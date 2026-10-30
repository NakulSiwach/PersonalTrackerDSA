import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ApiError, handler, isUniqueViolation, requireUserId } from "@/lib/api";
import { folderSchema } from "@/lib/validation";
import type { FolderDTO } from "@/lib/types";

export const GET = handler(async () => {
  const userId = await requireUserId();
  const folders = await prisma.folder.findMany({
    where: { userId },
    orderBy: [{ pinned: "desc" }, { name: "asc" }], // pinned folders first
    include: { _count: { select: { questions: true } } },
  });
  const result: FolderDTO[] = folders.map((f) => ({
    id: f.id,
    name: f.name,
    questionCount: f._count.questions,
    pinned: f.pinned,
  }));
  return NextResponse.json(result);
});

export const POST = handler(async (req) => {
  const userId = await requireUserId();
  const { name } = folderSchema.parse(await req.json());
  try {
    const folder = await prisma.folder.create({ data: { name, userId } });
    return NextResponse.json({ id: folder.id, name: folder.name, questionCount: 0, pinned: false }, { status: 201 });
  } catch (err) {
    if (isUniqueViolation(err)) throw new ApiError(409, "A folder with that name already exists");
    throw err;
  }
});
