import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { userIdSchema } from "@/lib/validation";
import { authOptions } from "@/lib/auth";

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const candidate: string = body?.userId ?? "";

  const parsed = userIdSchema.safeParse(candidate);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const exists = await prisma.user.findUnique({ where: { userId: candidate } });
  if (exists) {
    return NextResponse.json({ error: "That username has been taken. Please choose another." }, { status: 409 });
  }

  const updated = await prisma.user.update({
    where: { email: session.user.email },
    data: { userId: candidate },
    select: { id: true, userId: true },
  });

  return NextResponse.json(updated);
}


