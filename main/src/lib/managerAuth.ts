import type { NextRequest } from 'next/server';
import { getStaffSupabase, type StaffRouteAuth } from '@/lib/staffAuth';

/**
 * The single manager auth preamble for `app/api/manager/**` route handlers.
 *
 * Membership alone is not authorization: the row must have `is_active = true`,
 * matching the `is_manager()` RLS helper. The check itself lives in
 * `lib/staffAuth.ts` so the admin and manager trees run the same code rather than
 * two copies that agree only by inspection.
 */
export function getManagerSupabase(request: NextRequest): Promise<StaffRouteAuth> {
    return getStaffSupabase(request, 'managers');
}
