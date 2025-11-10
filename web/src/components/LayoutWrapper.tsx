"use client";

import { useEffect, useRef, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import Sidebar from "./Sidebar";

// const IDLE_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const IDLE_TIMEOUT = 3 * 60 * 1000; // 3 minutes

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const lastActiveRef = useRef<number>(Date.now());
  const hasSignedOutRef = useRef(false);
  const [userChecked, setUserChecked] = useState(false);

  // Check if user has set userId
  useEffect(() => {
    if (!session?.user?.email) {
      setUserChecked(true);
      return;
    }

    // Skip check if already on setup-username
    if (pathname === "/setup-username") {
      setUserChecked(true);
      return;
    }

    fetch("/api/user/current")
      .then((res) => res.json())
      .then((data) => {
        if (!data.user?.userId) {
          router.push("/setup-username");
        } else {
          setUserChecked(true);
        }
      })
      .catch(() => {
        setUserChecked(true);
      });
  }, [session, pathname, router]);

  // Idle timeout logic
  useEffect(() => {
    if (!session) {
      return;
    }

    lastActiveRef.current = Date.now();
    hasSignedOutRef.current = false;

    const events: (keyof DocumentEventMap)[] = [
      "click",
      "keydown",
      "mousemove",
      "scroll",
      "touchstart",
    ];

    const handleActivity = () => {
      const now = Date.now();
      if (now - lastActiveRef.current > IDLE_TIMEOUT) {
        if (!hasSignedOutRef.current) {
          hasSignedOutRef.current = true;
          void signOut({ callbackUrl: "/" });
        }
      } else {
        lastActiveRef.current = now;
      }
    };

    events.forEach((event) => document.addEventListener(event, handleActivity));

    return () => {
      events.forEach((event) => document.removeEventListener(event, handleActivity));
    };
  }, [session]);

  if (status === "loading" || (session && !userChecked)) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: "var(--background)" }}>
        <p style={{ color: "var(--foreground)", opacity: 0.7 }}>Loading...</p>
      </div>
    );
  }

  if (!session) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--background)", color: "var(--foreground)" }}>
      <div className="flex max-w-7xl" style={{ paddingLeft: "10vw" }}>
        <Sidebar />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}

