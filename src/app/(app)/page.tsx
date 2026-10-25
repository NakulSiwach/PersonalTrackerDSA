import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth";
import { FoldersView } from "./folders-view";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");
  const patternCount = await prisma.question.count({ where: { isPattern: true, folder: { userId } } });
  const folders = await prisma.folder.findMany({
    where: { userId },
    orderBy: { name: "asc" },
    include: { _count: { select: { questions: true } } },
  });
  return (
    <FoldersView
      patternCount={patternCount}
      initialFolders={folders.map((f) => ({ id: f.id, name: f.name, questionCount: f._count.questions }))}
    />
  );
}
