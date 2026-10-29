import { NextResponse } from "next/server";
import { Prisma, type Question } from "@prisma/client";
import { ZodError } from "zod";
import { prisma } from "./db";
import { getSessionUserId } from "./auth";
import type { QuestionDTO } from "./types";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export const notFound = () => new ApiError(404, "Not found");

/** Wraps a route handler: maps thrown errors to `{ error }` JSON with the right status. */
export function handler<P>(fn: (req: Request, ctx: { params: Promise<P> }) => Promise<Response>) {
  return async (req: Request, ctx: { params: Promise<P> }) => {
    try {
      return await fn(req, ctx);
    } catch (err) {
      if (err instanceof ApiError) {
        return NextResponse.json({ error: err.message }, { status: err.status });
      }
      if (err instanceof ZodError) {
        return NextResponse.json({ error: err.issues[0]?.message ?? "Invalid input" }, { status: 400 });
      }
      if (err instanceof SyntaxError) {
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
      }
      console.error(err);
      return NextResponse.json({ error: describeServerError(err) }, { status: 500 });
    }
  };
}

/**
 * Setup problems (bad database URL, missing secret) get a message that says what to fix,
 * instead of a bare "Internal server error". No secret values are included.
 */
function describeServerError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  if (message.includes("AUTH_SECRET")) {
    return "Server setup problem: AUTH_SECRET is missing or shorter than 32 characters.";
  }
  if (
    err instanceof Prisma.PrismaClientInitializationError ||
    /Can't reach database server|DATABASE_URL|P1001|P1000|P1013|ENOTFOUND|getaddrinfo/i.test(message)
  ) {
    return "Server setup problem: can't connect to the database. Check DATABASE_URL and DATABASE_URL_UNPOOLED.";
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2021") {
    return "Server setup problem: database tables are missing. Run the migrations (npm run db:deploy).";
  }
  return "Internal server error";
}

export async function requireUserId(): Promise<string> {
  const userId = await getSessionUserId();
  if (!userId) throw new ApiError(401, "Not authenticated");
  return userId;
}

/** The folder, only if it belongs to the user. Anything else is a 404. */
export async function getOwnedFolder(userId: string, folderId: string) {
  const folder = await prisma.folder.findFirst({ where: { id: folderId, userId } });
  if (!folder) throw notFound();
  return folder;
}

/** The question, only if its folder belongs to the user. Anything else is a 404. */
export async function getOwnedQuestion(userId: string, questionId: string) {
  const question = await prisma.question.findFirst({
    where: { id: questionId, folder: { userId } },
  });
  if (!question) throw notFound();
  return question;
}

export function parseTags(raw: string): string[] {
  try {
    const value = JSON.parse(raw);
    return Array.isArray(value) ? value.filter((t) => typeof t === "string") : [];
  } catch {
    return [];
  }
}

/** Client-facing shape: tags parsed, dates as ISO strings. `content` only when asked. */
export function serializeQuestion(q: Question, withContent = false): QuestionDTO {
  return {
    id: q.id,
    folderId: q.folderId,
    title: q.title,
    link: q.link,
    difficulty: q.difficulty as QuestionDTO["difficulty"],
    tags: parseTags(q.tags),
    isPattern: q.isPattern,
    lastRevisedAt: q.lastRevisedAt.toISOString(),
    createdAt: q.createdAt.toISOString(),
    updatedAt: q.updatedAt.toISOString(),
    ...(withContent ? { content: q.content } : {}),
  };
}

/** Revision suggestion: the question with the oldest lastRevisedAt in the folder. */
export function findSuggestion(folderId: string) {
  return prisma.question.findFirst({
    where: { folderId },
    orderBy: [{ lastRevisedAt: "asc" }, { createdAt: "asc" }],
  });
}

/** Same rule across the user's "Famous Patterns": the pattern question revised longest ago. */
export function findPatternSuggestion(userId: string) {
  return prisma.question.findFirst({
    where: { isPattern: true, folder: { userId } },
    orderBy: [{ lastRevisedAt: "asc" }, { createdAt: "asc" }],
    include: { folder: { select: { name: true } } },
  });
}

export function isUniqueViolation(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
}
