"use client";

import { useMemo, useState } from "react";
import { api } from "@/lib/client";
import type { QuestionDTO } from "@/lib/types";
import { QuestionCard } from "./QuestionCard";
import { Select } from "./Select";
import { SuggestionCard } from "./SuggestionCard";
import { useToast } from "./Toast";

type Listing = { suggestion: QuestionDTO | null; questions: QuestionDTO[] };

// Default order from the spec: oldest lastRevisedAt first (ties by createdAt).
const byRevised = (a: QuestionDTO, b: QuestionDTO) =>
  a.lastRevisedAt.localeCompare(b.lastRevisedAt) || a.createdAt.localeCompare(b.createdAt);

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

  // Client-side filtering; the suggestion card is never filtered.
  const visible = useMemo(() => {
    const s = search.trim().toLowerCase();
    return questions.filter(
      (q) => (!s || q.title.toLowerCase().includes(s)) && (!tag || q.tags.includes(tag)),
    );
  }, [questions, search, tag]);

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
          <input
            type="search"
            aria-label="Search questions by title"
            placeholder="Search by title…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 sm:flex-1 dark:border-neutral-700 dark:bg-neutral-900"
          />
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
