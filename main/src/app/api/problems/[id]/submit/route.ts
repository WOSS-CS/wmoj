import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabaseFromToken } from '@/lib/supabaseServer';
import { getJudgeSharedSecret, getJudgeUrl } from '@/lib/env';
import { canUserAccessProblem } from '@/lib/problemAccess';
import { checkContestGate, getContestIdsForProblem } from '@/lib/contestGate';
import {
  compensateFailedSubmission,
  readProblemTestData,
  writeSubmissionPrivate,
} from '@/lib/supabaseAdmin';
import { redactSummary, redactTestResults } from '@/lib/submissionRedaction';

// The exact set the `submissions_language_check` constraint accepts. The judge
// enumerates the same six current values and accepts `python`/`cpp` as legacy
// aliases during the cutover. Validating here means a bad language is a 400
// from us rather than a 4xx from the judge that the student reads as
// "something went wrong with my code".
const ALLOWED_LANGUAGES = [
  'python3',
  'pypy3',
  'cpp14',
  'cpp17',
  'cpp20',
  'cpp23',
  'python',
  'cpp',
] as const;

// Mirrors the judge's own MAX_CODE_BYTES. Enforced here so an oversized paste
// is rejected before it is shipped across the network to be 413'd.
const MAX_CODE_BYTES = 100_000;

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ error: 'Problem ID is required' }, { status: 400 });

    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
    if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.substring(7).trim();
    const supabase = getServerSupabaseFromToken(token);

    // Parse and validate the payload BEFORE any database work, so a malformed
    // body is a 400 that names the problem rather than a 500 from the outer
    // catch — and so four Supabase round-trips aren't spent on a request that
    // was never going to be gradeable.
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    const { language, code } = body as { language?: unknown; code?: unknown };
    if (typeof language !== 'string' || !(ALLOWED_LANGUAGES as readonly string[]).includes(language)) {
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

    // Authenticated user id
    const { data: authUser, error: userErr } = await supabase.auth.getUser();
    if (userErr || !authUser?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = authUser.user.id;

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

    // Custom checker (optional). Only a non-empty source counts: a problem
    // with no checker must send the judge exactly the payload it sent before
    // this feature existed, so the key is omitted rather than sent as null.
    const checkerSource =
      typeof tests.checker === 'string' && tests.checker.trim().length > 0
        ? tests.checker
        : null;

    // Call judge service
    const JUDGE_URL = getJudgeUrl();
    const resp = await fetch(`${JUDGE_URL}/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Judge-Token': getJudgeSharedSecret(),
      },
      body: JSON.stringify({
        language,
        code,
        input: tests.input,
        output: tests.output,
        timeLimit: problem.time_limit || 5000,
        memoryLimit: problem.memory_limit || 256,
        ...(checkerSource ? { checker: checkerSource } : {})
      }),
    });

    // Check `ok` BEFORE parsing. A cold start, a proxy error page or a Render
    // 502 comes back as HTML, and calling .json() on it throws into the outer
    // catch — which then reports "Internal server error", blaming us for what
    // is an upstream failure. Read the body as text on this path and surface
    // the judge's status instead.
    if (!resp.ok) {
      const detail = await resp.text().catch(() => '');
      console.error(`Judge /submit failed with HTTP ${resp.status}:`, detail.slice(0, 1000));
      return NextResponse.json(
        { error: `The judge service is unavailable (HTTP ${resp.status}). This is not a problem with your code — please try again shortly.` },
        { status: 502 },
      );
    }

    const data = await resp.json().catch(() => null);
    if (!data || typeof data !== 'object') {
      console.error('Judge /submit returned a non-JSON 200 response');
      return NextResponse.json(
        { error: 'The judge service returned an unreadable response. This is not a problem with your code — please try again shortly.' },
        { status: 502 },
      );
    }

    // The problem's own checker failed to compile. HTTP 200 with
    // summary={0,0,0} and results=[], exactly like a compile error, but it is
    // a problem-configuration fault and has nothing to do with the submitted
    // code. Bail out before the CE synthesis below so it never reaches the
    // student as their compile error, and before the insert so a misconfigured
    // problem cannot record a failed submission against them. Nothing ran, so
    // there is nothing to store or score.
    const hasCheckerError = typeof data?.checkerError === 'string' && data.checkerError.length > 0;
    if (hasCheckerError) {
      console.error(`Checker compile error for problem ${problem.id}:`, data.checkerError);
      return NextResponse.json({
        results: [],
        summary: null,
        firstSolve: false,
        checkerError: data.checkerError as string,
      });
    }

    // Judge returns compileError on CE with summary={0,0,0} and results=[].
    // Stash the verdict + message in the existing summary JSON so no schema
    // change is needed — teammate E owns the real verdict column migration.
    const hasCompileError = typeof data?.compileError === 'string' && data.compileError.length > 0;
    const summaryForStorage = hasCompileError
      ? { ...(data.summary ?? { total: 0, passed: 0, failed: 0 }), verdict: 'CE', compileError: data.compileError as string }
      : data.summary;

    // Check for first solve before inserting (so we don't count the new submission itself)
    const summary = data.summary as { failed?: number; total?: number } | null;
    const isPassed = !hasCompileError && summary != null && (summary.failed ?? 1) === 0 && (summary.total ?? 0) > 0;
    let isFirstSolve = false;
    if (isPassed) {
      const { data: priorPass } = await supabase
        .from('submissions')
        .select('id')
        .eq('user_id', userId)
        .eq('problem_id', problem.id)
        .eq('status', 'passed')
        .limit(1);
      isFirstSolve = !priorPass || priorPass.length === 0;
    }

    // Persist submission — only for active problems. Test submissions by
    // managers/admins against unpublished problems still run through the
    // judge and the client still renders the returned results, but the row
    // is not stored, so it disappears on reload and can never contribute to
    // the solver stats. With this rule in place, the submissions table only
    // ever contains rows for active problems, which is why the stat RPC
    // below no longer needs an is_active filter.
    //
    // `insertFailed` is the difference between "deliberately not stored"
    // (an inactive problem — the invariant above) and "should have been
    // stored and wasn't" (a constraint violation, a timeout, or an INSERT
    // policy that rejected the row). Only the second is a fault, and it must
    // reach the student: a green AC for a submission that no longer exists
    // after a reload is the worst possible outcome.
    let insertFailed = false;
    if (problem.is_active) {
      // THE SPLIT. `public.submissions` is world-readable (its SELECT policy is
      // `using (true)` to anon), and RLS filters rows, not columns — so every
      // column written here is published to every visitor. The public row
      // therefore carries only the REDACTED per-case array and a summary with
      // no compiler diagnostics; the source code, the full judge array and the
      // compile error go to `public.submission_private`, which only the owner
      // and active staff can read.
      //
      // `.select('id').single()` is new and required: the private row is keyed
      // by the public row's id, and the insert previously returned nothing.
      const { data: inserted, error: insertErr } = await supabase
        .from('submissions')
        .insert({
          problem_id: problem.id,
          user_id: userId,
          language,
          results: redactTestResults(data.results),
          summary: redactSummary(summaryForStorage),
        })
        .select('id, created_at')
        .single();

      if (insertErr || !inserted) {
        insertFailed = true;
        console.error('Submission insert error:', insertErr);
      } else {
        // PUBLIC ROW FIRST is forced by the FK: `submission_private.submission_id`
        // references `submissions(id)`, so the private row cannot exist before
        // its parent.
        const privateWritten = await writeSubmissionPrivate({
          submission_id: inserted.id,
          user_id: userId,
          code,
          results_full: data.results,
          compile_error: hasCompileError ? (data.compileError as string) : null,
          created_at: inserted.created_at ?? new Date().toISOString(),
        });

        if (!privateWritten) {
          // Compensate. A public row whose private half is missing is a
          // submission whose own author can never see their code or per-case
          // feedback — worse than no row at all, and it would still be scored.
          //
          // The compensating delete MUST go through the service role:
          // `submissions` has no owner DELETE policy, so the student's own
          // token would remove zero rows and report success, leaving exactly
          // the orphan this is meant to clean up. Check the result — a failed
          // compensation is the one case a human has to know about.
          const removed = await compensateFailedSubmission(inserted.id, userId);
          if (!removed) {
            console.error(
              `ORPHANED SUBMISSION ${inserted.id}: the private half failed to write and the ` +
                `compensating delete removed no row. The public row exists with no code and no ` +
                `per-case detail, and it will be counted by the stat RPCs. Remove it by hand.`,
            );
          }
          // `stored: false` covers both outcomes, and they differ: a successful
          // compensation leaves no row, a failed one leaves a public row with no
          // code. The client's banner is worded for that ambiguity rather than
          // asserting a history state the server could not establish.
          insertFailed = true;
        }
      }

      // Points and problems_solved recalculate only on a first solve, and only
      // when the row actually landed — recalculating against a submission that
      // was never stored would silently score a solve that has no row behind
      // it. `recalc_user_stats` does both recalculations in one guarded call
      // and raises 42501 when the caller is neither the target nor a manager.
      if (!insertFailed && isFirstSolve) {
        const { error: recalcErr } = await supabase.rpc('recalc_user_stats', { target: userId });
        if (recalcErr) {
          console.error(`recalc_user_stats failed for user ${userId}:`, recalcErr);
        }
      }
    }

    return NextResponse.json({
      // THE FULL ARRAY, deliberately — do NOT return the redacted row that was
      // just inserted. The caller is the submitter, this is their own code and
      // their own per-case output, and `SubmitClient` renders the expected vs
      // received detail straight from this response. A naive "return the
      // inserted row" would strip the owner's own feedback and make every
      // submission page show five keys and nothing to read.
      results: data.results,
      summary: summaryForStorage,
      // No row, no solve. Reporting a first solve for a submission that failed
      // to persist would credit points the recalculation never ran for.
      firstSolve: isFirstSolve && !insertFailed,
      // Present ONLY when persistence was attempted and failed. Its absence
      // means "stored" for an active problem and "deliberately not stored" for
      // an inactive one; clients render `stored === false` as
      // "graded but not recorded — contact staff".
      ...(insertFailed ? { stored: false } : {}),
      ...(hasCompileError ? { compileError: data.compileError } : {}),
      ...(typeof data?.effectiveMemoryLimitMb === 'number'
        ? { effectiveMemoryLimitMb: data.effectiveMemoryLimitMb }
        : {}),
    });
  } catch (err) {
    console.error('Submit error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
