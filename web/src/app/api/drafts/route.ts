import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await req.json();
    const { content } = body;

    if (!content || typeof content !== "string") {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    if (content.trim().length === 0) {
      return NextResponse.json({ error: "Content cannot be empty" }, { status: 400 });
    }

    const draft = await prisma.draft.create({
      data: {
        content: content.trim(),
        userId: user.id,
      },
    });

    return NextResponse.json({ draft }, { status: 201 });
  } catch (error) {
    console.error("Error creating draft:", error);
    return NextResponse.json(
      { error: "Failed to create draft" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const drafts = await prisma.draft.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ drafts });
  } catch (error) {
    console.error("Error fetching drafts:", error);
    return NextResponse.json(
      { error: "Failed to fetch drafts" },
      { status: 500 }
    );
  }
}
