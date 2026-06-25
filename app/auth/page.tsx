"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { supabase } from "@/utils/supabase"
import { Mail, Chrome } from "lucide-react"

export default function AuthPage() {
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [username, setUsername] = useState("")
  const [name, setName] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
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

        // Call the signup API
        const response = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, name, username }),
        })

        const data = await response.json()

        if (!response.ok) {
          setError(data.error || "Failed to create account")
          setLoading(false)
          return
        }

        setError("")
        alert("Account created! You can now sign in.")
        setIsSignUp(false)
        setEmail("")
        setPassword("")
        setConfirmPassword("")
        setUsername("")
        setName("")
      } else {
        // Sign in
        const result = await signIn("credentials", {
          email,
          password,
          redirect: false,
        })

        if (result?.error) {
          setError("Invalid email or password")
        } else if (result?.ok) {
          router.push("/")
        }
      }
    } catch (err: any) {
      setError(err.message || "An error occurred. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setLoading(true)
    setError("")
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
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
            onClick={() => {
              setIsSignUp(false)
              setError("")
            }}
            className={`flex-1 py-2 font-semibold transition ${
              !isSignUp
                ? "text-indigo-600 border-b-2 border-indigo-600"
                : "text-gray-600"
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => {
              setIsSignUp(true)
              setError("")
            }}
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
