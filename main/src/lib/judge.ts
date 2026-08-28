// The judge URL and the shared secret are read here and only here, and the
// `server-only` poison pill turns importing this module from a `'use client'`
// file into a BUILD error. The browser must never learn where the judge lives
// — that is why `/status` proxies through `api/status/health` rather than
// calling the judge directly.
import 'server-only';

import type { TestResult } from '@/types/judge';

/**
 * One owner for the judge's wire contract.
 *
 * Four routes used to each know the header spelling (`X-Judge-Token`, never
 * `Authorization`), the read-`ok`-before-parsing rule, and the protocol's least
 * obvious property: **both judge-side failure modes come back as HTTP 200**.
 * The ok-before-parse comment was copy-pasted between the two `generate` twins
 * and re-derived a third time in the submit route; the "omit `checker` when it
 * is blank" rule was a comment guarding a spread. They are all here now.
 *
 * The split is pure decision from I/O, per the repo's testing rule: everything
 * that decides anything — the wire body, the request, the classification of a
 * response — is a pure function with a unit test, and the three exported
 * `judge*` calls are thin orchestration over the global `fetch`. No injected
 * `fetch`, no client abstraction.
 *
 * What is deliberately NOT here: retries, timeouts and a queue. The browser's
 * submit blocks until every test case has run, exactly as before.
 */

// ── Environment ─────────────────────────────────────────────────────────────
// Absorbed from the deleted `lib/env.ts`, whose two exports had exactly these
// four call sites and inlined one `||` expression four times.

/**
 * Where wmoj-judge lives. Despite the `NEXT_PUBLIC_` prefix this is read
 * **server-side only**; the `server-only` import above is what enforces it.
 */
function getJudgeUrl(): string {
  return process.env.NEXT_PUBLIC_JUDGE_URL || 'http://localhost:4001';
}

/**
 * The shared secret sent as `X-Judge-Token`. The same value must be set on the
 * judge (`JUDGE_SHARED_SECRET` there too). In production a missing or empty
 * value is a hard error; in development it falls back to an empty string so a
 * local run without the judge still boots.
 */
function getJudgeSharedSecret(): string {
  const v = process.env.JUDGE_SHARED_SECRET ?? '';
  if (!v && process.env.NODE_ENV === 'production') {
    throw new Error('JUDGE_SHARED_SECRET is required in production but was not set');
  }
  return v;
}

// ── Types mirroring wmoj-judge/src/types.ts ─────────────────────────────────

export interface JudgeSubmitRequest {
  language: string;
  code: string;
  input: unknown[];
  output: unknown[];
  timeLimit: number;
  memoryLimit: number;
  /** null or blank ⇒ the key is OMITTED from the wire body, never sent as null. Enforced here. */
  checker: string | null;
}

export interface JudgeSubmitResponse {
  summary: { total: number; passed: number; failed: number };
  results: TestResult[];
  /** Mirrors the judge; the app no longer forwards it to the browser (no reader). */
  effectiveMemoryLimitMb?: number;
  /** HTTP 200. The submitted code did not compile — the student's fault. */
  compileError?: string;
  /** HTTP 200. The PROBLEM'S checker did not compile — never the student's fault. */
  checkerError?: string;
}

export interface JudgeGenerateResponse {
  input?: unknown[];
  output?: unknown[];
  inputJson?: string;
  outputJson?: string;
  error?: string;
}

/**
 * The result of one judge call.
 *
 * `ok` covers BOTH judge-side failure modes — `compileError` and `checkerError`
 * arrive as an ordinary HTTP 200 and are the caller's to branch on. Every
 * non-`ok` outcome means the request or the judge is wrong, never the user's
 * code.
 */
export type JudgeOutcome<T> =
  | { ok: true; value: T }
  | { ok: false; kind: 'httpError'; status: number; detail: string; parsed: Record<string, unknown> | null }
  | { ok: false; kind: 'unreadable'; status: number }
  | { ok: false; kind: 'unreachable'; detail: string };

/** How much of an unparseable body is worth carrying into a log or a message. */
const MAX_DETAIL_CHARS = 1000;

const JUDGE_PATHS = {
  submit: '/submit',
  generate: '/generate-tests',
  health: '/health',
} as const;

export type JudgePath = (typeof JUDGE_PATHS)[keyof typeof JUDGE_PATHS];

// ── Pure ────────────────────────────────────────────────────────────────────

/**
 * The exact wire body for `POST /submit`.
 *
 * `checker` is OMITTED entirely when it is null or blank rather than sent as
 * null: a problem with no custom checker must send the judge byte-for-byte the
 * payload it sent before the feature existed.
 */
