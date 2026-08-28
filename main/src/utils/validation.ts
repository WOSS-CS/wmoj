/**
 * Mirrors the `users_username_format` check constraint on `public.users`:
 * `username ~ '^[a-zA-Z0-9_.\-]{1,30}$'`. Keep the two in step.
 */
const USERNAME_REGEX = /^[a-zA-Z0-9_.\-]{1,30}$/;
const SLUG_REGEX = /^[a-zA-Z0-9_\-]{1,60}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** RFC 4122 text form, any version, either case — what Postgres accepts for a `uuid` column. */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Longest username the database will accept. */
export const USERNAME_MAX_LENGTH = 30;

export function validateEmail(email: string): string | null {
  if (!email) return 'Email is required';
  if (!EMAIL_REGEX.test(email.trim())) return 'Please enter a valid email address';
  return null;
}

export function validateUsername(username: string): string | null {
  if (!username) return 'Username is required';

  if (/\s/.test(username)){
     return 'Username cannot contain spaces';
  }
  if (!USERNAME_REGEX.test(username)) {
    return 'Username must be 1-30 characters: letters, numbers, underscores, hyphens, or dots only';
  }
  return null;
}

/** True when `username` satisfies the database's format constraint. */
export function isValidUsername(username: string): boolean {
  return USERNAME_REGEX.test(username);
}

/**
 * Coerce arbitrary text (auth metadata, an email local part) into something the
 * `users_username_format` constraint will accept: drop every disallowed character
 * and truncate to `maxLength`. Returns `'user'` when nothing usable survives, so
 * the result is always a valid username.
 *
 * Without this, a signup whose desired username fails the constraint raises 23514
 * and the `public.users` row is never created — leaving a verified auth user with
 * no profile, permanently.
 */
export function sanitizeUsername(raw: string, maxLength: number = USERNAME_MAX_LENGTH): string {
  const limit = Math.max(1, Math.min(maxLength, USERNAME_MAX_LENGTH));
  const cleaned = raw.replace(/[^a-zA-Z0-9_.\-]/g, '').slice(0, limit);
  return cleaned || 'user'.slice(0, limit);
}

export function validateSlug(slug: string, entityName: string): string | null {
  if (!slug) return `${entityName} ID is required`;

  if (/\s/.test(slug)) return `${entityName} ID cannot contain spaces`;
  
  if (!SLUG_REGEX.test(slug))
    return `${entityName} ID must be 1-60 characters: letters, numbers, hyphens, or underscores only`;
  return null;
}

/**
 * True when `value` can be a `uuid` primary key. Route handlers use it to answer
 * 404 for an id that cannot name a row instead of letting Postgres raise 22P02
 * (`invalid input syntax for type uuid`), which the error branch would report
 * as a 500.
 */
export function isUuid(value: string): boolean {
  return UUID_REGEX.test(value);
}
