import { redirect } from 'next/navigation';
import { requireActiveManager } from '@/lib/staffAuth';
import { NEWS_POST_EDIT_COLUMNS } from '@/lib/queries/newsPosts';
import ManagerEditNewsPostClient from './ManagerEditNewsPostClient';

export default async function ManagerEditNewsPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireActiveManager();

  const { data: post, error } = await supabase
    .from('news_posts')
    .select(NEWS_POST_EDIT_COLUMNS)
    .eq('id', id)
    .maybeSingle();

  if (error || !post) redirect('/manager/newsposts');

  return <ManagerEditNewsPostClient post={post} />;
}
