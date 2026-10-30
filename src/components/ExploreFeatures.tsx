"use client";

import { useState } from "react";
import { FEATURE_GROUPS } from "@/lib/features";
import { Modal } from "./Modal";

/** "Explore features" button next to the logo: a popup listing what the app can do. */
export function ExploreFeatures() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Explore features"
        title="What can this app do?"
        data-testid="explore-features"
        className="flex h-9 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100 hover:text-indigo-700 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-indigo-300"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M12 3l1.9 5.8L20 10l-6.1 1.2L12 17l-1.9-5.8L4 10l6.1-1.2z" />
          <path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z" />
        </svg>
        <span className="hidden sm:inline">Explore features</span>
      </button>
      <Modal open={open} title="What you can do in DSA Tracker" onClose={() => setOpen(false)} wide>
        <div className="space-y-5" data-testid="features-list">
          {FEATURE_GROUPS.map((group) => (
            <section key={group.name}>
              <h3 className="mb-2 text-xs font-semibold tracking-wide text-indigo-600 uppercase dark:text-indigo-400">
                {group.name}
              </h3>
              <ul className="grid gap-2 sm:grid-cols-2">
                {group.features.map((f) => (
                  <li
                    key={f.title}
                    className="flex gap-3 rounded-lg border border-neutral-200 p-3 dark:border-neutral-800"
                  >
                    <span className="text-xl leading-none" aria-hidden>
                      {f.icon}
                    </span>
                    <span>
                      <span className="block text-sm font-semibold">{f.title}</span>
                      <span className="block text-xs text-neutral-600 dark:text-neutral-400">{f.description}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Got it
          </button>
        </div>
      </Modal>
    </>
  );
}
