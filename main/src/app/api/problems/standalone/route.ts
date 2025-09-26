import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabaseServer';

export async function GET() {
  try {
    console.log('API: Fetching standalone problems...');
    const supabase = await getServerSupabase();
    const { data: problems, error } = await supabase
      .from('problems')
      .select('*')
      .is('contest', null)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    console.log('API: Supabase response:', { problems: problems?.length, error });

    if (error) {
      console.error('Error fetching standalone problems:', error);
      return NextResponse.json(
        { error: 'Failed to fetch problems' },
        { status: 500 }
      );
    }

    console.log('API: Returning problems:', problems?.length || 0);
    return NextResponse.json({ problems: problems || [] });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
