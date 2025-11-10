import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { triggerPusherEvent } from "@/lib/pusher";

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

    let reposted: boolean;
    let repostCount: number;

    if (existingRepost) {
      // Unrepost
      await prisma.repost.delete({
        where: { id: existingRepost.id },
      });
      reposted = false;
    } else {
      // Repost
      await prisma.repost.create({
        data: {
          userId: user.id,
          postId,
        },
      });
      reposted = true;
    }

    // Get updated repost count
    repostCount = await prisma.repost.count({
      where: { postId },
    });

    // Trigger Pusher event for real-time update
    await triggerPusherEvent(`post-${postId}`, "repost-update", {
      postId,
      reposted,
      repostCount,
      userId: user.id,
    });

    return NextResponse.json({ reposted, repostCount });
  } catch (error) {
    console.error("Error toggling repost:", error);
    return NextResponse.json(
      { error: "Failed to toggle repost" },
      { status: 500 }
    );
  }
}
