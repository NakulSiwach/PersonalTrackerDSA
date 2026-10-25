"use client";

import { useState } from "react";
import Link from "next/link";
import { FolderCard } from "@/components/FolderCard";
import { Modal } from "@/components/Modal";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useToast } from "@/components/Toast";
import { api } from "@/lib/client";
import type { FolderDTO } from "@/lib/types";

const byName = (a: FolderDTO, b: FolderDTO) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0);

export function FoldersView({
  initialFolders,
  patternCount,
}: {
  initialFolders: FolderDTO[];
  patternCount: number;
}) {
  const toast = useToast();
  const [folders, setFolders] = useState(initialFolders);
  const [nameModal, setNameModal] = useState<{ mode: "create" } | { mode: "rename"; folder: FolderDTO } | null>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<FolderDTO | null>(null);

  function openModal(m: NonNullable<typeof nameModal>) {
    setNameModal(m);
    setName(m.mode === "rename" ? m.folder.name : "");
    setError(null);
  }

  async function submitName(e: React.FormEvent) {
    e.preventDefault();
    if (!nameModal) return;
    try {
      if (nameModal.mode === "create") {
        const folder = await api<FolderDTO>("/api/folders", { method: "POST", json: { name } });
        setFolders((f) => [...f, folder].sort(byName));
      } else {
        const folder = await api<FolderDTO>(`/api/folders/${nameModal.folder.id}`, {
          method: "PATCH",
          json: { name },
        });
        setFolders((f) => f.map((x) => (x.id === folder.id ? folder : x)).sort(byName));
      }
      setNameModal(null);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function confirmDelete() {
    if (!toDelete) return;
    try {
      await api(`/api/folders/${toDelete.id}`, { method: "DELETE" });
      setFolders((f) => f.filter((x) => x.id !== toDelete.id));
      setToDelete(null);
    } catch (err) {
      toast((err as Error).message, "error");
    }
  }

  return (
    <>
      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Folders</h1>
        <button
          type="button"
          onClick={() => openModal({ mode: "create" })}
          className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          + New folder
        </button>
      </div>

      {/* Built-in list of every question toggled as "Pattern" (not a real folder: no rename/delete). */}
      <Link
        href="/patterns"
        data-testid="patterns-card"
        className="mb-3 flex items-center gap-3 rounded-xl border-2 border-amber-300 bg-amber-50 p-4 transition hover:border-amber-400 hover:shadow-sm dark:border-amber-700 dark:bg-amber-950/30 dark:hover:border-amber-500"
      >
        <span className="text-2xl text-amber-500" aria-hidden>
          ★
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">Famous Patterns</span>
          <span className="block text-sm text-neutral-600 dark:text-neutral-400">
            {patternCount} {patternCount === 1 ? "question" : "questions"} to revise often
          </span>
        </span>
        <span className="text-neutral-400" aria-hidden>
          →
        </span>
      </Link>

      {folders.length === 0 ? (
        <p className="rounded-xl border border-dashed border-neutral-300 p-8 text-center text-neutral-500 dark:border-neutral-700">
          No folders yet. Create one for each topic (e.g. Arrays, Graphs).
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {folders.map((folder) => (
            <FolderCard
              key={folder.id}
              folder={folder}
              onRename={() => openModal({ mode: "rename", folder })}
              onDelete={() => setToDelete(folder)}
            />
          ))}
        </div>
      )}

      <Modal
        open={!!nameModal}
        title={nameModal?.mode === "rename" ? "Rename folder" : "New folder"}
        onClose={() => setNameModal(null)}
      >
        <form onSubmit={submitName} className="space-y-3">
          <input
            aria-label="Folder name"
            placeholder="e.g. Arrays"
            value={name}
            maxLength={50}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 dark:border-neutral-700 dark:bg-neutral-900"
          />
          {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setNameModal(null)} className="rounded-lg border px-3 py-2 text-sm dark:border-neutral-700">
              Cancel
            </button>
            <button type="submit" className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700">
              {nameModal?.mode === "rename" ? "Save" : "Create"}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!toDelete}
        title="Delete folder"
        message={`Delete folder and all ${toDelete?.questionCount ?? 0} questions?`}
        onConfirm={confirmDelete}
        onClose={() => setToDelete(null)}
      />
    </>
  );
}
