import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const url = new URL(request.url)
  const page = parseInt(url.searchParams.get('page') || '1')
  const limit = parseInt(url.searchParams.get('limit') || '20')
  const status = url.searchParams.get('status') // upcoming, live, past, all
  const difficulty = url.searchParams.get('difficulty')
  const type = url.searchParams.get('type')
  const search = url.searchParams.get('search')

  try {
    let query = supabase
      .from('contests')
      .select(`
        id,
        title,
        slug,
        description,
        start_time,
        end_time,
        registration_start,
        registration_end,
        max_participants,
        is_public,
        is_rated,
        contest_type,
        difficulty_level,
        prize_pool,
        created_at,
        profiles(username, display_name),
        contest_registrations(count)
      `)
      .eq('is_public', true)

    // Filter by status
    const now = new Date().toISOString()
    if (status === 'upcoming') {
      query = query.gt('start_time', now)
    } else if (status === 'live') {
      query = query.lte('start_time', now).gt('end_time', now)
    } else if (status === 'past') {
      query = query.lt('end_time', now)
    }

    // Filter by difficulty
    if (difficulty) {
      query = query.eq('difficulty_level', difficulty)
    }

    // Filter by type
    if (type) {
      query = query.eq('contest_type', type)
    }

    // Search filter
    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`)
    }

    // Order by start time (upcoming first, then past)
    query = query.order('start_time', { ascending: status !== 'past' })

    const from = (page - 1) * limit
    const to = from + limit - 1

    const { data: contests, error, count } = await query
      .range(from, to)
      .limit(limit)

    if (error) {
      console.error('Error fetching contests:', error)
      return NextResponse.json({ error: 'Failed to fetch contests' }, { status: 500 })
    }

    return NextResponse.json({
      contests: contests || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    })

  } catch (error) {
    console.error('Error in GET /api/contests:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  try {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const body = await request.json()
    const {
      title,
      slug,
      description,
      startTime,
      endTime,
      registrationStart,
      registrationEnd,
      maxParticipants,
      isPublic,
      isRated,
      contestType,
      difficultyLevel,
      prizePool,
      rules,
      problems // Array of {problemId, problemIndex, points, penaltyMinutes}
    } = body

    // Validate required fields
    if (!title || !slug || !startTime || !endTime || !registrationEnd) {
      return NextResponse.json({ 
        error: 'Title, slug, start time, end time, and registration end are required' 
      }, { status: 400 })
    }

    // Validate time sequence
    const now = new Date()
    const start = new Date(startTime)
    const end = new Date(endTime)
    const regStart = new Date(registrationStart || now)
    const regEnd = new Date(registrationEnd)

    if (regStart >= regEnd || regEnd > start || start >= end) {
      return NextResponse.json({ 
        error: 'Invalid time sequence. Registration must end before contest starts, and contest must have positive duration.' 
      }, { status: 400 })
    }

    // Check if slug is unique
    const { data: existingContest } = await supabase
      .from('contests')
      .select('id')
      .eq('slug', slug)
      .single()

    if (existingContest) {
      return NextResponse.json({ error: 'A contest with this slug already exists' }, { status: 409 })
    }

    console.log('Creating contest:', { title, slug, contestType, difficultyLevel })

    // Create the contest
    const { data: contest, error: contestError } = await supabase
      .from('contests')
      .insert({
        title,
        slug,
        description: description || null,
        start_time: startTime,
        end_time: endTime,
        registration_start: registrationStart || now.toISOString(),
        registration_end: registrationEnd,
        max_participants: maxParticipants || null,
        is_public: isPublic !== undefined ? isPublic : true,
        is_rated: isRated !== undefined ? isRated : true,
        contest_type: contestType || 'icpc',
        difficulty_level: difficultyLevel || 'beginner',
        prize_pool: prizePool || 0,
        rules: rules || null,
        created_by: user.id
      })
      .select()
      .single()

    if (contestError) {
      console.error('Error creating contest:', contestError)
      return NextResponse.json({ 
        error: 'Failed to create contest', 
        details: contestError.message 
      }, { status: 500 })
    }

    console.log('Contest created successfully:', contest.id)

    // Add problems to contest if provided
    if (problems && problems.length > 0) {
      const contestProblemsData = problems.map((problem: any, index: number) => ({
        contest_id: contest.id,
        problem_id: problem.problemId,
        problem_index: problem.problemIndex || String.fromCharCode(65 + index), // A, B, C...
        points: problem.points || 100,
        penalty_minutes: problem.penaltyMinutes || 20,
        order_index: problem.orderIndex !== undefined ? problem.orderIndex : index
      }))

      const { error: problemsError, data: contestProblems } = await supabase
        .from('contest_problems')
        .insert(contestProblemsData)
        .select()

      if (problemsError) {
        console.error('Error adding problems to contest:', problemsError)
        // Don't fail the entire request, but log the error
      } else {
        console.log(`Added ${contestProblems?.length || 0} problems to contest`)
      }
    }

    // Fetch the complete contest data
    const { data: completeContest, error: fetchError } = await supabase
      .from('contests')
      .select(`
        *,
        profiles(username, display_name),
        contest_problems(
          id,
          problem_index,
          points,
          penalty_minutes,
          order_index,
          problems(id, title, slug, difficulty)
        )
      `)
      .eq('id', contest.id)
      .single()

    if (fetchError) {
      console.error('Error fetching complete contest:', fetchError)
    }

    return NextResponse.json({
      message: 'Contest created successfully',
      contest: completeContest || contest,
      stats: {
        problems: problems?.length || 0
      }
    })

  } catch (error) {
    console.error('Error in POST /api/contests:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
