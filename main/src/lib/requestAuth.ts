import type { User } from '@supabase/supabase-js';
import { getServerSupabaseFromToken } from '@/lib/supabaseServer';
import type { AppSupabaseClient } from '@/types/supabase';

/**
 * The bearer preamble for `app/api/**` routes that are NOT staff-only.
 *
 * There were three spellings of "get the token out of the header" and they did
 * not agree. Six routes did `authHeader.split(" ")[1]`, two did
 * `authHeader.substring(7).trim()`, and `staffAuth.getStaffSupabase` did a
 * third. On `Authorization: "Bearer  tok"` — two spaces, which is legal — the
 * first yields `''` and answers 401 while the others yield `tok` and let the
 * request through. Two of them also disagreed about the 401 body.
 *
 * {@link parseBearerHeader} is now the only parser in the app, shared with
 * `getStaffSupabase`; {@link requireUser} is the whole preamble for a non-staff
 * route.
 */

/** RFC 7235 puts one space between scheme and credentials; `Bearer` is 6 characters. */
const SCHEME = 'bearer';

/**
 * Pure. The credentials from an `Authorization` header value, or `null`.
 *
 * Per RFC 7235 the scheme is compared case-insensitively and the token is
 * everything after it, trimmed — so extra whitespace after `Bearer` is
 * tolerated rather than turned into an empty token. `null` for: a missing
 * header, a different scheme, `Bearer` with nothing after it, and a token that
 * is empty or only whitespace.
 */
export function parseBearerHeader(value: string | null | undefined): string | null {
  if (!value) return null;

  const scheme = value.slice(0, SCHEME.length);
  if (scheme.toLowerCase() !== SCHEME) return null;

  const rest = value.slice(SCHEME.length);
  // `Bearerfoo` is not a bearer credential: the scheme has to end somewhere.
  if (rest.length > 0 && !/^\s/.test(rest)) return null;

  const token = rest.trim();
  return token.length > 0 ? token : null;
}

export type RequestAuth =
  | { supabase: AppSupabaseClient; user: User; userId: string }
  | { error: 'Unauthorized'; status: 401 };

/**
 * Resolve the caller of a non-staff API route. Callers branch with
 * `if ('error' in auth)`.
 *
 * Bearer only, no cookie fallback: every one of these routes is `fetch`-called
 * from a client component that already holds the session's access token.
 * `Headers` lookups are case-insensitive, so `get('authorization')` alone finds
 * an `Authorization:` header too — the `|| get('Authorization')` idiom the
 * routes carried was always redundant.
 */
export async function requireUser(request: Request): Promise<RequestAuth> {
  const token = parseBearerHeader(request.headers.get('authorization'));
  if (!token) return { error: 'Unauthorized', status: 401 };

  const supabase = getServerSupabaseFromToken(token);
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    return { error: 'Unauthorized', status: 401 };
  }

  return { supabase, user: data.user, userId: data.user.id };
}
