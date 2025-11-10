import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export async function PATCH(req: NextRequest) {
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
    const { displayName, bio, image, coverImage } = body;

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        ...(displayName !== undefined && { displayName }),
        ...(bio !== undefined && { bio }),
        ...(image !== undefined && { image }),
        ...(coverImage !== undefined && { coverImage }),
      },
      select: {
        id: true,
        userId: true,
        name: true,
        displayName: true,
        image: true,
        coverImage: true,
        bio: true,
        followersCount: true,
        followingCount: true,
      },
    });

    // Calculate total posts count (authored posts + reposts)
    const authoredPostsCount = await prisma.post.count({
      where: {
        authorId: updatedUser.id,
        parentId: null,
      },
    });

    const repostsCount = await prisma.repost.count({
      where: { userId: updatedUser.id },
    });

    const totalPostsCount = authoredPostsCount + repostsCount;

    return NextResponse.json({
      user: {
        ...updatedUser,
        postsCount: totalPostsCount,
      }
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
}
