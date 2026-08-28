import { redirect } from 'next/navigation';
import { requireActiveAdmin } from '@/lib/staffAuth';
import { parsePage, computeRange, computeTotalPages, clampPage, buildPageHref, parseStaffStatus } from '@/lib/pagination';
import { CONTEST_MANAGE_COLUMNS } from '@/lib/queries/contests';
import ManageContestsClient from './ManageContestsClient';

const PAGE_SIZE = 20;

export default async function ManageContestsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { supabase, userId } = await requireActiveAdmin();

  const sp = await searchParams;
  const page = parsePage(sp.page);
  const search = typeof sp.search === 'string' ? sp.search.trim() : '';
  const status = parseStaffStatus(sp);

  const { from, to } = computeRange(page, PAGE_SIZE);

  let query = supabase
    .from('contests')
    .select(CONTEST_MANAGE_COLUMNS, { count: 'exact' })
    .eq('created_by', userId)
    .order('created_at', { ascending: false });

  if (status === 'active') query = query.eq('is_active', true);
  if (status === 'pending') query = query.eq('is_active', false);
  if (search) query = query.ilike('name', `%${search}%`);

  const { data, count } = await query.range(from, to);

  const totalPages = computeTotalPages(count, PAGE_SIZE);
  const effectivePage = clampPage(page, totalPages);
  if (effectivePage !== page) {
    redirect(
      buildPageHref(
        { search: search || undefined, status: status !== 'all' ? status : undefined },
        effectivePage,
      ),
    );
  }

  return (
    <ManageContestsClient
      rows={data || []}
      currentPage={page}
      totalPages={totalPages}
      currentSearch={search}
      currentStatus={status}
    />
  );
}