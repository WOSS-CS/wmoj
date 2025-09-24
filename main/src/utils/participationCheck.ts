import { supabase } from '@/lib/supabase';

export async function checkContestParticipation(userId: string, contestId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('contest_participants')
      .select('id')
      .eq('user_id', userId)
      .eq('contest_id', contestId)
      .maybeSingle();

    if (error) {
      console.error('Error checking contest participation:', error);
      return false;
    }

    return !!data;
  } catch (error) {
    console.error('Error checking contest participation:', error);
    return false;
  }
}

export async function getContestIdForProblem(problemId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('problems')
      .select('contest')
      .eq('id', problemId)
      .maybeSingle();

    if (error) {
      console.error('Error getting contest for problem:', error);
      return null;
    }

    return data?.contest || null;
  } catch (error) {
    console.error('Error getting contest for problem:', error);
    return null;
  }
}