export function buildSubmitBody(req: JudgeSubmitRequest): Record<string, unknown> {
  const checker = typeof req.checker === 'string' && req.checker.trim().length > 0
    ? req.checker
    : null;

  return {
    language: req.language,
    code: req.code,
    input: req.input,
    output: req.output,
    timeLimit: req.timeLimit,
    memoryLimit: req.memoryLimit,
    ...(checker ? { checker } : {}),
  };
}

/**
 * URL and `RequestInit` for one judge call. `body === null` means a GET with no
 * body. The auth header is `X-Judge-Token` — NOT `Authorization`, which the
 * judge ignores.
 */
export function buildJudgeRequest(
  env: { url: string; secret: string },
  path: JudgePath,
  body: unknown | null,
): { url: string; init: RequestInit } {
  return {
    url: `${env.url}${path}`,
    init: {
      method: body === null ? 'GET' : 'POST',
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        'X-Judge-Token': env.secret,
      },
      ...(body === null ? {} : { body: JSON.stringify(body) }),
    },
  };
}

/**
 * Classify a response from its `(status, ok, bodyText)`. Never throws.
 *
 * Reading `ok` BEFORE parsing is the load-bearing part: a cold start, a proxy
 * error page or a Render 502 answers with HTML, and calling `.json()` on that
 * throws — which every call site used to surface as an opaque app 500, telling
 * an author their generator was broken when the judge was simply down.
 *
 * `detail` is the raw body sliced to {@link MAX_DETAIL_CHARS}; `parsed` is the
 * body as a JSON object when it is one, else null.
 */
export function classifyJudgeResponse<T>(
  status: number,
  ok: boolean,
  bodyText: string,
): JudgeOutcome<T> {
  const parsed = parseJsonObject(bodyText);

  if (!ok) {
    return { ok: false, kind: 'httpError', status, detail: bodyText.slice(0, MAX_DETAIL_CHARS), parsed };
  }
  if (!parsed) {
    return { ok: false, kind: 'unreadable', status };
  }
  return { ok: true, value: parsed as T };
}

/** The body as a plain JSON object, or null for anything else (HTML, an array, a bare string). */
function parseJsonObject(bodyText: string): Record<string, unknown> | null {
  if (!bodyText) return null;
  try {
    const value: unknown = JSON.parse(bodyText);
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    return value as Record<string, unknown>;
  } catch {
    return null;
  }
}

// ── I/O (thin; global fetch) ────────────────────────────────────────────────

/**
 * One judge call, start to finish. A `fetch` that throws — DNS, a refused
 * connection, a dropped socket — becomes `{ ok: false, kind: 'unreachable' }`
 * and never propagates, so no caller's outer catch can turn the judge being
 * down into "internal server error".
 */
async function callJudge<T>(path: JudgePath, body: unknown | null): Promise<JudgeOutcome<T>> {
  const { url, init } = buildJudgeRequest(
    { url: getJudgeUrl(), secret: getJudgeSharedSecret() },
    path,
    body,
  );

  let response: Response;
  try {
    response = await fetch(url, init);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error(`[judge] ${path} is unreachable:`, detail);
    return { ok: false, kind: 'unreachable', detail };
  }

  const bodyText = await response.text().catch(() => '');
  const outcome = classifyJudgeResponse<T>(response.status, response.ok, bodyText);

  if (!outcome.ok && outcome.kind === 'httpError') {
    console.error(`[judge] ${path} failed with HTTP ${outcome.status}:`, outcome.detail);
  } else if (!outcome.ok && outcome.kind === 'unreadable') {
    console.error(`[judge] ${path} returned an unreadable HTTP ${outcome.status} body`);
  }

  return outcome;
}

/** Grade one submission. Both `compileError` and `checkerError` come back as `ok`. */
export async function judgeSubmit(
  req: JudgeSubmitRequest,
): Promise<JudgeOutcome<JudgeSubmitResponse>> {
  return callJudge<JudgeSubmitResponse>(JUDGE_PATHS.submit, buildSubmitBody(req));
}

/** Run a `generator.cpp` and get back the test data it produces. */
export async function judgeGenerateTests(
  source: string,
): Promise<JudgeOutcome<JudgeGenerateResponse>> {
  return callJudge<JudgeGenerateResponse>(JUDGE_PATHS.generate, { language: 'cpp', code: source });
}

/**
 * Reachability, and nothing else.
 *
 * Deliberately returns a boolean rather than the judge's body: spreading that
 * body both overwrote the caller's own `status: 'online'` with the judge's
 * `status: 'ok'` and published the judge's `version`, which is
 * `RENDER_GIT_COMMIT` in production — the exact commit that is live.
 */
export async function judgeHealthy(): Promise<boolean> {
  const outcome = await callJudge<unknown>(JUDGE_PATHS.health, null);
  // `unreadable` still means the judge answered 2xx: it is reachable, and this
  // probe never looks at what it said.
  return outcome.ok || (!outcome.ok && outcome.kind === 'unreadable');
}
