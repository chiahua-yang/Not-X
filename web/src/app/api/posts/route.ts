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

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await req.json();
    const { content, parentId } = body;

    if (!content || typeof content !== "string") {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    if (content.trim().length === 0) {
      return NextResponse.json({ error: "Content cannot be empty" }, { status: 400 });
    }

    // Create post
    const post = await prisma.post.create({
      data: {
        content: content.trim(),
        authorId: user.id,
        parentId: parentId || null,
      },
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
      },
    });

    // Update user's post count
    await prisma.user.update({
      where: { id: user.id },
      data: { postsCount: { increment: 1 } },
    });

    return NextResponse.json({ post }, { status: 201 });
  } catch (error) {
    console.error("Error creating post:", error);
    return NextResponse.json(
      { error: "Failed to create post" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const filter = searchParams.get("filter") || "all";
    const userId = searchParams.get("userId");

    const session = await getServerSession(authOptions);
    let currentUser = null;

    if (session?.user?.email) {
      currentUser = await prisma.user.findUnique({
        where: { email: session.user.email },
      });
    }

    let posts;

    if (userId) {
      // Get posts by specific user
      posts = await prisma.post.findMany({
        where: {
          authorId: userId,
          parentId: null, // Only top-level posts
        },
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
          likes: currentUser
            ? {
                where: { userId: currentUser.id },
                select: { id: true },
              }
            : false,
          reposts: currentUser
            ? {
                where: { userId: currentUser.id },
                select: { id: true },
              }
            : false,
        },
        orderBy: { createdAt: "desc" },
      });
    } else if (filter === "following" && currentUser) {
      // Get posts from followed users
      const following = await prisma.follow.findMany({
        where: { followerId: currentUser.id },
        select: { followingId: true },
      });

      const followingIds = following.map((f) => f.followingId);

      posts = await prisma.post.findMany({
        where: {
          authorId: { in: followingIds },
          parentId: null,
        },
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
            where: { userId: currentUser.id },
            select: { id: true },
          },
          reposts: {
            where: { userId: currentUser.id },
            select: { id: true },
          },
        },
        orderBy: { createdAt: "desc" },
      });
    } else {
      // Get all posts
      posts = await prisma.post.findMany({
        where: { parentId: null },
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
          likes: currentUser
            ? {
                where: { userId: currentUser.id },
                select: { id: true },
              }
            : false,
          reposts: currentUser
            ? {
                where: { userId: currentUser.id },
                select: { id: true },
              }
            : false,
        },
        orderBy: { createdAt: "desc" },
      });
    }

    return NextResponse.json({ posts });
  } catch (error) {
    console.error("Error fetching posts:", error);
    return NextResponse.json(
      { error: "Failed to fetch posts" },
      { status: 500 }
    );
  }
}
