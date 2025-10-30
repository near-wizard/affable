"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { storeAuthCredentials } from "@/lib/auth-utils"

export default function SignupPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [role, setRole] = useState("partner")
  const [companyName, setCompanyName] = useState("")
  const [websiteUrl, setWebsiteUrl] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    // Validate passwords match
    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    // Validate password strength
    if (password.length < 8) {
      setError("Password must be at least 8 characters")
      return
    }

    // Check for uppercase letter
    if (!/[A-Z]/.test(password)) {
      setError("Password must contain at least one uppercase letter")
      return
    }

    // Check for number
    if (!/[0-9]/.test(password)) {
      setError("Password must contain at least one number")
      return
    }

    // For vendors, validate website URL
    if (role === "vendor" && !websiteUrl) {
      setError("Website URL is required for vendors")
      return
    }

    setIsLoading(true)

    try {
      let endpoint: string
      let body: Record<string, any>

      if (role === "partner") {
        endpoint = `${process.env.NEXT_PUBLIC_API_URL}/v1/auth/register/partner`
        body = {
          email,
          password,
          name: email.split("@")[0], // Use part of email as name
        }
      } else {
        endpoint = `${process.env.NEXT_PUBLIC_API_URL}/v1/auth/register/vendor`
        body = {
          email,
          password,
          company_name: companyName || email.split("@")[1], // Use domain or provided company name
          name: email.split("@")[0],
          website_url: websiteUrl,
        }
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || "Sign up failed")
      }

      const data = await response.json()

      // Signup successful - account created
      if (role === "partner") {
        // Partners: account is pending approval, must log in after approval
        localStorage.setItem("signup_success_email", email)
        localStorage.setItem("signup_success_role", role)
        localStorage.setItem("signup_user_id", data.user_id || "")

        alert("Account created successfully! Your partner account is pending approval. You'll be able to log in once approved.")

        // Redirect to login page
        router.push(`/login?email=${encodeURIComponent(email)}&role=${role}`)
      } else if (role === "vendor" && data.access_token) {
        // Vendors: account is active, automatically log in and redirect to dashboard
        storeAuthCredentials(
          data.access_token,
          data.refresh_token,
          "vendor",
          data.user_id,
          data.email
        )

        // Show success message
        alert("Account created successfully! You are now logged in.")

        // Redirect to vendor dashboard
        router.push("/admin")
      } else {
        // Fallback: redirect to login if no token received
        alert("Vendor account created successfully! You can now log in with your email and password.")
        router.push(`/login?email=${encodeURIComponent(email)}&role=${role}`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred during sign up")
      console.error("Sign up error:", err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-muted">
      <div className="bg-card p-8 rounded-2xl shadow-md w-full max-w-md">
        <h1 className="text-2xl font-semibold text-center mb-6">
          Get started with <span className="text-primary">Affable Link</span>
        </h1>

        {error && (
          <div className="mb-4 p-3 bg-destructive/10 border border-destructive/30 text-destructive rounded-lg text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              I am a:
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full border border-border rounded-lg p-2 text-foreground"
            >
              <option value="partner">Affiliate / Partner</option>
              <option value="vendor">Founder / Vendor</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Email
            </label>
            <input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-border rounded-lg p-2 text-foreground"
              required
              disabled={isLoading}
            />
          </div>

          {role === "vendor" && (
            <>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Company Name
                </label>
                <input
                  type="text"
                  placeholder="Your company name"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full border border-border rounded-lg p-2 text-foreground"
                  disabled={isLoading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Website URL
                </label>
                <input
                  type="url"
                  placeholder="https://example.com"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  className="w-full border border-border rounded-lg p-2 text-foreground"
                  required
                  disabled={isLoading}
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Password
            </label>
            <input
              type="password"
              placeholder="Min 8 chars, 1 uppercase, 1 number"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-border rounded-lg p-2 text-foreground"
              required
              disabled={isLoading}
              minLength={8}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Must contain: at least 8 characters, 1 uppercase letter, 1 number
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Confirm Password
            </label>
            <input
              type="password"
              placeholder="Confirm your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full border border-border rounded-lg p-2 text-foreground"
              required
              disabled={isLoading}
              minLength={8}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-primary/100 text-white rounded-lg py-2 hover:bg-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed border-2 border-blueberry"
          >
            {isLoading ? "Creating account..." : "Create Account"}
          </button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Already have an account?{" "}
          <Link href="/login" className="text-primary hover:underline font-medium">
            Log in
          </Link>
        </p>
      </div>
    </div>
  )
}
