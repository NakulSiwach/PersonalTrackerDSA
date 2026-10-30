import Link from "next/link";
import { ExploreFeatures } from "@/components/ExploreFeatures";
import { HeaderLinks } from "@/components/HeaderLinks";
import { LogoutButton } from "@/components/LogoutButton";
import { QuickAdd } from "@/components/QuickAdd";
import { StreakButton } from "@/components/StreakButton";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="border-b border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-2 px-4">
          <div className="flex min-w-0 items-center gap-1">
            <Link href="/" className="shrink-0 font-bold text-indigo-600 dark:text-indigo-400">
              DSA Tracker
            </Link>
            <ExploreFeatures />
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <HeaderLinks />
            <StreakButton />
            <ThemeToggle />
            <LogoutButton />
          </div>
        </div>
      </header>
      {/* Bottom padding keeps the floating + button from covering the last cards. */}
      <main className="mx-auto max-w-5xl px-4 pt-6 pb-24">{children}</main>
      <QuickAdd />
    </>
  );
}
