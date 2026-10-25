import type { Difficulty } from "@/lib/validation";

const STYLES: Record<Difficulty, string> = {
  Easy: "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300",
  Medium: "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300",
  Hard: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300",
};

export function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STYLES[difficulty]}`}>
      {difficulty}
    </span>
  );
}
