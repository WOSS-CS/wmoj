import { NextRequest, NextResponse } from 'next/server';
import { getManagerSupabase } from '@/lib/managerAuth';
import { validateSlug } from '@/utils/validation';
import { checkContestProblemEligibility, validateContestCreate } from '@/lib/contestValidation';

export async function POST(request: NextRequest) {
  try {
    const auth = await getManagerSupabase(request);
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
          is_active: true,
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
        await supabase.from('contests').delete().eq('id', id);
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
