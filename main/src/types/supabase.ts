import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database, Json } from './database.types';

/**
 * The hand-written surface over the generated `database.types.ts`.
 *
 * `database.types.ts` comes from `npm run gen:types` (Supabase CLI, against the
 * local stack) and is NEVER hand-edited — regenerate it after every migration
 * and commit the diff. This file is the small, stable thing the rest of the app
 * imports, so a CLI output-shape change lands in one place rather than in every
 * module that annotates a client.
 */
export type { Database, Json };

/**
 * A Supabase client that knows this project's schema.
 *
 * All three clients (`lib/supabase.ts` browser, `lib/supabaseServer.ts` cookie
 * and bearer, `lib/supabaseAdmin.ts` service role) carry it, which is what makes
 * a misspelled column in a `.select()` string a compile error instead of a
 * runtime `null`. Annotate every `SupabaseClient` parameter with this, never
 * with the bare `SupabaseClient` — the bare form is `SupabaseClient<any>` and
 * silently switches the checking back off for that call site.
 */
export type AppSupabaseClient = SupabaseClient<Database>;

/** The row type of one public table, e.g. `Row<'submissions'>`. */
export type Row<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];
