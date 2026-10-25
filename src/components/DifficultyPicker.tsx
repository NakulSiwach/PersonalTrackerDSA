"use client";

import { useRef } from "react";
import { DIFFICULTIES, type Difficulty } from "@/lib/validation";

const SELECTED: Record<Difficulty, string> = {
  Easy: "bg-green-600 text-white border-green-600 dark:bg-green-600",
  Medium: "bg-amber-500 text-white border-amber-500 dark:bg-amber-500",
  Hard: "bg-red-600 text-white border-red-600 dark:bg-red-600",
};

const IDLE: Record<Difficulty, string> = {
  Easy: "text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-950",
  Medium: "text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950",
  Hard: "text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950",
};

/** Segmented Easy / Medium / Hard control (a radio group; arrow keys move the choice). */
export function DifficultyPicker({
  value,
  onChange,
  label = "Difficulty",
}: {
  value: Difficulty;
  onChange: (d: Difficulty) => void;
  label?: string;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  function onKeyDown(e: React.KeyboardEvent, index: number) {
    const delta = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!delta) return;
    e.preventDefault();
    const next = (index + delta + DIFFICULTIES.length) % DIFFICULTIES.length;
    onChange(DIFFICULTIES[next]);
    refs.current[next]?.focus();
  }

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="grid grid-cols-3 gap-1 rounded-lg border border-neutral-300 bg-white p-1 dark:border-neutral-700 dark:bg-neutral-900"
    >
      {DIFFICULTIES.map((d, i) => {
        const selected = d === value;
        return (
          <button
            key={d}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(d)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={`rounded-md border px-2 py-1.5 text-sm font-semibold transition-colors ${
              selected ? SELECTED[d] : `border-transparent ${IDLE[d]}`
            }`}
          >
            {d}
          </button>
        );
      })}
    </div>
  );
}
