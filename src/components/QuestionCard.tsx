"use client";

import Link from "next/link";
import { revisedShort } from "@/lib/dates";
import type { QuestionDTO } from "@/lib/types";
import { DifficultyBadge } from "./DifficultyBadge";
import { TagChips } from "./TagChips";
import { PatternToggle } from "./PatternToggle";

export function QuestionCard({
  question,
  onTogglePattern,
  busy,
  showFolder,
}: {
  question: QuestionDTO;
  onTogglePattern: (q: QuestionDTO) => void;
  busy?: boolean;
  showFolder?: boolean;
}) {
  return (
    <div
      data-testid="question-card"
      className="relative flex flex-col gap-2 rounded-xl border border-neutral-200 bg-white p-4 transition hover:border-indigo-300 hover:shadow-sm dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-indigo-700"
    >
      {/* Whole card opens the question; the Pattern switch sits above this link. */}
      <Link
        href={`/folders/${question.folderId}/questions/${question.id}`}
        className="absolute inset-0 rounded-xl"
        aria-label={question.title}
      />
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold">{question.title}</h3>
        <PatternToggle on={question.isPattern} busy={busy} onToggle={() => onTogglePattern(question)} />
      </div>
      {showFolder && question.folderName && (
        <p className="text-xs text-neutral-500">in {question.folderName}</p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <DifficultyBadge difficulty={question.difficulty} />
        <TagChips tags={question.tags} />
      </div>
      <p className="text-xs text-neutral-500" suppressHydrationWarning>
        {revisedShort(question.lastRevisedAt)}
      </p>
    </div>
  );
}
