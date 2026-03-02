import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

const generateUniqueUserId = async (baseRaw: string) => {
  const base = baseRaw.toLowerCase().replace(/[^a-z0-9_]/g, "") || "user";

  let candidate = base;
  let counter = 1;

  // Try base, then base1, base2, ...
  // Loop is safe because collision probability is very low for small numbers.
  // We also rely on the unique constraint on userId in the schema.
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const existing = await prisma.user.findUnique({
      where: { userId: candidate },
      select: { id: true },
    });

    if (!existing) {
      return candidate;
    }

    candidate = `${base}${counter}`;
    counter += 1;
  }
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, birthday, password } = body as {
      name?: string;
      email?: string;
      birthday?: string;
      password?: string;
    };

    if (!email || typeof email !== "string" || !password || typeof password !== "string") {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if user exists
    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing && existing.passwordHash) {
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    let birthdayDate: Date | null = null;
    if (birthday && typeof birthday === "string") {
      const parsed = new Date(birthday);
      if (!Number.isNaN(parsed.getTime())) {
        birthdayDate = parsed;
      }
    }

    // Ensure we have a unique userId (handle) just like OAuth flow eventually gets.
    let userId = existing?.userId ?? null;
    if (!userId) {
      const localPart = normalizedEmail.split("@")[0] ?? "";
      userId = await generateUniqueUserId(localPart);
    }

    const data = {
      name: name?.trim() || null,
      email: normalizedEmail,
      passwordHash,
      birthday: birthdayDate,
      userId,
    };

    if (existing) {
      await prisma.user.update({
        where: { id: existing.id },
        data,
      });
    } else {
      await prisma.user.create({ data });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("Failed to register user:", error);
    return NextResponse.json({ error: "Failed to register user" }, { status: 500 });
  }
}

