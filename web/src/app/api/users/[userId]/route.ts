import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const session = await getServerSession(authOptions);

    let currentUserId: string | null = null;
    if (session?.user?.email) {
      const currentUser = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true },
      });
      currentUserId = currentUser?.id || null;
    }

    // Find user by userId (username)
    const user = await prisma.user.findUnique({
      where: { userId },
      select: {
        id: true,
        userId: true,
        name: true,
        displayName: true,
        image: true,
        coverImage: true,
        bio: true,
        postsCount: true,
        followersCount: true,
        followingCount: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if current user is following this user
    let isFollowing = false;
    if (currentUserId && currentUserId !== user.id) {
      const follow = await prisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: currentUserId,
            followingId: user.id,
          },
        },
      });
      isFollowing = !!follow;
    }

    return NextResponse.json({ user, isFollowing });
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json(
      { error: "Failed to fetch user" },
      { status: 500 }
    );
  }
}
