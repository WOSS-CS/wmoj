import { NextResponse } from 'next/server';
import { judgeHealthy } from '@/lib/judge';

// Unauthenticated proxy for the judge's /health probe. The browser must never
// learn anything about the judge, so the judge's response body is deliberately
// NOT forwarded: spreading it both overwrote this endpoint's own
// `status: 'online'` with the judge's `status: 'ok'` and published the judge's
// `version` — which is RENDER_GIT_COMMIT in production, i.e. the exact commit
// that is live. `judgeHealthy` returns a boolean for exactly that reason.
export async function GET() {
  try {
    const online = await judgeHealthy();
    return online
      ? NextResponse.json({ status: 'online' })
      : NextResponse.json({ status: 'offline' }, { status: 502 });
  } catch {
    // `judgeHealthy` swallows an unreachable judge, but reading the shared
    // secret throws in production when it is not configured. A status page that
    // renders a Next.js error page instead of "offline" is worse than useless,
    // so that stays an offline reading here — the throw is logged by Next and
    // the misconfiguration is loud on every other judge route.
    return NextResponse.json({ status: 'offline' }, { status: 502 });
  }
}
