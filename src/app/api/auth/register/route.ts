import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createSession, hashPassword, registrationAllowed } from "@/lib/auth";
import { ApiError, handler, isUniqueViolation } from "@/lib/api";
import { registerSchema } from "@/lib/validation";

export const POST = handler(async (req) => {
  if (!registrationAllowed()) throw new ApiError(404, "Not found");
  const { username, password } = registerSchema.parse(await req.json());
  try {
    const user = await prisma.user.create({
      data: { username, passwordHash: await hashPassword(password) },
    });
    await createSession(user.id);
    return NextResponse.json({ id: user.id, username: user.username }, { status: 201 });
  } catch (err) {
    if (isUniqueViolation(err)) throw new ApiError(409, "That username is taken");
    throw err;
  }
});
