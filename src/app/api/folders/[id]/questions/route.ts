import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { findSuggestion, getOwnedFolder, handler, requireUserId, serializeQuestion } from "@/lib/api";
import { createQuestionSchema } from "@/lib/validation";

type Params = { id: string };

export const GET = handler<Params>(async (_req, { params }) => {
  const userId = await requireUserId();
  const { id } = await params;
  await getOwnedFolder(userId, id);
  const [suggestion, questions] = await Promise.all([
    findSuggestion(id),
    prisma.question.findMany({
      where: { folderId: id },
      orderBy: [{ lastRevisedAt: "asc" }, { createdAt: "asc" }],
    }),
  ]);
  // Cards don't need the note body, so `content` is left out of this list.
  return NextResponse.json({
    suggestion: suggestion ? serializeQuestion(suggestion) : null,
    questions: questions.map((q) => serializeQuestion(q)),
  });
});

export const POST = handler<Params>(async (req, { params }) => {
  const userId = await requireUserId();
  const { id } = await params;
  await getOwnedFolder(userId, id);
  const input = createQuestionSchema.parse(await req.json());
  const question = await prisma.question.create({
    data: {
      folderId: id,
      title: input.title,
      link: input.link,
      difficulty: input.difficulty ?? "Medium",
      tags: JSON.stringify(input.tags ?? []),
    },
  });
  return NextResponse.json(serializeQuestion(question, true), { status: 201 });
});
