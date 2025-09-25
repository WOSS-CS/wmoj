import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabaseServer';

export async function POST(request: NextRequest) {
  try {
    const { name, description, length } = await request.json();

    if (!name || !description || !length) {
      return NextResponse.json(
        { error: 'Name, description, and length are required' },
        { status: 400 }
      );
    }

    if (length < 1 || length > 1440) {
      return NextResponse.json(
        { error: 'Length must be between 1 and 1440 minutes' },
        { status: 400 }
      );
    }

    const supabase = await getServerSupabase();
    
    const { data, error } = await supabase
      .from('contests')
      .insert([
        {
          name,
          description,
          length,
          is_active: true
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to create contest' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { 
        success: true, 
        contest: data,
        message: 'Contest created successfully' 
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create contest error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
