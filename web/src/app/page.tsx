'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';

type SavedAccount = {
  userId: string;
  displayName: string | null;
  image: string | null;
  provider: 'google' | 'github' | null;
};

type SignupStep = 'form' | 'code' | 'password';

export default function LandingPage() {
  const { status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const oauthError = searchParams.get('error');

  const [savedAccounts, setSavedAccounts] = useState<SavedAccount[]>([]);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [showCreateAccountModal, setShowCreateAccountModal] = useState(false);
  const [signupStep, setSignupStep] = useState<SignupStep>('form');
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupMonth, setSignupMonth] = useState('');
  const [signupDay, setSignupDay] = useState('');
  const [signupYear, setSignupYear] = useState('');
  const [signupCode, setSignupCode] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupPasswordConfirm, setSignupPasswordConfirm] = useState('');
  const [signupError, setSignupError] = useState<string | null>(null);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);

  const [showSignInModal, setShowSignInModal] = useState(false);
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  const [signInError, setSignInError] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);

  useEffect(() => {
    if (status === 'authenticated') {
      router.replace('/home');
    }
  }, [status, router]);

  useEffect(() => {
    if (status !== 'unauthenticated') return;

    try {
      if (typeof window === 'undefined') return;
      const raw = window.localStorage.getItem('z_saved_accounts');
      const parsed = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(parsed)) return;
      // Only keep the latest one (migrate old list of multiple accounts).
      const list = parsed.length > 1 ? [parsed[0]] : parsed;
      if (parsed.length > 1) {
        window.localStorage.setItem('z_saved_accounts', JSON.stringify(list));
      }
      setSavedAccounts(list);
    } catch {
      // ignore localStorage parsing errors
    }
  }, [status]);

  const handleProviderLogin = async (provider: 'google' | 'github') => {
    await signIn(provider, { callbackUrl: '/home' });
  };

  const handleAccountLogin = async (account: SavedAccount) => {
    if (!account.provider) {
      setShowSignInModal(true);
      return;
    }

    setIsLoggingIn(true);
    await signIn(account.provider, { callbackUrl: '/home' });
  };

  const handleCreateAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignupError(null);

    if (
      !signupName.trim() ||
      !signupEmail.trim() ||
      !signupMonth ||
      !signupDay ||
      !signupYear
    ) {
      setSignupError('Please fill in all fields.');
      return;
    }

    setIsSendingCode(true);
    try {
      const res = await fetch('/api/auth/email/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: signupName.trim(),
          email: signupEmail.trim(),
          birthday: `${signupYear}-${signupMonth}-${signupDay}`,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setSignupError(data.error || 'Failed to send verification code.');
        return;
      }

      setSignupStep('code');
      setSignupCode('');
    } catch (err) {
      console.error('Failed to send verification code:', err);
      setSignupError('Failed to send verification code.');
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignupError(null);

    if (!signupEmail.trim() || !signupCode.trim()) {
      setSignupError('Please enter the code sent to your email.');
      return;
    }

    setIsVerifyingCode(true);
    try {
      const res = await fetch('/api/auth/email/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: signupEmail.trim(),
          code: signupCode.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setSignupError(data.error || 'Invalid code.');
        return;
      }

      setSignupStep('password');
      setSignupPassword('');
      setSignupPasswordConfirm('');
    } catch (err) {
      console.error('Failed to verify code:', err);
      setSignupError('Failed to verify code.');
    } finally {
      setIsVerifyingCode(false);
    }
  };

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignupError(null);

    if (!signupPassword || signupPassword.length < 8) {
      setSignupError('Password must be at least 8 characters.');
      return;
    }
    if (signupPassword !== signupPasswordConfirm) {
      setSignupError('Passwords do not match.');
      return;
    }

    try {
      const birthdayString =
        signupYear && signupMonth && signupDay
          ? `${signupYear}-${signupMonth}-${signupDay}`
          : undefined;

      const res = await fetch('/api/auth/email/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: signupName.trim(),
          email: signupEmail.trim(),
          birthday: birthdayString,
          password: signupPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setSignupError(data.error || 'Failed to create account.');
        return;
      }

      const result = await signIn('credentials', {
        redirect: false,
        email: signupEmail.trim(),
        password: signupPassword,
        callbackUrl: '/setup-username',
      });

      if (result?.error) {
        setSignupError(result.error);
        return;
      }

      setShowCreateAccountModal(false);
      setSignupStep('form');
      setSignupPassword('');
      setSignupPasswordConfirm('');
      router.replace('/setup-username');
    } catch (err) {
      console.error('Failed to complete registration:', err);
      setSignupError('Failed to complete registration.');
    }
  };

  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignInError(null);

    if (!signInEmail.trim() || !signInPassword.trim()) {
      setSignInError('Email and password are required.');
      return;
    }

    setIsSigningIn(true);
    try {
      const result = await signIn('credentials', {
        redirect: false,
        email: signInEmail.trim(),
        password: signInPassword,
        callbackUrl: '/home',
      });

      if (result?.error) {
        setSignInError(result.error);
        return;
      }

      setShowSignInModal(false);
      router.replace('/home');
    } catch (err) {
      console.error('Failed to sign in:', err);
      setSignInError('Failed to sign in.');
    } finally {
      setIsSigningIn(false);
    }
  };

  if (status === 'authenticated') return null;

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <p className="text-white opacity-70">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-black px-4">
      <div className="w-full max-w-5xl flex flex-col md:flex-row md:items-center md:justify-between gap-12">
        {/* Left side: Not-X branding */}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-7xl font-extrabold tracking-tight text-white md:text-8xl">
            Not X
          </div>
        </div>

        {/* Right side: all copy + auth actions */}
        <div className="flex-1 max-w-md w-full">
          {oauthError === 'OAuthAccountNotLinked' && (
            <div className="mb-4 rounded-lg border border-amber-500/50 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
              <p className="font-medium">此 email 已用其他方式註冊</p>
              <p className="mt-1 text-amber-200/90">
                您目前使用的 Google 帳號對應的 email，已經在本站用「Email 密碼」或其他方式註冊過。請改用該 email 的密碼登入，或使用一個從未在本站註冊過的 email 用 Google 登入。
              </p>
              <button
                type="button"
                onClick={() => router.replace('/', { scroll: false })}
                className="mt-2 text-xs underline hover:no-underline"
              >
                關閉
              </button>
            </div>
          )}
          <div className="mb-8">
            <h1 className="mb-2 text-4xl font-bold text-white md:text-6xl">
              Not X
            </h1>
            <h2 className="text-2xl font-semibold text-white md:text-3xl">
              Join today.
            </h2>
          </div>

          {savedAccounts.length > 0 && (
            <div className="mb-8 rounded-2xl bg-neutral-900/80 p-4 shadow-lg ring-1 ring-neutral-800">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-400">
                Continue with an account on this device
              </h3>
              <div className="space-y-2">
                {savedAccounts.map((account) => (
                  <button
                    key={account.userId}
                    type="button"
                    onClick={() => handleAccountLogin(account)}
                    disabled={isLoggingIn}
                    className="flex w-full items-center justify-between rounded-xl bg-black/40 px-3 py-2.5 text-left transition hover:bg-neutral-800/80"
                  >
                    <div className="flex items-center gap-3">
                      {account.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={account.image}
                          alt={account.displayName ?? 'Account avatar'}
                          className="h-9 w-9 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-700 text-sm font-semibold text-white">
                          {account.displayName?.charAt(0).toUpperCase() ?? "N"}
                        </div>
                      )}
                      <div>
                        <div className="text-sm font-medium text-white">
                          {account.displayName ?? 'Unknown user'}
                        </div>
                        <div className="text-xs text-neutral-400">
                          {account.provider === 'google' && 'Google account'}
                          {account.provider === 'github' && 'GitHub account'}
                          {account.provider === null &&
                            'Email and password account'}
                        </div>
                      </div>
                    </div>
                    <span className="text-xs font-medium text-sky-400">
                      {isLoggingIn ? 'Signing in...' : 'Sign in'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mb-6 space-y-3">
            <button
              type="button"
              onClick={() => handleProviderLogin('google')}
              className="flex w-full items-center justify-center gap-3 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-100"
            >
              <span className="text-lg">G</span>
              <span>Sign up with Google</span>
            </button>
            <button
              type="button"
              onClick={() => handleProviderLogin('github')}
              className="flex w-full items-center justify-center gap-3 rounded-full bg-neutral-100 px-4 py-2.5 text-sm font-semibold text-neutral-900 transition hover:bg-white"
            >
              <span className="inline-flex h-5 w-5 items-center justify-center">
                <Image
                  src="/github-icon.png"
                  alt="GitHub"
                  width={20}
                  height={20}
                  className="h-5 w-5"
                />
              </span>
              <span>Sign up with GitHub</span>
            </button>
          </div>

          <div className="mb-6 flex items-center gap-3 text-neutral-500">
            <div className="h-px flex-1 bg-neutral-800" />
            <span className="text-xs font-semibold uppercase tracking-wide">
              or
            </span>
            <div className="h-px flex-1 bg-neutral-800" />
          </div>

          <button
            type="button"
            onClick={() => {
              setShowCreateAccountModal(true);
              setSignupStep('form');
              setSignupError(null);
            }}
            className="mb-4 w-full rounded-full bg-sky-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-600"
          >
            Create account
          </button>

          <p className="mb-8 text-xs text-neutral-500">
            By signing up, you agree to the Terms of Service and Privacy
            Policy.
          </p>

          <div className="mt-6">
            <div className="mb-4 text-lg font-semibold text-white">
              Already have an account?
            </div>
            <button
              type="button"
              onClick={() => {
                setShowSignInModal(true);
                setSignInError(null);
              }}
              className="rounded-full border border-neutral-600 px-6 py-2.5 text-sm font-semibold text-sky-500 transition hover:bg-neutral-900/60"
            >
              Sign in
            </button>
          </div>
        </div>
      </div>

      {showCreateAccountModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-md rounded-2xl bg-black p-6 shadow-2xl ring-1 ring-neutral-800">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">
                Create your account
              </h2>
              <button
                type="button"
                onClick={() => {
                  setShowCreateAccountModal(false);
                  setSignupStep('form');
                  setSignupError(null);
                }}
                className="text-neutral-400 hover:text-neutral-200"
              >
                ✕
              </button>
            </div>

            {signupError && (
              <div className="mb-3 rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                {signupError}
              </div>
            )}

            {signupStep === 'form' && (
              <form onSubmit={handleCreateAccountSubmit} className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-neutral-400">
                    Name
                  </label>
                  <input
                    type="text"
                    value={signupName}
                    onChange={(e) => setSignupName(e.target.value)}
                    className="w-full rounded border border-neutral-700 bg-black px-3 py-2 text-sm text-white outline-none ring-sky-500/60 focus:ring-1"
                    placeholder="Your name"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-neutral-400">
                    Email
                  </label>
                  <input
                    type="email"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    className="w-full rounded border border-neutral-700 bg-black px-3 py-2 text-sm text-white outline-none ring-sky-500/60 focus:ring-1"
                    placeholder="you@example.com"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-neutral-400">
                    Date of birth
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={signupMonth}
                      onChange={(e) => setSignupMonth(e.target.value)}
                      className="w-1/2 rounded border border-neutral-700 bg-black px-2 py-2 text-xs text-white outline-none ring-sky-500/60 focus:ring-1"
                    >
                      <option value="" disabled hidden>
                        Month
                      </option>
                      <option value="01">January</option>
                      <option value="02">February</option>
                      <option value="03">March</option>
                      <option value="04">April</option>
                      <option value="05">May</option>
                      <option value="06">June</option>
                      <option value="07">July</option>
                      <option value="08">August</option>
                      <option value="09">September</option>
                      <option value="10">October</option>
                      <option value="11">November</option>
                      <option value="12">December</option>
                    </select>
                    <select
                      value={signupDay}
                      onChange={(e) => setSignupDay(e.target.value)}
                      className="w-1/4 rounded border border-neutral-700 bg-black px-2 py-2 text-xs text-white outline-none ring-sky-500/60 focus:ring-1"
                    >
                      <option value="" disabled hidden>
                        Day
                      </option>
                      {Array.from({ length: 31 }).map((_, i) => (
                        <option key={i + 1} value={String(i + 1).padStart(2, '0')}>
                          {i + 1}
                        </option>
                      ))}
                    </select>
                    <select
                      value={signupYear}
                      onChange={(e) => setSignupYear(e.target.value)}
                      className="w-1/4 rounded border border-neutral-700 bg-black px-2 py-2 text-xs text-white outline-none ring-sky-500/60 focus:ring-1"
                    >
                      <option value="" disabled hidden>
                        Year
                      </option>
                      {Array.from({ length: 120 }).map((_, i) => {
                        const year = new Date().getFullYear() - i;
                        return (
                          <option key={year} value={String(year)}>
                            {year}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={isSendingCode}
                  className="mt-2 w-full rounded-full bg-sky-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-600 disabled:opacity-60"
                >
                  {isSendingCode ? 'Sending code...' : 'Next'}
                </button>
              </form>
            )}

            {signupStep === 'code' && (
              <form onSubmit={handleVerifyCode} className="space-y-4">
                <p className="text-sm text-neutral-300">
                  We sent a verification code to{' '}
                  <span className="font-semibold">{signupEmail}</span>.
                </p>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-neutral-400">
                    Verification code
                  </label>
                  <input
                    type="text"
                    value={signupCode}
                    onChange={(e) => setSignupCode(e.target.value)}
                    className="w-full rounded border border-neutral-700 bg-black px-3 py-2 text-sm text-white outline-none ring-sky-500/60 focus:ring-1"
                    placeholder="Enter the 6-digit code"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isVerifyingCode}
                  className="mt-2 w-full rounded-full bg-sky-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-600 disabled:opacity-60"
                >
                  {isVerifyingCode ? 'Verifying...' : 'Next'}
                </button>
              </form>
            )}

            {signupStep === 'password' && (
              <form onSubmit={handleSetPassword} className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-neutral-400">
                    Password
                  </label>
                  <input
                    type="password"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    className="w-full rounded border border-neutral-700 bg-black px-3 py-2 text-sm text-white outline-none ring-sky-500/60 focus:ring-1"
                    placeholder="At least 8 characters"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-neutral-400">
                    Confirm password
                  </label>
                  <input
                    type="password"
                    value={signupPasswordConfirm}
                    onChange={(e) => setSignupPasswordConfirm(e.target.value)}
                    className="w-full rounded border border-neutral-700 bg-black px-3 py-2 text-sm text-white outline-none ring-sky-500/60 focus:ring-1"
                    placeholder="Re-enter your password"
                  />
                </div>
                <button
                  type="submit"
                  className="mt-2 w-full rounded-full bg-sky-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-600"
                >
                  Sign up
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {showSignInModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-md rounded-2xl bg-black p-6 shadow-2xl ring-1 ring-neutral-800">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">Sign in</h2>
              <button
                type="button"
                onClick={() => {
                  setShowSignInModal(false);
                  setSignInError(null);
                }}
                className="text-neutral-400 hover:text-neutral-200"
              >
                ✕
              </button>
            </div>

            {signInError && (
              <div className="mb-3 rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                {signInError}
              </div>
            )}

            <div className="mb-4 space-y-2">
              <button
                type="button"
                onClick={() => handleProviderLogin('google')}
                className="flex w-full items-center justify-center gap-3 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-100"
              >
                <span className="text-lg">G</span>
                <span>Sign in with Google</span>
              </button>
              <button
                type="button"
                onClick={() => handleProviderLogin('github')}
                className="flex w-full items-center justify-center gap-3 rounded-full bg-neutral-100 px-4 py-2.5 text-sm font-semibold text-neutral-900 transition hover:bg-white"
              >
                <span className="inline-flex h-5 w-5 items-center justify-center">
                  <Image
                    src="/github-icon.png"
                    alt="GitHub"
                    width={20}
                    height={20}
                    className="h-5 w-5"
                  />
                </span>
                <span>Sign in with GitHub</span>
              </button>
            </div>

            <div className="mb-4 flex items-center gap-3 text-neutral-500">
              <div className="h-px flex-1 bg-neutral-800" />
              <span className="text-xs font-semibold uppercase tracking-wide">
                or
              </span>
              <div className="h-px flex-1 bg-neutral-800" />
            </div>

            <form onSubmit={handleSignInSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-neutral-400">
                  Email
                </label>
                <input
                  type="email"
                  value={signInEmail}
                  onChange={(e) => setSignInEmail(e.target.value)}
                  className="w-full rounded border border-neutral-700 bg-black px-3 py-2 text-sm text-white outline-none ring-sky-500/60 focus:ring-1"
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-neutral-400">
                  Password
                </label>
                <input
                  type="password"
                  value={signInPassword}
                  onChange={(e) => setSignInPassword(e.target.value)}
                  className="w-full rounded border border-neutral-700 bg-black px-3 py-2 text-sm text-white outline-none ring-sky-500/60 focus:ring-1"
                  placeholder="Your password"
                />
              </div>
              <button
                type="submit"
                disabled={isSigningIn}
                className="mt-2 w-full rounded-full bg-sky-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-600 disabled:opacity-60"
              >
                {isSigningIn ? 'Signing in...' : 'Sign in'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
