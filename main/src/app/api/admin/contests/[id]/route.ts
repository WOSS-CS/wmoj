import { NextRequest, NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/adminAuth';
import {
  applyContestProblemChanges,
  buildContestUpdates,
  planContestProblemChanges,
  type ContestProblemChanges,
} from '@/lib/contestValidation';
import {
  CONTEST_DELETE_GUARD_COLUMNS,
  CONTEST_EDIT_COLUMNS,
  CONTEST_WRITE_GUARD_COLUMNS,
} from '@/lib/queries/contests';
import { STAFF_POLICY } from '@/lib/staffPolicy';

/**
 * `join_history` is `ON DELETE RESTRICT` on purpose — it is the permanent record
 * of who competed — so deleting a contest anyone has ever joined raises 23503.
 */
const FK_VIOLATION = '23503';

// Every difference between this route and its twin in the other staff tree is
// read from here — nothing else may differ.
const POLICY = STAFF_POLICY.admin;

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await getAdminSupabase(request);
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { supabase } = auth;
  const { data, error } = await supabase
    .from('contests')
    .select(CONTEST_EDIT_COLUMNS)
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
    .select(CONTEST_WRITE_GUARD_COLUMNS)
    .eq('id', id)
    .maybeSingle();
  if (existingError) {
    console.error('Fetch admin contest error:', existingError);
    return NextResponse.json({ error: 'Failed to fetch contest' }, { status: 500 });
  }
  // `contests` is world-readable, so under `scopeToOwner` ownership — not
  // visibility — is the gate: anything this caller does not own is 404, never a
  // false 200.
  if (!existing || (POLICY.scopeToOwner && existing.created_by !== user.id)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  // `guardActivatedContest`: only a manager may edit a contest that is already live.
  if (POLICY.guardActivatedContest && existing.is_active) {
    return NextResponse.json({ error: 'Cannot edit an activated contest' }, { status: 403 });
  }

  const built = buildContestUpdates(body, { starts_at: existing.starts_at, ends_at: existing.ends_at });
  if ('error' in built) return NextResponse.json({ error: built.error }, { status: built.status });
  const { updates } = built;

  // Publishing is the manager's alone (`mayPublish`); `buildContestUpdates` never
  // touches `is_active`, so an admin's `is_active` is ignored rather than rejected.
  if (POLICY.mayPublish && body.is_active !== undefined) updates.is_active = !!body.is_active;

  if (Object.keys(updates).length === 0 && body.problem_ids === undefined) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  // ---- Everything below is validation; the first write happens after it. ----
  // `ownerId` runs the problem-ownership gate, which only `scopeToOwner` wants:
  // the manager `contest_problems` policies already cover every problem.
  let changes: ContestProblemChanges = { toAdd: [], toRemove: [] };

  if (Array.isArray(body.problem_ids)) {
    const planned = await planContestProblemChanges(supabase, {
      contestId: id,
      problemIds: body.problem_ids as string[],
      isRated: body.is_rated !== undefined ? !!body.is_rated : !!existing.is_rated,
      wasRated: !!existing.is_rated,
      ownerId: POLICY.scopeToOwner ? user.id : undefined,
    });
    if ('error' in planned) {
      const { status, ...payload } = planned;
      return NextResponse.json(payload, { status });
    }
    changes = planned.changes;
  }

  // ---- Writes ----
  let data = null;
  if (Object.keys(updates).length > 0) {
    let update = supabase
      .from('contests')
      .update(updates)
      .eq('id', id);
    if (POLICY.scopeToOwner) update = update.eq('created_by', user.id);
    const result = await update.select().maybeSingle();
    if (result.error) {
      console.error('Update contest error:', result.error);
      return NextResponse.json({ error: 'Failed to update contest' }, { status: 500 });
    }
    if (!result.data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    data = result.data;
  }

  const applyError = await applyContestProblemChanges(supabase, id, changes);
  if (applyError) {
    return NextResponse.json({ error: applyError.error }, { status: applyError.status });
  }

  // A problem-list-only PATCH performs no `contests` UPDATE, so re-read the row
  // rather than answering `{ contest: null }` — callers check the payload, not
  // just `res.ok`.
  if (!data) {
    const { data: refreshed } = await supabase
      .from('contests')
      .select(CONTEST_EDIT_COLUMNS)
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
    .select(CONTEST_DELETE_GUARD_COLUMNS)
    .eq('id', id)
    .maybeSingle();
  if (existingError) {
    console.error('Fetch admin contest error:', existingError);
    return NextResponse.json({ error: 'Failed to fetch contest' }, { status: 500 });
  }
  if (!existing || (POLICY.scopeToOwner && existing.created_by !== user.id)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  // `guardActivatedContest`: only a manager may delete a contest that is already live.
  if (POLICY.guardActivatedContest && existing.is_active) {
    return NextResponse.json({ error: 'Cannot delete an activated contest' }, { status: 403 });
  }

  // contest_problems, contest_participants and countdown_timers cascade.
  let remove = supabase
    .from('contests')
    .delete()
    .eq('id', id);
  if (POLICY.scopeToOwner) remove = remove.eq('created_by', user.id);
  const { data, error } = await remove.select('id');

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
