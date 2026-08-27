import { NextResponse } from 'next/server';
import { getJudgeSharedSecret, getJudgeUrl } from '@/lib/env';

// Unauthenticated proxy for the judge's /health probe. The browser must never
// learn anything about the judge, so the judge's response body is deliberately
// NOT forwarded: spreading it both overwrote this endpoint's own
// `status: 'online'` with the judge's `status: 'ok'` and published the judge's
// `version` — which is RENDER_GIT_COMMIT in production, i.e. the exact commit
// that is live. Report reachability and nothing else.
export async function GET() {
  const JUDGE_URL = getJudgeUrl();
  try {
    const res = await fetch(`${JUDGE_URL}/health`, {
      cache: 'no-store',
      headers: { 'X-Judge-Token': getJudgeSharedSecret() },
    });
    if (res.ok) {
      return NextResponse.json({ status: 'online' });
    }
    return NextResponse.json({ status: 'offline' }, { status: 502 });
  } catch {
    return NextResponse.json({ status: 'offline' }, { status: 502 });
  }
}
