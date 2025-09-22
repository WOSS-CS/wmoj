import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { Problem } from '@/types/problem';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'Problem ID is required' },
        { status: 400 }
      );
    }

    const { data: problem, error } = await supabase
      .from('problems')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching problem:', error);
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Problem not found' },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: 'Failed to fetch problem' },
        { status: 500 }
      );
    }

    return NextResponse.json({ problem });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
