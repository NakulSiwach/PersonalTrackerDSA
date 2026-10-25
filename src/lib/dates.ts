const dayFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

/** "25 Oct 2026" */
export function formatDay(date: string | Date): string {
  return dayFormat.format(new Date(date));
}

/** Whole calendar days between `date` and now, in the viewer's local time zone. */
export function daysAgo(date: string | Date, now: Date = new Date()): number {
  const d = new Date(date);
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.max(0, Math.round((today - start) / 86_400_000));
}

/** "today", "1 day ago", "43 days ago" */
export function daysAgoLabel(date: string | Date): string {
  const n = daysAgo(date);
  return n === 0 ? "today" : n === 1 ? "1 day ago" : `${n} days ago`;
}

/** Compact card form: "Revised today", "Revised 43d ago" */
export function revisedShort(date: string | Date): string {
  const n = daysAgo(date);
  return n === 0 ? "Revised today" : `Revised ${n}d ago`;
}
