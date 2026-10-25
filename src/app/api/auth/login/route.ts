import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createSession, verifyPassword } from "@/lib/auth";
import { ApiError, handler } from "@/lib/api";
import { loginSchema } from "@/lib/validation";

export const POST = handler(async (req) => {
  const parsed = loginSchema.safeParse(await req.json());
  if (!parsed.success) throw new ApiError(401, "Invalid username or password");
  const { username, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    throw new ApiError(401, "Invalid username or password");
  }
  await createSession(user.id);
  return NextResponse.json({ id: user.id, username: user.username });
});
