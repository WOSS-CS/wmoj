import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PUT(request: NextRequest, { params }: { params: { slug: string, id: string } }) {
  const supabase = await createClient()

  try {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { slug, id } = params
    const body = await request.json()
    const { language, code, description, isPrimary } = body

    if (!language || !code) {
      return NextResponse.json({ 
        error: 'Language and code are required' 
      }, { status: 400 })
    }

    // First get the problem and solution info
    const { data: problemAndSolution, error: fetchError } = await supabase
      .from('reference_solutions')
      .select(`
        *,
        problems(id, user_id, slug)
      `)
      .eq('id', id)
      .single()

    if (fetchError || !problemAndSolution) {
      return NextResponse.json({ error: 'Solution not found' }, { status: 404 })
    }

    // Check if the solution belongs to the correct problem
    if (problemAndSolution.problems?.slug !== slug) {
      return NextResponse.json({ error: 'Solution does not belong to this problem' }, { status: 400 })
    }

    // Check if user owns the problem or is admin
    if (problemAndSolution.problems?.user_id !== user.id) {
      return NextResponse.json({ 
        error: 'You can only edit solutions for problems you created' 
      }, { status: 403 })
    }

    // If this is being set as primary, unset other primary solutions
    if (isPrimary && !problemAndSolution.is_primary) {
      await supabase
        .from('reference_solutions')
        .update({ is_primary: false })
        .eq('problem_id', problemAndSolution.problem_id)
    }

    // Update the reference solution
    const { data: solution, error: updateError } = await supabase
      .from('reference_solutions')
      .update({
        language,
        code,
        description: description || null,
        is_primary: isPrimary || false,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select(`
        *,
        profiles(username, display_name),
        supported_languages(display_name, name, file_extension)
      `)
      .single()

    if (updateError) {
      console.error('Error updating reference solution:', updateError)
      return NextResponse.json({ 
        error: 'Failed to update reference solution',
        details: updateError.message 
      }, { status: 500 })
    }

    return NextResponse.json({
      message: 'Reference solution updated successfully',
      solution
    })

  } catch (error) {
    console.error('Error in PUT /api/problems/[slug]/solutions/[id]:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { slug: string, id: string } }) {
  const supabase = await createClient()

  try {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { slug, id } = params

    // First get the problem and solution info
    const { data: problemAndSolution, error: fetchError } = await supabase
      .from('reference_solutions')
      .select(`
        *,
        problems(id, user_id, slug)
      `)
      .eq('id', id)
      .single()

    if (fetchError || !problemAndSolution) {
      return NextResponse.json({ error: 'Solution not found' }, { status: 404 })
    }

    // Check if the solution belongs to the correct problem
    if (problemAndSolution.problems?.slug !== slug) {
      return NextResponse.json({ error: 'Solution does not belong to this problem' }, { status: 400 })
    }

    // Check if user owns the problem or is admin
    if (problemAndSolution.problems?.user_id !== user.id) {
      return NextResponse.json({ 
        error: 'You can only delete solutions for problems you created' 
      }, { status: 403 })
    }

    // Delete the reference solution
    const { error: deleteError } = await supabase
      .from('reference_solutions')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Error deleting reference solution:', deleteError)
      return NextResponse.json({ 
        error: 'Failed to delete reference solution',
        details: deleteError.message 
      }, { status: 500 })
    }

    return NextResponse.json({
      message: 'Reference solution deleted successfully'
    })

  } catch (error) {
    console.error('Error in DELETE /api/problems/[slug]/solutions/[id]:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
