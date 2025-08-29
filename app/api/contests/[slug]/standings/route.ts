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
        contest_type,
        contest_problems(
          id,
          problem_index,
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

    // Get standings
    const { data: standings, error: standingsError } = await supabase
      .from('contest_standings')
      .select(`
        rank,
        total_score,
        total_penalty,
        problems_solved,
        last_submission_time,
        profiles(id, username, display_name, avatar_url)
      `)
      .eq('contest_id', contest.id)
      .order('rank', { ascending: true })

    if (standingsError) {
      console.error('Error fetching standings:', standingsError)
      return NextResponse.json({ 
        error: 'Failed to fetch standings',
        details: standingsError.message 
      }, { status: 500 })
    }

    // Get detailed problem results for each participant
    const { data: problemResults, error: resultsError } = await supabase
      .from('contest_problem_results')
      .select(`
        user_id,
        problem_id,
        attempts,
        is_solved,
        first_ac_time,
        points_earned,
        penalty_time
      `)
      .eq('contest_id', contest.id)

    if (resultsError) {
      console.error('Error fetching problem results:', resultsError)
    }

    // Organize problem results by user
    const problemResultsByUser = problemResults?.reduce((acc, result) => {
      if (!acc[result.user_id]) {
        acc[result.user_id] = {}
      }
      acc[result.user_id][result.problem_id] = result
      return acc
    }, {} as Record<string, Record<string, any>>) || {}

    // Enhanced standings with problem-wise results
    const enhancedStandings = standings?.map(standing => ({
      ...standing,
      problemResults: contest.contest_problems?.map(cp => {
        const userResults = problemResultsByUser[standing.profiles?.id || '']
        const result = userResults?.[cp.problems?.id || '']
        
        return {
          problemId: cp.problems?.id,
          problemIndex: cp.problem_index,
          problemTitle: cp.problems?.title,
          attempts: result?.attempts || 0,
          isSolved: result?.is_solved || false,
          firstAcTime: result?.first_ac_time || null,
          pointsEarned: result?.points_earned || 0,
          penaltyTime: result?.penalty_time || 0,
          maxPoints: cp.points
        }
      }) || []
    })) || []

    return NextResponse.json({
      contest: {
        id: contest.id,
        title: contest.title,
        startTime: contest.start_time,
        endTime: contest.end_time,
        type: contest.contest_type,
        problems: contest.contest_problems?.map(cp => ({
          id: cp.problems?.id,
          index: cp.problem_index,
          title: cp.problems?.title,
          maxPoints: cp.points
        })) || []
      },
      standings: enhancedStandings,
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
