import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase, getServerSupabaseFromToken } from '@/lib/supabaseServer';

export async function POST(request: NextRequest) {
  try {
    // Try header bearer token first (explicit), fall back to cookie-based session.
    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
    const bearerToken = authHeader?.toLowerCase().startsWith('bearer ')
      ? authHeader.substring(7).trim()
      : null;

    const supabase = bearerToken
      ? getServerSupabaseFromToken(bearerToken)
      : await getServerSupabase();

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

    // Expect multipart/form-data with file (C++ source)
    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'file field is required' }, { status: 400 });
    }
    const source = await file.text();
    if (!source || source.trim().length === 0) {
      return NextResponse.json({ error: 'Uploaded file is empty' }, { status: 400 });
    }

    // Call judge service using existing env var pattern
    const JUDGE_URL = process.env.NEXT_PUBLIC_JUDGE_URL || 'http://localhost:4001';
    const resp = await fetch(`${JUDGE_URL}/generate-tests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ language: 'cpp', code: source }),
    });
    const data = await resp.json();

    if (!resp.ok) {
      // Surface judge errors with any available raw JSON for debugging on UI
      return NextResponse.json(
        { error: data?.error || 'Judge error', inputRaw: data?.inputJson, outputRaw: data?.outputJson },
        { status: resp.status || 500 }
      );
    }

    // Return both parsed arrays and unmodified raw strings for UI preview/debugging
    return NextResponse.json({
      input: data?.input,
      output: data?.output,
      inputRaw: data?.inputJson,
      outputRaw: data?.outputJson,
    });
  } catch (error) {
    console.error('Generator generate error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


