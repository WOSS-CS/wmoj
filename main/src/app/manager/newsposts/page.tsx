import { redirect } from 'next/navigation';
import { requireActiveManager } from '@/lib/staffAuth';
import { NEWS_POST_LIST_COLUMNS } from '@/lib/queries/newsPosts';
import { parsePage, computeRange, computeTotalPages, clampPage, buildPageHref } from '@/lib/pagination';
import ManagerNewsPostsClient from './ManagerNewsPostsClient';

const PAGE_SIZE = 20;

export default async function ManagerNewsPostsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { supabase } = await requireActiveManager();

  const sp = await searchParams;
  const page = parsePage(sp.page);
  const search = typeof sp.search === 'string' ? sp.search.trim() : '';

  const { from, to } = computeRange(page, PAGE_SIZE);

  let query = supabase
    .from('news_posts')
    .select(NEWS_POST_LIST_COLUMNS, { count: 'exact' })
    .order('date_posted', { ascending: false });

  if (search) query = query.ilike('title', `%${search}%`);

  const { data: postsData, count } = await query.range(from, to);

  const totalPages = computeTotalPages(count, PAGE_SIZE);

  const effectivePage = clampPage(page, totalPages);
  if (effectivePage !== page) {
    redirect(
      buildPageHref({ search: search || undefined }, effectivePage),
    );
  }

  const posts = (postsData || []).map((p) => {
    // PostgREST returns a to-one embed as an object; the array arm is kept
    // because the hand-written type this replaces claimed both, and dropping it
    // silently would be a behaviour change nobody could see.
    const author = Array.isArray(p.users)
      ? p.users[0]?.username ?? 'Unknown'
      : p.users?.username ?? 'Unknown';
    return {
      id: p.id,
      title: p.title,
      date_posted: p.date_posted,
      updated_at: p.updated_at,
      author,
    };
  });

  return (
    <ManagerNewsPostsClient
      rows={posts}
      currentPage={page}
      totalPages={totalPages}
      currentSearch={search}
    />
  );
}