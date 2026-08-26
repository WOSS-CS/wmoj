import { redirect } from 'next/navigation';
import { requireActiveManager } from '@/lib/staffAuth';
import ManagerEditNewsPostClient from './ManagerEditNewsPostClient';

export default async function ManagerEditNewsPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireActiveManager();

  const { data: post, error } = await supabase
    .from('news_posts')
    .select('id, title, content, date_posted, updated_at')
    .eq('id', id)
    .maybeSingle();

  if (error || !post) redirect('/manager/newsposts');

  return <ManagerEditNewsPostClient post={post} />;
}
