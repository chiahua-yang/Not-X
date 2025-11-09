import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export async function GET(req: NextRequest) {
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

    // Get all posts that the user has liked
    const likedPosts = await prisma.postLike.findMany({
      where: { userId: user.id },
      include: {
        post: {
          include: {
            author: {
              select: {
                id: true,
                userId: true,
                name: true,
                displayName: true,
                image: true,
              },
            },
            _count: {
              select: {
                likes: true,
                reposts: true,
                comments: true,
              },
            },
            likes: {
              where: { userId: user.id },
              select: { id: true },
            },
            reposts: {
              where: { userId: user.id },
              select: { id: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const posts = likedPosts.map((like) => like.post);

    return NextResponse.json({ posts });
  } catch (error) {
    console.error("Error fetching liked posts:", error);
    return NextResponse.json(
      { error: "Failed to fetch liked posts" },
      { status: 500 }
    );
  }
}
