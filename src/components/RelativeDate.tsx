"use client";

import { daysAgoLabel, formatDay } from "@/lib/dates";

/** "25 Oct 2026 (43 days ago)". Day-level only; the full timestamp is in the tooltip. */
export function RelativeDate({ date, withAgo = true }: { date: string; withAgo?: boolean }) {
  return (
    <time dateTime={date} title={new Date(date).toLocaleString()} suppressHydrationWarning>
      {formatDay(date)}
      {withAgo && ` (${daysAgoLabel(date)})`}
    </time>
  );
}
