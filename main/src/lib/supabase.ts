import { createBrowserClient } from '@supabase/ssr'

import type { Database } from '@/types/supabase'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'placeholder'

export const supabase = createBrowserClient<Database>(supabaseUrl, supabasePublishableKey)
