import { redirect } from 'next/navigation';
import { getServerSupabase } from '@/lib/supabaseServer';
import { parsePage, computeRange, computeTotalPages, clampPage, buildPageHref } from '@/lib/pagination';
import { USER_RANKING_COLUMNS } from '@/lib/queries/users';
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
  let effectivePage = currentPage;

  try {
    const orderCol = sort === 'problems' ? 'problems_solved' : 'points';
    let query = supabase
      .from('users')
      .select(USER_RANKING_COLUMNS, { count: 'exact' })
      .order(orderCol, { ascending: false })
      // Most users sit at points = 0, and without a unique tiebreaker Postgres
      // gives no stable order across separate LIMIT/OFFSET queries — paging
      // 2 -> 3 -> 2 could show one user twice and omit another.
      .order('id', { ascending: true });

    if (search) {
      query = query.ilike('username', `%${search}%`);
    }

    const { data: users, count, error } = await query.range(from, to);

    if (error) {
      fetchError = 'Failed to fetch users';
    } else {
      totalPages = computeTotalPages(count, PAGE_SIZE);
      effectivePage = clampPage(currentPage, totalPages);
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

  // Outside the try/catch on purpose: redirect() signals by throwing, and the
  // catch above would swallow it.
  if (effectivePage !== currentPage) {
    redirect(
      buildPageHref(
        { search: search || undefined, sort: sort !== 'points' ? sort : undefined },
        effectivePage,
      ),
    );
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
