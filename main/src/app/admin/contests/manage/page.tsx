import { redirect } from 'next/navigation';
import { getServerSupabase } from '@/lib/supabaseServer';
import { parsePage, computeRange, computeTotalPages, clampPage, buildPageHref } from '@/lib/pagination';
import ManageContestsClient from './ManageContestsClient';

const PAGE_SIZE = 20;

export default async function ManageContestsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const supabase = await getServerSupabase();

  const { data: authData } = await supabase.auth.getUser();
  const userId = authData?.user?.id;
  if (!userId) redirect('/auth/login');

  const { data: adminRow } = await supabase
    .from('admins')
    .select('id')
    .eq('id', userId)
    .maybeSingle();

  if (!adminRow) redirect('/');

  const sp = await searchParams;
  const page = parsePage(sp.page);
  const search = typeof sp.search === 'string' ? sp.search.trim() : '';
  const filterRaw = typeof sp.filter === 'string' ? sp.filter : 'all';
  const filter = filterRaw === 'active' || filterRaw === 'inactive' ? filterRaw : 'all';

  const { from, to } = computeRange(page, PAGE_SIZE);

  let query = supabase
    .from('contests')
    .select('id,name,length,is_active,updated_at,created_at,starts_at,ends_at,is_rated', { count: 'exact' })
    .eq('created_by', userId)
    .order('created_at', { ascending: false });

  if (filter === 'active') query = query.eq('is_active', true);
  if (filter === 'inactive') query = query.eq('is_active', false);
  if (search) query = query.ilike('name', `%${search}%`);

  const { data, count } = await query.range(from, to);

  const totalPages = computeTotalPages(count, PAGE_SIZE);
  const effectivePage = clampPage(page, totalPages);
  if (effectivePage !== page) {
    redirect(
      buildPageHref(
        { search: search || undefined, filter: filter !== 'all' ? filter : undefined },
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
      currentFilter={filter}
    />
  );
}