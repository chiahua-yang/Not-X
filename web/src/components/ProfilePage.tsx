"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import Post from "./Post";

interface ProfilePageProps {
  userId?: string; // Optional: if viewing someone else's profile
}

type TabType = "posts" | "likes";

export default function ProfilePage({ userId }: ProfilePageProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [profileUser, setProfileUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<TabType>("posts");
  const [posts, setPosts] = useState<any[]>([]);
  const [likedPosts, setLikedPosts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isHoveringFollow, setIsHoveringFollow] = useState(false);

  const isOwnProfile = !userId || currentUser?.userId === userId;
  const sessionUserId = (session?.user as { id?: string } | undefined)?.id;

  // Own profile: fetch user, posts, and liked posts in parallel (one round-trip wave on Vercel)
  useEffect(() => {
    if (userId || !session?.user?.email || !sessionUserId) return;

    setIsLoading(true);
    Promise.all([
      fetch("/api/user/current").then((res) => res.json()),
      fetch(`/api/posts?userId=${sessionUserId}`).then((res) => res.json()),
      fetch("/api/posts/liked").then((res) => res.json()),
    ])
      .then(([userData, postsData, likedData]) => {
        const user = userData?.user;
        if (user) {
          setCurrentUser(user);
          setProfileUser(user);
        }
        setPosts(postsData?.posts ?? []);
        setLikedPosts(likedData?.posts ?? []);
      })
      .catch((err) => {
        console.error(err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [userId, session?.user?.email, sessionUserId]);

  // Viewing someone else's profile
  useEffect(() => {
    if (!userId) return;

    setIsLoading(true);
    fetch(`/api/users/${userId}`)
      .then((res) => res.json())
      .then((data) => {
        setProfileUser(data.user);
        setIsFollowing(data.isFollowing || false);
      })
      .catch((err) => {
        console.error(err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [userId]);

  // Fetch posts when profileUser is set (for others' profile; own profile already has posts from parallel fetch)
  useEffect(() => {
    if (!profileUser?.id || !userId) return;

    fetch(`/api/posts?userId=${profileUser.id}`)
      .then((res) => res.json())
      .then((data) => setPosts(data.posts || []))
      .catch(console.error);
  }, [profileUser?.id, userId]);


  const handleFollow = async () => {
    if (!profileUser?.userId) return;

    try {
      const res = await fetch(`/api/users/${profileUser.userId}/follow`, {
        method: "POST",
      });

      if (res.ok) {
        const data = await res.json();
        setIsFollowing(data.isFollowing);
        // Update follower count
        setProfileUser({
          ...profileUser,
          followersCount: data.isFollowing
            ? profileUser.followersCount + 1
            : profileUser.followersCount - 1,
        });
      }
    } catch (error) {
      console.error("Failed to follow/unfollow:", error);
    }
  };

  const refreshPosts = () => {
    if (!profileUser?.id) return;
    fetch(`/api/posts?userId=${profileUser.id}`)
      .then((res) => res.json())
      .then((data) => setPosts(data.posts || []))
      .catch(console.error);
  };

  const refreshLikedPosts = () => {
    if (!profileUser?.id) return;
    fetch(`/api/posts/liked?userId=${profileUser.id}`)
      .then((res) => res.json())
      .then((data) => setLikedPosts(data.posts || []))
      .catch(console.error);
  };

  const handleLike = async (postId: string) => {
    try {
      await fetch(`/api/posts/${postId}/like`, { method: "POST" });

      // Update local state to toggle like status
      if (activeTab === "posts") {
        setPosts(prevPosts =>
          prevPosts.map(post => {
            if (post.id === postId) {
              const isCurrentlyLiked = post.isLiked || (post.likes && post.likes.length > 0);
              return {
                ...post,
                isLiked: !isCurrentlyLiked,
                likes: isCurrentlyLiked ? [] : [{ id: 'temp' }],
                _count: {
                  ...post._count,
                  likes: isCurrentlyLiked ? post._count.likes - 1 : post._count.likes + 1
                }
              };
            }
            return post;
          })
        );
      } else {
        // For likes tab, also update local state but don't remove from list
        setLikedPosts(prevPosts =>
          prevPosts.map(post => {
            if (post.id === postId) {
              const isCurrentlyLiked = post.isLiked || (post.likes && post.likes.length > 0);
              return {
                ...post,
                isLiked: !isCurrentlyLiked,
                likes: isCurrentlyLiked ? [] : [{ id: 'temp' }],
                _count: {
                  ...post._count,
                  likes: isCurrentlyLiked ? post._count.likes - 1 : post._count.likes + 1
                }
              };
            }
            return post;
          })
        );
      }
    } catch (error) {
      console.error("Failed to like/unlike post:", error);
    }
  };

  const handleRepost = async (postId: string) => {
    try {
      await fetch(`/api/posts/${postId}/repost`, { method: "POST" });
      if (activeTab === "posts") {
        refreshPosts();
      }
    } catch (error) {
      console.error("Failed to repost:", error);
    }
  };

  const handleDelete = async (postId: string) => {
    if (!confirm("Are you sure you want to delete this post?")) return;

    try {
      const res = await fetch(`/api/posts/${postId}`, { method: "DELETE" });
      if (res.ok) {
        if (activeTab === "posts") {
          refreshPosts();
        } else {
          refreshLikedPosts();
        }
      }
    } catch (error) {
      console.error("Failed to delete post:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!profileUser) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-gray-500">User not found</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="sticky top-0 z-10 border-b" style={{ borderColor: "#333", background: "var(--background)" }}>
        <div className="flex items-center gap-8 p-4">
          <button
            onClick={() => router.back()}
            className="text-xl hover:bg-gray-800 rounded-full p-2 transition"
          >
            ←
          </button>
          <div>
            <h1 className="text-xl font-bold">{profileUser.displayName || profileUser.name}</h1>
            <p className="text-sm text-gray-500">{profileUser.postsCount} posts</p>
          </div>
        </div>
      </div>

      {/* Cover Image */}
      <div
        className="h-48 bg-gradient-to-r from-blue-900 to-blue-700"
        style={{
          background: profileUser.coverImage
            ? `url(${profileUser.coverImage}) center/cover`
            : "linear-gradient(to right, #1e3a8a, #1e40af)",
        }}
      />

      {/* Profile Info */}
      <div className="px-4 pb-4">
        {/* Avatar and Button Row */}
        <div className="flex items-end justify-between -mt-16 mb-4">
          {/* Avatar */}
          <div
            className="relative w-32 h-32 rounded-full border-4"
            style={{
              borderColor: "var(--background)",
              background: profileUser.image
                ? `url(${profileUser.image}) center/cover`
                : "var(--color-primary)",
              zIndex: 10,
            }}
          >
            {!profileUser.image && (
              <div className="w-full h-full flex items-center justify-center text-white font-bold text-4xl">
                {profileUser.name?.[0]?.toUpperCase() || "?"}
              </div>
            )}
          </div>

          {/* Edit Profile / Follow Button */}
          {isOwnProfile ? (
            <button
              onClick={() => setShowEditModal(true)}
              className="px-6 py-2 rounded-full font-semibold border transition hover:bg-gray-800"
              style={{ borderColor: "#666", color: "var(--foreground)" }}
            >
              Edit profile
            </button>
          ) : (
            <button
              onClick={handleFollow}
              onMouseEnter={() => setIsHoveringFollow(true)}
              onMouseLeave={() => setIsHoveringFollow(false)}
              className="px-6 py-2 rounded-full font-semibold transition-all cursor-pointer"
              style={{
                background: isFollowing
                  ? (isHoveringFollow ? "rgba(254, 226, 226, 0.1)" : "transparent")
                  : "var(--foreground)",
                color: isFollowing
                  ? (isHoveringFollow ? "#f91880" : "var(--foreground)")
                  : "var(--background)",
                border: isFollowing
                  ? (isHoveringFollow ? "1px solid #f91880" : "1px solid #666")
                  : "none",
              }}
            >
              {isFollowing ? (isHoveringFollow ? "Unfollow" : "Following") : "Follow"}
            </button>
          )}
        </div>

        {/* User Info */}
        <div className="space-y-3">
          <div>
            <h2 className="text-xl font-bold">{profileUser.displayName || profileUser.name}</h2>
            <p className="text-gray-500">@{profileUser.userId}</p>
          </div>

          {profileUser.bio && <p className="text-base">{profileUser.bio}</p>}

          {/* Following/Followers */}
          <div className="flex gap-4 text-sm">
            <div>
              <span className="font-semibold">{profileUser.followingCount}</span>
              <span className="text-gray-500 ml-1">Following</span>
            </div>
            <div>
              <span className="font-semibold">{profileUser.followersCount}</span>
              <span className="text-gray-500 ml-1">Followers</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b mt-6" style={{ borderColor: "#333" }}>
          <button
            onClick={() => setActiveTab("posts")}
            className="flex-1 py-4 font-semibold transition hover:bg-gray-800"
            style={{
              color: activeTab === "posts" ? "var(--foreground)" : "#666",
              borderBottom: activeTab === "posts" ? "3px solid var(--color-primary)" : "3px solid transparent",
            }}
          >
            Posts
          </button>
          {isOwnProfile && (
            <button
              onClick={() => setActiveTab("likes")}
              className="flex-1 py-4 font-semibold transition hover:bg-gray-800"
              style={{
                color: activeTab === "likes" ? "var(--foreground)" : "#666",
                borderBottom: activeTab === "likes" ? "3px solid var(--color-primary)" : "3px solid transparent",
              }}
            >
              Likes
            </button>
          )}
        </div>

        {/* Posts/Likes Content */}
        <div>
          {activeTab === "posts" ? (
            posts.length === 0 ? (
              <div className="p-8 text-center text-gray-500">No posts yet</div>
            ) : (
              <div>
                {posts.map((post, index) => (
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
            )
          ) : (
            <>
              <div className="p-4 bg-blue-900 bg-opacity-20 border border-blue-700 rounded-lg mt-4">
                <p className="text-sm flex items-center gap-2">
                  <span>🔒</span>
                  <span>Your likes are private. Only you can see them.</span>
                </p>
              </div>
              {likedPosts.length === 0 ? (
                <div className="p-8 text-center text-gray-500">No liked posts yet</div>
              ) : (
                <div>
                  {likedPosts.map((post) => (
                    <Post
                      key={post.id}
                      post={post}
                      currentUserId={currentUser?.id}
                      onLike={handleLike}
                      onRepost={handleRepost}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Edit Profile Modal */}
      {showEditModal && (
        <EditProfileModal
          user={profileUser}
          onClose={() => setShowEditModal(false)}
          onSave={(updatedUser) => {
            setProfileUser(updatedUser);
            setCurrentUser(updatedUser);
            setShowEditModal(false);
          }}
        />
      )}
    </div>
  );
}

// Edit Profile Modal Component
function EditProfileModal({
  user,
  onClose,
  onSave,
}: {
  user: any;
  onClose: () => void;
  onSave: (user: any) => void;
}) {
  const [step, setStep] = useState(0); // 0: Images, 1: Display Name, 2: Bio
  const [displayName, setDisplayName] = useState(user.displayName || user.name || "");
  const [bio, setBio] = useState(user.bio || "");
  const [image, setImage] = useState(user.image || "");
  const [coverImage, setCoverImage] = useState(user.coverImage || "");
  const [isFocused, setIsFocused] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const handleNext = () => {
    if (step === 0) {
      setStep(1);
    } else if (step === 1) {
      setStep(2);
    } else {
      handleSave();
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName, bio, image, coverImage }),
      });

      if (res.ok) {
        const data = await res.json();
        onSave(data.user);
      } else {
        alert("Failed to update profile");
      }
    } catch (error) {
      console.error("Failed to update profile:", error);
      alert("Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  if (!mounted) return null;

  const modalContent = (
    <>
      {/* Backdrop with blur */}
      <div className="fixed inset-0 bg-black bg-opacity-70 z-50" style={{ backdropFilter: "blur(4px)" }} />

      {/* Modal */}
      <div
        className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-xl z-50 rounded-2xl"
        style={{ background: "var(--background)", border: "1px solid #333" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: "#333" }}>
          <button
            onClick={() => step === 0 ? onClose() : setStep(step - 1)}
            className="text-xl hover:bg-gray-800 rounded-full w-8 h-8 flex items-center justify-center transition"
          >
            ←
          </button>
          <div className="flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full ${step === 0 ? 'bg-blue-500' : 'bg-gray-600'}`} />
            <div className={`w-2 h-2 rounded-full ${step === 1 ? 'bg-blue-500' : 'bg-gray-600'}`} />
            <div className={`w-2 h-2 rounded-full ${step === 2 ? 'bg-blue-500' : 'bg-gray-600'}`} />
          </div>
          <div className="w-8" /> {/* Spacer for alignment */}
        </div>

        {/* Content */}
        <div className="p-8" style={{ minHeight: "400px" }}>
          {step === 0 ? (
            // Step 0: Images
            <div className="space-y-6">
              <div>
                <h2 className="text-3xl font-bold mb-3">Pick a profile picture and cover</h2>
                <p className="text-gray-400">
                  Have a favorite selfie? Upload it now. You can also add a cover image.
                </p>
              </div>

              {/* Cover Image Preview */}
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: "var(--color-accent)" }}>
                  Cover Image
                </label>
                <div
                  className="w-full h-32 rounded-lg mb-2"
                  style={{
                    background: coverImage
                      ? `url(${coverImage}) center/cover`
                      : "linear-gradient(to right, #1e3a8a, #1e40af)",
                  }}
                />
                <input
                  type="text"
                  value={coverImage}
                  onChange={(e) => setCoverImage(e.target.value)}
                  className="w-full bg-transparent border-2 rounded-lg px-4 py-2 outline-none transition-colors"
                  style={{
                    borderColor: "#444",
                    color: "var(--foreground)"
                  }}
                  placeholder="Enter cover image URL"
                />
              </div>

              {/* Profile Image Preview */}
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: "var(--color-accent)" }}>
                  Profile Picture
                </label>
                <div className="flex items-center gap-4 mb-2">
                  <div
                    className="w-24 h-24 rounded-full"
                    style={{
                      background: image
                        ? `url(${image}) center/cover`
                        : "var(--color-primary)",
                    }}
                  >
                    {!image && (
                      <div className="w-full h-full flex items-center justify-center text-white font-bold text-2xl">
                        {displayName?.[0]?.toUpperCase() || user.name?.[0]?.toUpperCase() || "?"}
                      </div>
                    )}
                  </div>
                </div>
                <input
                  type="text"
                  value={image}
                  onChange={(e) => setImage(e.target.value)}
                  className="w-full bg-transparent border-2 rounded-lg px-4 py-2 outline-none transition-colors"
                  style={{
                    borderColor: "#444",
                    color: "var(--foreground)"
                  }}
                  placeholder="Enter profile image URL"
                />
              </div>
            </div>
          ) : step === 1 ? (
            // Step 1: Display Name
            <div className="space-y-6">
              <div>
                <h2 className="text-3xl font-bold mb-3">What's your name?</h2>
                <p className="text-gray-400">
                  This is how other users will see you. You can use your real name or a nickname.
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: "var(--color-accent)" }}>
                  Display Name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full bg-transparent border-2 rounded-lg px-4 py-3 outline-none text-lg transition-colors"
                  style={{
                    borderColor: displayName ? "var(--color-accent)" : "#444",
                    color: "var(--foreground)"
                  }}
                  maxLength={50}
                  placeholder="Enter your name"
                  autoFocus
                />
                <p className="text-xs text-gray-500 mt-2">{displayName.length}/50</p>
              </div>
            </div>
          ) : (
            // Step 2: Bio
            <div className="space-y-6">
              <div>
                <h2 className="text-3xl font-bold mb-3">Describe yourself</h2>
                <p className="text-gray-400">
                  What makes you special? Don't think too hard, just have fun with it.
                </p>
              </div>

              <div className="relative">
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  className="w-full bg-transparent border-2 rounded-lg px-4 pt-6 pb-3 outline-none resize-none transition-colors"
                  style={{
                    borderColor: isFocused || bio ? "#1d9bf0" : "#444",
                    color: "var(--foreground)",
                    minHeight: "150px"
                  }}
                  rows={6}
                  maxLength={160}
                  placeholder={!isFocused && !bio ? "" : ""}
                />

                {/* Floating label */}
                <label
                  className="absolute left-4 transition-all pointer-events-none"
                  style={{
                    top: isFocused || bio ? "8px" : "20px",
                    fontSize: isFocused || bio ? "12px" : "16px",
                    color: isFocused || bio ? "#1d9bf0" : "#666",
                  }}
                >
                  Your bio
                </label>

                {/* Character count */}
                {(isFocused || bio) && (
                  <div
                    className="absolute right-4 top-2 text-xs transition-opacity"
                    style={{ color: bio.length >= 160 ? "#f91880" : "#666" }}
                  >
                    {bio.length} / 160
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t flex gap-3" style={{ borderColor: "#333" }}>
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-full font-semibold border transition hover:bg-gray-800"
            style={{ borderColor: "#666", color: "var(--foreground)" }}
          >
            Cancel
          </button>
          <button
            onClick={handleNext}
            disabled={isSaving || (step === 1 && !displayName.trim())}
            className="flex-1 py-3 rounded-full font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: (step === 1 && !displayName.trim()) ? "#333" : "var(--color-primary)",
              color: "#fff"
            }}
          >
            {isSaving ? "Saving..." : step === 2 ? "Save" : "Next"}
          </button>
        </div>
      </div>
    </>
  );

  return createPortal(modalContent, document.body);
}
