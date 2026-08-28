import { redirect } from 'next/navigation';
import type { NextRequest } from 'next/server';
import type { User } from '@supabase/supabase-js';
import { parseBearerHeader } from '@/lib/requestAuth';
import { getServerSupabase, getServerSupabaseFromToken } from '@/lib/supabaseServer';
import type { AppSupabaseClient } from '@/types/supabase';

/**
 * Server-side staff authorization.
 *
 * A row in `public.managers` / `public.admins` is NOT authorization on its own —
 * `is_active` must be true. `is_manager()` / `is_admin()` (the RLS helpers) and
 * `getManagerSupabase` / `getAdminSupabase` (the API-route helpers) all require it,
 * and every gate outside those must require it too.
 *
 * The manager tree is the one that actually leaks without this: `managers_select_all`
 * is `using ((auth.uid() = id) or is_manager())`, so a deactivated manager can still
 * read their own row and any "does a row exist" check hands them their privileges back.
 * The admin tree currently fails closed only because `"Admins can view all admins"` is
 * `using (is_admin())` — an accident of RLS rather than a deliberate gate. Both are
 * checked explicitly here so neither depends on that.
 *
 * Every entry point funnels through `lookupActiveStaffRow`, so the membership query
 * is written once and the admin and manager trees cannot drift apart:
 *   - `isActiveManager` / `isActiveAdmin` — boolean predicate for a known user id.
 *   - `requireActiveManager` / `requireActiveAdmin` — resolve the caller or redirect.
 *     Use in `page.tsx` server components.
 *   - `getStaffSupabase` — resolve the caller or hand back an HTTP status. Use in
 *     `app/api/**` route handlers, through `getAdminSupabase` / `getManagerSupabase`.
 */

/** Membership tables. Both carry an `is_active` flag with identical semantics. */
export type StaffTable = 'managers' | 'admins';

export interface StaffSession {
  /** The client the check was performed with — reuse it for the rest of the request. */
  supabase: AppSupabaseClient;
  user: User;
  /** Convenience alias for `user.id`. */
  userId: string;
}

/**
 * Why a staff check failed.
 * - `unauthenticated` — no valid session (401 / `/auth/login`).
 * - `forbidden` — signed in, but not an active member of that table (403 / `/`).
 * - `error` — the membership query itself failed; treated as a denial (fail closed).
 */
type StaffDenialReason = 'unauthenticated' | 'forbidden' | 'error';

type StaffAuthResult =
  | ({ ok: true } & StaffSession)
  | { ok: false; reason: StaffDenialReason };

/**
 * The one membership query. `ok: false` means the query itself failed, which every
 * caller treats as a denial — but they distinguish it from a clean "no such row" so
 * a broken database does not read as a routine 403.
 *
 * `is_active` is nullable (`boolean default true`), and the RLS helpers spell the
 * check `is_active = true` — so a null reads as inactive here too, matching the
 * database rather than being more permissive than it.
 */
async function lookupActiveStaffRow(
  supabase: AppSupabaseClient,
  table: StaffTable,
  userId: string,
): Promise<{ ok: true; present: boolean } | { ok: false }> {
  const { data, error } = await supabase
    .from(table)
    .select('id')
    .eq('id', userId)
    .eq('is_active', true)
    .maybeSingle();

  if (error) {
    console.error(`[staffAuth] ${table} lookup failed:`, error);
    return { ok: false };
  }
  return { ok: true, present: Boolean(data) };
}

/** Does `userId` hold an active row in `table`? Fails closed on any query error. */
async function hasActiveStaffRow(
  supabase: AppSupabaseClient,
  table: StaffTable,
  userId: string,
): Promise<boolean> {
  const lookup = await lookupActiveStaffRow(supabase, table, userId);
  return lookup.ok && lookup.present;
}

/** True when `userId` is an active manager. Fails closed on any query error. */
export function isActiveManager(supabase: AppSupabaseClient, userId: string): Promise<boolean> {
  return hasActiveStaffRow(supabase, 'managers', userId);
}

/** True when `userId` is an active admin. Fails closed on any query error. */
export function isActiveAdmin(supabase: AppSupabaseClient, userId: string): Promise<boolean> {
  return hasActiveStaffRow(supabase, 'admins', userId);
}

async function checkActiveStaff(
  table: StaffTable,
  client?: AppSupabaseClient,
): Promise<StaffAuthResult> {
  const supabase = client ?? (await getServerSupabase());

  const { data, error } = await supabase.auth.getUser();
  const user = data?.user ?? null;
  if (error || !user) return { ok: false, reason: 'unauthenticated' };

  const lookup = await lookupActiveStaffRow(supabase, table, user.id);
  if (!lookup.ok) return { ok: false, reason: 'error' };
  if (!lookup.present) return { ok: false, reason: 'forbidden' };

  return { ok: true, supabase, user, userId: user.id };
}

async function requireActiveStaff(
  table: StaffTable,
  client?: AppSupabaseClient,
): Promise<StaffSession> {
  const result = await checkActiveStaff(table, client);
  if (result.ok) return result;
  // `redirect()` throws, so nothing below runs — and it must never be called
  // inside a try/catch that would swallow it.
  redirect(result.reason === 'unauthenticated' ? '/auth/login' : '/');
}

/**
 * Require an active manager, or redirect: `/auth/login` when signed out, `/`
 * otherwise. For `page.tsx` server components — replaces the
 * `getServerSupabase` + `auth.getUser` + `managers` lookup preamble:
 *
 * ```ts
 * const { supabase, userId } = await requireActiveManager();
 * ```
 */
export function requireActiveManager(client?: AppSupabaseClient): Promise<StaffSession> {
  return requireActiveStaff('managers', client);
}

/** Require an active admin, or redirect. See {@link requireActiveManager}. */
export function requireActiveAdmin(client?: AppSupabaseClient): Promise<StaffSession> {
  return requireActiveStaff('admins', client);
}

/** A resolved staff session, or the body and status the route should return. */
export type StaffRouteAuth =
  | { supabase: AppSupabaseClient; user: User }
  | { error: string; status: number };

const DENIAL_RESPONSE: Record<StaffDenialReason, { error: string; status: number }> = {
  unauthenticated: { error: 'Unauthorized', status: 401 },
  forbidden: { error: 'Forbidden', status: 403 },
  error: { error: 'Authorization check failed', status: 500 },
};

/**
 * The staff auth preamble for `app/api/**` route handlers. Accepts a Bearer token
 * — parsed by `parseBearerHeader`, the app's one token parser, shared with the
 * non-staff `requireUser` — and falls back to the cookie session when there is
 * no usable token. Callers branch with `if ('error' in auth)`.
 *
 * Call it through `getAdminSupabase` / `getManagerSupabase` rather than directly:
 * those name which tree a route belongs to, which is what makes a route missing its
 * twin greppable.
 */
export async function getStaffSupabase(
  request: NextRequest,
  table: StaffTable,
): Promise<StaffRouteAuth> {
  // `Headers` lookups are case-insensitive, so one `get` finds both spellings.
  const bearerToken = parseBearerHeader(request.headers.get('authorization'));
  const client = bearerToken ? getServerSupabaseFromToken(bearerToken) : await getServerSupabase();

  const result = await checkActiveStaff(table, client);
  if (!result.ok) return { ...DENIAL_RESPONSE[result.reason] };

  return { supabase: result.supabase, user: result.user };
}
