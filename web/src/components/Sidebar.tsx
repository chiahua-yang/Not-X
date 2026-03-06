"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
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
  const router = useRouter();
  const [showPostModal, setShowPostModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
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

  const handleAddAccount = () => {
    setShowUserMenu(false);
    signOut({ callbackUrl: "/" });
  };

  const handleLogoutClick = () => {
    setShowUserMenu(false);
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
    setShowLogoutConfirm(false);
    signOut({ callbackUrl: "/" });
  };

  return (
    <>
      <aside className="w-72 pl-3 pr-6 py-6 flex flex-col" style={{ borderRight: "1px solid #222", height: "100vh" }}>
        <div className="mb-6 text-xl" style={{ color: "var(--color-accent)" }}>Not X</div>
        <nav className="flex-1">
          <NavItem href="/home" label="Home" highlight={pathname === "/home"} />
          <NavItem href="/profile" label="Profile" highlight={pathname === "/profile"} />
          <NavItem label="Post" highlight={false} onClick={() => setShowPostModal(true)} />
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
                    onClick={handleAddAccount}
                    className="w-full px-4 py-3 text-left hover:bg-gray-800 transition"
                    style={{ color: "var(--foreground)" }}
                  >
                    Add an existing account
                  </button>
                  <button
                    onClick={handleLogoutClick}
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

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70">
          <div
            className="w-full max-w-sm rounded-2xl p-8"
            style={{ background: "var(--background)", border: "1px solid #333" }}
          >
            <h2 className="mb-4 text-2xl font-bold" style={{ color: "var(--foreground)" }}>
              Log out of Not-X?
            </h2>
            <p className="mb-6 text-gray-400">
              You can always log back in at any time.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={confirmLogout}
                className="w-full rounded-full bg-white px-6 py-3 font-semibold text-black transition-colors hover:bg-gray-200"
              >
                Log out
              </button>
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="w-full rounded-full border px-6 py-3 font-semibold transition-colors hover:bg-gray-800"
                style={{ borderColor: "#333", color: "var(--foreground)" }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}


