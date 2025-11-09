"use client";

import { useState } from "react";
import { formatTimeAgo } from "@/lib/timeFormat";

interface PostProps {
  post: {
    id: string;
    content: string;
    createdAt: string;
    author: {
      id: string;
      userId: string | null;
      name: string | null;
      displayName: string | null;
      image: string | null;
    };
    _count: {
      likes: number;
      reposts: number;
      comments: number;
    };
    likes?: Array<{ id: string }>;
    reposts?: Array<{ id: string }>;
  };
  onLike?: (postId: string) => void;
  onRepost?: (postId: string) => void;
  onComment?: (postId: string) => void;
  onDelete?: (postId: string) => void;
  currentUserId?: string;
}

export default function Post({ post, onLike, onRepost, onComment, onDelete, currentUserId }: PostProps) {
  const [showMenu, setShowMenu] = useState(false);
  const isLiked = post.likes && post.likes.length > 0;
  const isReposted = post.reposts && post.reposts.length > 0;
  const isOwnPost = currentUserId === post.author.id;

  // Parse content to create links for URLs, hashtags, and mentions
  const parseContent = (content: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const hashtagRegex = /#(\w+)/g;
    const mentionRegex = /@(\w+)/g;

    let parsed = content;
    const elements: Array<{ type: string; value: string; index: number; length: number }> = [];

    // Find URLs
    let match;
    while ((match = urlRegex.exec(content)) !== null) {
      elements.push({ type: 'url', value: match[0], index: match.index, length: match[0].length });
    }

    // Find hashtags
    while ((match = hashtagRegex.exec(content)) !== null) {
      elements.push({ type: 'hashtag', value: match[0], index: match.index, length: match[0].length });
    }

    // Find mentions
    while ((match = mentionRegex.exec(content)) !== null) {
      elements.push({ type: 'mention', value: match[0], index: match.index, length: match[0].length });
    }

    // Sort by index
    elements.sort((a, b) => a.index - b.index);

    // Build JSX elements
    const result: Array<React.ReactNode> = [];
    let lastIndex = 0;

    elements.forEach((el, i) => {
      // Add text before this element
      if (el.index > lastIndex) {
        result.push(content.substring(lastIndex, el.index));
      }

      // Add the element with styling
      if (el.type === 'url') {
        result.push(
          <a
            key={i}
            href={el.value}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:underline"
          >
            {el.value}
          </a>
        );
      } else if (el.type === 'hashtag') {
        result.push(
          <span key={i} className="text-blue-400 hover:underline cursor-pointer">
            {el.value}
          </span>
        );
      } else if (el.type === 'mention') {
        result.push(
          <span key={i} className="text-blue-400 hover:underline cursor-pointer">
            {el.value}
          </span>
        );
      }

      lastIndex = el.index + el.length;
    });

    // Add remaining text
    if (lastIndex < content.length) {
      result.push(content.substring(lastIndex));
    }

    return result.length > 0 ? result : content;
  };

  return (
    <article
      className="border-b p-4"
      style={{ borderColor: "#333" }}
    >
      <div className="flex gap-3">
        {/* Avatar */}
        <div
          className="w-12 h-12 rounded-full flex-shrink-0"
          style={{
            background: post.author.image
              ? `url(${post.author.image}) center/cover`
              : "var(--color-primary)",
          }}
        >
          {!post.author.image && (
            <div className="w-full h-full flex items-center justify-center text-white font-semibold">
              {post.author.name?.[0]?.toUpperCase() || "?"}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold hover:underline cursor-pointer">
                {post.author.displayName || post.author.name}
              </span>
              <span className="text-gray-500">
                @{post.author.userId || "unknown"}
              </span>
              <span className="text-gray-500">·</span>
              <span className="text-gray-500 text-sm">
                {formatTimeAgo(post.createdAt)}
              </span>
            </div>

            {/* Menu button (only for own posts) */}
            {isOwnPost && (
              <div className="relative">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="text-gray-500 hover:text-blue-400 px-2"
                >
                  ⋯
                </button>
                {showMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowMenu(false)}
                    />
                    <div
                      className="absolute right-0 mt-1 py-2 w-48 rounded-lg shadow-lg z-20"
                      style={{ background: "var(--background)", border: "1px solid #333" }}
                    >
                      <button
                        onClick={() => {
                          onDelete?.(post.id);
                          setShowMenu(false);
                        }}
                        className="w-full px-4 py-2 text-left text-red-500 hover:bg-gray-800 transition"
                      >
                        Delete
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Post content */}
          <p className="whitespace-pre-wrap break-words mb-3">{parseContent(post.content)}</p>

          {/* Action buttons */}
          <div className="flex items-center gap-6 text-gray-500">
            {/* Comment */}
            <button
              onClick={() => onComment?.(post.id)}
              className="flex items-center gap-2 hover:text-blue-400 transition group"
            >
              <span className="group-hover:bg-blue-400 group-hover:bg-opacity-10 rounded-full p-2 transition">
                💬
              </span>
              <span className="text-sm">{post._count.comments}</span>
            </button>

            {/* Repost */}
            <button
              onClick={() => onRepost?.(post.id)}
              className={`flex items-center gap-2 transition group ${
                isReposted ? "text-green-500" : "hover:text-green-500"
              }`}
            >
              <span className="group-hover:bg-green-500 group-hover:bg-opacity-10 rounded-full p-2 transition">
                🔁
              </span>
              <span className="text-sm">{post._count.reposts}</span>
            </button>

            {/* Like */}
            <button
              onClick={() => onLike?.(post.id)}
              className={`flex items-center gap-2 transition group ${
                isLiked ? "text-red-500" : "hover:text-red-500"
              }`}
            >
              <span className="group-hover:bg-red-500 group-hover:bg-opacity-10 rounded-full p-2 transition">
                {isLiked ? "❤️" : "🤍"}
              </span>
              <span className="text-sm">{post._count.likes}</span>
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
