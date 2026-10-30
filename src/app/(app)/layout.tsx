import Link from "next/link";
import { LogoutButton } from "@/components/LogoutButton";
import { ThemeToggle } from "@/components/ThemeToggle";

/**
 * Shortcut to one of the user's other tools, opened in a new tab. On phones only the icon
 * shows, so the top bar fits; the name appears from the `sm` breakpoint up.
 */
function ExternalAppLink({
  href,
  label,
  title,
  testId,
  children,
}: {
  href: string;
  label: string;
  title: string;
  testId: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={title}
      aria-label={`${label} (opens in a new tab)`}
      data-testid={testId}
      className="flex h-9 min-w-9 items-center justify-center gap-1.5 rounded-lg border border-neutral-200 px-2 text-sm font-medium text-neutral-700 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 sm:px-2.5 dark:border-neutral-700 dark:text-neutral-200 dark:hover:border-indigo-700 dark:hover:bg-indigo-950 dark:hover:text-indigo-300"
    >
      <svg
        viewBox="0 0 24 24"
        className="h-4 w-4 shrink-0"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        {children}
      </svg>
      <span className="hidden sm:inline">{label}</span>
    </a>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="border-b border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-2 px-4">
          <Link href="/" className="shrink-0 font-bold text-indigo-600 dark:text-indigo-400">
            DSA Tracker
          </Link>
          <div className="flex items-center gap-1">
            <ExternalAppLink
              href="https://pomofocus.io/"
              label="Pomodoro"
              title="Open Pomofocus (Pomodoro timer) in a new tab"
              testId="pomodoro-link"
            >
              {/* Timer */}
              <circle cx="12" cy="13" r="8" />
              <path d="M12 9v4l2 2" />
              <path d="M10 2h4" />
            </ExternalAppLink>
            <ExternalAppLink
              href="https://agentic-todo-personal.vercel.app/"
              label="TaskFlow"
              title="Open TaskFlow (to-do app) in a new tab"
              testId="taskflow-link"
            >
              {/* Checked box */}
              <path d="M9 11l3 3L22 4" />
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            </ExternalAppLink>
            <ThemeToggle />
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </>
  );
}
