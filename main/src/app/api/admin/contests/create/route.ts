import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase, getServerSupabaseFromToken } from '@/lib/supabaseServer';

export async function POST(request: NextRequest) {
  try {
    const { name, description, length } = await request.json();

    if (!name || !description || !length) {
      return NextResponse.json(
        { error: 'Name, description, and length are required' },
        { status: 400 }
      );
    }

    if (length < 1 || length > 1440) {
      return NextResponse.json(
        { error: 'Length must be between 1 and 1440 minutes' },
        { status: 400 }
      );
    }

    // Try header bearer token first, fallback to cookie based session
    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
    const bearerToken = authHeader?.toLowerCase().startsWith('bearer ')
      ? authHeader.substring(7).trim()
      : null;

    const supabase = bearerToken
      ? getServerSupabaseFromToken(bearerToken)
      : await getServerSupabase();

    // Current user
    const { data: userResp, error: userErr } = await supabase.auth.getUser();
    const authUser = userResp?.user;
    if (userErr || !authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify admin membership
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
      .from('contests')
      .insert([
        {
          name,
          description,
          length,
          is_active: true
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
