import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildJudgeRequest,
  buildSubmitBody,
  classifyJudgeResponse,
  type JudgeSubmitRequest,
} from '@/lib/judge';

/**
 * The three pure halves of the judge contract. Each one pins a rule that used
 * to live as a comment beside a copy-pasted `fetch`:
 *
 * - `checker` is OMITTED when blank, never sent as null;
 * - the auth header is `X-Judge-Token`, never `Authorization`;
 * - `ok` is read BEFORE the body is parsed, because a judge that is down
 *   answers with HTML and `.json()` on HTML throws.
 */

const BASE: JudgeSubmitRequest = {
  language: 'cpp17',
  code: 'int main(){}',
  input: ['1 2'],
  output: ['3'],
  timeLimit: 5000,
  memoryLimit: 256,
  checker: null,
};

// ── buildSubmitBody ─────────────────────────────────────────────────────────

test('a null checker is omitted from the body, not sent as null', () => {
  const body = buildSubmitBody(BASE);
  assert.equal('checker' in body, false);
});

test('a blank or whitespace-only checker is omitted too', () => {
  assert.equal('checker' in buildSubmitBody({ ...BASE, checker: '' }), false);
  assert.equal('checker' in buildSubmitBody({ ...BASE, checker: '   ' }), false);
  assert.equal('checker' in buildSubmitBody({ ...BASE, checker: '\n\t ' }), false);
});

test('a real checker is carried through verbatim', () => {
  const checker = 'int main(){ return 0; }';
  assert.equal(buildSubmitBody({ ...BASE, checker }).checker, checker);
});

test('every other field of the contract is present', () => {
  assert.deepEqual(buildSubmitBody(BASE), {
    language: 'cpp17',
    code: 'int main(){}',
    input: ['1 2'],
    output: ['3'],
    timeLimit: 5000,
    memoryLimit: 256,
  });
});

// ── buildJudgeRequest ───────────────────────────────────────────────────────

const ENV = { url: 'https://judge.example', secret: 's3cret' };

test('the auth header is X-Judge-Token and there is no Authorization header', () => {
  const { init } = buildJudgeRequest(ENV, '/submit', { a: 1 });
  const headers = init.headers as Record<string, string>;
  assert.equal(headers['X-Judge-Token'], 's3cret');
  assert.equal(headers['Content-Type'], 'application/json');
  assert.equal('Authorization' in headers, false);
});

test('the URL is the base plus the path, with no extra separator', () => {
  assert.equal(buildJudgeRequest(ENV, '/submit', {}).url, 'https://judge.example/submit');
  assert.equal(buildJudgeRequest(ENV, '/generate-tests', {}).url, 'https://judge.example/generate-tests');
  assert.equal(buildJudgeRequest(ENV, '/health', null).url, 'https://judge.example/health');
});

test('a body makes it a POST and is serialised; no body makes it a GET', () => {
  const post = buildJudgeRequest(ENV, '/generate-tests', { language: 'cpp', code: 'x' });
  assert.equal(post.init.method, 'POST');
  assert.equal(post.init.body, '{"language":"cpp","code":"x"}');

  const get = buildJudgeRequest(ENV, '/health', null);
  assert.equal(get.init.method, 'GET');
  assert.equal('body' in get.init, false);
});

test('every judge call is uncached', () => {
  assert.equal(buildJudgeRequest(ENV, '/health', null).init.cache, 'no-store');
  assert.equal(buildJudgeRequest(ENV, '/submit', {}).init.cache, 'no-store');
});

// ── classifyJudgeResponse ───────────────────────────────────────────────────

test('a 200 with a JSON object is ok, carrying the parsed value', () => {
  const outcome = classifyJudgeResponse<{ summary: { total: number } }>(
    200,
    true,
    '{"summary":{"total":3,"passed":3,"failed":0},"results":[]}',
  );
  assert.equal(outcome.ok, true);
  assert.equal(outcome.ok && outcome.value.summary.total, 3);
});

test('a 200 whose body is HTML is unreadable, not a parse throw', () => {
  const outcome = classifyJudgeResponse(200, true, '<html><body>502</body></html>');
  assert.equal(outcome.ok, false);
  assert.equal(!outcome.ok && outcome.kind, 'unreadable');
  assert.equal(!outcome.ok && outcome.kind === 'unreadable' && outcome.status, 200);
});

test('a 200 with an empty body, a bare array or a bare string is unreadable', () => {
  for (const body of ['', '[]', '"ok"', 'null']) {
    const outcome = classifyJudgeResponse(200, true, body);
    assert.equal(!outcome.ok && outcome.kind, 'unreadable', `body=${JSON.stringify(body)}`);
  }
});

test('a non-ok HTML response is an httpError with no parsed body and a capped detail', () => {
  const huge = `<html>${'x'.repeat(5000)}</html>`;
  const outcome = classifyJudgeResponse(502, false, huge);
  assert.equal(outcome.ok, false);
  assert.ok(!outcome.ok && outcome.kind === 'httpError');
  if (!outcome.ok && outcome.kind === 'httpError') {
    assert.equal(outcome.status, 502);
    assert.equal(outcome.parsed, null);
    assert.equal(outcome.detail.length, 1000);
    assert.equal(outcome.detail, huge.slice(0, 1000));
  }
});

test('a non-ok JSON response keeps the judge\'s own fields for the caller to forward', () => {
  const outcome = classifyJudgeResponse(400, false, '{"error":"x","inputJson":"[]"}');
  assert.ok(!outcome.ok && outcome.kind === 'httpError');
  if (!outcome.ok && outcome.kind === 'httpError') {
    assert.equal(outcome.status, 400);
    assert.equal(outcome.parsed?.error, 'x');
    assert.equal(outcome.parsed?.inputJson, '[]');
  }
});

test('ok is read before the body: a JSON body on a non-ok status is still an httpError', () => {
  const outcome = classifyJudgeResponse(500, false, '{"summary":{"total":1}}');
  assert.equal(!outcome.ok && outcome.kind, 'httpError');
});
