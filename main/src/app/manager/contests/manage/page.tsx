import { redirect } from 'next/navigation';
import { requireActiveManager } from '@/lib/staffAuth';
import { parsePage, computeRange, computeTotalPages, clampPage, buildPageHref } from '@/lib/pagination';
import ManagerManageContestsClient from './ManagerManageContestsClient';

const PAGE_SIZE = 20;

export default async function ManagerManageContestsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { supabase } = await requireActiveManager();

  const sp = await searchParams;
  const page = parsePage(sp.page);
  const search = typeof sp.search === 'string' ? sp.search.trim() : '';
  const statusRaw = typeof sp.status === 'string' ? sp.status : 'all';
  const status: 'all' | 'active' | 'pending' =
    statusRaw === 'active' || statusRaw === 'pending' || statusRaw === 'inactive' ? statusRaw === 'inactive' ? 'pending' : statusRaw : 'all';

  const { count: pendingCount } = await supabase
    .from('contests')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', false);

  const { from, to } = computeRange(page, PAGE_SIZE);

  let query = supabase
    .from('contests')
    .select('id,name,length,is_active,updated_at,created_at,starts_at,ends_at,is_rated', { count: 'exact' })
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
    <ManagerManageContestsClient
      rows={data || []}
      currentPage={page}
      totalPages={totalPages}
      currentSearch={search}
      currentStatus={status}
      pendingCount={pendingCount ?? 0}
    />
  );
}