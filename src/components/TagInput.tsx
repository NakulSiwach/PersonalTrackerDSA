"use client";

import { useId, useMemo, useState } from "react";
import { normalizeTag } from "@/lib/validation";

const MAX_TAGS = 10;

/**
 * Chip input: Enter or comma adds a tag, × removes one. While typing, a suggestion list shows
 * tags already used in the user's other questions (↑/↓ to move, Enter to pick, Esc to close).
 */
export function TagInput({
  value,
  onChange,
  suggestions = [],
}: {
  value: string[];
  onChange: (tags: string[]) => void;
  suggestions?: string[];
}) {
  const [draft, setDraft] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const listId = useId();
  const full = value.length >= MAX_TAGS;

  const matches = useMemo(() => {
    const q = normalizeTag(draft);
    return suggestions
      .filter((s) => !value.includes(s) && (!q || s.includes(q)))
      .slice(0, 8);
  }, [draft, suggestions, value]);

  const add = (raw: string) => {
    const next = [...value];
    for (const part of raw.split(",")) {
      const tag = normalizeTag(part).slice(0, 30);
      if (tag && !next.includes(tag) && next.length < MAX_TAGS) next.push(tag);
    }
    if (next.length !== value.length) onChange(next);
    setDraft("");
    setActive(-1);
  };

  const showList = open && !full && matches.length > 0;

  return (
    <div className="relative">
      <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-2 py-1.5 focus-within:ring-2 focus-within:ring-indigo-500 dark:border-neutral-700 dark:bg-neutral-900">
        {value.map((tag) => (
          <span
            key={tag}
            className="flex items-center gap-1 rounded-full bg-indigo-50 py-0.5 pr-1 pl-2.5 text-xs font-medium text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200"
          >
            {tag}
            <button
              type="button"
              aria-label={`Remove tag ${tag}`}
              onClick={() => onChange(value.filter((t) => t !== tag))}
              className="flex h-5 w-5 items-center justify-center rounded-full hover:bg-indigo-100 dark:hover:bg-indigo-900"
            >
              ×
            </button>
          </span>
        ))}
        <input
          value={draft}
          role="combobox"
          aria-label="Add tag"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          placeholder={full ? "Max 10 tags" : "Add tag…"}
          disabled={full}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            setOpen(false);
            if (draft.trim()) add(draft);
          }}
          onChange={(e) => {
            setOpen(true);
            setActive(-1);
            if (e.target.value.includes(",")) add(e.target.value);
            else setDraft(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown" && matches.length) {
              e.preventDefault();
              setOpen(true);
              setActive((a) => (a + 1) % matches.length);
            } else if (e.key === "ArrowUp" && matches.length) {
              e.preventDefault();
              setActive((a) => (a <= 0 ? matches.length - 1 : a - 1));
            } else if (e.key === "Enter") {
              e.preventDefault();
              if (showList && active >= 0) add(matches[active]);
              else if (draft.trim()) add(draft);
            } else if (e.key === "Escape") {
              setOpen(false);
            } else if (e.key === "Backspace" && !draft && value.length) {
              onChange(value.slice(0, -1));
            }
          }}
          className="min-w-24 flex-1 bg-transparent py-0.5 text-sm outline-none"
        />
      </div>
      {showList && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Tag suggestions"
          className="absolute z-30 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-neutral-200 bg-white py-1 shadow-lg dark:border-neutral-700 dark:bg-neutral-900"
        >
          <li className="px-3 pt-1 pb-1.5 text-[11px] font-semibold tracking-wide text-neutral-400 uppercase">
            Your tags
          </li>
          {matches.map((tag, i) => (
            <li
              key={tag}
              role="option"
              aria-selected={i === active}
              onMouseEnter={() => setActive(i)}
              onMouseDown={(e) => e.preventDefault()} // keep focus in the input
              onClick={() => add(tag)}
              className={`cursor-pointer px-3 py-1.5 text-sm ${i === active ? "bg-indigo-50 dark:bg-indigo-950/60" : ""}`}
            >
              <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs dark:bg-neutral-800">{tag}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
