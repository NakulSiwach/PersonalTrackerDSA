"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Breadcrumb } from "@/components/Breadcrumb";
import { Editor } from "@/components/Editor";
import { TagInput } from "@/components/TagInput";
import { RelativeDate } from "@/components/RelativeDate";
import { Menu } from "@/components/Menu";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useToast } from "@/components/Toast";
import { api } from "@/lib/client";
import { notifyActivity } from "@/lib/activity";
import type { Difficulty } from "@/lib/validation";
import { DifficultyPicker } from "@/components/DifficultyPicker";
import { PatternToggle } from "@/components/PatternToggle";
import type { QuestionDTO } from "@/lib/types";

type Patch = Partial<Pick<QuestionDTO, "title" | "link" | "content" | "difficulty" | "tags">>;
type SaveState = "idle" | "saving" | "saved" | "error";

const AUTOSAVE_MS = 1000;

function isValidLink(v: string): boolean {
  if (!v.trim()) return true;
  try {
    const u = new URL(v.trim());
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/** Debounced autosave (1s) that also flushes on page unload. Never touches lastRevisedAt. */
function useAutosave(questionId: string) {
  const [state, setState] = useState<SaveState>("idle");
  const pending = useRef<Patch>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = useCallback(
    async (keepalive = false) => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
      const patch = pending.current;
      if (Object.keys(patch).length === 0) return;
      pending.current = {};
      const request = fetch(`/api/questions/${questionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
        keepalive,
      });
      if (keepalive) return;
      setState("saving");
      try {
        const res = await request;
        if (!res.ok) throw new Error();
        setState(Object.keys(pending.current).length ? "saving" : "saved");
      } catch {
        pending.current = { ...patch, ...pending.current }; // keep it for the next attempt
        setState("error");
      }
    },
    [questionId],
  );

  const queue = useCallback(
    (patch: Patch) => {
      pending.current = { ...pending.current, ...patch };
      setState("saving");
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void flush(), AUTOSAVE_MS);
    },
    [flush],
  );

  useEffect(() => {
    const onHide = () => document.visibilityState === "hidden" && void flush(true);
    const onUnload = () => void flush(true);
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onUnload);
    window.addEventListener("beforeunload", onUnload);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onUnload);
      window.removeEventListener("beforeunload", onUnload);
      void flush(true); // leaving the page inside the app
    };
  }, [flush]);

  return { state, queue, flush };
}

export function QuestionView({
  folder,
  initialQuestion,
  from,
  tagSuggestions,
}: {
  folder: { id: string; name: string };
  initialQuestion: QuestionDTO;
  /** "suggestion" = opened from a folder's suggestion card, "patterns" = from Famous Patterns. */
  from: "suggestion" | "patterns" | null;
  tagSuggestions: string[];
}) {
  const router = useRouter();
  const toast = useToast();
  const q = initialQuestion;
  const { state, queue, flush } = useAutosave(q.id);

  const [title, setTitle] = useState(q.title);
  const titleRef = useRef<HTMLTextAreaElement>(null);

  // Grow the title box so long titles are shown in full instead of cut off.
  useEffect(() => {
    const el = titleRef.current;
    if (!el) return;
    const fit = () => {
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [title]);

  const [link, setLink] = useState(q.link ?? "");
  const [difficulty, setDifficulty] = useState<Difficulty>(q.difficulty);
  const [tags, setTags] = useState(q.tags);
  const [isPattern, setIsPattern] = useState(q.isPattern);
  const [lastRevisedAt, setLastRevisedAt] = useState(q.lastRevisedAt);
  const [next, setNext] = useState<QuestionDTO | null>(null);
  const [revising, setRevising] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const linkOk = isValidLink(link);
  const otherTags = tagSuggestions.filter((t) => !tags.includes(t));

  async function markRevised() {
    setRevising(true);
    try {
      await flush();
      const res = await api<{ question: QuestionDTO; nextSuggestion: QuestionDTO | null }>(
        `/api/questions/${q.id}/revise${from === "patterns" ? "?scope=patterns" : ""}`,
        { method: "POST" },
      );
      setLastRevisedAt(res.question.lastRevisedAt);
      setNext(res.nextSuggestion);
      toast("Marked as revised ✓");
      notifyActivity();
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setRevising(false);
    }
  }

  async function deleteQuestion() {
    try {
      await api(`/api/questions/${q.id}`, { method: "DELETE" });
      router.push(`/folders/${folder.id}`);
      router.refresh();
    } catch (err) {
      toast((err as Error).message, "error");
    }
  }

  const field =
    "w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:border-neutral-700 dark:bg-neutral-900";

  return (
    <>
      <Breadcrumb
        items={[
          { label: "Folders", href: "/" },
          from === "patterns"
            ? { label: "Famous Patterns", href: "/patterns" }
            : { label: folder.name, href: `/folders/${folder.id}` },
          { label: title || q.title },
        ]}
      />

      {/* Metadata panel */}
      <section className="mb-5 space-y-4 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
        {/* On phones the title gets its own full-width line; the controls wrap below it. */}
        <div className="flex flex-wrap items-start gap-2 sm:flex-nowrap">
          <textarea
            ref={titleRef}
            rows={1}
            aria-label="Title"
            value={title}
            onChange={(e) => {
              const value = e.target.value.replace(/\s*\n\s*/g, " "); // titles stay one line, even when pasted
              setTitle(value);
              if (value.trim()) queue({ title: value.trim() });
            }}
            onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
            onBlur={() => !title.trim() && setTitle(q.title)}
            className="w-full min-w-0 resize-none overflow-hidden rounded-lg bg-transparent px-1 text-2xl font-bold break-words outline-none focus:ring-2 focus:ring-indigo-500 sm:w-auto sm:flex-1"
          />
          <div className="ml-auto flex shrink-0 items-start gap-2">
            <span className="mt-2 shrink-0 text-xs text-neutral-500" role="status" aria-live="polite" data-testid="save-status">
              {state === "saving" ? "Saving…" : state === "saved" ? "Saved" : state === "error" ? "Save failed" : ""}
            </span>
            <PatternToggle
              size="md"
              on={isPattern}
              onToggle={async () => {
                const nextValue = !isPattern;
                setIsPattern(nextValue);
                try {
                  await api(`/api/questions/${q.id}`, { method: "PATCH", json: { isPattern: nextValue } });
                  toast(nextValue ? "Added to Famous Patterns ★" : "Removed from Famous Patterns");
                } catch (err) {
                  setIsPattern(!nextValue);
                  toast((err as Error).message, "error");
                }
              }}
            />
            <Menu label="Question actions" items={[{ label: "Delete question", onSelect: () => setConfirmDelete(true), danger: true }]} />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1">
            <span className="text-sm font-medium">Link</span>
            <input
              type="url"
              value={link}
              placeholder="https://leetcode.com/problems/…"
              onChange={(e) => {
                setLink(e.target.value);
                if (isValidLink(e.target.value)) queue({ link: e.target.value.trim() || null });
              }}
              aria-invalid={!linkOk}
              className={field}
            />
            {!linkOk && <span className="text-xs text-red-600 dark:text-red-400">Enter a valid http(s) URL</span>}
            {linkOk && link.trim() && (
              <a
                href={link.trim()}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block text-sm text-indigo-600 hover:underline dark:text-indigo-400"
              >
                Open problem ↗
              </a>
            )}
          </label>
          <div className="space-y-1">
            <span className="text-sm font-medium">Difficulty</span>
            <DifficultyPicker
              value={difficulty}
              onChange={(d) => {
                setDifficulty(d);
                queue({ difficulty: d });
              }}
            />
          </div>
        </div>

        <div className="space-y-1">
          <span className="text-sm font-medium">Tags</span>
          <TagInput
            value={tags}
            suggestions={otherTags}
            onChange={(t) => {
              setTags(t);
              queue({ tags: t });
            }}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-neutral-200 pt-4 dark:border-neutral-800">
          <p className="text-sm" data-testid="last-revised">
            <span className="font-medium">Last revised:</span> <RelativeDate date={lastRevisedAt} withAgo={false} />
          </p>
          <button
            type="button"
            onClick={markRevised}
            disabled={revising}
            className={
              from
                ? "rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-indigo-700 disabled:opacity-50"
                : "rounded-lg border border-indigo-300 px-3 py-1.5 text-sm font-medium text-indigo-700 hover:bg-indigo-50 disabled:opacity-50 dark:border-indigo-700 dark:text-indigo-300 dark:hover:bg-indigo-950"
            }
          >
            Mark as revised today
          </button>
          {from && next && (
            <Link
              href={`/folders/${next.folderId}/questions/${next.id}?from=${from}`}
              className="text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400"
            >
              Next suggestion →
            </Link>
          )}
        </div>
      </section>

      <Editor
        content={q.content ?? "{}"}
        onChange={(json) => queue({ content: json })}
        onError={(m) => toast(m, "error")}
      />

      <ConfirmDialog
        open={confirmDelete}
        title="Delete question"
        message={`Delete "${title || q.title}"? This can't be undone.`}
        onConfirm={deleteQuestion}
        onClose={() => setConfirmDelete(false)}
      />
    </>
  );
}
