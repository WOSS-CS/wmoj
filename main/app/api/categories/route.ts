import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()

  try {
    const { data: categories, error } = await supabase
      .from('problem_categories')
      .select('*')
      .order('name')

    if (error) {
      console.error('Error fetching categories:', error)
      return NextResponse.json({ 
        error: 'Failed to fetch categories',
        details: error.message 
      }, { status: 500 })
    }

    return NextResponse.json({ categories })

  } catch (error) {
    console.error('Error in GET /api/categories:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
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
    const { name, description, color, icon } = body

    if (!name) {
      return NextResponse.json({ error: 'Category name is required' }, { status: 400 })
    }

    // Check if category name already exists
    const { data: existingCategory } = await supabase
      .from('problem_categories')
      .select('id')
      .eq('name', name)
      .single()

    if (existingCategory) {
      return NextResponse.json({ 
        error: 'A category with this name already exists' 
      }, { status: 409 })
    }

    const { data: category, error: categoryError } = await supabase
      .from('problem_categories')
      .insert({
        name,
        description: description || null,
        color: color || '#3B82F6',
        icon: icon || null
      })
      .select()
      .single()

    if (categoryError) {
      console.error('Error creating category:', categoryError)
      return NextResponse.json({ 
        error: 'Failed to create category',
        details: categoryError.message 
      }, { status: 500 })
    }

    return NextResponse.json({
      message: 'Category created successfully',
      category
    })

  } catch (error) {
    console.error('Error in POST /api/categories:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
