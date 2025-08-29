import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest, { params }: { params: { slug: string } }) {
  const supabase = await createClient()

  try {
    const { slug } = params

    // First get the problem ID
    const { data: problem, error: problemError } = await supabase
      .from('problems')
      .select('id')
      .eq('slug', slug)
      .single()

    if (problemError || !problem) {
      return NextResponse.json({ error: 'Problem not found' }, { status: 404 })
    }

    // Get reference solutions
    const { data: solutions, error } = await supabase
      .from('reference_solutions')
      .select(`
        *,
        profiles(username, display_name),
        supported_languages(display_name, name, file_extension)
      `)
      .eq('problem_id', problem.id)
      .order('is_primary', { ascending: false })
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching reference solutions:', error)
      return NextResponse.json({ 
        error: 'Failed to fetch reference solutions',
        details: error.message 
      }, { status: 500 })
    }

    return NextResponse.json({ solutions: solutions || [] })

  } catch (error) {
    console.error('Error in GET /api/problems/[slug]/solutions:', error)
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
    const { language, code, description, isPrimary } = body

    if (!language || !code) {
      return NextResponse.json({ 
        error: 'Language and code are required' 
      }, { status: 400 })
    }

    // First get the problem ID
    const { data: problem, error: problemError } = await supabase
      .from('problems')
      .select('id, user_id')
      .eq('slug', slug)
      .single()

    if (problemError || !problem) {
      return NextResponse.json({ error: 'Problem not found' }, { status: 404 })
    }

    // Check if user owns the problem or is admin
    if (problem.user_id !== user.id) {
      return NextResponse.json({ 
        error: 'You can only add reference solutions to problems you created' 
      }, { status: 403 })
    }

    // If this is being set as primary, unset other primary solutions
    if (isPrimary) {
      await supabase
        .from('reference_solutions')
        .update({ is_primary: false })
        .eq('problem_id', problem.id)
    }

    // Create the reference solution
    const { data: solution, error: solutionError } = await supabase
      .from('reference_solutions')
      .insert({
        problem_id: problem.id,
        language,
        code,
        description: description || null,
        is_primary: isPrimary || false,
        created_by: user.id
      })
      .select(`
        *,
        profiles(username, display_name),
        supported_languages(display_name, name, file_extension)
      `)
      .single()

    if (solutionError) {
      console.error('Error creating reference solution:', solutionError)
      return NextResponse.json({ 
        error: 'Failed to create reference solution',
        details: solutionError.message 
      }, { status: 500 })
    }

    return NextResponse.json({
      message: 'Reference solution created successfully',
      solution
    })

  } catch (error) {
    console.error('Error in POST /api/problems/[slug]/solutions:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
