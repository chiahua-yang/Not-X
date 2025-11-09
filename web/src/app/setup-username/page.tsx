"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { userIdSchema } from "@/lib/validation";
import HomeFeed from "@/components/HomeFeed";

export default function SetupUsernamePage() {
  const { data: session } = useSession();
  const [value, setValue] = useState("");
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showMore, setShowMore] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const invalidMessage = useMemo(() => {
    if (!value) return null; // 不輸入時不顯示警告
    const res = userIdSchema.safeParse(value);
    return res.success ? null : res.error.issues[0]?.message || null;
  }, [value]);

  useEffect(() => {
    if (!value || invalidMessage) {
      setAvailable(null);
      return;
    }
    let aborted = false;
    setChecking(true);
    fetch(`/api/user/handle/availability?userId=${encodeURIComponent(value)}`)
      .then((r) => r.json())
      .then((j) => {
        if (aborted) return;
        setAvailable(Boolean(j?.available));
      })
      .catch(() => {
        if (aborted) return;
        setAvailable(null);
      })
      .finally(() => {
        if (aborted) return;
        setChecking(false);
      });
    return () => {
      aborted = true;
    };
  }, [value, invalidMessage]);

  // 產生建議 username（取自 name 或 email 前綴），並檢查可用性
  useEffect(() => {
    const baseRaw =
      (session?.user?.name || "user") + (session?.user?.email ? "_" + session.user.email.split("@")[0] : "");
    const base = baseRaw.toLowerCase().replace(/[^a-z0-9_]/g, "_").slice(0, 12) || "user";
    const candidates = Array.from(new Set([
      `${base}`,
      `${base}${Math.floor(10 + Math.random() * 89)}`,
      `${base}_${Math.floor(100 + Math.random() * 899)}`,
      `${base}${Math.floor(1000 + Math.random() * 8999)}`,
    ])).slice(0, 6);

    let cancelled = false;
    Promise.all(
      candidates.map(async (c) => {
        const valid = userIdSchema.safeParse(c).success;
        if (!valid) return null;
        const r = await fetch(`/api/user/handle/availability?userId=${encodeURIComponent(c)}`);
        const j = await r.json().catch(() => ({}));
        return j?.available ? c : null;
      })
    ).then((arr) => {
      if (cancelled) return;
      const filtered = arr.filter(Boolean) as string[];
      setSuggestions(filtered.slice(0, 4));
    });
    return () => {
      cancelled = true;
    };
  }, [session?.user?.name, session?.user?.email]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = userIdSchema.safeParse(value);
    if (!res.success) {
      setError(res.error.issues[0]?.message || "Invalid username");
      return;
    }
    const resp = await fetch("/api/user/handle", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: value }),
    });
    if (!resp.ok) {
      const j = await resp.json().catch(() => ({}));
      setError(j?.error || "Failed to set username");
      return;
    }
    window.location.href = "/home";
  }

  return (
    <>
      {/* Background content (Home Feed) */}
      <div className="relative">
        <HomeFeed />
      </div>

      {/* Backdrop overlay */}
      <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0, 0, 0, 0.7)", backdropFilter: "blur(4px)" }}>
        {/* Modal Container */}
        <div
          className="w-full max-w-lg rounded-2xl p-8 shadow-2xl"
          style={{ background: "var(--background)", border: "1px solid #333" }}
        >
        <form onSubmit={onSubmit} className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold mb-2" style={{ color: "var(--foreground)" }}>
              What should we call you?
            </h1>
            <p className="text-gray-400">
              Your @username is unique. You can always change it later.
            </p>
          </div>

          <div>
            <label className="block text-sm mb-2 font-semibold" style={{ color: "var(--color-accent)" }}>
              Username
            </label>
            <div
              className="rounded-lg border px-4 py-3"
              style={{
                borderColor:
                  invalidMessage || available === false ? "#ef4444" : "#444",
                background: "#0a0a0a",
              }}
            >
              <span style={{ color: "#999" }}>@</span>
              <input
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="ml-2 w-[90%] bg-transparent outline-none text-lg"
                style={{ color: "var(--foreground)" }}
                placeholder="your_handle"
                autoFocus
              />
            </div>
            {invalidMessage && (
              <p className="mt-2 text-sm" style={{ color: "#ef4444" }}>
                {invalidMessage}
              </p>
            )}
            {!invalidMessage && available === false && (
              <p className="mt-2 text-sm" style={{ color: "#ef4444" }}>
                That username has been taken. Please choose another.
              </p>
            )}
            {!invalidMessage && available && (
              <p className="mt-2 text-sm flex items-center gap-1" style={{ color: "#22c55e" }}>
                ✓ Available
              </p>
            )}
            {error && (
              <p className="mt-2 text-sm" style={{ color: "#ef4444" }}>
                {error}
              </p>
            )}

            {/* Suggestions */}
            {suggestions.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-sm text-gray-500">Suggestions:</p>
                <div className="flex flex-wrap gap-2">
                  {(showMore ? suggestions.slice(0, 4) : suggestions.slice(0, 2)).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setValue(s)}
                      className="rounded-full px-4 py-2 border hover:bg-gray-800 transition"
                      style={{ borderColor: "#444", color: "#ccc" }}
                    >
                      @{s}
                    </button>
                  ))}
                </div>
                {suggestions.length > 2 && !showMore && (
                  <button
                    type="button"
                    onClick={() => setShowMore(true)}
                    className="text-sm text-gray-500 hover:text-gray-300 underline"
                  >
                    show more
                  </button>
                )}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={Boolean(invalidMessage) || available === false || checking}
            className="w-full rounded-full px-6 py-4 text-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: Boolean(invalidMessage) || available === false || checking ? "#555" : "var(--color-primary)",
              color: "#fff",
            }}
          >
            {checking ? "Checking..." : "Next"}
          </button>
        </form>
        </div>
      </div>
    </>
  );
}


