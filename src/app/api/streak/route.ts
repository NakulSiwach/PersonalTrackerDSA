import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handler, requireUserId } from "@/lib/api";
import { computeStreak, isValidTimeZone, todayIn } from "@/lib/streak";

/**
 * GET /api/streak?tz=Asia/Kolkata → { current, longest, activeToday, recent }.
 * Days are counted in the viewer's time zone, so "today" matches their own clock.
 */
export const GET = handler(async (req) => {
  const userId = await requireUserId();
  const requested = new URL(req.url).searchParams.get("tz") ?? "UTC";
  const tz = isValidTimeZone(requested) ? requested : "UTC";

  // Timestamps are stored as UTC; convert each to a calendar day in the viewer's zone.
  const rows = await prisma.$queryRaw<{ day: Date }[]>`
    SELECT DISTINCT ((e."at" AT TIME ZONE 'UTC') AT TIME ZONE ${tz})::date AS "day"
    FROM "ActivityEvent" e
    WHERE e."userId" = ${userId}
    ORDER BY "day" DESC
    LIMIT 1000`;
  const days = rows.map((r) => new Date(r.day).toISOString().slice(0, 10));

  return NextResponse.json(computeStreak(days, todayIn(tz)));
});
