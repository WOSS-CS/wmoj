import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabaseServer';

export async function POST(request: NextRequest) {
  try {
    const { name, content, contest, input, output } = await request.json();

    if (!name || !content || !input || !output) {
      return NextResponse.json(
        { error: 'Name, content, input, and output are required' },
        { status: 400 }
      );
    }

    // Validate that input and output are arrays
    if (!Array.isArray(input) || !Array.isArray(output)) {
      return NextResponse.json(
        { error: 'Input and output must be arrays' },
        { status: 400 }
      );
    }

    // Validate that input and output arrays have the same length
    if (input.length !== output.length) {
      return NextResponse.json(
        { error: 'Input and output arrays must have the same length' },
        { status: 400 }
      );
    }

    // Validate that input and output arrays are not empty
    if (input.length === 0) {
      return NextResponse.json(
        { error: 'At least one test case is required' },
        { status: 400 }
      );
    }

    const supabase = await getServerSupabase();

    // Fetch current user (session context via cookies). If no user, reject.
    const {
      data: { user: authUser },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify admin membership explicitly to provide clearer feedback before hitting RLS.
    const { data: adminRow, error: adminErr } = await supabase
      .from('admins')
      .select('id, is_active')
      .eq('id', authUser.id)
      .maybeSingle();

    if (adminErr) {
      console.error('Admin lookup error:', adminErr);
      return NextResponse.json({ error: 'Authorization check failed' }, { status: 500 });
    }
    if (!adminRow || adminRow.is_active === false) {
      return NextResponse.json({ error: 'Forbidden: admin access required' }, { status: 403 });
    }
    
    const { data, error } = await supabase
      .from('problems')
      .insert([
        {
          name,
          content,
          contest: contest || null,
          input,
          output
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to create problem' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { 
        success: true, 
        problem: data,
        message: 'Problem created successfully' 
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create problem error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
