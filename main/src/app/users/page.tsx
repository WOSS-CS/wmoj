import { getServerSupabase } from '@/lib/supabaseServer';
import { parsePage, computeRange, computeTotalPages } from '@/lib/pagination';
import UsersClient from './UsersClient';

export interface UserRow {
  id: string;
  username: string;
  problems_solved: number;
  points: number;
}

const PAGE_SIZE = 25;

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string; sort?: string }>;
}) {
  const params = await searchParams;
  const currentPage = parsePage(params?.page);
  const search = params?.search?.trim() || '';
  const sort = params?.sort === 'problems' ? 'problems' : 'points';
  const { from, to } = computeRange(currentPage, PAGE_SIZE);

  const supabase = await getServerSupabase();

  let leaderboard: UserRow[] = [];
  let totalPages = 1;
  let fetchError: string | undefined;

  try {
    const orderCol = sort === 'problems' ? 'problems_solved' : 'points';
    let query = supabase
      .from('users')
      .select('id, username, problems_solved, points', { count: 'exact' })
      .eq('is_active', true)
      .order(orderCol, { ascending: false });

    if (search) {
      query = query.ilike('username', `%${search}%`);
    }

    const { data: users, count, error } = await query.range(from, to);

    if (error) {
      fetchError = 'Failed to fetch users';
    } else {
      totalPages = computeTotalPages(count, PAGE_SIZE);
      leaderboard = (users || []).map((u) => ({
        id: u.id,
        username: u.username || 'Unknown',
        problems_solved: u.problems_solved ?? 0,
        points: u.points ?? 0,
      }));
    }
  } catch (err) {
    console.error('[UsersPage] Error fetching data:', err);
    fetchError = 'Failed to fetch users';
  }

  return (
    <UsersClient
      initialUsers={leaderboard}
      totalPages={totalPages}
      currentPage={currentPage}
      currentSearch={search}
      currentSort={sort}
      fetchError={fetchError}
    />
  );
}
