import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { userId } = await params;

    // Find target user by userId (username)
    const targetUser = await prisma.user.findUnique({
      where: { userId },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "Target user not found" }, { status: 404 });
    }

    if (currentUser.id === targetUser.id) {
      return NextResponse.json({ error: "Cannot follow yourself" }, { status: 400 });
    }

    // Check if already following
    const existingFollow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: currentUser.id,
          followingId: targetUser.id,
        },
      },
    });

    if (existingFollow) {
      // Unfollow
      await prisma.follow.delete({
        where: { id: existingFollow.id },
      });

      // Update counts
      await prisma.user.update({
        where: { id: currentUser.id },
        data: { followingCount: { decrement: 1 } },
      });

      await prisma.user.update({
        where: { id: targetUser.id },
        data: { followersCount: { decrement: 1 } },
      });

      return NextResponse.json({ isFollowing: false });
    } else {
      // Follow
      await prisma.follow.create({
        data: {
          followerId: currentUser.id,
          followingId: targetUser.id,
        },
      });

      // Update counts
      await prisma.user.update({
        where: { id: currentUser.id },
        data: { followingCount: { increment: 1 } },
      });

      await prisma.user.update({
        where: { id: targetUser.id },
        data: { followersCount: { increment: 1 } },
      });

      return NextResponse.json({ isFollowing: true });
    }
  } catch (error) {
    console.error("Error toggling follow:", error);
    return NextResponse.json(
      { error: "Failed to toggle follow" },
      { status: 500 }
    );
  }
}
