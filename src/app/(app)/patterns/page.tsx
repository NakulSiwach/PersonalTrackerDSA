import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth";
import { findPatternSuggestion, serializeQuestion } from "@/lib/api";
import { Breadcrumb } from "@/components/Breadcrumb";
import { QuestionBoard } from "@/components/QuestionBoard";

export const dynamic = "force-dynamic";

/** Famous Patterns: every question marked "Pattern", across all folders (linked, not copied). */
export default async function PatternsPage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");

  const [suggestion, questions] = await Promise.all([
    findPatternSuggestion(userId),
    prisma.question.findMany({
      where: { isPattern: true, folder: { userId } },
      orderBy: [{ lastRevisedAt: "asc" }, { createdAt: "asc" }],
      include: { folder: { select: { name: true } } },
    }),
  ]);

  return (
    <>
      <Breadcrumb items={[{ label: "Folders", href: "/" }, { label: "Famous Patterns" }]} />
      <div className="mb-5">
        <h1 className="text-2xl font-bold">
          <span className="text-amber-500" aria-hidden>
            ★{" "}
          </span>
          Famous Patterns
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Questions you marked as <b>Pattern</b>, from every folder. Revising one here also updates it in
          its own folder.
        </p>
      </div>
      <QuestionBoard
        scope="patterns"
        emptyText="Turn on Pattern on any question to add it here."
        initial={{
          suggestion: suggestion ? { ...serializeQuestion(suggestion), folderName: suggestion.folder.name } : null,
          questions: questions.map((q) => ({ ...serializeQuestion(q), folderName: q.folder.name })),
        }}
      />
    </>
  );
}
