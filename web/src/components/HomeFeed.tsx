"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import Post from "./Post";

type FilterType = "all" | "following";

const MAX_CHARS = 280;
const URL_REGEX = /(https?:\/\/[^\s]+)/g;

// Helper function to parse content and count characters
function parseContent(content: string) {
  let charCount = 0;
  let lastIndex = 0;

  // Find all URLs
  const matches = content.matchAll(URL_REGEX);
  for (const match of matches) {
    const url = match[0];
    const urlStart = match.index!;

    // Count characters before this URL
    const textBefore = content.substring(lastIndex, urlStart);
    charCount += textBefore.length;

    // URLs always count as 23 characters
    charCount += 23;

    lastIndex = urlStart + url.length;
  }

  // Count remaining characters after last URL
  charCount += content.substring(lastIndex).length;

  // Remove hashtags and mentions from count
  const hashtagMentionRegex = /[#@]\w+/g;
  const textWithoutUrls = content.replace(URL_REGEX, '');
  const hashtagsMentions = textWithoutUrls.match(hashtagMentionRegex) || [];

  for (const tag of hashtagsMentions) {
    charCount -= tag.length;
  }

  return charCount;
}

export default function HomeFeed() {
  const { data: session } = useSession();
  const [filter, setFilter] = useState<FilterType>("all");
  const [posts, setPosts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [inlineContent, setInlineContent] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const [showInlineComposer, setShowInlineComposer] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Fetch current user info
  useEffect(() => {
    if (session?.user?.email) {
      fetch("/api/user/current")
        .then((res) => res.json())
        .then((data) => setCurrentUser(data.user))
        .catch(console.error);
    }
  }, [session]);

  // Fetch posts
  useEffect(() => {
    fetchPosts();
  }, [filter]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
    }
  }, [inlineContent]);

  const fetchPosts = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/posts?filter=${filter}`);
      const data = await res.json();
      setPosts(data.posts || []);
    } catch (error) {
      console.error("Failed to fetch posts:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInlinePost = async () => {
    if (!inlineContent.trim() || isPosting) return;

    setIsPosting(true);
    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: inlineContent }),
      });

      if (res.ok) {
        setInlineContent("");
        setShowInlineComposer(false);
        fetchPosts(); // Refresh posts
      } else {
        const error = await res.json();
        alert(error.error || "Failed to create post");
      }
    } catch (error) {
      console.error("Failed to post:", error);
      alert("Failed to create post");
    } finally {
      setIsPosting(false);
    }
  };

  const handleLike = async (postId: string) => {
    try {
      const res = await fetch(`/api/posts/${postId}/like`, {
        method: "POST",
      });

      if (res.ok) {
        fetchPosts(); // Refresh to update like status
      }
    } catch (error) {
      console.error("Failed to like post:", error);
    }
  };

  const handleRepost = async (postId: string) => {
    try {
      const res = await fetch(`/api/posts/${postId}/repost`, {
        method: "POST",
      });

      if (res.ok) {
        fetchPosts(); // Refresh to update repost status
      }
    } catch (error) {
      console.error("Failed to repost:", error);
    }
  };

  const handleDelete = async (postId: string) => {
    if (!confirm("Are you sure you want to delete this post?")) return;

    try {
      const res = await fetch(`/api/posts/${postId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        fetchPosts(); // Refresh posts
      } else {
        const error = await res.json();
        alert(error.error || "Failed to delete post");
      }
    } catch (error) {
      console.error("Failed to delete post:", error);
      alert("Failed to delete post");
    }
  };

  return (
    <div>
      {/* Header with filters */}
      <div className="border-b sticky top-0 z-10" style={{ borderColor: "#333", background: "var(--background)" }}>
        <div className="flex">
          <button
            onClick={() => setFilter("all")}
            className="flex-1 py-4 font-semibold transition hover:bg-gray-800"
            style={{
              color: filter === "all" ? "var(--foreground)" : "#666",
              borderBottom: filter === "all" ? "3px solid var(--color-primary)" : "3px solid transparent",
            }}
          >
            All
          </button>
          <button
            onClick={() => setFilter("following")}
            className="flex-1 py-4 font-semibold transition hover:bg-gray-800"
            style={{
              color: filter === "following" ? "var(--foreground)" : "#666",
              borderBottom: filter === "following" ? "3px solid var(--color-primary)" : "3px solid transparent",
            }}
          >
            Following
          </button>
        </div>
      </div>

      {/* Inline post composer */}
      <div className="border-b p-4" style={{ borderColor: "#333" }}>
        <div className="flex gap-3">
          {/* Avatar */}
          <div
            className="w-12 h-12 rounded-full flex-shrink-0"
            style={{
              background: session?.user?.image
                ? `url(${session.user.image}) center/cover`
                : "var(--color-primary)",
            }}
          >
            {!session?.user?.image && (
              <div className="w-full h-full flex items-center justify-center text-white font-semibold">
                {session?.user?.name?.[0]?.toUpperCase() || "?"}
              </div>
            )}
          </div>

          {/* Input */}
          <div className="flex-1">
            {!showInlineComposer ? (
              <input
                type="text"
                placeholder="What's happening?"
                onFocus={() => setShowInlineComposer(true)}
                className="w-full bg-transparent outline-none text-lg"
                style={{ color: "var(--foreground)" }}
              />
            ) : (
              <>
                <textarea
                  ref={textareaRef}
                  value={inlineContent}
                  onChange={(e) => {
                    const newValue = e.target.value;
                    const charCount = parseContent(newValue);
                    // Prevent input if over limit
                    if (charCount <= MAX_CHARS) {
                      setInlineContent(newValue);
                    }
                  }}
                  placeholder="What's happening?"
                  className="w-full bg-transparent resize-none outline-none text-lg"
                  style={{ color: "var(--foreground)", minHeight: "80px" }}
                  rows={1}
                />
                <div className="flex items-center justify-between mt-3">
                  <div className="text-sm">
                    {(() => {
                      const charCount = parseContent(inlineContent);
                      const remaining = MAX_CHARS - charCount;

                      if (remaining <= 20 && remaining >= 0) {
                        return (
                          <span className={remaining <= 10 ? "text-orange-500" : "text-gray-400"}>
                            {remaining}
                          </span>
                        );
                      } else if (remaining < 0) {
                        return (
                          <span className="text-red-500">
                            {Math.abs(remaining)} over limit
                          </span>
                        );
                      }
                      return null;
                    })()}
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        setShowInlineComposer(false);
                        setInlineContent("");
                      }}
                      className="text-sm text-gray-500 hover:text-gray-300"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleInlinePost}
                      disabled={!inlineContent.trim() || isPosting || parseContent(inlineContent) > MAX_CHARS}
                      className="px-5 py-2 rounded-full font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{
                        background: (inlineContent.trim() && parseContent(inlineContent) <= MAX_CHARS) ? "var(--color-primary)" : "#333",
                        color: (inlineContent.trim() && parseContent(inlineContent) <= MAX_CHARS) ? "#fff" : "#666",
                      }}
                    >
                      {isPosting ? "Posting..." : "Post"}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Posts list */}
      {isLoading ? (
        <div className="p-8 text-center text-gray-500">Loading...</div>
      ) : posts.length === 0 ? (
        <div className="p-8 text-center text-gray-500">
          {filter === "following" ? "No posts from people you follow yet" : "No posts yet"}
        </div>
      ) : (
        <div>
          {posts.map((post) => (
            <Post
              key={post.repostedAt ? `repost-${post.id}-${post.repostedAt}` : post.id}
              post={post}
              currentUserId={currentUser?.id}
              onLike={handleLike}
              onRepost={handleRepost}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
