import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabaseFromToken } from '@/lib/supabaseServer';
import { getTimerStatus } from '@/utils/timerCheck';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
    
    if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const accessToken = authHeader.split(' ')[1];
    const supabase = getServerSupabaseFromToken(accessToken);

    // Verify authenticated user
    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr || !authData?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = authData.user.id;

    // Get timer status
    const timerStatus = await getTimerStatus(supabase, userId, id);
    
    return NextResponse.json({
      isActive: timerStatus.isActive,
      remainingSeconds: timerStatus.remainingSeconds,
      contestName: timerStatus.contestName
    });
  } catch (error) {
    console.error('Timer status error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}