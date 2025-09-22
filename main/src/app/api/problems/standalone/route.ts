import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { Problem } from '@/types/problem';

export async function GET() {
  try {
    const { data: problems, error } = await supabase
      .from('problems')
      .select('*')
      .is('contest', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching standalone problems:', error);
      return NextResponse.json(
        { error: 'Failed to fetch problems' },
        { status: 500 }
      );
    }

    return NextResponse.json({ problems });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
