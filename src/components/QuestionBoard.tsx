"use client";

import { useMemo, useState } from "react";
import { api } from "@/lib/client";
import { notifyActivity } from "@/lib/activity";
import type { QuestionDTO } from "@/lib/types";
import { QuestionCard } from "./QuestionCard";
import { Select } from "./Select";
import { SuggestionCard } from "./SuggestionCard";
import { useToast } from "./Toast";

type Listing = { suggestion: QuestionDTO | null; questions: QuestionDTO[] };

// Default order from the spec: oldest lastRevisedAt first (ties by createdAt).
const byRevised = (a: QuestionDTO, b: QuestionDTO) =>
  a.lastRevisedAt.localeCompare(b.lastRevisedAt) || a.createdAt.localeCompare(b.createdAt);

// Difficulty sort button cycles: default → hardest first → easiest first → default.
type SortMode = "default" | "desc" | "asc";
const NEXT_SORT: Record<SortMode, SortMode> = { default: "desc", desc: "asc", asc: "default" };
const DIFFICULTY_RANK: Record<QuestionDTO["difficulty"], number> = { Easy: 1, Medium: 2, Hard: 3 };
const SORT_TEXT: Record<SortMode, { label: string; aria: string }> = {
  default: { label: "Difficulty", aria: "Sort by difficulty (currently: default order)" },
  desc: { label: "Hard → Easy", aria: "Sort by difficulty (currently: hardest first)" },
  asc: { label: "Easy → Hard", aria: "Sort by difficulty (currently: easiest first)" },
};

/**
 * Filter bar + Revision Suggestion card + question cards. Used by a folder (scope "folder")
 * and by Famous Patterns (scope "patterns"), where the suggestion spans all pattern questions.
 */
export function QuestionBoard({
  scope,
  initial,
  emptyText,
}: {
  scope: "folder" | "patterns";
  initial: Listing;
  emptyText?: string;
}) {
  const toast = useToast();
  const [suggestion, setSuggestion] = useState(initial.suggestion);
  const [questions, setQuestions] = useState(initial.questions);
  const [search, setSearch] = useState("");
  const [tag, setTag] = useState("");
  const [revising, setRevising] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);
  const [sort, setSort] = useState<SortMode>("default");

  const tagOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const q of questions) for (const t of q.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
    return [
      { value: "", label: "All tags", hint: String(questions.length) },
      ...[...counts.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([t, n]) => ({ value: t, label: t, hint: String(n) })),
    ];
  }, [questions]);

  // Client-side filtering and sorting; the suggestion card is never affected.
  const visible = useMemo(() => {
    const s = search.trim().toLowerCase();
    const filtered = questions.filter(
      (q) => (!s || q.title.toLowerCase().includes(s)) && (!tag || q.tags.includes(tag)),
    );
    if (sort === "default") return filtered;
    // Stable sort, so questions with the same difficulty keep the default order.
    const dir = sort === "desc" ? -1 : 1;
    return [...filtered].sort((a, b) => dir * (DIFFICULTY_RANK[a.difficulty] - DIFFICULTY_RANK[b.difficulty]));
  }, [questions, search, tag, sort]);

  async function markRevised(id: string) {
    setRevising(true);
    try {
      const qs = scope === "patterns" ? "?scope=patterns" : "";
      const { question, nextSuggestion } = await api<{
        question: QuestionDTO;
        nextSuggestion: QuestionDTO | null;
      }>(`/api/questions/${id}/revise${qs}`, { method: "POST" });
      setQuestions((list) =>
        list.map((q) => (q.id === question.id ? { ...q, ...question, folderName: q.folderName } : q)).sort(byRevised),
      );
      setSuggestion(nextSuggestion);
      toast("Marked as revised ✓");
      notifyActivity();
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setRevising(false);
    }
  }

  async function togglePattern(q: QuestionDTO) {
    setToggling(q.id);
    const isPattern = !q.isPattern;
    try {
      await api(`/api/questions/${q.id}`, { method: "PATCH", json: { isPattern } });
      if (scope === "patterns") {
        // Removing from Famous Patterns can change its suggestion, so reload the listing.
        const fresh = await api<Listing>("/api/patterns");
        setQuestions(fresh.questions);
        setSuggestion(fresh.suggestion);
      } else {
        setQuestions((list) => list.map((x) => (x.id === q.id ? { ...x, isPattern } : x)));
        setSuggestion((s) => (s && s.id === q.id ? { ...s, isPattern } : s));
      }
      toast(isPattern ? "Added to Famous Patterns ★" : "Removed from Famous Patterns");
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setToggling(null);
    }
  }

  return (
    <>
      {questions.length > 0 && (
        <div className="mb-4 flex flex-col gap-2 sm:flex-row">
          <div className="flex gap-2 sm:flex-1">
            <input
              type="search"
              aria-label="Search questions by title"
              placeholder="Search by title…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="min-w-0 flex-1 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:border-neutral-700 dark:bg-neutral-900"
            />
            <button
              type="button"
              onClick={() => setSort((s) => NEXT_SORT[s])}
              aria-label={SORT_TEXT[sort].aria}
              aria-pressed={sort !== "default"}
              title="Sort by difficulty: Hard → Easy, then Easy → Hard, then back to default"
              data-testid="sort-difficulty"
              className={`flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium whitespace-nowrap ${
                sort === "default"
                  ? "border-neutral-300 bg-white text-neutral-700 hover:border-neutral-400 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200"
                  : "border-indigo-400 bg-indigo-50 text-indigo-700 dark:border-indigo-600 dark:bg-indigo-950 dark:text-indigo-300"
              }`}
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                {sort === "asc" ? (
                  <path d="M12 19V5M5 12l7-7 7 7" />
                ) : sort === "desc" ? (
                  <path d="M12 5v14M19 12l-7 7-7-7" />
                ) : (
                  <path d="M7 4v16M3 8l4-4 4 4M17 20V4M21 16l-4 4-4-4" />
                )}
              </svg>
              <span data-testid="sort-label">{SORT_TEXT[sort].label}</span>
            </button>
          </div>
          <Select label="Filter by tag" value={tag} options={tagOptions} onChange={setTag} className="sm:w-56" />
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <SuggestionCard
          suggestion={suggestion}
          onMarkRevised={markRevised}
          busy={revising}
          from={scope === "patterns" ? "patterns" : "suggestion"}
          emptyText={emptyText}
        />
        {visible.map((q) => (
          <QuestionCard
            key={q.id}
            question={q}
            onTogglePattern={togglePattern}
            busy={toggling === q.id}
            showFolder={scope === "patterns"}
          />
        ))}
      </div>

      {questions.length > 0 && visible.length === 0 && (
        <p className="mt-4 text-sm text-neutral-500">No questions match the filter.</p>
      )}
    </>
  );
}
