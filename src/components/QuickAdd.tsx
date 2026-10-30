"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { api } from "@/lib/client";
import type { FolderDTO } from "@/lib/types";
import { NewQuestionModal } from "./NewQuestionModal";
import { useToast } from "./Toast";

function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  return el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName);
}

/**
 * Quick-add from anywhere: a floating "+" button, or press N (Alt+N also works).
 * Browsers keep Ctrl+N for "new window" and don't pass it to web pages, so it can't be used.
 */
export function QuickAdd() {
  const toast = useToast();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [folders, setFolders] = useState<FolderDTO[] | undefined>(undefined);
  const [tags, setTags] = useState<string[]>([]);

  // Inside a folder or one of its questions, preselect that folder.
  const currentFolder = /^\/folders\/([^/]+)/.exec(pathname)?.[1];

  const openModal = useCallback(async () => {
    try {
      const [f, t] = await Promise.all([api<FolderDTO[]>("/api/folders"), api<string[]>("/api/tags")]);
      setFolders(f);
      setTags(t);
      setOpen(true);
    } catch (err) {
      toast((err as Error).message, "error");
    }
  }, [toast]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== "n" || e.shiftKey || e.metaKey) return;
      const plainN = !e.ctrlKey && !e.altKey && !isTyping(e.target);
      const withModifier = e.altKey || e.ctrlKey; // Ctrl+N only reaches us in some setups
      if (!plainN && !withModifier) return;
      if (open || document.querySelector('[role="dialog"][aria-modal="true"]')) return;
      e.preventDefault();
      void openModal();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, openModal]);

  return (
    <>
      <button
        type="button"
        onClick={() => void openModal()}
        aria-label="Quick add a question (N)"
        title="Add a question (press N)"
        data-testid="quick-add"
        className="fixed right-5 bottom-5 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 transition hover:scale-105 hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-300 focus:outline-none dark:focus:ring-indigo-800"
      >
        <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>
      <NewQuestionModal
        open={open}
        onClose={() => setOpen(false)}
        folders={folders}
        defaultFolderId={folders?.some((f) => f.id === currentFolder) ? currentFolder : undefined}
        tagSuggestions={tags}
      />
    </>
  );
}
