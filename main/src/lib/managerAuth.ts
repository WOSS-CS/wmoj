import { NextRequest } from 'next/server';
import { getServerSupabase, getServerSupabaseFromToken } from '@/lib/supabaseServer';

/**
 * The single manager auth preamble for `app/api/manager/**` route handlers.
 * Accepts a Bearer token (scheme compared case-insensitively, per RFC 7235)
 * and falls back to the cookie session.
 *
 * Membership alone is not authorization: the row must have `is_active = true`,
 * matching the `is_manager()` RLS helper and `lib/staffAuth.ts`. A SQL `NULL`
 * therefore reads as inactive here, exactly as it does in the database.
 */
export async function getManagerSupabase(request: NextRequest) {
    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
    const bearerToken = authHeader?.toLowerCase().startsWith('bearer ')
        ? authHeader.substring(7).trim()
        : null;
    const supabase = bearerToken ? getServerSupabaseFromToken(bearerToken) : await getServerSupabase();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return { error: 'Unauthorized', status: 401 };

    const { data: managerRow, error: managerErr } = await supabase
        .from('managers')
        .select('id')
        .eq('id', user.id)
        .eq('is_active', true)
        .maybeSingle();

    if (managerErr) return { error: 'Authorization check failed', status: 500 };
    if (!managerRow) return { error: 'Forbidden', status: 403 };

    return { supabase, user };
}
