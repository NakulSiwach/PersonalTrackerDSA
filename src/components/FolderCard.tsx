"use client";

import Link from "next/link";
import type { FolderDTO } from "@/lib/types";
import { Menu } from "./Menu";

export function FolderCard({
  folder,
  onRename,
  onDelete,
  onTogglePin,
}: {
  folder: FolderDTO;
  onRename: () => void;
  onDelete: () => void;
  onTogglePin: () => void;
}) {
  return (
    <div className="relative rounded-xl border border-neutral-200 bg-white transition hover:border-indigo-300 hover:shadow-sm dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-indigo-700">
      <Link href={`/folders/${folder.id}`} className="block p-4 pr-12" data-testid="folder-card">
        <h2 className="flex items-center gap-1.5 font-semibold">
          {folder.pinned && (
            <span title="Pinned" aria-label="Pinned" data-testid="pin-badge">
              📌
            </span>
          )}
          <span className="truncate">{folder.name}</span>
        </h2>
        <p className="mt-1 text-sm text-neutral-500">
          {folder.questionCount} {folder.questionCount === 1 ? "question" : "questions"}
        </p>
      </Link>
      <div className="absolute top-2 right-2">
        <Menu
          label={`Actions for ${folder.name}`}
          items={[
            { label: folder.pinned ? "Unpin" : "Pin to top", onSelect: onTogglePin },
            { label: "Rename", onSelect: onRename },
            { label: "Delete", onSelect: onDelete, danger: true },
          ]}
        />
      </div>
    </div>
  );
}
