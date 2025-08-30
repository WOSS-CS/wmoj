import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest, { params }: { params: { slug: string } }) {
  const supabase = await createClient()

  try {
    const { slug } = params

    // Get contest registrations
    const { data: contest, error: contestError } = await supabase
      .from('contests')
      .select('id, title, max_participants')
      .eq('slug', slug)
      .single()

    if (contestError || !contest) {
      return NextResponse.json({ error: 'Contest not found' }, { status: 404 })
    }

    const { data: registrations, error } = await supabase
      .from('contest_registrations')
      .select(`
        id,
        registered_at,
        profiles(id, username, display_name, avatar_url)
      `)
      .eq('contest_id', contest.id)
      .order('registered_at', { ascending: true })

    if (error) {
      console.error('Error fetching registrations:', error)
      return NextResponse.json({ 
        error: 'Failed to fetch registrations',
        details: error.message 
      }, { status: 500 })
    }

    return NextResponse.json({
      contest: {
        id: contest.id,
        title: contest.title,
        maxParticipants: contest.max_participants
      },
      registrations: registrations || [],
      stats: {
        totalRegistrations: registrations?.length || 0,
        spotsRemaining: contest.max_participants 
          ? Math.max(0, contest.max_participants - (registrations?.length || 0))
          : null
      }
    })

  } catch (error) {
    console.error('Error in GET /api/contests/[slug]/register:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: { slug: string } }) {
  const supabase = await createClient()

  try {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { slug } = params
    const body = await request.json()
    const { teamName, isOfficial = true } = body

    // Get contest details
    const { data: contest, error: contestError } = await supabase
      .from('contests')
      .select('*')
      .eq('slug', slug)
      .single()

    if (contestError || !contest) {
      return NextResponse.json({ error: 'Contest not found' }, { status: 404 })
    }

    // Check if contest is public
    if (!contest.is_public) {
      return NextResponse.json({ error: 'This contest is private' }, { status: 403 })
    }

    // Check registration timing
    const now = new Date()
    const regStart = new Date(contest.registration_start)
    const regEnd = new Date(contest.registration_end)

    if (now < regStart) {
      return NextResponse.json({ 
        error: 'Registration has not started yet',
        registrationStart: contest.registration_start
      }, { status: 400 })
    }

    if (now > regEnd) {
      return NextResponse.json({ 
        error: 'Registration has ended',
        registrationEnd: contest.registration_end
      }, { status: 400 })
    }

    // Check if already registered
    const { data: existingRegistration } = await supabase
      .from('contest_registrations')
      .select('id')
      .eq('contest_id', contest.id)
      .eq('user_id', user.id)
      .single()

    if (existingRegistration) {
      return NextResponse.json({ 
        error: 'You are already registered for this contest' 
      }, { status: 409 })
    }

    // Check participant limit
    if (contest.max_participants) {
      const { count: currentRegistrations } = await supabase
        .from('contest_registrations')
        .select('*', { count: 'exact', head: true })
        .eq('contest_id', contest.id)

      if (currentRegistrations && currentRegistrations >= contest.max_participants) {
        return NextResponse.json({ 
          error: 'Contest is full',
          maxParticipants: contest.max_participants,
          currentRegistrations
        }, { status: 409 })
      }
    }

    // Register the user
    const { data: registration, error: registrationError } = await supabase
      .from('contest_registrations')
      .insert({
        contest_id: contest.id,
        user_id: user.id
      })
      .select(`
        id,
        registered_at,
        profiles(username, display_name, avatar_url)
      `)
      .single()

    if (registrationError) {
      console.error('Error registering for contest:', registrationError)
      return NextResponse.json({ 
        error: 'Failed to register for contest',
        details: registrationError.message 
      }, { status: 500 })
    }

    return NextResponse.json({
      message: 'Successfully registered for contest',
      registration,
      contest: {
        title: contest.title,
        startTime: contest.start_time
      }
    })

  } catch (error) {
    console.error('Error in POST /api/contests/[slug]/register:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { slug: string } }) {
  const supabase = await createClient()

  try {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { slug } = params

    // Get contest details
    const { data: contest, error: contestError } = await supabase
      .from('contests')
      .select('id, title, start_time')
      .eq('slug', slug)
      .single()

    if (contestError || !contest) {
      return NextResponse.json({ error: 'Contest not found' }, { status: 404 })
    }

    // Check if contest has started
    const now = new Date()
    const contestStart = new Date(contest.start_time)

    if (now >= contestStart) {
      return NextResponse.json({ 
        error: 'Cannot unregister after contest has started' 
      }, { status: 400 })
    }

    // Delete registration
    const { error: deleteError } = await supabase
      .from('contest_registrations')
      .delete()
      .eq('contest_id', contest.id)
      .eq('user_id', user.id)

    if (deleteError) {
      console.error('Error unregistering from contest:', deleteError)
      return NextResponse.json({ 
        error: 'Failed to unregister from contest',
        details: deleteError.message 
      }, { status: 500 })
    }

    return NextResponse.json({
      message: 'Successfully unregistered from contest'
    })

  } catch (error) {
    console.error('Error in DELETE /api/contests/[slug]/register:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
