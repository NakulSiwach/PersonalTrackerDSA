"use client";

import { useState } from "react";
import { Breadcrumb } from "@/components/Breadcrumb";
import { QuestionBoard } from "@/components/QuestionBoard";
import { NewQuestionModal } from "@/components/NewQuestionModal";
import type { QuestionDTO } from "@/lib/types";

export function FolderView({
  folder,
  initialSuggestion,
  initialQuestions,
  tagSuggestions,
}: {
  folder: { id: string; name: string };
  initialSuggestion: QuestionDTO | null;
  initialQuestions: QuestionDTO[];
  tagSuggestions: string[];
}) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <Breadcrumb items={[{ label: "Folders", href: "/" }, { label: folder.name }]} />
      <div className="mb-5 flex items-center justify-between gap-3">
        <h1 className="truncate text-2xl font-bold">{folder.name}</h1>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="shrink-0 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          + New question
        </button>
      </div>

      <QuestionBoard scope="folder" initial={{ suggestion: initialSuggestion, questions: initialQuestions }} />

      <NewQuestionModal
        folderId={folder.id}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        tagSuggestions={tagSuggestions}
      />
    </>
  );
}
