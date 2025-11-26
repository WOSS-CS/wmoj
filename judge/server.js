const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const app = express();
// Prefer platform-provided PORT (Render/Heroku/etc.), fallback to custom or local default
const PORT = process.env.PORT || process.env.JUDGE_PORT || 4001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));

/**
 * Request body schema:
 * {
 *   language: 'python' | 'cpp' | 'java',
 *   code: string, // full source code text
 *   input: string[], // each item is one test case input string
 *   output: string[] // each item is expected output string for corresponding input
 * }
 */

app.post('/submit', async (req, res) => {
  const { language, code, input, output, timeLimit, memoryLimit } = req.body || {};
  // Basic debug to help diagnose production issues
  try { console.log(`[judge] submit: lang=${language}, code_len=${code ? String(code).length : 0}, cases=${Array.isArray(input) ? input.length : 0}, timeLimit=${timeLimit || 5000}ms, memoryLimit=${memoryLimit || 256}MB`); } catch (_) { }

  // TODO: Memory limit enforcement not yet implemented. Requires proper sandboxing (e.g., cgroups, nsjail).
  // The memoryLimit parameter is accepted but not enforced in the current implementation.

  if (!language || !code || !Array.isArray(input) || !Array.isArray(output)) {
    return res.status(400).json({
      error: 'Invalid payload. Required: language, code, input[], output[]'
    });
  }

  if (input.length !== output.length) {
    return res.status(400).json({ error: 'input and output arrays must be the same length' });
  }

  try {
    const workDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'judge-'));

    let filePath;
    let compileCmd = null;
    let runCmdBuilder;

    async function findExecutable(candidates, versionArgs = ['--version']) {
      for (const candidate of candidates) {
        try {
          await new Promise((resolve, reject) => {
            const p = spawn(candidate, versionArgs);
            p.on('error', reject);
            p.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`code ${code}`))));
          });
          return candidate;
        } catch (_) {
          // try next
        }
      }
      return null;
    }

    // Convert one test case (inner array) to a single-line CP-style stdin string
    function toCaseLine(value) {
      const tokens = [];
      (function flatten(v) {
        if (v == null) return;
        if (Array.isArray(v)) {
          for (const x of v) flatten(x);
          return;
        }
        if (typeof v === 'number') { tokens.push(String(v)); return; }
        if (typeof v === 'string') { tokens.push(v.trim()); return; }
        // objects: stringify
        try { tokens.push(JSON.stringify(v)); } catch (_) { /* ignore */ }
      })(value);
      return tokens.join(' ');
    }

    function normalizeInputCase(testInput) {
      // Expect each testInput to be an inner array (tokens for one run)
      // If it's a string containing JSON, parse it; otherwise use as-is
      let line = '';
      if (Array.isArray(testInput)) {
        line = toCaseLine(testInput);
      } else if (typeof testInput === 'string') {
        const raw = testInput.trim();
        if ((raw.startsWith('[') && raw.endsWith(']')) || (raw.startsWith('{') && raw.endsWith('}'))) {
          try { line = toCaseLine(JSON.parse(raw)); } catch (_) { line = raw; }
        } else {
          line = raw;
        }
      } else if (typeof testInput === 'number') {
        line = String(testInput);
      } else {
        try { line = JSON.stringify(testInput); } catch (_) { line = String(testInput ?? ''); }
      }
      return line.endsWith('\n') ? line : line + '\n';
    }

    function normalizeExpectedCase(expected) {
      if (Array.isArray(expected)) return toCaseLine(expected);
      if (typeof expected === 'number') return String(expected);
      const raw = (expected ?? '').toString().trim();
      if ((raw.startsWith('[') && raw.endsWith(']')) || (raw.startsWith('{') && raw.endsWith('}'))) {
        try { return toCaseLine(JSON.parse(raw)); } catch (_) { return raw; }
      }
      return raw.replace(/\s+/g, ' ');
    }

    function collapseWhitespace(s) {
      return (s ?? '').toString().replace(/\s+/g, ' ').trim();
    }

    if (language === 'python') {
      const py = await findExecutable(['python3', 'python'], ['-V']);
      if (!py) {
        await fs.promises.rm(workDir, { recursive: true, force: true });
        return res.status(501).json({ error: 'Python runtime not available on server' });
      }
      filePath = path.join(workDir, 'Main.py');
      await fs.promises.writeFile(filePath, code ?? '', 'utf8');
      runCmdBuilder = () => ({ cmd: py, args: [filePath], env: { PYTHONUNBUFFERED: '1' } });
    } else if (language === 'cpp') {
      const gpp = await findExecutable(['g++'], ['--version']);
      if (!gpp) {
        await fs.promises.rm(workDir, { recursive: true, force: true });
        return res.status(501).json({ error: 'g++ compiler not available on server' });
      }
      filePath = path.join(workDir, 'Main.cpp');
      const outPath = path.join(workDir, 'a.out');
      await fs.promises.writeFile(filePath, code ?? '', 'utf8');
      compileCmd = { cmd: gpp, args: ['-O2', '-std=c++17', filePath, '-o', outPath] };
      runCmdBuilder = () => ({ cmd: outPath, args: [] });
    } else if (language === 'java') {
      const javac = await findExecutable(['javac'], ['-version']);
      const java = await findExecutable(['java'], ['-version']);
      if (!javac || !java) {
        await fs.promises.rm(workDir, { recursive: true, force: true });
        return res.status(501).json({ error: 'Java runtime/compiler not available on server' });
      }
      filePath = path.join(workDir, 'Main.java');
      await fs.promises.writeFile(filePath, code ?? '', 'utf8');
      compileCmd = { cmd: javac, args: [filePath] };
      runCmdBuilder = () => ({ cmd: java, args: ['-classpath', workDir, 'Main'] });
    } else {
      return res.status(400).json({ error: 'Unsupported language. Use python | cpp | java' });
    }

    // Compile if needed
    if (compileCmd) {
      await new Promise((resolve, reject) => {
        const p = spawn(compileCmd.cmd, compileCmd.args, { cwd: workDir });
        let stderr = '';
        p.on('error', (err) => reject(err));
        p.stderr.on('data', (d) => (stderr += d.toString()));
        p.on('close', (code) => {
          if (code !== 0) {
            reject(new Error(`Compilation failed (code ${code})\n${stderr}`));
          } else {
            resolve(undefined);
          }
        });
      });
    }

    const results = [];

    // Run each test case sequentially to simplify resource usage
    for (let i = 0; i < input.length; i += 1) {
      const testInput = input[i] ?? '';
      const expected = output[i] ?? '';
      const { cmd, args, env: extraEnv } = runCmdBuilder();

      const result = await new Promise((resolve) => {
        const child = spawn(cmd, args, { cwd: workDir, env: { ...process.env, ...(extraEnv || {}) } });
        let stdout = '';
        let stderr = '';
        let timedOut = false;

        // Use provided timeLimit or default to 5s
        const timer = setTimeout(() => {
          timedOut = true;
          child.kill('SIGKILL');
        }, timeLimit || 5000);

        child.on('error', (err) => {
          clearTimeout(timer);
          resolve({
            index: i,
            exitCode: null,
            timedOut: false,
            stdout: '',
            stderr: `spawn error: ${String(err && err.message ? err.message : err)}`,
            passed: false,
            expected: (expected || '').replace(/\r\n/g, '\n').trimEnd(),
            received: ''
          });
        });

        try {
          const payloadInput = normalizeInputCase(testInput);
          try { console.log(`[judge] case ${i}: input_len=${payloadInput.length} preview="${payloadInput.slice(0, 50).replace(/\n/g, '\\n')}"`); } catch (_) { }
          child.stdin.write(payloadInput, 'utf8');
          child.stdin.end();
        } catch (_) {
          // ignore
        }

        child.stdout.on('data', (d) => (stdout += d.toString()))
        child.stderr.on('data', (d) => (stderr += d.toString()))

        child.on('close', (code) => {
          clearTimeout(timer);
          const normalizedOut = (stdout || '').replace(/\r\n/g, '\n').trim();
          const expectedNorm = normalizeExpectedCase(expected);
          const outCollapsed = collapseWhitespace(normalizedOut);
          const expCollapsed = collapseWhitespace(expectedNorm);
          try { console.log(`[judge] case ${i}: exit=${code} out_len=${normalizedOut.length} err_len=${(stderr || '').length}`); } catch (_) { }
          if ((stderr || '').length) {
            try { console.log(`[judge] case ${i}: stderr_preview="${stderr.slice(0, 200).replace(/\n/g, '\\n')}"`); } catch (_) { }
          }
          resolve({
            index: i,
            exitCode: code,
            timedOut,
            stdout,
            stderr,
            passed: !timedOut && code === 0 && outCollapsed === expCollapsed,
            expected: expectedNorm,
            received: normalizedOut,
          });
        });
      });

      results.push(result);
    }

    // Summarize
    const summary = {
      total: results.length,
      passed: results.filter((r) => r.passed).length,
      failed: results.filter((r) => !r.passed).length,
    };

    // Cleanup best-effort
    try { await fs.promises.rm(workDir, { recursive: true, force: true }); } catch (_) { }

    return res.json({ summary, results });
  } catch (err) {
    return res.status(500).json({ error: String(err && err.message ? err.message : err) });
  }
});

