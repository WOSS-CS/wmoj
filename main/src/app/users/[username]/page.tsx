import { notFound } from 'next/navigation';
import { getServerSupabase } from '@/lib/supabaseServer';
import { isValidUsername } from '@/utils/validation';
import UserProfileClient from './UserProfileClient';
import type { HeatmapDay } from '@/components/SubmissionHeatmap';

interface ProfileData {
  id: string;
  username: string;
  created_at: string;
  about_me: string | null;
  problems_solved: number;
  points: number;
  contests_written: number;
  avatarUrl: string;
}

/**
 * Ceiling on the heatmap query. The grid can only ever render the trailing 365
 * days or one selected year back to the account-creation year, so the query is
 * bounded at the account's own creation date and capped in rows — a heavy user's
 * entire submission history no longer lands in the Vercel function on every
 * anonymous profile view. Newest-first, so if the cap ever bites it truncates the
 * oldest years rather than an arbitrary slice.
 */
const HEATMAP_ROW_LIMIT = 10000;

export default async function UserProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const supabase = await getServerSupabase();

  // Nothing outside the username format can name a user, and rejecting it here
  // also keeps LIKE metacharacters out of the pattern below.
  if (!isValidUsername(username)) notFound();

  // Uniqueness is enforced case-insensitively (`users_username_lower_key`) and
  // `is_username_taken` lowercases both sides, so the lookup must be
  // case-insensitive too — otherwise every shared profile link is case-fragile.
  //
  // `_` is both a legal username character and a LIKE wildcard, so it is escaped:
  // an unescaped `hi_man` would also resolve `hixman`. Verified against this
  // project's PostgREST — `ilike.h\_man` matches only the literal, and
  // `ilike.\_i\_man` matches nothing. `maybeSingle()` is safe because
  // `unique (lower(username))` allows at most one row per pattern.
  const pattern = username.replace(/[\\%_]/g, '\\$&');
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id, username, created_at, about_me, problems_solved, points')
    .ilike('username', pattern)
    .eq('is_active', true)
    .maybeSingle();

  // 404, not a 200 with an inline panel — otherwise crawlers index nonexistent
  // profiles as live pages.
  if (userError || !user) notFound();

  const accountCreatedMs = user.created_at ? new Date(user.created_at).getTime() : Number.NaN;
  const trailingWindowStartMs = new Date().getTime() - 400 * 24 * 60 * 60 * 1000;
  const heatmapSinceMs = Number.isFinite(accountCreatedMs)
    ? Math.min(accountCreatedMs, trailingWindowStartMs)
    : trailingWindowStartMs;

  const { data: submissions, error: heatmapError } = await supabase
    .from('submissions')
    .select('created_at')
    .eq('user_id', user.id)
    .gte('created_at', new Date(heatmapSinceMs).toISOString())
    .order('created_at', { ascending: false })
    .limit(HEATMAP_ROW_LIMIT);

  if (heatmapError) {
    console.error('[UserProfilePage] Failed to fetch heatmap submissions:', heatmapError);
  }

  // Group by UTC date — SubmissionHeatmap's calendar is UTC end to end, so the
  // bucket key and the tooltip label have to agree on the day boundary.
  const countMap = new Map<string, number>();
  for (const sub of submissions || []) {
    const date = new Date(sub.created_at).toISOString().split('T')[0];
    countMap.set(date, (countMap.get(date) || 0) + 1);
  }

  const heatmapData: HeatmapDay[] = Array.from(countMap.entries()).map(([date, count]) => ({
    date,
    count,
  }));

  // Count distinct contests the user has joined
  const { count: contestsWritten } = await supabase
    .from('join_history')
    .select('contest_id', { count: 'exact', head: true })
    .eq('user_id', user.id);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const avatarUrl = `${supabaseUrl}/storage/v1/object/public/avatars/${user.id}/avatar`;

  const profileData: ProfileData = {
    id: user.id,
    username: user.username,
    created_at: user.created_at,
    about_me: user.about_me,
    problems_solved: user.problems_solved ?? 0,
    points: user.points ?? 0,
    contests_written: contestsWritten ?? 0,
    avatarUrl,
  };

  return (
    <UserProfileClient
      profile={profileData}
      heatmapData={heatmapData}
    />
  );
}
