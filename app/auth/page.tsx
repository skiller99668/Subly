"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { getSupabaseBrowserClient } from "@/utils/supabase"
import { Mail, Chrome } from "lucide-react"

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
          redirectTo: `${window.location.origin}/auth/callback`,
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-indigo-600">Subly</h1>
          <p className="text-gray-600 mt-2">Find a sublease near McGill</p>
        </div>

        {/* Google Sign In Button - Always Available */}
        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full bg-white border-2 border-gray-300 hover:border-blue-500 text-gray-700 font-semibold py-3 rounded-lg transition flex items-center justify-center gap-2 mb-6 disabled:opacity-50"
        >
          <Chrome size={20} />
          Sign in with Google
        </button>

        {/* Divider */}
        <div className="flex items-center my-4">
          <div className="flex-1 border-t border-gray-300"></div>
          <span className="px-2 text-gray-500 text-sm">OR</span>
          <div className="flex-1 border-t border-gray-300"></div>
        </div>

        {/* Tab Switch */}
        <div className="flex gap-4 mb-6 border-b">
          <button
            onClick={() => switchTab(false)}
            className={`flex-1 py-2 font-semibold transition ${
              !isSignUp
                ? "text-indigo-600 border-b-2 border-indigo-600"
                : "text-gray-600"
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => switchTab(true)}
            className={`flex-1 py-2 font-semibold transition ${
              isSignUp
                ? "text-indigo-600 border-b-2 border-indigo-600"
                : "text-gray-600"
            }`}
          >
            Sign Up
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleEmailAuth} className="space-y-4">
          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="your@email.com"
              required
              disabled={loading}
            />
          </div>

          {/* Name (Sign Up Only) */}
          {isSignUp && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Your name"
                required={isSignUp}
                disabled={loading}
              />
            </div>
          )}

          {/* Username (Sign Up Only) */}
          {isSignUp && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Choose username"
                required={isSignUp}
                disabled={loading}
              />
            </div>
          )}

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Enter password"
              required
              disabled={loading}
            />
          </div>

          {/* Confirm Password (Sign Up Only) */}
          {isSignUp && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Confirm password"
                required={isSignUp}
                disabled={loading}
              />
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Info / success message */}
          {info && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
              {info}
            </div>
          )}

          {/* Resend verification link (with cooldown) */}
          {showResend && (
            <div className="text-sm text-gray-600">
              Didn't get the email?{" "}
              <button
                type="button"
                onClick={handleResend}
                disabled={loading || resendCooldown > 0}
                className="text-indigo-600 hover:text-indigo-700 underline disabled:no-underline disabled:text-gray-400 disabled:cursor-not-allowed"
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
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 rounded-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Mail size={18} />
            {loading ? "Loading..." : isSignUp ? "Create Account" : "Sign In with Email"}
          </button>
        </form>
      </div>
    </div>
  )
}
