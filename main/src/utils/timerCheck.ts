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
      // Timer expired: clean up the timer and mark the user as having left.
      // supabase-js resolves with `{ error }` rather than throwing, so each
      // write's error must be read — a wrapping try/catch here caught nothing
      // and the two deletes silently discarded their results entirely.
      const [timerDelete, participantDelete, leftAtUpdate] = await Promise.all([
        supabase
          .from('countdown_timers')
          .delete()
          .eq('user_id', userId)
          .eq('contest_id', contestId),
        // Remove from active participants so UI shows spectator state
        supabase
          .from('contest_participants')
          .delete()
          .eq('user_id', userId)
          .eq('contest_id', contestId),
        // Record left_at for join history.
        // Must be an update, not an upsert: the row is created on join, and the
        // uniqueness here is (user_id, contest_id) while the primary key is id,
        // so an upsert either raises 23505 or inserts a bogus history row with a
        // wrong joined_at and is_virtual.
        // `.select()` is what makes a refusal visible: an UPDATE filtered away
        // by RLS reports no error, just zero rows. Checking only `.error` is
        // how left_at silently stayed NULL for every row in the first place.
        supabase
          .from('join_history')
          .update({ left_at: new Date().toISOString() })
          .eq('user_id', userId)
          .eq('contest_id', contestId)
          .select('id'),
      ]);

      if (timerDelete.error) {
        console.error('Error cleaning up expired countdown timer:', timerDelete.error);
      }
      if (participantDelete.error) {
        console.error('Error removing expired contest participant:', participantDelete.error);
      }
      if (leftAtUpdate.error) {
        console.error('Error recording join history left_at:', leftAtUpdate.error);
      } else if ((leftAtUpdate.data ?? []).length === 0) {
        console.error(
          '[timerCheck] join_history left_at matched no row for',
          { userId, contestId },
        );
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
