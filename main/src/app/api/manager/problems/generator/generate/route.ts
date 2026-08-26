import { NextRequest, NextResponse } from 'next/server';
import { getManagerSupabase } from '@/lib/managerAuth';
import { getJudgeSharedSecret } from '@/lib/env';

export async function POST(request: NextRequest) {
  try {
    const auth = await getManagerSupabase(request);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    // Expect JSON body with code string
    const body = await request.json();
    const source = body?.code;
    if (!source || typeof source !== 'string' || source.trim().length === 0) {
      return NextResponse.json({ error: 'code field is required' }, { status: 400 });
    }

    // Call judge service using existing env var pattern
    const JUDGE_URL = process.env.NEXT_PUBLIC_JUDGE_URL || 'http://localhost:4001';
    const resp = await fetch(`${JUDGE_URL}/generate-tests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Judge-Token': getJudgeSharedSecret(),
      },
      body: JSON.stringify({ language: 'cpp', code: source }),
    });

    // Check `resp.ok` BEFORE parsing. A judge 502/504, a proxy page or a cold
    // start answers with HTML, and `.json()` would throw into the outer catch
    // and surface as an opaque app 500 — telling the author their generator is
    // broken when the judge is simply down.
    if (!resp.ok) {
      const raw = await resp.text().catch(() => '');
      let parsed: { error?: string; inputJson?: string; outputJson?: string } | null = null;
      try { parsed = raw ? JSON.parse(raw) : null; } catch { parsed = null; }
      return NextResponse.json(
        {
          error: parsed?.error || `Judge error (HTTP ${resp.status})${raw && !parsed ? `: ${raw.slice(0, 500)}` : ''}`,
          inputRaw: parsed?.inputJson,
          outputRaw: parsed?.outputJson,
        },
        { status: resp.status || 500 }
      );
    }

    const data = await resp.json().catch(() => null);
    if (!data) {
      return NextResponse.json({ error: 'Judge returned a malformed response' }, { status: 502 });
    }

    // Return both parsed arrays and unmodified raw strings for UI preview/debugging
    return NextResponse.json({
      input: data?.input,
      output: data?.output,
      inputRaw: data?.inputJson,
      outputRaw: data?.outputJson,
    });
  } catch (error) {
    console.error('Generator generate error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
