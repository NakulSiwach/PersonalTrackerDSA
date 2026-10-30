"use client";

import { useEffect, useRef, useState } from "react";

/**
 * "Download" button on a folder page:
 * - PDF: opens a print-ready page of all notes in a new tab; choose "Save as PDF".
 * - HTML file: one click saves a single file with every note and image, viewable offline.
 */
export function DownloadFolder({ folderId }: { folderId: string }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

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

  const base = `/api/folders/${folderId}/export`;

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        data-testid="download-folder"
        title="Download all notes in this folder"
        className="flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-700 hover:border-indigo-300 hover:text-indigo-700 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:text-indigo-300"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M12 3v12M7 10l5 5 5-5M5 21h14" />
        </svg>
        <span className="hidden sm:inline">Download</span>
        <span className="sr-only sm:hidden">Download</span>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-1 w-64 overflow-hidden rounded-xl border border-neutral-200 bg-white py-1 shadow-xl dark:border-neutral-700 dark:bg-neutral-900"
        >
          <a
            role="menuitem"
            href={`${base}?format=print`}
            target="_blank"
            rel="noopener"
            onClick={() => setOpen(false)}
            className="block px-3 py-2.5 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            <span className="block text-sm font-medium">📄 PDF</span>
            <span className="block text-xs text-neutral-500">Opens a print view: choose &quot;Save as PDF&quot;</span>
          </a>
          <a
            role="menuitem"
            href={`${base}?format=html`}
            download
            onClick={() => setOpen(false)}
            className="block px-3 py-2.5 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            <span className="block text-sm font-medium">🌐 HTML file</span>
            <span className="block text-xs text-neutral-500">One file with all notes and images; opens in any browser</span>
          </a>
        </div>
      )}
    </div>
  );
}
