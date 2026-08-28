/**
 * The one place the app knows which languages exist and what to call them.
 *
 * `LANGUAGE_LABELS`/`displayLanguage` were declared three times (the admin
 * dashboard, the admin problem-submissions client and the owner's
 * `/submissions` page) and one staff surface bypassed them entirely and
 * CSS-uppercased the raw code, so the same submission read `C++17 (GCC)` on
 * one screen and `CPP17` on the next. `ALLOWED_LANGUAGES`/`MAX_CODE_BYTES`
 * lived in the submit route. They are all here now, and this module is
 * deliberately free of imports so both server routes and client components
 * can read it.
 */

/** Display label per language code the submit dropdown offers (plus the two legacy aliases). */
export const LANGUAGE_LABELS: Record<string, string> = {
  python: 'Python',
  python3: 'Python 3',
  pypy3: 'PyPy 3',
  cpp: 'C++',
  cpp14: 'C++14 (GCC)',
  cpp17: 'C++17 (GCC)',
  cpp20: 'C++20 (GCC)',
  cpp23: 'C++23 (GCC)',
};

/** The label for a language code, or the code upper-cased when it is not one we know. */
export function displayLanguage(code: string): string {
  return LANGUAGE_LABELS[code] ?? code.toUpperCase();
}

/**
 * The exact set the `submissions_language_check` constraint accepts. The judge
 * enumerates the same six current values and accepts `python`/`cpp` as legacy
 * aliases during the cutover. Validating in the submit route means a bad
 * language is a 400 from us rather than a 4xx from the judge that the student
 * reads as "something went wrong with my code".
 */
export const ALLOWED_LANGUAGES = [
  'python3',
  'pypy3',
  'cpp14',
  'cpp17',
  'cpp20',
  'cpp23',
  'python',
  'cpp',
] as const;

export type AllowedLanguage = (typeof ALLOWED_LANGUAGES)[number];

/** True when `value` is one of {@link ALLOWED_LANGUAGES}. */
export function isAllowedLanguage(value: unknown): value is AllowedLanguage {
  return typeof value === 'string' && (ALLOWED_LANGUAGES as readonly string[]).includes(value);
}

/**
 * Mirrors the judge's own MAX_CODE_BYTES. Enforced in the submit route so an
 * oversized paste is rejected before it is shipped across the network to be 413'd.
 */
export const MAX_CODE_BYTES = 100_000;
