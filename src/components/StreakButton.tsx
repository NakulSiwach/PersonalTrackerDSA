"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ACTIVITY_EVENT } from "@/lib/activity";
import type { StreakInfo } from "@/lib/streak";

const dayLabel = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short" });

/**
 * 🔥 N: days in a row with at least one question added or revised. Click for details.
 * Refreshes whenever a question is added or revised (see lib/activity.ts).
 */
export function StreakButton() {
  const [info, setInfo] = useState<StreakInfo | null>(null);
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const res = await fetch(`/api/streak?tz=${encodeURIComponent(tz)}`);
      if (res.ok) setInfo(await res.json());
    } catch {
      /* offline: keep the last value */
    }
  }, []);

  useEffect(() => {
    void load();
    window.addEventListener(ACTIVITY_EVENT, load);
    return () => window.removeEventListener(ACTIVITY_EVENT, load);
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !root.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const current = info?.current ?? 0;
  const lit = !!info?.activeToday;

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Streak: ${current} ${current === 1 ? "day" : "days"}${lit ? ", done today" : ", not done today yet"}`}
        title="Your streak: days in a row with a question added or revised"
        data-testid="streak-button"
        className={`flex h-9 items-center gap-1 rounded-lg px-2 text-sm font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-800 ${
          lit ? "text-orange-600 dark:text-orange-400" : "text-neutral-400 dark:text-neutral-500"
        }`}
      >
        <span aria-hidden className={lit ? "" : "grayscale"}>
          🔥
        </span>
        <span data-testid="streak-count">{current}</span>
      </button>

      {open && info && (
        <div
          role="dialog"
          aria-label="Streak details"
          className="absolute right-0 z-40 mt-2 w-72 rounded-xl border border-neutral-200 bg-white p-4 shadow-xl dark:border-neutral-700 dark:bg-neutral-900"
        >
          <div className="flex items-baseline justify-between">
            <p className="text-2xl font-bold">
              🔥 {info.current} <span className="text-sm font-medium text-neutral-500">{info.current === 1 ? "day" : "days"}</span>
            </p>
            <p className="text-xs text-neutral-500">Best: {info.longest}</p>
          </div>
          <p
            className={`mt-1 text-sm ${lit ? "text-green-700 dark:text-green-400" : "text-amber-700 dark:text-amber-400"}`}
            data-testid="streak-today"
          >
            {lit ? "✓ Done for today. Nice!" : "Not done today: revise or add a question to keep it going."}
          </p>
          <p className="mt-3 mb-1.5 text-xs font-medium text-neutral-500">Last 14 days</p>
          <div className="grid grid-cols-7 gap-1.5">
            {info.recent.map((d) => (
              <span
                key={d.day}
                title={`${dayLabel.format(new Date(`${d.day}T12:00:00`))}${d.active ? ": active" : ""}`}
                className={`h-6 rounded ${
                  d.active ? "bg-orange-500 dark:bg-orange-500" : "bg-neutral-100 dark:bg-neutral-800"
                }`}
              />
            ))}
          </div>
          <p className="mt-3 text-xs text-neutral-500">
            A day counts when you add a new question or mark one as revised.
          </p>
        </div>
      )}
    </div>
  );
}
