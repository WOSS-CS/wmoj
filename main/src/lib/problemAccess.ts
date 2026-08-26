import type { SupabaseClient } from '@supabase/supabase-js';
import { isActiveAdmin, isActiveManager } from '@/lib/staffAuth';

export async function canUserAccessProblem(
  supabase: SupabaseClient,
  problem: { is_active: boolean | null; created_by: string | null },
  userId: string | null,
): Promise<boolean> {
  if (problem.is_active === true) return true;
  if (!userId) return false;

  // Membership alone is not authorization — a deactivated manager must lose
  // access to unpublished problems (statement, tests, checker) like anyone else.
  if (await isActiveManager(supabase, userId)) return true;

  if (problem.created_by === userId && (await isActiveAdmin(supabase, userId))) {
    return true;
  }

  return false;
}
