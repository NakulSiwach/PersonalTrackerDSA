"use client";

import Link from "next/link";
import type { QuestionDTO } from "@/lib/types";
import { DifficultyBadge } from "./DifficultyBadge";
import { TagChips } from "./TagChips";
import { RelativeDate } from "./RelativeDate";

/**
 * Always the first card: the question revised longest ago. `from` is passed to the question
 * page so "Next suggestion →" continues in the same list (a folder, or Famous Patterns).
 */
export function SuggestionCard({
  suggestion,
  onMarkRevised,
  busy,
  from = "suggestion",
  emptyText = "Add a question to get revision suggestions.",
}: {
  suggestion: QuestionDTO | null;
  onMarkRevised: (id: string) => void;
  busy?: boolean;
  from?: "suggestion" | "patterns";
  emptyText?: string;
}) {
  const shell =
    "rounded-xl border-2 border-indigo-400 bg-indigo-50 p-4 dark:border-indigo-600 dark:bg-indigo-950/40";
  const label = (
    <p className="text-xs font-semibold tracking-wide text-indigo-700 uppercase dark:text-indigo-300">
      🔁 Revise next
    </p>
  );

  if (!suggestion) {
    return (
      <div className={shell} data-testid="suggestion-card">
        {label}
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">{emptyText}</p>
      </div>
    );
  }

  return (
    <div className={`${shell} relative flex flex-col gap-2`} data-testid="suggestion-card">
      <Link
        href={`/folders/${suggestion.folderId}/questions/${suggestion.id}?from=${from}`}
        className="absolute inset-0 rounded-xl"
        aria-label={`Open suggested question: ${suggestion.title}`}
      />
      {label}
      <h2 className="font-semibold" data-testid="suggestion-title">
        {suggestion.title}
      </h2>
      {suggestion.folderName && <p className="-mt-1 text-xs text-neutral-500">in {suggestion.folderName}</p>}
      <div className="flex flex-wrap items-center gap-2">
        <DifficultyBadge difficulty={suggestion.difficulty} />
        <TagChips tags={suggestion.tags} />
      </div>
      <p className="text-sm text-neutral-600 dark:text-neutral-300">
        Last revised: <RelativeDate date={suggestion.lastRevisedAt} />
      </p>
      <button
        type="button"
        disabled={busy}
        onClick={() => onMarkRevised(suggestion.id)}
        className="relative z-10 mt-1 self-start rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        Mark as revised
      </button>
    </div>
  );
}
