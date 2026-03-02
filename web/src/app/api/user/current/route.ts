import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        userId: true,
        name: true,
        displayName: true,
        image: true,
        bio: true,
        email: true,
        followersCount: true,
        followingCount: true,
        lastSignInProvider: true,
        accounts: {
          select: {
            provider: true,
          },
          take: 1,
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Calculate total posts count (authored posts + reposts)
    const authoredPostsCount = await prisma.post.count({
      where: {
        authorId: user.id,
        parentId: null,
      },
    });

    const repostsCount = await prisma.repost.count({
      where: { userId: user.id },
    });

    const totalPostsCount = authoredPostsCount + repostsCount;

    return NextResponse.json({
      user: {
        id: user.id,
        userId: user.userId,
        name: user.name,
        displayName: user.displayName,
        image: user.image,
        bio: user.bio,
        email: user.email,
        followersCount: user.followersCount,
        followingCount: user.followingCount,
        postsCount: totalPostsCount,
        provider:
          user.lastSignInProvider === "credentials"
            ? null
            : user.lastSignInProvider ?? user.accounts[0]?.provider ?? null,
      },
    });
  } catch (error) {
    console.error("Error fetching current user:", error);
    return NextResponse.json(
      { error: "Failed to fetch user" },
      { status: 500 }
    );
  }
}
