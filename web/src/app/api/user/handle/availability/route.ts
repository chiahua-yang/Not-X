import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { userIdSchema } from "@/lib/validation";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const candidate = searchParams.get("userId") ?? "";

  const parsed = userIdSchema.safeParse(candidate);
  if (!parsed.success) {
    return NextResponse.json(
      { available: false, reason: "invalid", message: parsed.error.issues[0]?.message },
      { status: 200 }
    );
  }

  const existing = await prisma.user.findUnique({ where: { userId: candidate } });
  return NextResponse.json({ available: !existing, reason: existing ? "taken" : "ok" });
}


