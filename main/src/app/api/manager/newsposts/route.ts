import { NextRequest, NextResponse } from 'next/server';
import { getManagerSupabase } from '@/lib/managerAuth';
import { NEWS_POST_DETAIL_COLUMNS, NEWS_POST_EDIT_COLUMNS } from '@/lib/queries/newsPosts';

export async function GET(request: NextRequest) {
  const auth = await getManagerSupabase(request);
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { supabase } = auth;

  const { data, error } = await supabase
    .from('news_posts')
    .select(NEWS_POST_DETAIL_COLUMNS)
    .order('date_posted', { ascending: false });

  if (error) {
    console.error('Fetch news posts error:', error);
    return NextResponse.json({ error: 'Failed to fetch news posts' }, { status: 500 });
  }

  return NextResponse.json({ posts: data });
}

export async function POST(request: NextRequest) {
  const auth = await getManagerSupabase(request);
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { supabase, user } = auth;

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const content = typeof body.content === 'string' ? body.content.trim() : '';

  if (!title) return NextResponse.json({ error: 'Title is required' }, { status: 400 });
  if (!content) return NextResponse.json({ error: 'Content is required' }, { status: 400 });

  const { data, error } = await supabase
    .from('news_posts')
    .insert([{ title, content, uid: user.id }])
    .select(NEWS_POST_EDIT_COLUMNS)
    .single();

  if (error) {
    console.error('Create news post error:', error);
    return NextResponse.json({ error: 'Failed to create news post' }, { status: 500 });
  }

  return NextResponse.json({ post: data }, { status: 201 });
}
