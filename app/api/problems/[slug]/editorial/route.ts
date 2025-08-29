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

    // Get the editorial
    const { data: editorial, error } = await supabase
      .from('problem_editorials')
      .select(`
        *,
        profiles(username, display_name)
      `)
      .eq('problem_id', problem.id)
      .eq('is_published', true)
      .single()

    if (error || !editorial) {
      return NextResponse.json({ error: 'Editorial not found' }, { status: 404 })
    }

    return NextResponse.json({ editorial })

  } catch (error) {
    console.error('Error in GET /api/problems/[slug]/editorial:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { slug: string } }) {
  const supabase = await createClient()

  try {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { slug } = params
    const body = await request.json()
    const { title, content, complexity, hints, relatedTopics, isPublished } = body

    if (!title || !content) {
      return NextResponse.json({ 
        error: 'Title and content are required' 
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
        error: 'You can only edit editorials for problems you created' 
      }, { status: 403 })
    }

    // Check if editorial exists
    const { data: existingEditorial } = await supabase
      .from('problem_editorials')
      .select('id')
      .eq('problem_id', problem.id)
      .single()

    let editorial
    let operation = 'created'

    if (existingEditorial) {
      // Update existing editorial
      const { data: updatedEditorial, error: updateError } = await supabase
        .from('problem_editorials')
        .update({
          title,
          content,
          approach_complexity: complexity || null,
          hints: hints || [],
          related_topics: relatedTopics || [],
          is_published: isPublished !== undefined ? isPublished : false,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingEditorial.id)
        .select()
        .single()

      if (updateError) {
        console.error('Error updating editorial:', updateError)
        return NextResponse.json({ 
          error: 'Failed to update editorial',
          details: updateError.message 
        }, { status: 500 })
      }

      editorial = updatedEditorial
      operation = 'updated'
    } else {
      // Create new editorial
      const { data: newEditorial, error: createError } = await supabase
        .from('problem_editorials')
        .insert({
          problem_id: problem.id,
          title,
          content,
          approach_complexity: complexity || null,
          hints: hints || [],
          related_topics: relatedTopics || [],
          created_by: user.id,
          is_published: isPublished !== undefined ? isPublished : false
        })
        .select()
        .single()

      if (createError) {
        console.error('Error creating editorial:', createError)
        return NextResponse.json({ 
          error: 'Failed to create editorial',
          details: createError.message 
        }, { status: 500 })
      }

      editorial = newEditorial
    }

    return NextResponse.json({
      message: `Editorial ${operation} successfully`,
      editorial
    })

  } catch (error) {
    console.error('Error in PUT /api/problems/[slug]/editorial:', error)
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
        error: 'You can only delete editorials for problems you created' 
      }, { status: 403 })
    }

    // Delete the editorial
    const { error: deleteError } = await supabase
      .from('problem_editorials')
      .delete()
      .eq('problem_id', problem.id)

    if (deleteError) {
      console.error('Error deleting editorial:', deleteError)
      return NextResponse.json({ 
        error: 'Failed to delete editorial',
        details: deleteError.message 
      }, { status: 500 })
    }

    return NextResponse.json({
      message: 'Editorial deleted successfully'
    })

  } catch (error) {
    console.error('Error in DELETE /api/problems/[slug]/editorial:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
