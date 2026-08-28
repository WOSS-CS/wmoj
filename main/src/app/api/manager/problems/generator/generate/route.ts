import { NextRequest, NextResponse } from 'next/server';
import { getManagerSupabase } from '@/lib/managerAuth';
import { judgeGenerateTests } from '@/lib/judge';

export async function POST(request: NextRequest) {
  try {
    const auth = await getManagerSupabase(request);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    // Expect JSON body with code string
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    const source = body?.code;
    if (!source || typeof source !== 'string' || source.trim().length === 0) {
      return NextResponse.json({ error: 'code field is required' }, { status: 400 });
    }

    const outcome = await judgeGenerateTests(source);

    if (!outcome.ok) {
      // A judge that answered, however badly, gets its own status and its own
      // error text forwarded — the author needs to see why their generator was
      // rejected. Anything else is a 502: the judge is down or unintelligible,
      // which is never a fault of the source they just pasted.
      if (outcome.kind === 'httpError') {
        const parsedError = typeof outcome.parsed?.error === 'string' ? outcome.parsed.error : '';
        const rawTail = !outcome.parsed && outcome.detail ? `: ${outcome.detail.slice(0, 500)}` : '';
        return NextResponse.json(
          {
            error: parsedError || `Judge error (HTTP ${outcome.status})${rawTail}`,
            inputRaw: outcome.parsed?.inputJson,
            outputRaw: outcome.parsed?.outputJson,
          },
          { status: outcome.status || 500 },
        );
      }
      return NextResponse.json({ error: 'Judge returned a malformed response' }, { status: 502 });
    }

    // Return both parsed arrays and unmodified raw strings for UI preview/debugging
    return NextResponse.json({
      input: outcome.value.input,
      output: outcome.value.output,
      inputRaw: outcome.value.inputJson,
      outputRaw: outcome.value.outputJson,
    });
  } catch (error) {
    console.error('Generator generate error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
