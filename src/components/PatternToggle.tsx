"use client";

/** "Pattern" on/off switch: when on, the question is also listed in Famous Patterns. */
export function PatternToggle({
  on,
  onToggle,
  busy,
  size = "sm",
}: {
  on: boolean;
  onToggle: () => void;
  busy?: boolean;
  size?: "sm" | "md";
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={on ? "Pattern: on (in Famous Patterns)" : "Pattern: off"}
      title={on ? "Remove from Famous Patterns" : "Add to Famous Patterns"}
      disabled={busy}
      data-testid="pattern-toggle"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onToggle();
      }}
      className={`relative z-10 inline-flex shrink-0 items-center gap-1.5 rounded-full border font-medium transition-colors disabled:opacity-50 ${
        size === "md" ? "px-3 py-1.5 text-sm" : "px-2 py-0.5 text-xs"
      } ${
        on
          ? "border-amber-400 bg-amber-100 text-amber-800 dark:border-amber-500 dark:bg-amber-900/50 dark:text-amber-200"
          : "border-neutral-300 text-neutral-500 hover:border-amber-400 hover:text-amber-700 dark:border-neutral-700 dark:text-neutral-400 dark:hover:text-amber-300"
      }`}
    >
      <span aria-hidden>{on ? "★" : "☆"}</span>
      Pattern
    </button>
  );
}
