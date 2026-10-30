// Streak = consecutive days with at least one study action (a question added or revised).
// Pure functions on "YYYY-MM-DD" strings so they're easy to test.

const DAY_MS = 86_400_000;

function toTime(day: string): number {
  const [y, m, d] = day.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

export function shiftDay(day: string, delta: number): string {
  return new Date(toTime(day) + delta * DAY_MS).toISOString().slice(0, 10);
}

/** Today's date in the given IANA time zone, as YYYY-MM-DD. */
export function todayIn(timeZone: string, now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export interface StreakInfo {
  /** Days in a row up to today, or up to yesterday if today has no activity yet. */
  current: number;
  longest: number;
  activeToday: boolean;
  /** The last 14 days, oldest first. */
  recent: { day: string; active: boolean }[];
}

export function computeStreak(activeDays: string[], today: string): StreakInfo {
  const set = new Set(activeDays);
  const activeToday = set.has(today);

  // Today not done yet doesn't break the streak: count back from yesterday instead.
  let cursor = activeToday ? today : shiftDay(today, -1);
  let current = 0;
  while (set.has(cursor)) {
    current++;
    cursor = shiftDay(cursor, -1);
  }

  const sorted = [...set].sort();
  let longest = 0;
  let run = 0;
  for (let i = 0; i < sorted.length; i++) {
    run = i > 0 && shiftDay(sorted[i - 1], 1) === sorted[i] ? run + 1 : 1;
    longest = Math.max(longest, run);
  }

  const recent = Array.from({ length: 14 }, (_, i) => {
    const day = shiftDay(today, i - 13);
    return { day, active: set.has(day) };
  });

  return { current, longest, activeToday, recent };
}
