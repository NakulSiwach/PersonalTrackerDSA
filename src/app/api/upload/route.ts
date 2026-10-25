import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ApiError, handler, requireUserId } from "@/lib/api";
import { createCuid, EXT_BY_TYPE, MAX_UPLOAD_BYTES, sniffImageType } from "@/lib/uploads";

export const POST = handler(async (req) => {
  const userId = await requireUserId();
  const form = await req.formData().catch(() => {
    throw new ApiError(400, "Expected multipart/form-data with a file");
  });
  const file = form.get("file");
  if (!(file instanceof File)) throw new ApiError(400, "No file uploaded");
  if (file.size > MAX_UPLOAD_BYTES) throw new ApiError(413, "Image must be 4 MB or smaller");
  if (!EXT_BY_TYPE[file.type]) {
    throw new ApiError(415, "Only PNG, JPEG, GIF and WebP images are allowed");
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (sniffImageType(bytes) !== file.type) {
    throw new ApiError(415, "File content is not a valid PNG, JPEG, GIF or WebP image");
  }

  // Never use the client's filename.
  const filename = `${createCuid()}.${EXT_BY_TYPE[file.type]}`;
  await prisma.image.create({ data: { filename, userId, mimeType: file.type, data: bytes } });
  return NextResponse.json({ url: `/api/uploads/${filename}` }, { status: 201 });
});
