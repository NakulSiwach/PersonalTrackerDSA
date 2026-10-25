import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getOwnedQuestion, handler, requireUserId, serializeQuestion } from "@/lib/api";
import { updateQuestionSchema } from "@/lib/validation";

type Params = { id: string };

export const GET = handler<Params>(async (_req, { params }) => {
  const userId = await requireUserId();
  const { id } = await params;
  const question = await getOwnedQuestion(userId, id);
  return NextResponse.json(serializeQuestion(question, true));
});

export const PATCH = handler<Params>(async (req, { params }) => {
  const userId = await requireUserId();
  const { id } = await params;
  await getOwnedQuestion(userId, id);
  const body = (await req.json()) as Record<string, unknown>;
  const input = updateQuestionSchema.parse(body);

  // lastRevisedAt is deliberately not updatable here; only POST /revise changes it.
  const data: Prisma.QuestionUpdateInput = {};
  if (input.title !== undefined) data.title = input.title;
  if ("link" in body) data.link = input.link;
  if (input.content !== undefined) data.content = input.content;
  if (input.difficulty !== undefined) data.difficulty = input.difficulty;
  if (input.tags !== undefined) data.tags = JSON.stringify(input.tags);
  if (input.isPattern !== undefined) data.isPattern = input.isPattern;

  const question = await prisma.question.update({ where: { id }, data });
  return NextResponse.json(serializeQuestion(question, true));
});

export const DELETE = handler<Params>(async (_req, { params }) => {
  const userId = await requireUserId();
  const { id } = await params;
  await getOwnedQuestion(userId, id);
  await prisma.question.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
});
