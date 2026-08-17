import { redirect } from 'next/navigation';
import { getServerSupabase } from '@/lib/supabaseServer';
import { parsePage, computeRange, computeTotalPages, clampPage, buildPageHref } from '@/lib/pagination';
import ManagerUserManagementClient from './ManagerUserManagementClient';

const PAGE_SIZE = 20;

export default async function ManagerUserManagementPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const supabase = await getServerSupabase();

  const { data: authData } = await supabase.auth.getUser();
  const userId = authData?.user?.id;
  if (!userId) redirect('/auth/login');

  const { data: managerRow } = await supabase
    .from('managers')
    .select('id')
    .eq('id', userId)
    .maybeSingle();

  if (!managerRow) redirect('/');

  const sp = await searchParams;
  const page = parsePage(sp.page);
  const search = typeof sp.search === 'string' ? sp.search.trim() : '';
  const filterRaw = typeof sp.filter === 'string' ? sp.filter : 'all';
  const filter = filterRaw === 'active' || filterRaw === 'disabled' ? filterRaw : 'all';

  const { from, to } = computeRange(page, PAGE_SIZE);

  // Resolve search to user IDs first (avoids PostgREST .or() string injection).
  let filteredUserIds: string[] | null = null;
  if (search) {
    const [{ data: byUsername }, { data: byEmail }] = await Promise.all([
      supabase.from('users').select('id').ilike('username', `%${search}%`),
      supabase.from('users').select('id').ilike('email', `%${search}%`),
    ]);
    const idSet = new Set<string>();
    for (const u of byUsername || []) idSet.add(u.id);
    for (const u of byEmail || []) idSet.add(u.id);
    filteredUserIds = Array.from(idSet);
  }

  // If search produced no matches, short-circuit to an empty page.
  if (filteredUserIds !== null && filteredUserIds.length === 0) {
    return (
      <ManagerUserManagementClient
        rows={[]}
        currentPage={1}
        totalPages={1}
        currentSearch={search}
        currentFilter={filter}
      />
    );
  }

  let query = supabase
    .from('users')
    .select('id, username, email, is_active, created_at, updated_at', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (filter === 'active') query = query.eq('is_active', true);
  if (filter === 'disabled') query = query.eq('is_active', false);
  if (filteredUserIds !== null) query = query.in('id', filteredUserIds);

  const [usersRes, adminsRes, managersRes] = await Promise.all([
    query.range(from, to),
    supabase.from('admins').select('id'),
    supabase.from('managers').select('id'),
  ]);

  const users = usersRes.data || [];
  const count = usersRes.count;
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

  const adminIds = new Set((adminsRes.data || []).map((a: { id: string }) => a.id));
  const managerIds = new Set((managersRes.data || []).map((m: { id: string }) => m.id));

  const pageUserIds = users.map((u: { id: string }) => u.id);
  const submissionCounts: Record<string, number> = {};
  if (pageUserIds.length > 0) {
    const { data: subsData } = await supabase
      .from('submissions')
      .select('user_id')
      .in('user_id', pageUserIds);
    for (const sub of subsData || []) {
      if (sub.user_id) submissionCounts[sub.user_id] = (submissionCounts[sub.user_id] || 0) + 1;
    }
  }

  const usersWithCounts = users.map((user) => ({
    ...user,
    submissionsCount: submissionCounts[user.id] || 0,
    isAdmin: adminIds.has(user.id),
    isManager: managerIds.has(user.id),
  }));

  return (
    <ManagerUserManagementClient
      rows={usersWithCounts}
      currentPage={page}
      totalPages={totalPages}
      currentSearch={search}
      currentFilter={filter}
    />
  );
}