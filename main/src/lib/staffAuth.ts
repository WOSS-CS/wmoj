import { redirect } from 'next/navigation';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { getServerSupabase } from '@/lib/supabaseServer';

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
 * Three layers, smallest first:
 *   - `isActiveManager` / `isActiveAdmin` — boolean predicate for a known user id.
 *   - `checkActiveManager` / `checkActiveAdmin` — resolve the caller, never throw.
 *     Use in route handlers, where a redirect would be wrong.
 *   - `requireActiveManager` / `requireActiveAdmin` — resolve the caller or redirect.
 *     Use in `page.tsx` server components.
 */

/** Membership tables. Both carry an `is_active` flag with identical semantics. */
type StaffTable = 'managers' | 'admins';

export interface StaffSession {
  /** The client the check was performed with — reuse it for the rest of the request. */
  supabase: SupabaseClient;
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
export type StaffDenialReason = 'unauthenticated' | 'forbidden' | 'error';

export type StaffAuthResult =
  | ({ ok: true } & StaffSession)
  | { ok: false; reason: StaffDenialReason };

/**
 * Does `userId` hold an **active** row in `table`?
 *
 * `is_active` is nullable (`boolean default true`), and the RLS helpers spell the
 * check `is_active = true` — so a null reads as inactive here too, matching the
 * database rather than being more permissive than it.
 */
async function hasActiveStaffRow(
  supabase: SupabaseClient,
  table: StaffTable,
  userId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from(table)
    .select('id')
    .eq('id', userId)
    .eq('is_active', true)
    .maybeSingle();

  if (error) {
    console.error(`[staffAuth] ${table} lookup failed:`, error);
    return false;
  }
  return Boolean(data);
}

/** True when `userId` is an active manager. Fails closed on any query error. */
export function isActiveManager(supabase: SupabaseClient, userId: string): Promise<boolean> {
  return hasActiveStaffRow(supabase, 'managers', userId);
}

/** True when `userId` is an active admin. Fails closed on any query error. */
export function isActiveAdmin(supabase: SupabaseClient, userId: string): Promise<boolean> {
  return hasActiveStaffRow(supabase, 'admins', userId);
}

async function checkActiveStaff(
  table: StaffTable,
  client?: SupabaseClient,
): Promise<StaffAuthResult> {
  const supabase = client ?? (await getServerSupabase());

  const { data, error } = await supabase.auth.getUser();
  const user = data?.user ?? null;
  if (error || !user) return { ok: false, reason: 'unauthenticated' };

  const { data: row, error: rowError } = await supabase
    .from(table)
    .select('id')
    .eq('id', user.id)
    .eq('is_active', true)
    .maybeSingle();

  if (rowError) {
    console.error(`[staffAuth] ${table} lookup failed:`, rowError);
    return { ok: false, reason: 'error' };
  }
  if (!row) return { ok: false, reason: 'forbidden' };

  return { ok: true, supabase, user, userId: user.id };
}

/**
 * Resolve the caller as an active manager without throwing or redirecting.
 * Pass `client` when the caller already has a Supabase client — e.g. a route
 * handler authenticating from a Bearer token via `getServerSupabaseFromToken`.
 */
export function checkActiveManager(client?: SupabaseClient): Promise<StaffAuthResult> {
  return checkActiveStaff('managers', client);
}

/** Non-redirecting active-admin check. See {@link checkActiveManager}. */
export function checkActiveAdmin(client?: SupabaseClient): Promise<StaffAuthResult> {
  return checkActiveStaff('admins', client);
}

async function requireActiveStaff(
  table: StaffTable,
  client?: SupabaseClient,
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
export function requireActiveManager(client?: SupabaseClient): Promise<StaffSession> {
  return requireActiveStaff('managers', client);
}

/** Require an active admin, or redirect. See {@link requireActiveManager}. */
export function requireActiveAdmin(client?: SupabaseClient): Promise<StaffSession> {
  return requireActiveStaff('admins', client);
}
