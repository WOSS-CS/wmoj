import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const url = new URL(request.url)
  const page = parseInt(url.searchParams.get('page') || '1')
  const limit = parseInt(url.searchParams.get('limit') || '20')
  const difficulty = url.searchParams.get('difficulty')
  const tags = url.searchParams.get('tags')?.split(',').filter(Boolean)
  const search = url.searchParams.get('search')

  let query = supabase
    .from('problems')
    .select(`
      id,
      title,
      slug,
      difficulty,
      tags,
      created_at,
      user_id,
      profiles(username, display_name)
    `)
    .eq('is_public', true)
    .order('created_at', { ascending: false })

  if (difficulty) {
    query = query.eq('difficulty', difficulty)
  }

  if (tags && tags.length > 0) {
    query = query.overlaps('tags', tags)
  }

  if (search) {
    query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`)
  }

  const from = (page - 1) * limit
  const to = from + limit - 1

  const { data: problems, error, count } = await query
    .range(from, to)
    .limit(limit)

  if (error) {
    console.error('Error fetching problems:', error)
    return NextResponse.json({ error: 'Failed to fetch problems' }, { status: 500 })
  }

  return NextResponse.json({
    problems: problems || [],
    pagination: {
      page,
      limit,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / limit)
    }
  })
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
      difficulty,
      tags,
      inputFormat,
      outputFormat,
      constraints,
      sampleInput,
      sampleOutput,
      explanation,
      timeLimit,
      memoryLimit,
      testCases
    } = body

    // Validate required fields
    if (!title || !slug || !description) {
      return NextResponse.json({ error: 'Title, slug, and description are required' }, { status: 400 })
    }

    // Check if slug is unique
    const { data: existingProblem } = await supabase
      .from('problems')
      .select('id')
      .eq('slug', slug)
      .single()

    if (existingProblem) {
      return NextResponse.json({ error: 'A problem with this slug already exists' }, { status: 409 })
    }

    // Create the problem
    const { data: problem, error: problemError } = await supabase
      .from('problems')
      .insert({
        title,
        slug,
        description,
        difficulty,
        tags: tags || [],
        input_format: inputFormat,
        output_format: outputFormat,
        constraints,
        sample_input: sampleInput,
        sample_output: sampleOutput,
        explanation,
        time_limit: timeLimit || 2000,
        memory_limit: memoryLimit || 256,
        user_id: user.id,
        is_public: true
      })
      .select()
      .single()

    if (problemError) {
      console.error('Error creating problem:', problemError)
      return NextResponse.json({ error: 'Failed to create problem' }, { status: 500 })
    }

    // Create test cases
    if (testCases && testCases.length > 0) {
      const testCaseData = testCases.map((testCase: any) => ({
        problem_id: problem.id,
        input: testCase.input,
        expected_output: testCase.expectedOutput,
        is_sample: testCase.isSample || false,
        points: testCase.points || 1,
        time_limit: testCase.timeLimit || timeLimit || 2000,
        memory_limit: testCase.memoryLimit || memoryLimit || 256
      }))

      const { error: testCaseError } = await supabase
        .from('test_cases')
        .insert(testCaseData)

      if (testCaseError) {
        console.error('Error creating test cases:', testCaseError)
        // Don't fail the entire request, but log the error
      }
    }

    return NextResponse.json({
      message: 'Problem created successfully',
      problem
    })

  } catch (error) {
    console.error('Error in POST /api/problems:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
