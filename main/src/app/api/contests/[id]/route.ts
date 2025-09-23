import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const { data: contest, error } = await supabase
      .from('contests')
      .select('id, name, description, length, participants, created_at, is_active')
      .eq('id', id)
      .single();
    if (error) throw error;

    const { data: problems, error: pErr } = await supabase
      .from('problems')
      .select('id, name')
      .eq('contest', id)
      .order('created_at', { ascending: true });
    if (pErr) throw pErr;

    return NextResponse.json({ contest, problems });
  } catch (e: any) {
    console.error('Error loading contest', e);
    return NextResponse.json({ error: 'Failed to load contest' }, { status: 500 });
  }
}


