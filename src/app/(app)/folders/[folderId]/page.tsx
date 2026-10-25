import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth";
import { findSuggestion, serializeQuestion } from "@/lib/api";
import { getUserTags } from "@/lib/server-data";
import { FolderView } from "./folder-view";

export const dynamic = "force-dynamic";

export default async function FolderPage({ params }: { params: Promise<{ folderId: string }> }) {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");
  const { folderId } = await params;

  const folder = await prisma.folder.findFirst({ where: { id: folderId, userId } });
  if (!folder) notFound(); // missing or someone else's folder

  const [suggestion, questions, tags] = await Promise.all([
    findSuggestion(folderId),
    prisma.question.findMany({
      where: { folderId },
      orderBy: [{ lastRevisedAt: "asc" }, { createdAt: "asc" }],
    }),
    getUserTags(userId),
  ]);

  return (
    <FolderView
      folder={{ id: folder.id, name: folder.name }}
      initialSuggestion={suggestion ? serializeQuestion(suggestion) : null}
      initialQuestions={questions.map((q) => serializeQuestion(q))}
      tagSuggestions={tags}
    />
  );
}
