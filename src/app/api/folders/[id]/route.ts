import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ApiError, getOwnedFolder, handler, isUniqueViolation, requireUserId } from "@/lib/api";
import { updateFolderSchema } from "@/lib/validation";

type Params = { id: string };

export const PATCH = handler<Params>(async (req, { params }) => {
  const userId = await requireUserId();
  const { id } = await params;
  await getOwnedFolder(userId, id);
  const data = updateFolderSchema.parse(await req.json());
  try {
    const folder = await prisma.folder.update({
      where: { id },
      data,
      include: { _count: { select: { questions: true } } },
    });
    return NextResponse.json({
      id: folder.id,
      name: folder.name,
      questionCount: folder._count.questions,
      pinned: folder.pinned,
    });
  } catch (err) {
    if (isUniqueViolation(err)) throw new ApiError(409, "A folder with that name already exists");
    throw err;
  }
});

export const DELETE = handler<Params>(async (_req, { params }) => {
  const userId = await requireUserId();
  const { id } = await params;
  await getOwnedFolder(userId, id);
  await prisma.folder.delete({ where: { id } }); // cascades to its questions
  return new NextResponse(null, { status: 204 });
});
