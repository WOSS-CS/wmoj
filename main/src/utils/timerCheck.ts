import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Check if a user's contest timer has expired
 * @param supabase - Supabase client instance
 * @param userId - User ID
 * @param contestId - Contest ID
 * @returns Promise<{ expired: boolean; remainingSeconds?: number }>
 */
export async function checkTimerExpiry(
  supabase: SupabaseClient,
  userId: string,
  contestId: string
): Promise<{ expired: boolean; remainingSeconds?: number }> {
  try {
    const { data: timer, error } = await supabase
      .from('countdown_timers')
      .select('started_at, duration_minutes, is_active')
      .eq('user_id', userId)
      .eq('contest_id', contestId)
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      console.error('Error checking timer expiry:', error);
      return { expired: true }; // Fail safe - assume expired on error
    }

    if (!timer) {
      return { expired: true }; // No timer found - assume expired
    }

    const startTime = new Date(timer.started_at).getTime();
    const now = Date.now();
    const elapsedSeconds = Math.floor((now - startTime) / 1000);
    const totalDurationSeconds = timer.duration_minutes * 60;
    const remainingSeconds = Math.max(0, totalDurationSeconds - elapsedSeconds);

    return {
      expired: remainingSeconds <= 0,
      remainingSeconds
    };
  } catch (error) {
    console.error('Error in checkTimerExpiry:', error);
    return { expired: true }; // Fail safe - assume expired on error
  }
}

/**
 * Get timer status for a user and contest
 * @param supabase - Supabase client instance
 * @param userId - User ID
 * @param contestId - Contest ID
 * @returns Promise<{ isActive: boolean; remainingSeconds?: number; contestName?: string }>
 */
export async function getTimerStatus(
  supabase: SupabaseClient,
  userId: string,
  contestId: string
): Promise<{ isActive: boolean; remainingSeconds?: number; contestName?: string }> {
  try {
    const { data: timer, error } = await supabase
      .from('countdown_timers')
      .select('started_at, duration_minutes, is_active')
      .eq('user_id', userId)
      .eq('contest_id', contestId)
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      console.error('Error getting timer status:', error);
      return { isActive: false };
    }

    if (!timer) {
      return { isActive: false };
    }

    const startTime = new Date(timer.started_at).getTime();
    const now = Date.now();
    const elapsedSeconds = Math.floor((now - startTime) / 1000);
    const totalDurationSeconds = timer.duration_minutes * 60;
    const remainingSeconds = Math.max(0, totalDurationSeconds - elapsedSeconds);

    if (remainingSeconds <= 0) {
      // Timer expired, clean up timer and mark user as having left the contest
      try {
        await supabase
          .from('countdown_timers')
          .delete()
          .eq('user_id', userId)
          .eq('contest_id', contestId);
      } catch (e) {
        console.warn('Timer cleanup failed:', e);
      }
      try {
        // Remove from active participants so UI shows spectator state
        await supabase
          .from('contest_participants')
          .delete()
          .eq('user_id', userId)
          .eq('contest_id', contestId);
      } catch (e) {
        console.warn('Participant cleanup failed:', e);
      }
      try {
        // Record left_at for join history (best-effort)
        await supabase
          .from('join_history')
          .upsert({ user_id: userId, contest_id: contestId, left_at: new Date().toISOString() });
      } catch (e) {
        console.warn('Join history left_at upsert failed:', e);
      }
      return { isActive: false };
    }

    // Get contest name
    const { data: contest } = await supabase
      .from('contests')
      .select('name')
      .eq('id', contestId)
      .single();

    return {
      isActive: true,
      remainingSeconds,
      contestName: contest?.name
    };
  } catch (error) {
    console.error('Error in getTimerStatus:', error);
    return { isActive: false };
  }
}
