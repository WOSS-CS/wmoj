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
  const { language, code, input, output } = req.body || {};
  // Basic debug to help diagnose production issues
  try { console.log(`[judge] submit: lang=${language}, code_len=${code ? String(code).length : 0}, cases=${Array.isArray(input) ? input.length : 0}`); } catch(_) {}

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

    function flattenArrayToTokens(arr, tokens) {
      for (const v of arr) {
        if (Array.isArray(v)) {
          flattenArrayToTokens(v, tokens);
        } else if (typeof v === 'number') {
          tokens.push(String(v));
        } else if (typeof v === 'string') {
          // Extract numeric tokens from any embedded string
          const matches = v.match(/[+-]?\d+(?:\.\d+)?/g);
          if (matches) tokens.push(...matches);
        }
      }
    }

    function toSpaceSeparatedNumbersFromJsonLike(s) {
      try {
        const data = JSON.parse(s);
        const tokens = [];
        if (Array.isArray(data)) {
          flattenArrayToTokens(data, tokens);
          return tokens.join(' ');
        }
      } catch (_) {}
      return null;
    }

    function normalizeInputCase(testInput) {
      const raw = (testInput ?? '').toString();
      const trimmed = raw.trim();
      let normalized = null;
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        normalized = toSpaceSeparatedNumbersFromJsonLike(trimmed);
      }
      if (!normalized) {
        // As a fallback, extract numeric tokens from the string
        const matches = trimmed.match(/[+-]?\d+(?:\.\d+)?/g);
        if (matches && matches.length) {
          normalized = matches.join(' ');
        }
      }
      if (!normalized) normalized = raw; // last resort: pass through
      return normalized.endsWith('\n') ? normalized : normalized + '\n';
    }

    function normalizeExpectedCase(expected) {
      if (typeof expected === 'number') return String(expected);
      const raw = (expected ?? '').toString();
      const trimmed = raw.trim();
      let normalized = null;
      if ((trimmed.startsWith('[') && trimmed.endsWith(']')) || (trimmed.startsWith('{') && trimmed.endsWith('}'))) {
        const asSpace = toSpaceSeparatedNumbersFromJsonLike(trimmed);
        if (asSpace !== null) return asSpace;
      }
      // Fallback: collapse internal whitespace
      return trimmed.replace(/\s+/g, ' ');
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

        // Simple 5s timeout per test case
        const timer = setTimeout(() => {
          timedOut = true;
          child.kill('SIGKILL');
        }, 5000);

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
          try { console.log(`[judge] case ${i}: input_len=${payloadInput.length} preview="${payloadInput.slice(0,50).replace(/\n/g,'\\n')}"`); } catch(_) {}
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
          try { console.log(`[judge] case ${i}: exit=${code} out_len=${normalizedOut.length} err_len=${(stderr||'').length}`); } catch(_) {}
          if ((stderr || '').length) {
            try { console.log(`[judge] case ${i}: stderr_preview="${stderr.slice(0,200).replace(/\n/g,'\\n')}"`); } catch(_) {}
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
    try { await fs.promises.rm(workDir, { recursive: true, force: true }); } catch (_) {}

    return res.json({ summary, results });
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

app.listen(PORT, () => {
  console.log(`Judge listening on http://localhost:${PORT}`);
});


