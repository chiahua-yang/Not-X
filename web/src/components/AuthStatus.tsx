"use client";

import { signIn, signOut, useSession } from "next-auth/react";

export default function AuthStatus() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <p style={{ opacity: 0.7 }}>Loading session…</p>;
  }

  if (!session) {
    return (
      <div className="flex flex-col gap-3">
        <p style={{ opacity: 0.8 }}>You are not signed in.</p>
        <button
          onClick={() => signIn()}
          className="rounded-full px-5 py-2"
          style={{ background: "var(--color-primary)", color: "#fff" }}
        >
          Sign in
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p>
        Signed in as <span style={{ color: "var(--color-accent)" }}>{session.user?.email ?? session.user?.name}</span>
      </p>
      <button
        onClick={() => signOut()}
        className="rounded-full px-5 py-2 border"
        style={{ borderColor: "var(--color-accent)", color: "var(--color-accent)" }}
      >
        Sign out
      </button>
    </div>
  );
}