// Compile and run a C++ generator that emits input JSON on stdout and output JSON on stderr
app.post('/generate-tests', async (req, res) => {
  const { language, code } = req.body || {};
  try { console.log(`[judge] generate-tests: lang=${language}, code_len=${code ? String(code).length : 0}`); } catch (_) { }

  if (!code || (language && language !== 'cpp')) {
    return res.status(400).json({ error: 'Invalid payload. Required: code (C++). language must be cpp if provided.' });
  }

  try {
    const workDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'judge-'));

    async function findExecutable(candidates, versionArgs = ['--version']) {
      for (const candidate of candidates) {
        try {
          await new Promise((resolve, reject) => {
            const p = spawn(candidate, versionArgs);
            p.on('error', reject);
            p.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`code ${code}`))));
          });
          return candidate;
        } catch (_) { /* try next */ }
      }
      return null;
    }

    const gpp = await findExecutable(['g++'], ['--version']);
    if (!gpp) {
      await fs.promises.rm(workDir, { recursive: true, force: true });
      return res.status(501).json({ error: 'g++ compiler not available on server' });
    }

    const filePath = path.join(workDir, 'Generator.cpp');
    const outPath = path.join(workDir, 'gen.out');
    await fs.promises.writeFile(filePath, code ?? '', 'utf8');

    // Compile
    try {
      await new Promise((resolve, reject) => {
        const p = spawn(gpp, ['-O2', '-std=gnu++17', filePath, '-o', outPath], { cwd: workDir });
        let stderr = '';
        p.on('error', (err) => reject(err));
        p.stderr.on('data', (d) => (stderr += d.toString()));
        p.on('close', (code) => {
          if (code !== 0) reject(new Error(`Compilation failed (code ${code})\n${stderr}`));
          else resolve();
        });
      });
    } catch (e) {
      try { await fs.promises.rm(workDir, { recursive: true, force: true }); } catch (_) { }
      return res.status(400).json({ error: String(e && e.message ? e.message : e) });
    }

    // Run (no stdin). The generator prints input JSON to stdout, output JSON to stderr
    // No artificial timeout; allow generator to complete naturally.
    const runResult = await new Promise((resolve) => {
      const child = spawn(outPath, [], { cwd: workDir });
      let stdout = '';
      let stderr = '';
      child.stdout.on('data', (d) => (stdout += d.toString()));
      child.stderr.on('data', (d) => (stderr += d.toString()));
      child.on('error', (err) => {
        resolve({ code: null, stdout, stderr, error: `spawn error: ${String(err && err.message ? err.message : err)}` });
      });
      child.on('close', (code) => {
        resolve({ code, stdout, stderr });
      });
    });

    // Cleanup workdir best-effort after processing
    try { await fs.promises.rm(workDir, { recursive: true, force: true }); } catch (_) { }

    if (runResult.code !== 0) {
      return res.status(400).json({ error: `Generator exited with code ${runResult.code}`, inputJson: runResult.stdout, outputJson: runResult.stderr });
    }

    const inputRaw = runResult.stdout ?? '';
    const outputRaw = runResult.stderr ?? '';

    // Validate JSON arrays (any JSON values), same length
    let inputArr, outputArr;
    try { inputArr = JSON.parse(inputRaw); } catch (e) { return res.status(400).json({ error: `Invalid JSON on stdout: ${String(e && e.message ? e.message : e)}`, inputJson: inputRaw, outputJson: outputRaw }); }
    try { outputArr = JSON.parse(outputRaw); } catch (e) { return res.status(400).json({ error: `Invalid JSON on stderr: ${String(e && e.message ? e.message : e)}`, inputJson: inputRaw, outputJson: outputRaw }); }

    if (!Array.isArray(inputArr) || !Array.isArray(outputArr)) {
      return res.status(400).json({ error: 'Both stdout and stderr must be JSON arrays', inputJson: inputRaw, outputJson: outputRaw });
    }
    if (inputArr.length !== outputArr.length) {
      return res.status(400).json({ error: 'Input and output arrays must be the same length', inputJson: inputRaw, outputJson: outputRaw });
    }

    // Coerce all values to strings for downstream compatibility
    const toStrings = (arr) => arr.map((v) => {
      if (typeof v === 'string') return v;
      if (typeof v === 'number') return String(v);
      try { return JSON.stringify(v); } catch (_) { return String(v ?? ''); }
    });
    const inputStr = toStrings(inputArr);
    const outputStr = toStrings(outputArr);

    return res.json({ inputJson: inputRaw, outputJson: outputRaw, input: inputStr, output: outputStr });
  } catch (err) {
    return res.status(500).json({ error: String(err && err.message ? err.message : err) });
  }
});

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.get('/selftest/python', async (_req, res) => {
  function findExec(cands, args) {
    return new Promise((resolve) => {
      let idx = 0;
      const tryNext = () => {
        if (idx >= cands.length) return resolve(null);
        const c = cands[idx++];
        const p = spawn(c, args);
        p.on('error', () => tryNext());
        p.on('close', (code) => (code === 0 ? resolve(c) : tryNext()));
      };
      tryNext();
    });
  }
  const py = await findExec(['python3', 'python'], ['-V']);
  if (!py) return res.status(501).json({ error: 'python not available' });
  const child = spawn(py, ['-u', '-c', 'print(input())']);
  let out = '', err = '';
  child.stdout.on('data', (d) => (out += d.toString()));
  child.stderr.on('data', (d) => (err += d.toString()));
  child.stdin.write('hello\n');
  child.stdin.end();
  child.on('close', (code) => {
    res.json({ code, out, err });
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Judge listening on http://0.0.0.0:${PORT}`);
});


