import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth";
import { serializeQuestion } from "@/lib/api";
import { getUserTags } from "@/lib/server-data";
import { QuestionView } from "./question-view";

export const dynamic = "force-dynamic";

export default async function QuestionPage({
  params,
  searchParams,
}: {
  params: Promise<{ folderId: string; questionId: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");
  const { folderId, questionId } = await params;
  const { from } = await searchParams;

  const question = await prisma.question.findFirst({
    where: { id: questionId, folderId, folder: { userId } },
    include: { folder: { select: { name: true } } },
  });
  if (!question) notFound(); // missing, in another folder, or someone else's

  return (
    <QuestionView
      key={question.id}
      folder={{ id: folderId, name: question.folder.name }}
      initialQuestion={serializeQuestion(question, true)}
      from={from === "suggestion" || from === "patterns" ? from : null}
      tagSuggestions={await getUserTags(userId)}
    />
  );
}
