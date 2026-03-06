import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { triggerPusherEvent } from "@/lib/pusher";
import {
  getRootPostId,
  getTotalCommentCount,
  getTotalCommentCounts,
} from "@/lib/postCount";

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

    // If this is a comment (has parentId), trigger Pusher for the root post with total count
    if (parentId) {
      const rootPostId = await getRootPostId(parentId);
      const commentCount = await getTotalCommentCount(rootPostId);

      await triggerPusherEvent(`post-${rootPostId}`, "comment-update", {
        postId: rootPostId,
        commentCount,
        newComment: post,
      });
    }

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
      // Get posts by specific user (both authored and reposted)

      // 1. Get posts authored by this user
      const authoredPosts = await prisma.post.findMany({
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
      });

      // 2. Get posts reposted by this user
      const userReposts = await prisma.repost.findMany({
        where: { userId },
        include: {
          user: {
            select: {
              id: true,
              userId: true,
              name: true,
              displayName: true,
              image: true,
            },
          },
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
          },
        },
        orderBy: { createdAt: "desc" },
      });

      // 3. Combine and mark reposted posts
      const repostedPosts = userReposts.map((repost) => ({
        ...repost.post,
        repostedBy: repost.user,
        repostedAt: repost.createdAt,
      }));

      // 4. Merge and sort by date (no deduplication for user profile to show self-reposts)
      const allPosts = [...authoredPosts, ...repostedPosts];
      posts = allPosts.sort((a, b) => {
        const dateA = (a as any).repostedAt || a.createdAt;
        const dateB = (b as any).repostedAt || b.createdAt;
        return new Date(dateB).getTime() - new Date(dateA).getTime();
      });
    } else if (filter === "following" && currentUser) {
      // Get posts from followed users (both authored and reposted)
      const following = await prisma.follow.findMany({
        where: { followerId: currentUser.id },
        select: { followingId: true },
      });

      const followingIds = following.map((f) => f.followingId);

      // 1. Get posts authored by followed users
      const authoredPosts = await prisma.post.findMany({
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
      });

      // 2. Get posts reposted by followed users
      const followingReposts = await prisma.repost.findMany({
        where: { userId: { in: followingIds } },
        include: {
          user: {
            select: {
              id: true,
              userId: true,
              name: true,
              displayName: true,
              image: true,
            },
          },
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
                where: { userId: currentUser.id },
                select: { id: true },
              },
              reposts: {
                where: { userId: currentUser.id },
                select: { id: true },
              },
            },
          },
        },
      });

      // 3. Combine and mark reposted posts
      const repostedPosts = followingReposts.map((repost) => ({
        ...repost.post,
        repostedBy: repost.user,
        repostedAt: repost.createdAt,
      }));

      // 4. Merge and sort by date
      const allPosts = [...authoredPosts, ...repostedPosts];
      // Remove duplicates based on post ID
      const uniquePosts = Array.from(
        new Map(allPosts.map(post => [post.id, post])).values()
      );
      posts = uniquePosts.sort((a, b) => {
        const dateA = (a as any).repostedAt || a.createdAt;
        const dateB = (b as any).repostedAt || b.createdAt;
        return new Date(dateB).getTime() - new Date(dateA).getTime();
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

    // Replace direct comment count with total (including nested) comment count
    const postIds = (posts as { id: string }[]).map((p) => p.id);
    const totalCounts = await getTotalCommentCounts(postIds);
    posts = (posts as any[]).map((p) => ({
      ...p,
      _count: {
        ...p._count,
        comments: totalCounts.get(p.id) ?? 0,
      },
    }));

    return NextResponse.json({ posts });
  } catch (error) {
    console.error("Error fetching posts:", error);
    return NextResponse.json(
      { error: "Failed to fetch posts" },
      { status: 500 }
    );
  }
}
