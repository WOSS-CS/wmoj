import { NextRequest, NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/adminAuth';
import {
  buildContestUpdates,
  checkContestProblemEligibility,
  findUnownedProblems,
} from '@/lib/contestValidation';

/**
 * `join_history` is `ON DELETE RESTRICT` on purpose — it is the permanent record
 * of who competed — so deleting a contest anyone has ever joined raises 23503.
 */
const FK_VIOLATION = '23503';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await getAdminSupabase(request);
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { supabase } = auth;
  const { data, error } = await supabase
    .from('contests')
    .select('id,name,description,length,is_active,created_at,updated_at,starts_at,ends_at,is_rated')
    .eq('id', id)
    .maybeSingle();
  if (error) {
    console.error('Fetch admin contest error:', error);
    return NextResponse.json({ error: 'Failed to fetch contest' }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ contest: data });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await getAdminSupabase(request);
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { supabase, user } = auth;

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { data: existing, error: existingError } = await supabase
    .from('contests')
    .select('is_active, is_rated, created_by, starts_at, ends_at')
    .eq('id', id)
    .maybeSingle();
  if (existingError) {
    console.error('Fetch admin contest error:', existingError);
    return NextResponse.json({ error: 'Failed to fetch contest' }, { status: 500 });
  }
  // `contests` is world-readable, so ownership — not visibility — is the gate here.
  // Admins may only touch their own contests; anything else is 404, never a false 200.
  if (!existing || existing.created_by !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  if (existing.is_active) return NextResponse.json({ error: 'Cannot edit an activated contest' }, { status: 403 });

  const built = buildContestUpdates(body, { starts_at: existing.starts_at, ends_at: existing.ends_at });
  if ('error' in built) return NextResponse.json({ error: built.error }, { status: built.status });
  const { updates } = built;

  if (Object.keys(updates).length === 0 && body.problem_ids === undefined) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  // ---- Everything below is validation; the first write happens after it. ----
  let toAdd: string[] = [];
  let toRemove: string[] = [];

  if (Array.isArray(body.problem_ids)) {
    const problemIds: string[] = body.problem_ids;

    const { data: current, error: currentError } = await supabase
      .from('contest_problems')
      .select('problem_id')
      .eq('contest_id', id);
    if (currentError) {
      console.error('Fetch contest problems error:', currentError);
      return NextResponse.json({ error: 'Failed to load contest problems' }, { status: 500 });
    }
    const currentIds = (current || []).map((r: { problem_id: string }) => r.problem_id);
    const currentSet = new Set(currentIds);

    toRemove = currentIds.filter((pid: string) => !problemIds.includes(pid));
    toAdd = problemIds.filter(pid => !currentSet.has(pid));

    const ownership = await findUnownedProblems(supabase, [...new Set([...toAdd, ...toRemove])], user.id);
    if ('error' in ownership) return NextResponse.json({ error: ownership.error }, { status: 500 });
    if (ownership.unowned.length > 0) {
      return NextResponse.json(
        {
          error: 'You can only add or remove problems you created',
          problem_ids: ownership.unowned,
        },
        { status: 403 },
      );
    }

    // Flipping is_rated false → true must re-validate the problems already
    // attached, not just the new ones — otherwise Invariant 3 is bypassable by
    // ticking "Rated" without touching the problem list.
    const isRatedAfter = body.is_rated !== undefined ? !!body.is_rated : !!existing.is_rated;
    const becameRated = isRatedAfter && !existing.is_rated;
    const idsToValidate = becameRated ? [...new Set([...currentIds, ...toAdd])] : toAdd;

    const eligibility = await checkContestProblemEligibility(supabase, {
      contestId: id,
      problemIds: idsToValidate,
      isRated: isRatedAfter,
    });
    if (eligibility) return NextResponse.json({ error: eligibility.error }, { status: eligibility.status });
  }

  // ---- Writes ----
  let data = null;
  if (Object.keys(updates).length > 0) {
    const result = await supabase
      .from('contests')
      .update(updates)
      .eq('id', id)
      .eq('created_by', user.id)
      .select()
      .maybeSingle();
    if (result.error) {
      console.error('Update contest error:', result.error);
      return NextResponse.json({ error: 'Failed to update contest' }, { status: 500 });
    }
    if (!result.data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    data = result.data;
  }

  if (toRemove.length > 0) {
    const { error: removeError } = await supabase
      .from('contest_problems')
      .delete()
      .eq('contest_id', id)
      .in('problem_id', toRemove);
    if (removeError) {
      console.error('Remove contest problems error:', removeError);
      return NextResponse.json({ error: 'Failed to update contest problems' }, { status: 500 });
    }
  }

  if (toAdd.length > 0) {
    const rows = toAdd.map(pid => ({ contest_id: id, problem_id: pid }));
    const { data: inserted, error: cpError } = await supabase
      .from('contest_problems')
      .insert(rows)
      .select('problem_id');
    if (cpError) {
      console.error('Problem assignment error:', cpError);
      return NextResponse.json({ error: 'Failed to update contest problems' }, { status: 500 });
    }
    if ((inserted || []).length !== rows.length) {
      return NextResponse.json({ error: 'Failed to update contest problems' }, { status: 500 });
    }
  }

  // A problem-list-only PATCH performs no `contests` UPDATE, so re-read the row
  // rather than answering `{ contest: null }` — callers check the payload, not
  // just `res.ok`.
  if (!data) {
    const { data: refreshed } = await supabase
      .from('contests')
      .select('id,name,description,length,is_active,created_at,updated_at,starts_at,ends_at,is_rated')
      .eq('id', id)
      .maybeSingle();
    data = refreshed;
  }

  return NextResponse.json({ contest: data });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await getAdminSupabase(request);
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { supabase, user } = auth;

  const { data: existing, error: existingError } = await supabase
    .from('contests')
    .select('is_active, created_by')
    .eq('id', id)
    .maybeSingle();
  if (existingError) {
    console.error('Fetch admin contest error:', existingError);
    return NextResponse.json({ error: 'Failed to fetch contest' }, { status: 500 });
  }
  if (!existing || existing.created_by !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  if (existing.is_active) return NextResponse.json({ error: 'Cannot delete an activated contest' }, { status: 403 });

  // contest_problems, contest_participants and countdown_timers cascade.
  const { data, error } = await supabase
    .from('contests')
    .delete()
    .eq('id', id)
    .eq('created_by', user.id)
    .select('id');

  if (error) {
    if (error.code === FK_VIOLATION) {
      return NextResponse.json(
        { error: 'This contest has participation history and cannot be deleted; deactivate it instead' },
        { status: 409 },
      );
    }
    console.error('Delete contest error:', error);
    return NextResponse.json({ error: 'Failed to delete contest' }, { status: 500 });
  }
  if (!data || data.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({ success: true });
}
