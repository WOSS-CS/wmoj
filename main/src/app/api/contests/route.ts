import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    // Try to return only active contests
    let { data, error } = await supabase
      .from('contests')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      // Fallback in case is_active column doesn't exist yet
      const fallback = await supabase
        .from('contests')
        .select('*')
        .order('created_at', { ascending: false });
      data = fallback.data ?? [];
      error = fallback.error ?? null;
    }

    if (error) {
      console.error('Error fetching contests:', error);
      return NextResponse.json({ error: 'Failed to fetch contests' }, { status: 500 });
    }

    return NextResponse.json({ contests: data ?? [] });
  } catch (e: any) {
    console.error('Unexpected error fetching contests:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


