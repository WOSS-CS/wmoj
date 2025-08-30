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
      created_by,
      profiles(username, display_name)
    `)
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
      explanation,
      timeLimit,
      memoryLimit,
      testCases,
      referenceSolutions,
      categories,
      editorial
    } = body

    if (!title || !slug || !description) {
      return NextResponse.json({ error: 'Title, slug, and description are required' }, { status: 400 })
    }

    if (!testCases || testCases.length === 0) {
      return NextResponse.json({ error: 'At least one test case is required' }, { status: 400 })
    }

    const { data: existingProblem } = await supabase
      .from('problems')
      .select('id')
      .eq('slug', slug)
      .single()

    if (existingProblem) {
      return NextResponse.json({ error: 'A problem with this slug already exists' }, { status: 409 })
    }

    console.log('Creating problem:', { title, slug, difficulty, testCasesCount: testCases.length })

    const { data: problem, error: problemError } = await supabase
      .from('problems')
      .insert({
        title,
        slug,
        description,
        difficulty,
        tags: tags || [],
        -- explanation removed per schema update
        time_limit: timeLimit || 2000,
        memory_limit: memoryLimit || 256,
        created_by: user.id,
        is_active: true
      })
      .select()
      .single()

    if (problemError) {
      console.error('Error creating problem:', problemError)
      return NextResponse.json({ 
        error: 'Failed to create problem', 
        details: problemError.message 
      }, { status: 500 })
    }

    console.log('Problem created successfully:', problem.id)

    if (testCases && testCases.length > 0) {
      const testCaseData = testCases.map((testCase: any, index: number) => ({
        problem_id: problem.id,
        input: testCase.input,
        expected_output: testCase.expectedOutput,
        is_sample: testCase.isSample || false,
        points: testCase.points || 1,
        time_limit: testCase.timeLimit || timeLimit || 2000,
        memory_limit: testCase.memoryLimit || memoryLimit || 256,
        order_index: index
      }))

      const { error: testCaseError, data: createdTestCases } = await supabase
        .from('test_cases')
        .insert(testCaseData)
        .select()

      if (testCaseError) {
        console.error('Error creating test cases:', testCaseError)
      } else {
        console.log(`Created ${createdTestCases?.length || 0} test cases`)
      }
    }

    if (referenceSolutions && referenceSolutions.length > 0) {
      const solutionData = referenceSolutions.map((solution: any, index: number) => ({
        problem_id: problem.id,
        language: solution.language,
        code: solution.code,
        description: solution.description || null,
        is_primary: index === 0 || solution.isPrimary,
        created_by: user.id
      }))

      const { error: solutionError, data: createdSolutions } = await supabase
        .from('reference_solutions')
        .insert(solutionData)
        .select()

      if (solutionError) {
        console.error('Error creating reference solutions:', solutionError)
      } else {
        console.log(`Created ${createdSolutions?.length || 0} reference solutions`)
      }
    }

    if (categories && categories.length > 0) {
      const categoryMappings = categories.map((categoryId: string) => ({
        problem_id: problem.id,
        category_id: categoryId
      }))

      const { error: categoryError, data: createdMappings } = await supabase
        .from('problem_category_mappings')
        .insert(categoryMappings)
        .select()

      if (categoryError) {
        console.error('Error creating category mappings:', categoryError)
      } else {
        console.log(`Created ${createdMappings?.length || 0} category mappings`)
      }
    }

    if (editorial && editorial.title && editorial.content) {
      const { error: editorialError, data: createdEditorial } = await supabase
        .from('problem_editorials')
        .insert({
          problem_id: problem.id,
          title: editorial.title,
          content: editorial.content,
          approach_complexity: editorial.complexity || null,
          hints: editorial.hints || [],
          related_topics: editorial.relatedTopics || [],
          created_by: user.id,
          is_published: editorial.publish || false
        })
        .select()

      if (editorialError) {
        console.error('Error creating editorial:', editorialError)
      } else {
        console.log('Created editorial:', createdEditorial?.[0]?.id)
      }
    }

    const { data: completeProblem, error: fetchError } = await supabase
      .from('problems')
      .select(`
        *,
        profiles(username, display_name),
        test_cases(*),
        reference_solutions(*),
        problem_category_mappings(
          problem_categories(*)
        ),
        problem_editorials(*)
      `)
      .eq('id', problem.id)
      .single()

    if (fetchError) {
      console.error('Error fetching complete problem:', fetchError)
    }

    return NextResponse.json({
      message: 'Problem created successfully',
      problem: completeProblem || problem,
      stats: {
        testCases: testCases?.length || 0,
        referenceSolutions: referenceSolutions?.length || 0,
        categories: categories?.length || 0,
        hasEditorial: !!(editorial && editorial.title && editorial.content)
      }
    })

  } catch (error) {
    console.error('Error in POST /api/problems:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
