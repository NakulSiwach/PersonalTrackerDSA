import { prisma } from "./db";
import { parseTags } from "./api";

/** All distinct tags across the user's questions (for tag suggestions). */
export async function getUserTags(userId: string): Promise<string[]> {
  const rows = await prisma.question.findMany({
    where: { folder: { userId } },
    select: { tags: true },
  });
  return [...new Set(rows.flatMap((r) => parseTags(r.tags)))].sort();
}
