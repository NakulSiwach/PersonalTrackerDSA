/**
 * DB script for acceptance test 6: set a question's lastRevisedAt to N days ago.
 * Usage: npx tsx scripts/set-last-revised.ts <questionId> <daysAgo>
 */
import { PrismaClient } from "@prisma/client";

async function main() {
  const [id, days] = process.argv.slice(2);
  if (!id || days === undefined || Number.isNaN(Number(days))) {
    console.error("Usage: npx tsx scripts/set-last-revised.ts <questionId> <daysAgo>");
    process.exit(1);
  }
  const prisma = new PrismaClient();
  const date = new Date(Date.now() - Number(days) * 86_400_000);
  const q = await prisma.question.update({ where: { id }, data: { lastRevisedAt: date } });
  console.log(`"${q.title}" lastRevisedAt -> ${q.lastRevisedAt.toISOString()}`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
