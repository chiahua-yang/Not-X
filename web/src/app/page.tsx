"use client";

import { useEffect, useState } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

type SavedAccount = {
  id: string;
  userId: string;
  name: string | null;
  displayName: string | null;
  image: string | null;
  provider: string | null;
};

export default function LandingPage() {
  const { status } = useSession();
  const router = useRouter();
  const [savedAccounts, setSavedAccounts] = useState<SavedAccount[]>([]);
  const [showUserIdInput, setShowUserIdInput] = useState(false);
  const [userIdInput, setUserIdInput] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showProviderModal, setShowProviderModal] = useState(false);

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/home");
    }
  }, [status, router]);

  // Fetch saved accounts on mount
  useEffect(() => {
    async function fetchSavedAccounts() {
      try {
        const res = await fetch("/api/auth/accounts");
        if (res.ok) {
          const accounts = await res.json();
          setSavedAccounts(accounts);
        }
      } catch (error) {
        console.error("Failed to fetch saved accounts:", error);
      }
    }
    if (status === "unauthenticated") {
      fetchSavedAccounts();
    }
  }, [status]);

  const handleAccountLogin = async (account: SavedAccount) => {
    setIsLoggingIn(true);
    // If we know the provider, use it directly; otherwise show modal
    if (account.provider && (account.provider === 'google' || account.provider === 'github')) {
      await signIn(account.provider, { callbackUrl: '/home' });
    } else {
      // Fallback to modal if provider is unknown
      setShowProviderModal(true);
    }
  };

  const handleUserIdLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userIdInput.trim()) return;

    setIsLoggingIn(true);

    // Try to find the account by userId and use its provider
    const matchedAccount = savedAccounts.find(
      acc => acc.userId.toLowerCase() === userIdInput.trim().toLowerCase().replace('@', '')
    );

    if (matchedAccount?.provider && (matchedAccount.provider === 'google' || matchedAccount.provider === 'github')) {
      // Found a match, use its provider directly
      await signIn(matchedAccount.provider, { callbackUrl: '/home' });
    } else {
      // No match found, show provider selection modal
      setShowProviderModal(true);
    }
  };

  const handleProviderLogin = async (provider: 'google' | 'github') => {
    await signIn(provider, { callbackUrl: '/home' });
  };

  const removeAccount = async (accountId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    // TODO: Implement account removal from local saved list
    setSavedAccounts(prev => prev.filter(acc => acc.id !== accountId));
  };

  if (status === "authenticated") {
    return null;
  }

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <p className="text-white opacity-70">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-black px-4">
      <div className="w-full max-w-md">
        <h1 className="mb-8 text-4xl font-bold text-white">Log in to X</h1>

        {savedAccounts.length > 0 && (
          <div className="mb-8">
            <p className="mb-4 text-gray-400">Continue with your existing accounts</p>
            <div className="space-y-3">
              {savedAccounts.map((account) => (
                <div
                  key={account.id}
                  className="flex w-full items-center gap-4 rounded-lg border border-gray-700 bg-black px-4 py-3 transition-colors hover:bg-gray-900"
                >
                  <button
                    onClick={() => handleAccountLogin(account)}
                    disabled={isLoggingIn}
                    className="flex flex-1 items-center gap-4 text-left disabled:opacity-50"
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gray-700 text-white">
                      {account.image ? (
                        <img
                          src={account.image}
                          alt={account.name || account.userId}
                          className="h-full w-full rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-lg font-semibold">
                          {(account.displayName || account.name || account.userId)
                            .charAt(0)
                            .toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-white">
                        {account.displayName || account.name}
                      </p>
                      <p className="text-sm text-gray-400">@{account.userId}</p>
                    </div>
                  </button>
                  <button
                    onClick={(e) => removeAccount(account.id, e)}
                    className="shrink-0 p-2 text-gray-500 transition-colors hover:text-gray-300"
                    aria-label="Remove account"
                  >
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M3 6h18v2H3zm2 3h14l-1 13H6zm5-8h4v2h-4z" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={() => setShowProviderModal(true)}
          disabled={isLoggingIn}
          className="mb-6 flex w-full items-center justify-center gap-3 rounded-full border border-gray-700 bg-black px-6 py-3 text-white transition-colors hover:bg-gray-900 disabled:opacity-50"
        >
          <span className="text-2xl">+</span>
          <span>Add another account</span>
          <div className="ml-auto flex gap-2">
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
          </div>
        </button>

        <div className="my-6 flex items-center gap-4">
          <div className="flex-1 border-t border-gray-700"></div>
          <span className="text-gray-400">OR</span>
          <div className="flex-1 border-t border-gray-700"></div>
        </div>

        {!showUserIdInput ? (
          <button
            onClick={() => setShowUserIdInput(true)}
            className="w-full rounded-full border border-gray-700 bg-black px-6 py-3 text-white transition-colors hover:bg-gray-900"
          >
            Log in with userID
          </button>
        ) : (
          <form onSubmit={handleUserIdLogin} className="space-y-4">
            <div>
              <input
                type="text"
                value={userIdInput}
                onChange={(e) => setUserIdInput(e.target.value)}
                placeholder="Enter your @userID"
                className="w-full rounded-lg border border-gray-700 bg-black px-4 py-3 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                autoFocus
              />
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowUserIdInput(false);
                  setUserIdInput("");
                }}
                className="flex-1 rounded-full border border-gray-700 bg-black px-6 py-3 text-white transition-colors hover:bg-gray-900"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!userIdInput.trim() || isLoggingIn}
                className="flex-1 rounded-full bg-white px-6 py-3 text-black transition-colors hover:bg-gray-200 disabled:opacity-50"
              >
                {isLoggingIn ? "Logging in..." : "Log in"}
              </button>
            </div>
          </form>
        )}

        <div className="mt-8 border-t border-gray-700 pt-8">
          <p className="mb-4 text-center text-gray-400">Don&apos;t have an account?</p>
          <button
            onClick={() => setShowProviderModal(true)}
            disabled={isLoggingIn}
            className="w-full rounded-full border border-gray-700 bg-black px-6 py-3 text-white transition-colors hover:bg-gray-900 disabled:opacity-50"
          >
            Create a new account
          </button>
        </div>
      </div>

      {/* Provider Selection Modal */}
      {showProviderModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
          onClick={() => {
            setShowProviderModal(false);
            setIsLoggingIn(false);
          }}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-black border border-gray-700 p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">Choose a provider</h2>
              <button
                onClick={() => {
                  setShowProviderModal(false);
                  setIsLoggingIn(false);
                }}
                className="text-gray-400 transition-colors hover:text-white"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <button
                onClick={() => handleProviderLogin('google')}
                className="flex w-full items-center justify-center gap-3 rounded-full border border-gray-600 bg-white px-6 py-3 text-black transition-colors hover:bg-gray-100"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Continue with Google
              </button>

              <button
                onClick={() => handleProviderLogin('github')}
                className="flex w-full items-center justify-center gap-3 rounded-full border border-gray-600 bg-white px-6 py-3 text-black transition-colors hover:bg-gray-100"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
                Continue with GitHub
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

