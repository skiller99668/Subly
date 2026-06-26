"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { getSupabaseBrowserClient } from "@/utils/supabase"
import { MapPin, ArrowLeft } from "lucide-react"

// The site's canonical origin. Prefer an explicit env (stable across Vercel
// preview deployments) and fall back to the current origin in the browser.
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
  (typeof window !== "undefined" ? window.location.origin : "")

// Official multi-colour Google "G" mark, so the OAuth button reads like every
// other site's rather than a generic icon.
function GoogleIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.167 6.656 3.58 9 3.58z"
      />
    </svg>
  )
}

export default function AuthPage() {
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [username, setUsername] = useState("")
  const [name, setName] = useState("")
  const [error, setError] = useState("")
  const [info, setInfo] = useState("")
  const [showResend, setShowResend] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()

  // Surface errors passed back from the /auth/confirm verification route.
  useEffect(() => {
    const err = new URLSearchParams(window.location.search).get("error")
    if (err) setError(err)
  }, [])

  // Tick the resend cooldown down to zero, one second at a time.
  useEffect(() => {
    if (resendCooldown <= 0) return
    const id = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000)
    return () => clearTimeout(id)
  }, [resendCooldown])

  const switchTab = (signUp: boolean) => {
    setIsSignUp(signUp)
    setError("")
    setInfo("")
    setShowResend(false)
  }

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setInfo("")
    setShowResend(false)
    setLoading(true)

    try {
      if (isSignUp) {
        // Sign up validation
        if (password !== confirmPassword) {
          setError("Passwords do not match")
          setLoading(false)
          return
        }
        if (password.length < 6) {
          setError("Password must be at least 6 characters")
          setLoading(false)
          return
        }
        if (!username || !name) {
          setError("Username and name are required")
          setLoading(false)
          return
        }

        // Best-effort username uniqueness check (the DB also enforces it).
        const { data: existing } = await supabase
          .from("users")
          .select("id")
          .eq("username", username)
          .maybeSingle()

        if (existing) {
          setError("That username is already taken")
          setLoading(false)
          return
        }

        // Create the account. With email confirmation enabled, Supabase sends
        // a verification link and returns no session until the email is
        // confirmed. The name/username ride along in user metadata and are
        // turned into a public.users row by the on_auth_user_created trigger.
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { name, username },
          },
        })

        if (signUpError) {
          setError(signUpError.message)
          setLoading(false)
          return
        }

        // An existing-but-unconfirmed email is returned with an empty
        // identities array (Supabase avoids leaking which emails are taken).
        if (data.user && data.user.identities && data.user.identities.length === 0) {
          setError("An account with this email already exists. Try signing in.")
          setLoading(false)
          return
        }

        // If a session comes back, "Confirm email" is OFF in Supabase: the
        // account is already active and no verification email is sent. This is
        // the usual reason no email arrives — surface it instead of telling
        // them to check an inbox that will stay empty.
        if (data.session) {
          setInfo(
            "Account created and signed in. (Email verification is currently disabled in Supabase — enable “Confirm email” to require it.)"
          )
          router.refresh()
          setLoading(false)
          return
        }

        setInfo(
          `We've sent a verification link to ${email}. Click it to activate your account, then sign in.`
        )
        setShowResend(true)
        setResendCooldown(30)
        setIsSignUp(false)
        setPassword("")
        setConfirmPassword("")
        setUsername("")
        setName("")
      } else {
        // Sign in with Supabase (sets the session cookie shared with the server)
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (signInError) {
          const code = (signInError as { code?: string }).code
          if (
            code === "email_not_confirmed" ||
            signInError.message.toLowerCase().includes("not confirmed")
          ) {
            setError("Your email isn't verified yet. Check your inbox for the verification link.")
            setShowResend(true)
          } else {
            setError("Invalid email or password")
          }
        } else {
          router.push("/")
          router.refresh()
        }
      }
    } catch (err: any) {
      setError(err.message || "An error occurred. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (!email) {
      setError("Enter your email above, then resend.")
      return
    }
    setLoading(true)
    setError("")
    setInfo("")
    const { error: resendError } = await supabase.auth.resend({
      type: "signup",
      email,
    })
    if (resendError) {
      setError(resendError.message)
    } else {
      setInfo(`Verification email re-sent to ${email}.`)
      setResendCooldown(30)
    }
    setLoading(false)
  }

  const handleGoogleSignIn = async () => {
    setLoading(true)
    setError("")
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${SITE_URL}/auth/callback`,
        },
      })

      if (error) {
        setError("Google signin failed: " + error.message)
        setLoading(false)
      }
    } catch (err: any) {
      setError("Google signin error: " + err.message)
      setLoading(false)
    }
  }

  const inputClass =
    "w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-[15px] text-slate-800 placeholder:text-slate-400 transition focus:border-slate-300 focus:outline-none focus:ring-4 focus:ring-slate-900/5 disabled:opacity-60"

  return (
    <div className="relative min-h-screen overflow-hidden bg-white font-sans text-slate-900 antialiased">
      {/* Faint dotted texture, matching the landing hero */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: "radial-gradient(#dbe1ea 1px, transparent 1px)",
          backgroundSize: "24px 24px",
          maskImage: "radial-gradient(ellipse 70% 55% at 50% 30%, black 30%, transparent 80%)",
          WebkitMaskImage: "radial-gradient(ellipse 70% 55% at 50% 30%, black 30%, transparent 80%)",
        }}
      />

      <div className="relative mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-12 sm:px-6">
        {/* Back to home */}
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-1.5 self-start text-sm font-medium text-slate-500 transition-colors hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>

        {/* Logo + heading */}
        <div className="mb-7 text-center">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-600">
              <MapPin className="h-[18px] w-[18px] text-white" strokeWidth={2.5} />
            </span>
            <span className="text-xl font-semibold tracking-tight text-slate-900">Subly</span>
          </Link>
          <h1 className="mt-6 font-serif text-3xl font-medium tracking-tight text-slate-900">
            {isSignUp ? "Create your account" : "Welcome back"}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {isSignUp
              ? "Find a sublease, a roommate, or post your own — always free."
              : "Sign in to message hosts and manage your listings."}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_-16px_rgba(15,23,42,0.18)] sm:p-7">
          {/* Google */}
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="flex w-full items-center justify-center gap-2.5 rounded-lg border border-slate-200 bg-white py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50"
          >
            <GoogleIcon className="h-[18px] w-[18px]" />
            Continue with Google
          </button>

          {/* Divider */}
          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-xs font-medium uppercase tracking-wide text-slate-400">or</span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          {/* Tab Switch */}
          <div className="mb-5 grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1">
            <button
              onClick={() => switchTab(false)}
              className={`rounded-md py-1.5 text-sm font-medium transition ${
                !isSignUp ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Sign in
            </button>
            <button
              onClick={() => switchTab(true)}
              className={`rounded-md py-1.5 text-sm font-medium transition ${
                isSignUp ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Sign up
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleEmailAuth} className="space-y-4">
            {/* Email */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
                placeholder="your@email.com"
                required
                disabled={loading}
              />
            </div>

            {/* Name (Sign Up Only) */}
            {isSignUp && (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Full name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={inputClass}
                  placeholder="Your name"
                  required={isSignUp}
                  disabled={loading}
                />
              </div>
            )}

            {/* Username (Sign Up Only) */}
            {isSignUp && (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className={inputClass}
                  placeholder="Choose a username"
                  required={isSignUp}
                  disabled={loading}
                />
              </div>
            )}

            {/* Password */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
                placeholder="Enter password"
                required
                disabled={loading}
              />
            </div>

            {/* Confirm Password (Sign Up Only) */}
            {isSignUp && (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Confirm password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={inputClass}
                  placeholder="Confirm password"
                  required={isSignUp}
                  disabled={loading}
                />
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Info / success message */}
            {info && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
                {info}
              </div>
            )}

            {/* Resend verification link (with cooldown) */}
            {showResend && (
              <div className="text-sm text-slate-600">
                Didn&apos;t get the email?{" "}
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={loading || resendCooldown > 0}
                  className="font-medium text-blue-600 underline hover:text-blue-700 disabled:cursor-not-allowed disabled:text-slate-400 disabled:no-underline"
                >
                  {resendCooldown > 0
                    ? `Resend in ${resendCooldown}s`
                    : "Resend verification email"}
                </button>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Loading…" : isSignUp ? "Create account" : "Sign in"}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          By continuing you agree to use Subly responsibly. No brokers, no fees.
        </p>
      </div>
    </div>
  )
}
