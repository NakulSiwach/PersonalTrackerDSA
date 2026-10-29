import Link from "next/link";
import { LogoutButton } from "@/components/LogoutButton";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="border-b border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <Link href="/" className="font-bold text-indigo-600 dark:text-indigo-400">
            DSA Tracker
          </Link>
          <div className="flex items-center gap-1">
            {/* Shortcut to the user's separate TaskFlow to-do app. */}
            <a
              href="https://agentic-todo-personal.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              title="Open TaskFlow (to-do app) in a new tab"
              data-testid="taskflow-link"
              className="flex h-9 items-center gap-1.5 rounded-lg border border-neutral-200 px-2.5 text-sm font-medium text-neutral-700 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 dark:border-neutral-700 dark:text-neutral-200 dark:hover:border-indigo-700 dark:hover:bg-indigo-950 dark:hover:text-indigo-300"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M9 11l3 3L22 4" />
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
              </svg>
              TaskFlow
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
            <ThemeToggle />
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </>
  );
}
