"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";
import type { Difficulty } from "@/lib/validation";
import type { QuestionDTO } from "@/lib/types";
import { Modal } from "./Modal";
import { TagInput } from "./TagInput";
import { DifficultyPicker } from "./DifficultyPicker";

const field =
  "w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 dark:border-neutral-700 dark:bg-neutral-900";

/** Title (required), Link, Difficulty, Tags. On create, opens the new question's page. */
export function NewQuestionModal({
  folderId,
  open,
  onClose,
  tagSuggestions,
}: {
  folderId: string;
  open: boolean;
  onClose: () => void;
  tagSuggestions: string[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [link, setLink] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("Medium");
  const [tags, setTags] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const q = await api<QuestionDTO>(`/api/folders/${folderId}/questions`, {
        method: "POST",
        json: { title, link: link || null, difficulty, tags },
      });
      router.push(`/folders/${folderId}/questions/${q.id}`);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <Modal open={open} title="New question" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <label className="block space-y-1">
          <span className="text-sm font-medium">Title</span>
          <input className={field} required value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium">Link</span>
          <input
            className={field}
            type="url"
            placeholder="https://leetcode.com/problems/…"
            value={link}
            onChange={(e) => setLink(e.target.value)}
          />
        </label>
        <div className="space-y-1">
          <span className="text-sm font-medium">Difficulty</span>
          <DifficultyPicker value={difficulty} onChange={setDifficulty} />
        </div>
        <div className="space-y-1">
          <span className="text-sm font-medium">Tags</span>
          <TagInput value={tags} onChange={setTags} suggestions={tagSuggestions} />
        </div>
        {error && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="rounded-lg border px-3 py-2 text-sm dark:border-neutral-700">
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            Create
          </button>
        </div>
      </form>
    </Modal>
  );
}
