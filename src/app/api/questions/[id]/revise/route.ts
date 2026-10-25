import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  findPatternSuggestion,
  findSuggestion,
  getOwnedQuestion,
  handler,
  requireUserId,
  serializeQuestion,
} from "@/lib/api";

type Params = { id: string };

/**
 * Marks a question as revised now and returns the next suggestion. By default that's the
 * folder's oldest question; with `?scope=patterns` it's the oldest across Famous Patterns.
 */
export const POST = handler<Params>(async (req, { params }) => {
  const userId = await requireUserId();
  const { id } = await params;
  const existing = await getOwnedQuestion(userId, id);
  const question = await prisma.question.update({
    where: { id },
    data: { lastRevisedAt: new Date() },
  });

  if (new URL(req.url).searchParams.get("scope") === "patterns") {
    const next = await findPatternSuggestion(userId);
    return NextResponse.json({
      question: serializeQuestion(question),
      nextSuggestion: next ? { ...serializeQuestion(next), folderName: next.folder.name } : null,
    });
  }

  const next = await findSuggestion(existing.folderId);
  return NextResponse.json({
    question: serializeQuestion(question),
    nextSuggestion: next ? serializeQuestion(next) : null,
  });
});
