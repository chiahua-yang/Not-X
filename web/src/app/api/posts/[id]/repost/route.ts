import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id: postId } = await params;

    // Check if post exists
    const post = await prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // Check if already reposted
    const existingRepost = await prisma.repost.findUnique({
      where: {
        userId_postId: {
          userId: user.id,
          postId,
        },
      },
    });

    if (existingRepost) {
      // Unrepost
      await prisma.repost.delete({
        where: { id: existingRepost.id },
      });

      return NextResponse.json({ reposted: false });
    } else {
      // Repost
      await prisma.repost.create({
        data: {
          userId: user.id,
          postId,
        },
      });

      return NextResponse.json({ reposted: true });
    }
  } catch (error) {
    console.error("Error toggling repost:", error);
    return NextResponse.json(
      { error: "Failed to toggle repost" },
      { status: 500 }
    );
  }
}
