"use client";

import { useEffect, useRef, useState } from "react";

interface StudyLink {
  label: string;
  href: string;
  title: string;
  testId: string;
  icon: React.ReactNode;
}

// Order matters: shown left to right in the top bar.
const LINKS: StudyLink[] = [
  {
    label: "Striver A2Z",
    href: "https://takeuforward.org/prep-hub/strivers-a2z-dsa-sheet?page=sheet",
    title: "Open Striver's A2Z DSA sheet in a new tab",
    testId: "striver-link",
    icon: (
      <>
        {/* Sheet / checklist */}
        <path d="M9 6h11M9 12h11M9 18h11" />
        <path d="M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2" />
      </>
    ),
  },
  {
    label: "Neetcode 250",
    href: "https://neetcode.io/practice/practice/neetcode250",
    title: "Open the NeetCode 250 list in a new tab",
    testId: "neetcode-link",
    icon: (
      <>
        {/* Code brackets */}
        <path d="M8 6l-6 6 6 6M16 6l6 6-6 6" />
      </>
    ),
  },
  {
    label: "Pomodoro",
    href: "https://pomofocus.io/",
    title: "Open Pomofocus (Pomodoro timer) in a new tab",
    testId: "pomodoro-link",
    icon: (
      <>
        {/* Timer */}
        <circle cx="12" cy="13" r="8" />
        <path d="M12 9v4l2 2" />
        <path d="M10 2h4" />
      </>
    ),
  },
  {
    label: "TaskFlow",
    href: "https://agentic-todo-personal.vercel.app/",
    title: "Open TaskFlow (to-do app) in a new tab",
    testId: "taskflow-link",
    icon: (
      <>
        {/* Checked box */}
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </>
    ),
  },
];

const Icon = ({ children }: { children: React.ReactNode }) => (
  <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    {children}
  </svg>
);

/**
 * Shortcuts to the user's other study tools, each opening in a new tab.
 * Phones: one "grid" button with a menu. Tablets: icons. Laptops (lg+): icons with names.
 */
export function HeaderLinks() {
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

  return (
    <>
      {/* Tablet and up: one button per link */}
      <div className="hidden items-center gap-1 sm:flex">
        {LINKS.map((l) => (
          <a
            key={l.href}
            href={l.href}
            target="_blank"
            rel="noopener noreferrer"
            title={l.title}
            aria-label={`${l.label} (opens in a new tab)`}
            data-testid={l.testId}
            className="flex h-9 min-w-9 items-center justify-center gap-1.5 rounded-lg border border-neutral-200 px-2 text-sm font-medium whitespace-nowrap text-neutral-700 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 lg:px-2.5 dark:border-neutral-700 dark:text-neutral-200 dark:hover:border-indigo-700 dark:hover:bg-indigo-950 dark:hover:text-indigo-300"
          >
            <Icon>{l.icon}</Icon>
            <span className="hidden lg:inline">{l.label}</span>
          </a>
        ))}
      </div>

      {/* Phones: a single menu so the top bar fits */}
      <div ref={root} className="relative sm:hidden">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label="Study links"
          aria-haspopup="menu"
          aria-expanded={open}
          data-testid="links-menu"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 text-neutral-700 dark:border-neutral-700 dark:text-neutral-200"
        >
          <Icon>
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
          </Icon>
        </button>
        {open && (
          <div
            role="menu"
            className="absolute right-0 z-40 mt-2 w-52 overflow-hidden rounded-xl border border-neutral-200 bg-white py-1 shadow-xl dark:border-neutral-700 dark:bg-neutral-900"
          >
            {LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                target="_blank"
                rel="noopener noreferrer"
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2.5 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                <Icon>{l.icon}</Icon>
                {l.label}
              </a>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
