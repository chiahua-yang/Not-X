import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { id: postId } = await params;

    const post = await prisma.post.findUnique({
      where: { id: postId },
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
        comments: {
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
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // Check if current user liked/reposted this post and its comments
    let enrichedPost = post;
    if (session?.user?.email) {
      const user = await prisma.user.findUnique({
        where: { email: session.user.email },
      });

      if (user) {
        const [postLike, postRepost] = await Promise.all([
          prisma.postLike.findUnique({
            where: {
              userId_postId: {
                userId: user.id,
                postId: post.id,
              },
            },
          }),
          prisma.repost.findUnique({
            where: {
              userId_postId: {
                userId: user.id,
                postId: post.id,
              },
            },
          }),
        ]);

        // Enrich comments with like/repost status
        const enrichedComments = await Promise.all(
          post.comments.map(async (comment) => {
            const [commentLike, commentRepost] = await Promise.all([
              prisma.postLike.findUnique({
                where: {
                  userId_postId: {
                    userId: user.id,
                    postId: comment.id,
                  },
                },
              }),
              prisma.repost.findUnique({
                where: {
                  userId_postId: {
                    userId: user.id,
                    postId: comment.id,
                  },
                },
              }),
            ]);

            return {
              ...comment,
              isLiked: !!commentLike,
              isReposted: !!commentRepost,
            };
          })
        );

        enrichedPost = {
          ...post,
          isLiked: !!postLike,
          isReposted: !!postRepost,
          comments: enrichedComments,
        } as any;
      }
    }

    return NextResponse.json(enrichedPost);
  } catch (error) {
    console.error("Error fetching post:", error);
    return NextResponse.json(
      { error: "Failed to fetch post" },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    // Check if post exists and belongs to user
    const post = await prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    if (post.authorId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Delete the post (cascading deletes will handle likes, reposts, comments)
    await prisma.post.delete({
      where: { id: postId },
    });

    // Update user's post count
    await prisma.user.update({
      where: { id: user.id },
      data: { postsCount: { decrement: 1 } },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting post:", error);
    return NextResponse.json(
      { error: "Failed to delete post" },
      { status: 500 }
    );
  }
}
