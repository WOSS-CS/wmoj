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
app.use(express.json({ limit: '2mb' }));
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

    if (language === 'python') {
      filePath = path.join(workDir, 'Main.py');
      await fs.promises.writeFile(filePath, code, 'utf8');
      runCmdBuilder = () => ({ cmd: 'python3', args: [filePath] });
    } else if (language === 'cpp') {
      filePath = path.join(workDir, 'Main.cpp');
      const outPath = path.join(workDir, 'a.out');
      await fs.promises.writeFile(filePath, code, 'utf8');
      compileCmd = { cmd: 'g++', args: ['-O2', '-std=c++17', filePath, '-o', outPath] };
      runCmdBuilder = () => ({ cmd: outPath, args: [] });
    } else if (language === 'java') {
      filePath = path.join(workDir, 'Main.java');
      await fs.promises.writeFile(filePath, code, 'utf8');
      compileCmd = { cmd: 'javac', args: [filePath] };
      runCmdBuilder = () => ({ cmd: 'java', args: ['-classpath', workDir, 'Main'] });
    } else {
      return res.status(400).json({ error: 'Unsupported language. Use python | cpp | java' });
    }

    // Compile if needed
    if (compileCmd) {
      await new Promise((resolve, reject) => {
        const p = spawn(compileCmd.cmd, compileCmd.args, { cwd: workDir });
        let stderr = '';
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
      const { cmd, args } = runCmdBuilder();

      const result = await new Promise((resolve) => {
        const child = spawn(cmd, args, { cwd: workDir });
        let stdout = '';
        let stderr = '';
        let timedOut = false;

        // Simple 5s timeout per test case
        const timer = setTimeout(() => {
          timedOut = true;
          child.kill('SIGKILL');
        }, 5000);

        child.stdin.write(testInput);
        child.stdin.end();

        child.stdout.on('data', (d) => (stdout += d.toString()))
        child.stderr.on('data', (d) => (stderr += d.toString()))

        child.on('close', (code) => {
          clearTimeout(timer);
          const normalizedOut = (stdout || '').replace(/\r\n/g, '\n').trimEnd();
          const normalizedExpected = (expected || '').replace(/\r\n/g, '\n').trimEnd();
          resolve({
            index: i,
            exitCode: code,
            timedOut,
            stdout,
            stderr,
            passed: !timedOut && code === 0 && normalizedOut === normalizedExpected,
            expected: normalizedExpected,
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

app.listen(PORT, () => {
  console.log(`Judge listening on http://localhost:${PORT}`);
});


