import { NextRequest } from 'next/server';
import { getServerSupabase, getServerSupabaseFromToken } from '@/lib/supabaseServer';

export async function getAdminSupabase(request: NextRequest) {
    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
    const bearerToken = authHeader?.toLowerCase().startsWith('bearer ')
        ? authHeader.substring(7).trim()
        : null;
    const supabase = bearerToken ? getServerSupabaseFromToken(bearerToken) : await getServerSupabase();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return { error: 'Unauthorized', status: 401 };

    const { data: adminRow, error: adminErr } = await supabase
        .from('admins')
        .select('id, is_active')
        .eq('id', user.id)
        .maybeSingle();

    if (adminErr) return { error: 'Authorization check failed', status: 500 };
    if (!adminRow) return { error: 'Forbidden', status: 403 };

    // existing code in list/route.ts checked is_active, but my exploration of user.ts didn't show is_active on admins table interface explicitly? 
    // However, list/route.ts used it: if (!adminRow || adminRow.is_active === false)
    // I should probably support it if it exists.
    // Actually, let's stick to what list/route.ts did exactly.
    if (adminRow.is_active === false) return { error: 'Forbidden', status: 403 };

    return { supabase, user };
}
