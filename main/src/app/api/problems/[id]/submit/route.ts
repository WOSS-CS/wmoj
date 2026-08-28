import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/requestAuth';
import { checkContestGate, getContestIdsForProblem } from '@/lib/contestGate';
import { judgeSubmit } from '@/lib/judge';
import { isAllowedLanguage, MAX_CODE_BYTES } from '@/lib/languages';
import { canUserAccessProblem } from '@/lib/problemAccess';
import { compileErrorOf, recordSubmission, summaryForStorage } from '@/lib/submissionRecord';
import { readProblemTestData } from '@/lib/supabaseAdmin';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ error: 'Problem ID is required' }, { status: 400 });

    // Parse and validate the payload BEFORE any database work, so a malformed
    // body is a 400 that names the problem rather than a 500 from the outer
    // catch — and so no round-trip is spent on a request that was never going
    // to be gradeable.
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    const { language, code } = body as { language?: unknown; code?: unknown };
    if (!isAllowedLanguage(language)) {
      return NextResponse.json({ error: 'Unsupported language' }, { status: 400 });
    }
    if (typeof code !== 'string' || code.trim().length === 0) {
      return NextResponse.json({ error: 'Missing language or code' }, { status: 400 });
    }
    if (Buffer.byteLength(code, 'utf8') > MAX_CODE_BYTES) {
      return NextResponse.json(
        { error: `Code is too large. The limit is ${MAX_CODE_BYTES.toLocaleString('en-US')} bytes.` },
        { status: 413 },
      );
    }

    const auth = await requireUser(request);
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const { supabase, userId } = auth;

    // Fetch problem. The graded columns are deliberately NOT selected here: they
    // are read separately, AFTER authorization, through `readProblemTestData`.
    const { data: problem, error: probErr } = await supabase
      .from('problems')
      .select('id, time_limit, memory_limit, is_active, created_by')
      .eq('id', id)
      .single();
    if (probErr || !problem) {
      return NextResponse.json({ error: 'Problem not found' }, { status: 404 });
    }

    const hasAccess = await canUserAccessProblem(supabase, problem, userId);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Problem not found' }, { status: 404 });
    }

    // The contest gate. This is the last line between a scheduled contest's
    // problem set and a submission that would be accepted and SCORED against
    // it, so the `hidden` arm below is a 404 and not a 403: this repo's rule is
    // that a hidden resource is indistinguishable from one that does not exist.
    // The rules themselves, and why each is load-bearing, live in
    // `lib/contestGate.ts` alongside the two pages that share them.
    const contestIds = await getContestIdsForProblem(supabase, id);
    const gate = await checkContestGate(supabase, { contestIds, userId });
    if (gate.kind === 'hidden') {
      return NextResponse.json({ error: 'Problem not found' }, { status: 404 });
    }
    if (gate.kind === 'notParticipant') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (gate.kind === 'expired') {
      return NextResponse.json({ error: 'Contest time has expired' }, { status: 403 });
    }

    // The answer key. Read only now, once every access gate above has passed —
    // this is the one place in the app that reads it on behalf of someone who
    // must not be able to read it themselves, so it runs through the
    // service-role client (`readProblemTestData`) rather than the student's own.
    // It must never be selected into anything that becomes a client-component
    // prop.
    const tests = await readProblemTestData(problem.id);
    if (!tests) {
      console.error(`Could not load test data for problem ${problem.id}`);
      return NextResponse.json(
        { error: 'This problem\'s test data could not be loaded. This is not a problem with your code — please let a WMOJ admin know.' },
        { status: 500 },
      );
    }

    const outcome = await judgeSubmit({
      language,
      code,
      input: tests.input,
      output: tests.output,
      timeLimit: problem.time_limit || 5000,
      memoryLimit: problem.memory_limit || 256,
      checker: tests.checker,
    });

    // A non-ok outcome means the request or the judge is wrong, never the
    // student's code. `lib/judge.ts` has already logged the detail.
    if (!outcome.ok) {
      if (outcome.kind === 'unreadable') {
        return NextResponse.json(
          { error: 'The judge service returned an unreadable response. This is not a problem with your code — please try again shortly.' },
          { status: 502 },
        );
      }
      const status = outcome.kind === 'httpError' ? `HTTP ${outcome.status}` : 'unreachable';
      return NextResponse.json(
        { error: `The judge service is unavailable (${status}). This is not a problem with your code — please try again shortly.` },
        { status: 502 },
      );
    }

    const judge = outcome.value;

    // CHECKER ERROR FIRST, before the compile-error branch below. The problem's
    // own checker failed to compile: HTTP 200 with summary={0,0,0} and
    // results=[], exactly like a compile error, but it is a
    // problem-configuration fault with nothing to do with the submitted code.
    // Bail out here so it never reaches the student as their compile error, and
    // before `recordSubmission` so a misconfigured problem cannot record a
    // failed submission against them. Nothing ran, so there is nothing to store
    // and nothing to score.
    if (typeof judge.checkerError === 'string' && judge.checkerError.length > 0) {
      console.error(`Checker compile error for problem ${problem.id}:`, judge.checkerError);
      return NextResponse.json({
        results: [],
        summary: null,
        firstSolve: false,
        checkerError: judge.checkerError,
      });
    }

    const compileError = compileErrorOf(judge);
    const record = await recordSubmission({ supabase, problem, userId, language, code, judge });

    return NextResponse.json({
      // THE FULL ARRAY, deliberately — do NOT return the redacted row that was
      // just stored. The caller is the submitter, this is their own code and
      // their own per-case output, and `SubmitClient` renders the expected vs
      // received detail straight from this response. A naive "return the
      // inserted row" would strip the owner's own feedback and make every
      // submission page show five keys and nothing to read.
      results: judge.results,
      // The same pure function `recordSubmission` stored, so what the student
      // is shown and what the row carries cannot drift.
      summary: summaryForStorage(judge.summary, compileError !== null),
      // No row, no solve. Reporting a first solve for a submission that failed
      // to persist would credit points the recalculation never ran for.
      firstSolve: record.stored && record.firstSolve,
      // Present ONLY when persistence was attempted and failed. Its absence
      // means "stored" for an active problem and "deliberately not stored" for
      // an inactive one; clients render `stored === false` as
      // "graded but not recorded — contact staff".
      ...(!record.stored && record.reason === 'writeFailed' ? { stored: false } : {}),
      ...(compileError ? { compileError } : {}),
    });
  } catch (err) {
    console.error('Submit error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
