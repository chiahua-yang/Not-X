"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Post from "@/components/Post";

type PostData = {
  id: string;
  content: string;
  createdAt: string;
  author: {
    id: string;
    userId: string;
    name: string | null;
    displayName: string | null;
    image: string | null;
  };
  _count: {
    likes: number;
    reposts: number;
    comments: number;
  };
  isLiked?: boolean;
  isReposted?: boolean;
  parentId: string | null;
  comments: PostData[];
};

export default function PostDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { data: session } = useSession();
  const postId = params.id as string;

  const [post, setPost] = useState<PostData | null>(null);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!postId) return;
    fetchPost();
  }, [postId]);

  const fetchPost = async () => {
    try {
      const res = await fetch(`/api/posts/${postId}`);
      if (res.ok) {
        const data = await res.json();
        setPost(data);
      }
    } catch (error) {
      console.error("Failed to fetch post:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: commentText,
          parentId: postId,
        }),
      });

      if (res.ok) {
        setCommentText("");
        fetchPost(); // Refresh to show new comment
      }
    } catch (error) {
      console.error("Failed to post comment:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLike = async () => {
    if (!post) return;
    try {
      await fetch(`/api/posts/${post.id}/like`, { method: "POST" });
      fetchPost();
    } catch (error) {
      console.error("Failed to like post:", error);
    }
  };

  const handleRepost = async () => {
    if (!post) return;
    try {
      await fetch(`/api/posts/${post.id}/repost`, { method: "POST" });
      fetchPost();
    } catch (error) {
      console.error("Failed to repost:", error);
    }
  };

  const handleDelete = async () => {
    if (!post) return;
    if (!confirm("Are you sure you want to delete this post?")) return;

    try {
      const res = await fetch(`/api/posts/${post.id}`, { method: "DELETE" });
      if (res.ok) {
        router.back();
      }
    } catch (error) {
      console.error("Failed to delete post:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-400">Loading...</p>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-400">Post not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header with back button */}
      <div className="sticky top-0 z-10 border-b border-gray-800 bg-black/80 backdrop-blur-sm">
        <div className="flex items-center gap-4 px-4 py-3">
          <button
            onClick={() => router.back()}
            className="rounded-full p-2 transition-colors hover:bg-gray-800"
            aria-label="Go back"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <h1 className="text-xl font-bold">Post</h1>
        </div>
      </div>

      <div className="mx-auto max-w-2xl">
        {/* Main post */}
        <div className="border-b border-gray-800 px-4 py-6">
          <Post
            post={post}
            onLike={handleLike}
            onRepost={handleRepost}
            onDelete={handleDelete}
            showFullContent={true}
          />
        </div>

        {/* Comment input */}
        {session && (
          <div className="border-b border-gray-800 px-4 py-4">
            <div className="mb-3 text-sm text-gray-500">
              Replying to{" "}
              <span className="text-blue-400">
                @{post.author.userId || "unknown"}
              </span>
            </div>
            <form onSubmit={handleSubmitComment}>
              <div className="flex gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-700 text-white">
                  {session.user?.image ? (
                    <img
                      src={session.user.image}
                      alt={session.user.name || "User"}
                      className="h-full w-full rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-sm font-semibold">
                      {(session.user?.name || "U").charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="flex-1">
                  <textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Post your reply"
                    className="w-full resize-none border-none bg-transparent text-white placeholder-gray-500 focus:outline-none"
                    rows={3}
                  />
                  <div className="mt-2 flex justify-end">
                    <button
                      type="submit"
                      disabled={!commentText.trim() || isSubmitting}
                      className="rounded-full bg-blue-500 px-6 py-2 font-semibold text-white transition-colors hover:bg-blue-600 disabled:opacity-50"
                    >
                      {isSubmitting ? "Replying..." : "Reply"}
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* Comments list */}
        <div>
          {post.comments && post.comments.length > 0 ? (
            post.comments.map((comment) => (
              <div key={comment.id} className="border-b border-gray-800 px-4 py-4">
                <Post
                  post={comment}
                  onLike={async () => {
                    await fetch(`/api/posts/${comment.id}/like`, { method: "POST" });
                    fetchPost();
                  }}
                  onRepost={async () => {
                    await fetch(`/api/posts/${comment.id}/repost`, { method: "POST" });
                    fetchPost();
                  }}
                  onComment={() => router.push(`/post/${comment.id}`)}
                  onDelete={async () => {
                    if (confirm("Delete this comment?")) {
                      await fetch(`/api/posts/${comment.id}`, { method: "DELETE" });
                      fetchPost();
                    }
                  }}
                />
              </div>
            ))
          ) : (
            <div className="px-4 py-8 text-center text-gray-500">
              No replies yet. Be the first to reply!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
