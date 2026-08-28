/**
 * The four states a contest can be displayed in.
 *
 * Contest status is NEVER stored — always compute it with `getContestStatus`
 * (`utils/contestStatus.ts`) from `is_active` plus the time window. Both
 * timestamps null means `virtual`, not `inactive`.
 *
 * The hand-written `Contest` row interface that used to live here is gone: every
 * contest row shape is now derived from the generated schema in
 * `lib/queries/contests.ts`, beside the column list that produces it.
 */
export type ContestStatus = 'upcoming' | 'ongoing' | 'virtual' | 'inactive';
