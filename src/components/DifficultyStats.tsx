import type { Difficulty } from "@/lib/validation";

export type DifficultyCounts = Record<Difficulty, number>;

/** Counts questions per difficulty (every question added counts as solved). */
export function countByDifficulty(questions: { difficulty: string }[]): DifficultyCounts {
  const counts: DifficultyCounts = { Easy: 0, Medium: 0, Hard: 0 };
  for (const q of questions) {
    if (q.difficulty in counts) counts[q.difficulty as Difficulty]++;
  }
  return counts;
}

const TILES: { key: Difficulty; text: string; bar: string }[] = [
  { key: "Easy", text: "text-green-600 dark:text-green-400", bar: "bg-green-500" },
  { key: "Medium", text: "text-amber-600 dark:text-amber-400", bar: "bg-amber-500" },
  { key: "Hard", text: "text-red-600 dark:text-red-400", bar: "bg-red-500" },
];

/** Small "solved" summary: total plus Easy / Medium / Hard, with a proportion bar. */
export function DifficultyStats({ counts, label }: { counts: DifficultyCounts; label: string }) {
  const total = counts.Easy + counts.Medium + counts.Hard;
  return (
    <section
      aria-label={label}
      data-testid="difficulty-stats"
      className="mb-5 rounded-xl border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900"
    >
      <div className="grid grid-cols-4 divide-x divide-neutral-200 text-center dark:divide-neutral-800">
        <div className="px-1">
          <div className="text-xl font-bold" data-testid="stat-total">
            {total}
          </div>
          <div className="text-xs text-neutral-500">Solved</div>
        </div>
        {TILES.map((t) => (
          <div key={t.key} className="px-1">
            <div className={`text-xl font-bold ${t.text}`} data-testid={`stat-${t.key.toLowerCase()}`}>
              {counts[t.key]}
            </div>
            <div className="text-xs text-neutral-500">{t.key}</div>
          </div>
        ))}
      </div>
      {total > 0 && (
        <div className="mt-3 flex h-1.5 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800" aria-hidden>
          {TILES.map((t) =>
            counts[t.key] ? (
              <div key={t.key} className={t.bar} style={{ width: `${(counts[t.key] / total) * 100}%` }} />
            ) : null,
          )}
        </div>
      )}
    </section>
  );
}
