import type { ContestStatus } from '@/types/contest';

/**
 * Converts a UTC ISO timestamp string to a value suitable for a datetime-local input.
 * datetime-local inputs expect local time (YYYY-MM-DDTHH:MM), not UTC.
 */
export function toLocalDatetimeInput(isoString: string): string {
  const d = new Date(isoString);
  const offsetMs = d.getTimezoneOffset() * 60_000;
  return new Date(d.getTime() - offsetMs).toISOString().slice(0, 16);
}

/**
 * Converts a datetime-local input value (local time, no timezone) to a UTC ISO string.
 * Browsers parse YYYY-MM-DDTHH:MM as local time, so new Date(...).toISOString() gives UTC.
 */
export function fromLocalDatetimeInput(localValue: string): string {
  return new Date(localValue).toISOString();
}

/**
 * Returns a human-readable "in X days/hours/minutes" string for a future timestamp.
 * If the timestamp is in the past, returns an empty string.
 */
export function formatTimeUntil(isoString: string): string {
  const ms = new Date(isoString).getTime() - Date.now();
  if (ms <= 0) return '';
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 60) return `in ${minutes} min`;
  const hours = Math.floor(ms / 3_600_000);
  if (hours < 24) return `in ${hours}h`;
  const days = Math.floor(hours / 24);
  return `in ${days} day${days !== 1 ? 's' : ''}`;
}

/**
 * Badge presentation for each contest status. Shared so that every surface
 * showing a contest's state agrees — a hard-coded "Active" badge on one page
 * while the next one over says "Virtual" is the bug this replaces.
 */
export const CONTEST_STATUS_VARIANT: Record<ContestStatus, 'success' | 'info' | 'warning' | 'neutral'> = {
  ongoing: 'success',
  upcoming: 'info',
  virtual: 'warning',
  inactive: 'neutral',
};

export const CONTEST_STATUS_LABEL: Record<ContestStatus, string> = {
  ongoing: 'Ongoing',
  upcoming: 'Upcoming',
  virtual: 'Virtual',
  inactive: 'Inactive',
};

interface ContestStatusInput {
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
}

/**
 * Computes the current display status of a contest purely from its data.
 * Never stored in the database — always computed at call time.
 *
 * - inactive:  is_active = false
 * - upcoming:  is_active = true, now < starts_at
 * - ongoing:   is_active = true, starts_at <= now <= ends_at
 * - virtual:   is_active = true, now > ends_at  (or no time window set)
 */
/**
 * Checks whether a contest is currently in virtual status by fetching it from the database.
 * Useful on server-side to gate access for contest problems.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function isContestVirtual(supabase: any, contestId: string): Promise<boolean> {
  const { data } = await supabase
    .from('contests')
    .select('is_active, starts_at, ends_at')
    .eq('id', contestId)
    .single();
  if (!data) return false;
  const status = getContestStatus(data);
  return status === 'virtual' || status === 'inactive';
}

export function getContestStatus(contest: ContestStatusInput): ContestStatus {
  if (!contest.is_active) return 'inactive';

  const now = Date.now();
  const startsAt = contest.starts_at ? new Date(contest.starts_at).getTime() : null;
  const endsAt = contest.ends_at ? new Date(contest.ends_at).getTime() : null;

  // No time window set — treat as virtual (backward compat for old contests)
  if (startsAt === null && endsAt === null) return 'virtual';

  if (startsAt !== null && now < startsAt) return 'upcoming';

  if (startsAt !== null && endsAt !== null && now >= startsAt && now <= endsAt) {
    return 'ongoing';
  }

  // is_active=true but ends_at is in the past (or only starts_at is set with no end)
  return 'virtual';
}
