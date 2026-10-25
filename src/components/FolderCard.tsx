"use client";

import Link from "next/link";
import type { FolderDTO } from "@/lib/types";
import { Menu } from "./Menu";

export function FolderCard({
  folder,
  onRename,
  onDelete,
}: {
  folder: FolderDTO;
  onRename: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="relative rounded-xl border border-neutral-200 bg-white transition hover:border-indigo-300 hover:shadow-sm dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-indigo-700">
      <Link href={`/folders/${folder.id}`} className="block p-4 pr-12" data-testid="folder-card">
        <h2 className="truncate font-semibold">{folder.name}</h2>
        <p className="mt-1 text-sm text-neutral-500">
          {folder.questionCount} {folder.questionCount === 1 ? "question" : "questions"}
        </p>
      </Link>
      <div className="absolute top-2 right-2">
        <Menu
          label={`Actions for ${folder.name}`}
          items={[
            { label: "Rename", onSelect: onRename },
            { label: "Delete", onSelect: onDelete, danger: true },
          ]}
        />
      </div>
    </div>
  );
}
