import { redirect } from 'next/navigation';
import { requireActiveManager } from '@/lib/staffAuth';
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
    .select('id, title, date_posted, updated_at, users!uid(username)', { count: 'exact' })
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

  const posts = (postsData || []).map((p: Record<string, unknown>) => {
    const usersField = p.users as { username: string } | { username: string }[] | null;
    const username = Array.isArray(usersField)
      ? usersField[0]?.username ?? 'Unknown'
      : usersField?.username ?? 'Unknown';
    return {
      id: p.id as string,
      title: p.title as string,
      date_posted: p.date_posted as string,
      updated_at: p.updated_at as string | null,
      author: username,
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