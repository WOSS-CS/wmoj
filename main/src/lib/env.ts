/**
 * Server-only environment readers. Values exported here MUST NOT be
 * referenced from client components — Next.js will only inline vars
 * that start with `NEXT_PUBLIC_` into the browser bundle, so importing
 * this file from a client component would yield `undefined` at runtime.
 *
 * Kept minimal on purpose: one helper per judge env var, explicit error
 * messages when a required var is missing in production.
 */

/**
 * Read the shared secret the Next.js API routes send as `X-Judge-Token`
 * when talking to wmoj-judge. The same value must be set on the judge
 * (`JUDGE_SHARED_SECRET` env var there too). In production, a missing
 * or empty value is a hard boot-time error; in development we fall
 * back to an empty string so local runs without the judge still work.
 */
/**
 * Where wmoj-judge lives. Despite the `NEXT_PUBLIC_` prefix this is read
 * **server-side only** — the browser must never learn the judge URL, which is
 * why `/status` proxies through `api/status/health` instead of calling it
 * directly. Reading it in one place is what keeps that greppable.
 */
export function getJudgeUrl(): string {
  return process.env.NEXT_PUBLIC_JUDGE_URL || 'http://localhost:4001';
}

export function getJudgeSharedSecret(): string {
  const v = process.env.JUDGE_SHARED_SECRET ?? '';
  if (!v && process.env.NODE_ENV === 'production') {
    throw new Error(
      'JUDGE_SHARED_SECRET is required in production but was not set',
    );
  }
  return v;
}
