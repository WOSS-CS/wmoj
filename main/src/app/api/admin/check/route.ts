import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabaseFromToken } from '@/lib/supabaseServer';
import { checkActiveAdmin } from '@/lib/staffAuth';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
    // RFC 7235 defines the auth scheme as case-insensitive; the rest of the tree
    // lowercases before comparing, so this one must too.
    const token = authHeader?.toLowerCase().startsWith('bearer ')
      ? authHeader.substring(7).trim()
      : null;
    if (!token) {
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      );
    }

    // An `admins` row is not authorization on its own — `is_active` must be
    // true. `checkActiveAdmin` is the non-throwing variant; `requireActive*`
    // throws a redirect, which is wrong in a route handler.
    const result = await checkActiveAdmin(getServerSupabaseFromToken(token));

    if (!result.ok) {
      if (result.reason === 'unauthenticated') {
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
      }
      if (result.reason === 'error') {
        return NextResponse.json({ error: 'Authorization check failed' }, { status: 500 });
      }
      return NextResponse.json({ error: 'User is not an admin' }, { status: 403 });
    }

    return NextResponse.json(
      {
        isAdmin: true,
        userId: result.userId
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Admin check error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
