import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabaseFromToken } from '@/lib/supabaseServer';
import { getJudgeSharedSecret } from '@/lib/env';
import { checkTimerExpiry } from '@/utils/timerCheck';
import { getContestStatus } from '@/utils/contestStatus';
import { canUserAccessProblem } from '@/lib/problemAccess';

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

    // Fetch problem
    const { data: problem, error: probErr } = await supabase
      .from('problems')
      .select('id, input, output, time_limit, memory_limit, is_active, created_by, checker')
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

    // Check if problem is part of any ongoing contest
    const { data: cpRows } = await supabase
      .from('contest_problems')
      .select('contest_id')
      .eq('problem_id', id);

    const contestIds = (cpRows || []).map((r: { contest_id: string }) => r.contest_id);

    if (contestIds.length > 0) {
      const { data: contests } = await supabase
        .from('contests')
        .select('id, is_active, starts_at, ends_at')
        .in('id', contestIds);

      const ongoingContests = (contests || []).filter(
        c => getContestStatus(c as { is_active: boolean; starts_at: string | null; ends_at: string | null }) === 'ongoing'
      );

      if (ongoingContests.length > 0) {
        let hasAccess = false;
        for (const contest of ongoingContests) {
          const { data: participant } = await supabase
            .from('contest_participants')
            .select('user_id')
            .eq('user_id', userId)
            .eq('contest_id', contest.id)
            .maybeSingle();

          if (participant) {
            const { expired } = await checkTimerExpiry(supabase, userId, contest.id);
            if (expired) {
              return NextResponse.json({ error: 'Contest time has expired' }, { status: 403 });
            }
            hasAccess = true;
            break;
          }
        }

        if (!hasAccess) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
      }
    }

    const body = await request.json();
    const { language, code } = body || {};
    if (!language || !code) {
      return NextResponse.json({ error: 'Missing language or code' }, { status: 400 });
    }

    // Custom checker (optional). Only a non-empty source counts: a problem
    // with no checker must send the judge exactly the payload it sent before
    // this feature existed, so the key is omitted rather than sent as null.
    const checkerSource =
      typeof problem.checker === 'string' && problem.checker.trim().length > 0
        ? problem.checker
        : null;

    // Call judge service
    const JUDGE_URL = process.env.NEXT_PUBLIC_JUDGE_URL || 'http://localhost:4001';
    const resp = await fetch(`${JUDGE_URL}/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Judge-Token': getJudgeSharedSecret(),
      },
      body: JSON.stringify({
        language,
        code,
        input: problem.input,
        output: problem.output,
        timeLimit: problem.time_limit || 5000,
        memoryLimit: problem.memory_limit || 256,
        ...(checkerSource ? { checker: checkerSource } : {})
      }),
    });
    const data = await resp.json();
    if (!resp.ok) {
      return NextResponse.json({ error: data?.error || 'Judge error' }, { status: resp.status || 500 });
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
    // ever contains rows for active problems, which is why the stat RPCs
    // below no longer need an is_active filter.
    if (problem.is_active) {
      const { error: insertErr } = await supabase
        .from('submissions')
        .insert({
          problem_id: problem.id,
          user_id: userId,
          language,
          code,
          input: problem.input,
          output: problem.output,
          results: data.results,
          summary: summaryForStorage,
        });

      if (insertErr) {
        console.error('Submission insert error:', insertErr);
      }

      if (isFirstSolve) {
        await supabase.rpc('recalculate_problems_solved', { uid: userId });
        await supabase.rpc('recalculate_user_points', { uid: userId });
      }
    }

    return NextResponse.json({
      results: data.results,
      summary: summaryForStorage,
      firstSolve: isFirstSolve,
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
