"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import PostModal from "./PostModal";

function NavItem({ href, label, highlight = false, onClick }: { href?: string; label: string; highlight?: boolean; onClick?: () => void }) {
  const content = (
    <div
      className="mb-3 block rounded-full px-5 py-3 transition-all duration-200 cursor-pointer"
      style={{
        background: highlight ? "var(--color-primary)" : "transparent",
        color: highlight ? "#fff" : "var(--color-foreground)",
        border: highlight ? "none" : "1px solid #333",
      }}
      onMouseEnter={(e) => {
        if (!highlight) {
          e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
        }
      }}
      onMouseLeave={(e) => {
        if (!highlight) {
          e.currentTarget.style.background = "transparent";
        }
      }}
      onClick={onClick}
    >
      {label}
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}

export default function Sidebar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [showPostModal, setShowPostModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Fetch current user info (skip if on setup-username page)
  useEffect(() => {
    if (session?.user?.email && pathname !== "/setup-username") {
      fetch("/api/user/current")
        .then((res) => res.json())
        .then((data) => setCurrentUser(data.user))
        .catch(console.error);
    }
  }, [session, pathname]);

  const handleLogout = () => {
    signOut({ callbackUrl: "/" });
  };

  return (
    <>
      <aside className="w-72 pl-3 pr-6 py-6 flex flex-col" style={{ borderRight: "1px solid #222", height: "100vh" }}>
        <div className="mb-6 text-xl" style={{ color: "var(--color-accent)" }}>X-Clone</div>
        <nav className="flex-1">
          <NavItem href="/home" label="Home" />
          <NavItem href="/profile" label="Profile" />
          <NavItem label="Post" highlight onClick={() => setShowPostModal(true)} />
        </nav>

        {/* User Profile Card */}
        {currentUser && (
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="w-full flex items-center gap-3 p-3 rounded-full hover:bg-gray-800 transition"
            >
              {/* Avatar */}
              <div
                className="w-10 h-10 rounded-full flex-shrink-0"
                style={{
                  background: session?.user?.image
                    ? `url(${session.user.image}) center/cover`
                    : "var(--color-primary)",
                }}
              >
                {!session?.user?.image && (
                  <div className="w-full h-full flex items-center justify-center text-white font-semibold text-sm">
                    {currentUser.name?.[0]?.toUpperCase() || "?"}
                  </div>
                )}
              </div>

              {/* User Info */}
              <div className="flex-1 text-left overflow-hidden">
                <div className="font-semibold truncate" style={{ color: "var(--foreground)" }}>
                  {currentUser.displayName || currentUser.name || "User"}
                </div>
                <div className="text-sm text-gray-500 truncate">
                  @{currentUser.userId || "unknown"}
                </div>
              </div>

              {/* More icon */}
              <div className="text-lg">⋯</div>
            </button>

            {/* Popup Menu */}
            {showUserMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowUserMenu(false)}
                />
                <div
                  className="absolute bottom-full left-0 right-0 mb-2 py-2 rounded-2xl shadow-lg z-20"
                  style={{ background: "var(--background)", border: "1px solid #333" }}
                >
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      // TODO: Add account switching functionality
                      alert("Account switching not implemented yet");
                    }}
                    className="w-full px-4 py-3 text-left hover:bg-gray-800 transition"
                    style={{ color: "var(--foreground)" }}
                  >
                    Add an existing account
                  </button>
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      handleLogout();
                    }}
                    className="w-full px-4 py-3 text-left hover:bg-gray-800 transition"
                    style={{ color: "var(--foreground)" }}
                  >
                    Log out @{currentUser.userId || "unknown"}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </aside>

      <PostModal
        isOpen={showPostModal}
        onClose={() => setShowPostModal(false)}
        onPostCreated={() => {
          // Optionally refresh posts or show success message
          console.log("Post created successfully");
        }}
      />
    </>
  );
}


