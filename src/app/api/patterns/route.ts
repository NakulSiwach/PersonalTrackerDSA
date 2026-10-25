import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { findPatternSuggestion, handler, requireUserId, serializeQuestion } from "@/lib/api";

/**
 * The "Famous Patterns" folder: every question the user toggled as a pattern, from any folder.
 * These are the same questions (not copies), so revising one here updates it everywhere.
 */
export const GET = handler(async () => {
  const userId = await requireUserId();
  const [suggestion, questions] = await Promise.all([
    findPatternSuggestion(userId),
    prisma.question.findMany({
      where: { isPattern: true, folder: { userId } },
      orderBy: [{ lastRevisedAt: "asc" }, { createdAt: "asc" }],
      include: { folder: { select: { name: true } } },
    }),
  ]);
  return NextResponse.json({
    suggestion: suggestion ? { ...serializeQuestion(suggestion), folderName: suggestion.folder.name } : null,
    questions: questions.map((q) => ({ ...serializeQuestion(q), folderName: q.folder.name })),
  });
});
