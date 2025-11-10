"use client";

import { useState, useRef, useEffect } from "react";
import { useSession } from "next-auth/react";

interface PostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPostCreated?: () => void;
}

// Helper function to detect URLs
const URL_REGEX = /(https?:\/\/[^\s]+)/g;

// Helper function to parse content and count characters
function parseContent(content: string) {
  // Step 1: Replace all URLs with a placeholder of exactly 23 characters
  const urlPlaceholder = 'X'.repeat(23);
  let modifiedContent = content;
  const urls: string[] = [];

  const urlMatches = content.matchAll(URL_REGEX);
  for (const match of urlMatches) {
    urls.push(match[0]);
    modifiedContent = modifiedContent.replace(match[0], urlPlaceholder);
  }

  // Step 2: Remove all hashtags and mentions (they don't count toward limit)
  const hashtagMentionRegex = /(#\w+|@\w+)/g;
  const contentWithoutHashtagsMentions = modifiedContent.replace(hashtagMentionRegex, '');

  // Step 3: Count remaining characters
  const charCount = contentWithoutHashtagsMentions.length;

  return { charCount, urls };
}

export default function PostModal({ isOpen, onClose, onPostCreated }: PostModalProps) {
  const { data: session } = useSession();
  const [content, setContent] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);
  const [showDrafts, setShowDrafts] = useState(false);
  const [drafts, setDrafts] = useState<Array<{ id: string; content: string; createdAt: string }>>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { charCount } = parseContent(content);
  const remaining = 280 - charCount;
  const canPost = content.trim().length > 0 && remaining >= 0;

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
    }
  }, [content]);

  // Fetch drafts when showing drafts
  useEffect(() => {
    if (showDrafts) {
      fetchDrafts();
    }
  }, [showDrafts]);

  // Focus textarea when modal opens
  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isOpen]);

  const fetchDrafts = async () => {
    try {
      const res = await fetch("/api/drafts");
      if (res.ok) {
        const data = await res.json();
        setDrafts(data.drafts || []);
      }
    } catch (error) {
      console.error("Failed to fetch drafts:", error);
    }
  };

  const handlePost = async () => {
    if (!canPost) return;

    setIsPosting(true);
    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });

      if (res.ok) {
        setContent("");
        onClose();
        onPostCreated?.();
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

  const handleClose = () => {
    if (content.trim().length > 0) {
      setShowDiscardDialog(true);
    } else {
      onClose();
    }
  };

  const handleSaveDraft = async () => {
    try {
      const res = await fetch("/api/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });

      if (res.ok) {
        setContent("");
        setShowDiscardDialog(false);
        onClose();
      } else {
        alert("Failed to save draft");
      }
    } catch (error) {
      console.error("Failed to save draft:", error);
      alert("Failed to save draft");
    }
  };

  const handleDiscard = () => {
    setContent("");
    setShowDiscardDialog(false);
    onClose();
  };

  const handleLoadDraft = (draft: { id: string; content: string }) => {
    setContent(draft.content);
    setShowDrafts(false);
  };

  const handleDeleteDraft = async (draftId: string) => {
    try {
      const res = await fetch(`/api/drafts/${draftId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setDrafts(drafts.filter((d) => d.id !== draftId));
      }
    } catch (error) {
      console.error("Failed to delete draft:", error);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl z-50 rounded-2xl"
        style={{ background: "var(--background)", border: "1px solid #333" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: "#333" }}>
          <button
            onClick={handleClose}
            className="text-xl w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-800 transition"
          >
            ✕
          </button>
          <button
            onClick={() => setShowDrafts(!showDrafts)}
            className="text-sm px-4 py-2 rounded-full hover:bg-gray-800 transition"
            style={{ color: "var(--color-accent)" }}
          >
            Drafts
          </button>
        </div>

        {/* Drafts List */}
        {showDrafts && (
          <div className="p-4 border-b" style={{ borderColor: "#333", maxHeight: "200px", overflowY: "auto" }}>
            <h3 className="text-lg font-semibold mb-3">Your Drafts</h3>
            {drafts.length === 0 ? (
              <p className="text-gray-500">No drafts saved</p>
            ) : (
              <div className="space-y-2">
                {drafts.map((draft) => (
                  <div
                    key={draft.id}
                    className="flex items-start justify-between p-3 rounded-lg hover:bg-gray-800 transition"
                  >
                    <div
                      className="flex-1 cursor-pointer"
                      onClick={() => handleLoadDraft(draft)}
                    >
                      <p className="text-sm line-clamp-2">{draft.content}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(draft.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteDraft(draft.id)}
                      className="ml-3 text-red-500 hover:text-red-400 text-sm"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Content */}
        <div className="p-4">
          <div className="flex items-start gap-3">
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

            {/* Textarea */}
            <div className="flex-1">
              <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => {
                  const newValue = e.target.value;
                  const { charCount: newCharCount } = parseContent(newValue);
                  // Only allow input if under 280 characters (excluding hashtags/mentions)
                  if (newCharCount <= 280) {
                    setContent(newValue);
                  }
                }}
                placeholder="What's happening?"
                className="w-full bg-transparent resize-none outline-none text-lg"
                style={{ color: "var(--foreground)", minHeight: "120px" }}
                rows={1}
              />
            </div>
          </div>

          {/* Character count */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t" style={{ borderColor: "#333" }}>
            <div className="text-sm" style={{ color: remaining < 0 ? "#ff0000" : remaining < 20 ? "#ffaa00" : "#666" }}>
              {remaining < 0 ? `${Math.abs(remaining)} over limit` : `${remaining} characters remaining`}
            </div>
            <button
              onClick={handlePost}
              disabled={!canPost || isPosting}
              className="px-6 py-2 rounded-full font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: canPost ? "var(--color-primary)" : "#333",
                color: canPost ? "#fff" : "#666",
              }}
            >
              {isPosting ? "Posting..." : "Post"}
            </button>
          </div>
        </div>
      </div>

      {/* Discard Dialog */}
      {showDiscardDialog && (
        <>
          <div className="fixed inset-0 bg-black bg-opacity-70 z-50" />
          <div
            className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-sm z-50 rounded-2xl p-6"
            style={{ background: "var(--background)", border: "1px solid #333" }}
          >
            <h3 className="text-xl font-semibold mb-2">Save draft?</h3>
            <p className="text-gray-400 mb-6">
              You can save this post as a draft or discard it.
            </p>
            <div className="space-y-3">
              <button
                onClick={handleSaveDraft}
                className="w-full py-3 rounded-full font-semibold transition"
                style={{ background: "var(--color-primary)", color: "#fff" }}
              >
                Save as Draft
              </button>
              <button
                onClick={handleDiscard}
                className="w-full py-3 rounded-full font-semibold transition border"
                style={{ borderColor: "#ff4444", color: "#ff4444" }}
              >
                Discard
              </button>
              <button
                onClick={() => setShowDiscardDialog(false)}
                className="w-full py-3 rounded-full font-semibold transition"
                style={{ background: "#222", color: "var(--foreground)" }}
              >
                Cancel
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
