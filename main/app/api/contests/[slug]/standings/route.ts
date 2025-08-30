import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest, { params }: { params: { slug: string } }) {
  const supabase = await createClient()

  try {
    const { slug } = params

    // Get contest details
    const { data: contest, error: contestError } = await supabase
      .from('contests')
      .select(`
        id,
        title,
        start_time,
        end_time,
        contest_problems(
          id,
          points,
          problems(id, title, slug)
        )
      `)
      .eq('slug', slug)
      .single()

    if (contestError || !contest) {
      return NextResponse.json({ error: 'Contest not found' }, { status: 404 })
    }

    // Check if user has permission to view standings
    const { data: { user } } = await supabase.auth.getUser()
    
    // Only show standings to registered participants or contest creator during contest
    const now = new Date()
    const contestStart = new Date(contest.start_time)
    const contestEnd = new Date(contest.end_time)
    const isContestRunning = now >= contestStart && now <= contestEnd

    if (isContestRunning && user) {
      const { data: registration } = await supabase
        .from('contest_registrations')
        .select('id')
        .eq('contest_id', contest.id)
        .eq('user_id', user.id)
        .single()

      if (!registration) {
        return NextResponse.json({ 
          error: 'You must be registered to view standings during the contest' 
        }, { status: 403 })
      }
    }

    // Compute standings from submissions
    const { data: subs, error: subsError } = await supabase
      .from('submissions')
      .select(`user_id, score, submitted_at, test_cases_passed, total_test_cases, profiles(id, username, display_name, avatar_url)`)
      .eq('contest_id', contest.id)

    if (subsError) {
      console.error('Error fetching submissions for standings:', subsError)
      return NextResponse.json({ error: 'Failed to fetch standings' }, { status: 500 })
    }

    const byUser = new Map<string, any>()
    subs?.forEach((s) => {
      const accepted = (s.total_test_cases && s.test_cases_passed === s.total_test_cases) || s.score > 0
      if (!byUser.has(s.user_id)) {
        byUser.set(s.user_id, {
          user_id: s.user_id,
          username: s.profiles?.username,
          display_name: s.profiles?.display_name,
          avatar_url: s.profiles?.avatar_url,
          total_score: 0,
          last_submission_time: s.submitted_at,
        })
      }
      if (accepted) byUser.get(s.user_id).total_score += s.score
      const last = byUser.get(s.user_id).last_submission_time
      if (!last || new Date(s.submitted_at).getTime() < new Date(last).getTime()) {
        byUser.get(s.user_id).last_submission_time = s.submitted_at
      }
    })

    const standings = Array.from(byUser.values())
      .sort((a, b) => {
        if (b.total_score !== a.total_score) return b.total_score - a.total_score
        return new Date(a.last_submission_time).getTime() - new Date(b.last_submission_time).getTime()
      })
      .map((u, idx) => ({
        rank: idx + 1,
        username: u.username,
        display_name: u.display_name,
        avatar_url: u.avatar_url,
        total_score: u.total_score,
        total_penalty: 0,
      }))

    return NextResponse.json({
      contest: {
        id: contest.id,
        title: contest.title,
        startTime: contest.start_time,
        endTime: contest.end_time,
        problems: contest.contest_problems?.map(cp => ({
          id: cp.problems?.id,
          index: '',
          title: cp.problems?.title,
          maxPoints: cp.points
        })) || []
      },
      standings,
      stats: {
        totalParticipants: standings?.length || 0,
        lastUpdated: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Error in GET /api/contests/[slug]/standings:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
