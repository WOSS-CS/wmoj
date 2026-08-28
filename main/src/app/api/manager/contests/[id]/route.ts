import { NextRequest, NextResponse } from 'next/server';
import { getManagerSupabase } from '@/lib/managerAuth';
import {
  applyContestProblemChanges,
  buildContestUpdates,
  planContestProblemChanges,
  type ContestProblemChanges,
} from '@/lib/contestValidation';

/**
 * `join_history` is `ON DELETE RESTRICT` on purpose — it is the permanent record
 * of who competed — so deleting a contest anyone has ever joined raises 23503.
 */
const FK_VIOLATION = '23503';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await getManagerSupabase(request);
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { supabase } = auth;
  const { data, error } = await supabase
    .from('contests')
    .select('id, name, description, length, is_active, created_at, updated_at, starts_at, ends_at, is_rated')
    .eq('id', id)
    .maybeSingle();
  if (error) {
    console.error('Fetch manager contest error:', error);
    return NextResponse.json({ error: 'Failed to fetch contest' }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ contest: data });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await getManagerSupabase(request);
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { supabase } = auth;

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  // Deliberately unscoped by `created_by`, and deliberately without an
  // activated-contest guard: managers own every contest and are the only role
  // allowed to edit one that is already live.
  const { data: existing, error: existingError } = await supabase
    .from('contests')
    .select('is_rated, starts_at, ends_at')
    .eq('id', id)
    .maybeSingle();
  if (existingError) {
    console.error('Fetch manager contest error:', existingError);
    return NextResponse.json({ error: 'Failed to fetch contest' }, { status: 500 });
  }
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const built = buildContestUpdates(body, { starts_at: existing.starts_at, ends_at: existing.ends_at });
  if ('error' in built) return NextResponse.json({ error: built.error }, { status: built.status });
  const { updates } = built;

  if (body.is_active !== undefined) updates.is_active = !!body.is_active;

  if (Object.keys(updates).length === 0 && body.problem_ids === undefined) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  // ---- Everything below is validation; the first write happens after it. ----
  // No `ownerId`: the manager `contest_problems` policies cover every problem,
  // so the admin twin's ownership gate is deliberately absent here.
  let changes: ContestProblemChanges = { toAdd: [], toRemove: [] };

  if (Array.isArray(body.problem_ids)) {
    const planned = await planContestProblemChanges(supabase, {
      contestId: id,
      problemIds: body.problem_ids as string[],
      isRated: body.is_rated !== undefined ? !!body.is_rated : !!existing.is_rated,
      wasRated: !!existing.is_rated,
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
    const result = await supabase
      .from('contests')
      .update(updates)
      .eq('id', id)
      .select()
      .maybeSingle();
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
      .select('id,name,description,length,is_active,created_at,updated_at,starts_at,ends_at,is_rated')
      .eq('id', id)
      .maybeSingle();
    data = refreshed;
  }

  return NextResponse.json({ contest: data });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await getManagerSupabase(request);
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { supabase } = auth;

  // contest_problems, contest_participants and countdown_timers cascade.
  const { data, error } = await supabase
    .from('contests')
    .delete()
    .eq('id', id)
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
