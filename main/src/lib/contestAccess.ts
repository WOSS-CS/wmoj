import type { AppSupabaseClient } from '@/types/supabase';
import { isActiveAdmin, isActiveManager } from '@/lib/staffAuth';

export async function canUserAccessContest(
  supabase: AppSupabaseClient,
  contest: { is_active: boolean | null; created_by: string | null },
  userId: string | null,
): Promise<boolean> {
  if (contest.is_active === true) return true;
  if (!userId) return false;

  // Membership alone is not authorization — a deactivated manager must lose
  // access to pending contests like anyone else.
  if (await isActiveManager(supabase, userId)) return true;

  if (contest.created_by === userId && (await isActiveAdmin(supabase, userId))) {
    return true;
  }

  return false;
}
