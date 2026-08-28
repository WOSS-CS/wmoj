import { NextRequest, NextResponse } from 'next/server';
import { getManagerSupabase } from '@/lib/managerAuth';
import { NEWS_POST_DETAIL_COLUMNS, NEWS_POST_EDIT_COLUMNS } from '@/lib/queries/newsPosts';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await getManagerSupabase(request);
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { supabase } = auth;

  const { data, error } = await supabase
    .from('news_posts')
    .select(NEWS_POST_DETAIL_COLUMNS)
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('Fetch news post error:', error);
    return NextResponse.json({ error: 'Failed to fetch news post' }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({ post: data });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await getManagerSupabase(request);
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { supabase } = auth;

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  // Mirror POST's validation: both columns are NOT NULL, and a blank headline
  // renders as an empty row on the landing page.
  const updates: Record<string, unknown> = {};
  if (body.title !== undefined) {
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    if (!title) return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    updates.title = title;
  }
  if (body.content !== undefined) {
    const content = typeof body.content === 'string' ? body.content.trim() : '';
    if (!content) return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    updates.content = content;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('news_posts')
    .update(updates)
    .eq('id', id)
    .select(NEWS_POST_EDIT_COLUMNS)
    .maybeSingle();

  if (error) {
    console.error('Update news post error:', error);
    return NextResponse.json({ error: 'Failed to update news post' }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({ post: data });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await getManagerSupabase(request);
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { supabase } = auth;

  const { data, error } = await supabase
    .from('news_posts')
    .delete()
    .eq('id', id)
    .select('id');

  if (error) {
    console.error('Delete news post error:', error);
    return NextResponse.json({ error: 'Failed to delete news post' }, { status: 500 });
  }
  if (!data || data.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({ success: true });
}
