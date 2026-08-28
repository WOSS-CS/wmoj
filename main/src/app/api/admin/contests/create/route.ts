import { NextRequest, NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/adminAuth';
import { validateSlug } from '@/utils/validation';
import {
  checkContestProblemEligibility,
  findUnownedProblems,
  validateContestCreate,
} from '@/lib/contestValidation';
import { STAFF_POLICY } from '@/lib/staffPolicy';

// Every difference between this route and its twin in the other staff tree is
// read from here — nothing else may differ.
const POLICY = STAFF_POLICY.admin;

export async function POST(request: NextRequest) {
  try {
    const auth = await getAdminSupabase(request);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const { supabase, user } = auth;

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    const { id, problem_ids } = body;

    const slugError = validateSlug(id, 'Contest');
    if (slugError) {
      return NextResponse.json({ error: slugError }, { status: 400 });
    }

    const validated = validateContestCreate(body);
    if ('error' in validated) {
      return NextResponse.json({ error: validated.error }, { status: validated.status });
    }
    const { values } = validated;

    // Check uniqueness of contest ID
    const { data: existing } = await supabase.from('contests').select('id').eq('id', id).maybeSingle();
    if (existing) {
      return NextResponse.json({ error: 'A contest with this ID already exists' }, { status: 409 });
    }

    // ---- Validate the problem selection before inserting anything. There is no
    // transaction here, so a rejection after the insert would strand an empty
    // contest and make the retry collide with its own 409. ----
    const selectedIds: string[] = Array.isArray(problem_ids) ? [...new Set<string>(problem_ids)] : [];

    if (selectedIds.length > 0) {
      // `scopeToOwner`: a caller who only owns their own problems may only put
      // their own problems in a contest. Managers own everything, so they skip it.
      if (POLICY.scopeToOwner) {
        const ownership = await findUnownedProblems(supabase, selectedIds, user.id);
        if ('error' in ownership) return NextResponse.json({ error: ownership.error }, { status: 500 });
        if (ownership.unowned.length > 0) {
          return NextResponse.json(
            { error: 'You can only add problems you created', problem_ids: ownership.unowned },
            { status: 403 },
          );
        }
      }

      const eligibility = await checkContestProblemEligibility(supabase, {
        contestId: null,
        problemIds: selectedIds,
        isRated: values.is_rated,
      });
      if (eligibility) {
        return NextResponse.json({ error: eligibility.error }, { status: eligibility.status });
      }
    }

    const { data, error } = await supabase
      .from('contests')
      .insert([
        {
          id,
          name: values.name,
          description: values.description,
          length: values.length,
          // `createsPending`: admin contests land pending, manager contests go live.
          is_active: !POLICY.createsPending,
          created_by: user.id,
          starts_at: values.starts_at,
          ends_at: values.ends_at,
          is_rated: values.is_rated,
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to create contest' },
        { status: 500 }
      );
    }

    if (selectedIds.length > 0) {
      const rows = selectedIds.map((pid: string) => ({ contest_id: id, problem_id: pid }));
      const { data: inserted, error: cpError } = await supabase
        .from('contest_problems')
        .insert(rows)
        .select('problem_id');

      if (cpError || (inserted || []).length !== rows.length) {
        console.error('Problem assignment error:', cpError);
        // Nothing here is transactional, so roll the contest back by hand rather
        // than leaving a problem-less contest behind a 500.
        let rollback = supabase.from('contests').delete().eq('id', id);
        if (POLICY.scopeToOwner) rollback = rollback.eq('created_by', user.id);
        await rollback;
        return NextResponse.json(
          { error: 'Failed to assign problems to the contest' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      {
        success: true,
        contest: data,
        message: 'Contest created successfully'
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create contest error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
