import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth";
import { FoldersView } from "./folders-view";
import { countByDifficulty } from "@/components/DifficultyStats";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");
  const patternCount = await prisma.question.count({ where: { isPattern: true, folder: { userId } } });
  // Every question across all folders, counted per difficulty for the home dashboard.
  const allQuestions = await prisma.question.findMany({
    where: { folder: { userId } },
    select: { difficulty: true },
  });
  const folders = await prisma.folder.findMany({
    where: { userId },
    orderBy: { name: "asc" },
    include: { _count: { select: { questions: true } } },
  });
  return (
    <FoldersView
      patternCount={patternCount}
      stats={countByDifficulty(allQuestions)}
      initialFolders={folders.map((f) => ({ id: f.id, name: f.name, questionCount: f._count.questions }))}
    />
  );
}
