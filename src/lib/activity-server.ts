import { prisma } from "./db";

/** Logs a study action for the streak. Never blocks the main action if logging fails. */
export async function recordActivity(userId: string, kind: "create" | "revise"): Promise<void> {
  try {
    await prisma.activityEvent.create({ data: { userId, kind } });
  } catch (err) {
    console.error("Could not record activity", err);
  }
}
