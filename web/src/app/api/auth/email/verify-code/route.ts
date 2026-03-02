import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, code } = body as {
      email?: string;
      code?: string;
    };

    if (!email || typeof email !== "string" || !code || typeof code !== "string") {
      return NextResponse.json({ error: "Email and code are required" }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const token = await prisma.verificationToken.findFirst({
      where: {
        identifier: normalizedEmail,
        token: code,
      },
    });

    if (!token) {
      return NextResponse.json({ error: "Invalid code" }, { status: 400 });
    }

    if (token.expires < new Date()) {
      // Clean up expired token
      await prisma.verificationToken.deleteMany({
        where: {
          identifier: normalizedEmail,
          token: code,
        },
      });
      return NextResponse.json({ error: "Code has expired" }, { status: 400 });
    }

    // Code is valid. For now, just delete it and return success.
    await prisma.verificationToken.deleteMany({
      where: {
        identifier: normalizedEmail,
        token: code,
      },
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("Failed to verify code:", error);
    return NextResponse.json({ error: "Failed to verify code" }, { status: 500 });
  }
}

