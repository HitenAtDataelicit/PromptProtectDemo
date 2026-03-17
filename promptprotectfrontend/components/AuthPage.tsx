"use client"

import React, { useMemo, useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"
import * as CT from "countries-and-timezones"

interface AuthPageProps {
  onSuccess?: () => void
}

const emailRegex =
  /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(\.[a-zA-Z]{2,})?$/

import { SearchableDropdown } from "@/components/SearchableDropdown"

const API_BASE = ""

const EyeIcon = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-5 w-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
      d="M2.458 12C3.732 7.943 7.523 5 12 5s8.268 2.943 9.542 7c-1.274 4.057-5.065 7-9.542 7s-8.268-2.943-9.542-7z"
    />
    <circle cx="12" cy="12" r="3" strokeWidth="1.5" />
  </svg>
)

const EyeOffIcon = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-5 w-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
      d="M3 3l18 18M10.477 10.477A3 3 0 0113.5 13.5m-1.732-4.255A3 3 0 0115 12m-3-7c4.477 0 8.268 2.943 9.542 7a9.97 9.97 0 01-1.501 3.063M6.96 6.96C4.79 8.278 3.268 10.17 2.458 12c1.274 4.057 5.065 7 9.542 7 1.43 0 2.79-.27 4.02-.764"
    />
  </svg>
)

function isBusinessEmail(email: string) {
  return emailRegex.test(email)
}

function isStrongPassword(password: string) {
  const regex = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{7,}$/
  return regex.test(password)
}

function Field({
  label,
  children,
  hint,
  error,
}: {
  label: string
  children: React.ReactNode
  hint?: string
  error?: string
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="text-[11px] uppercase tracking-wide text-slate-400">{label}</div>
        {hint ? <div className="text-[11px] text-slate-500">{hint}</div> : null}
      </div>
      {children}
      {error ? <div className="text-xs text-red-400">{error}</div> : null}
    </div>
  )
}

function Stepper({ step }: { step: number }) {
  const steps = [
    { n: 1, label: "Organization" },
    { n: 2, label: "Admin" },
  ]

  return (
    <div className="flex items-center justify-between gap-2">
      {steps.map((s, idx) => {
        const active = step === s.n
        const done = step > s.n
        return (
          <div key={s.n} className="flex flex-1 items-center gap-2">
            <div
              className={[
                "h-7 w-7 shrink-0 rounded-full border text-xs font-semibold",
                "flex items-center justify-center",
                done
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                  : active
                    ? "border-blue-500/30 bg-blue-500/10 text-blue-200"
                    : "border-slate-800/70 bg-slate-950/30 text-slate-400",
              ].join(" ")}
            >
              {s.n}
            </div>
            <div className="min-w-0">
              <div
                className={[
                  "truncate text-xs font-medium",
                  active || done ? "text-slate-200" : "text-slate-500",
                ].join(" ")}
              >
                {s.label}
              </div>
            </div>

            {idx !== steps.length - 1 ? (
              <div className="mx-1 h-px flex-1 bg-slate-800/70" />
            ) : null}
          </div>
        )
      })}
    </div>
  )
}

export default function AuthPage({ onSuccess }: AuthPageProps) {
  const router = useRouter()
  // Mode: "signup" or "login"
  const [authMode, setAuthMode] = useState<"signup" | "login">("login")

  // Login State
  // loginStep 1: Enter Org Key
  // loginStep 2: Enter Credentials (LDAP/Local) or SSO Button
  const [loginStep, setLoginStep] = useState(1)
  const [orgKey, setOrgKey] = useState("") // Populated after Workspace Lookup
  const [workspaceInput, setWorkspaceInput] = useState("") // User enters Workspace here
  const [authSettings, setAuthSettings] = useState<any>(null)
  const [selectedAuthMethod, setSelectedAuthMethod] = useState<"LOCAL" | "LDAP" | "SAML" | null>(null)

  // Common State
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  // Signup Specific State
  const [signupStep, setSignupStep] = useState(1)
  const [orgName, setOrgName] = useState("")
  const [workspace, setWorkspace] = useState("")
  const [timezone, setTimezone] = useState("Asia/Kolkata")
  const [userName, setUserName] = useState("")
  const [touched, setTouched] = useState({
    orgName: false,
    userName: false,
    email: false,
    password: false,
    orgKey: false,
    workspaceInput: false,
    workspace: false
  })

  const [verificationSuccess, setVerificationSuccess] = useState(false)

  // Check URL params for errors (e.g., SAML failure)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search)
      const success = urlParams.get("success")
      const verified = urlParams.get("verified")

      if (success === "true") {
        // Handle SAML Success
        onSuccess?.()
      } else if (verified === "true") {
        setVerificationSuccess(true)
        setAuthMode("login")
      } else {
        const errorMsg = urlParams.get("error")
        if (errorMsg) {
          setError(decodeURIComponent(errorMsg))
        }
      }
    }
  }, [onSuccess])


  // Derived State
  const emailValidSignup = useMemo(() => isBusinessEmail(email), [email])
  const passwordValid = useMemo(() => isStrongPassword(password), [password])
  const workspaceValid = useMemo(() => /^[a-zA-Z0-9_]+$/.test(workspace), [workspace])
  const canGoSignupStep1 = orgName.trim().length > 0 && workspaceValid
  const canGoSignupStep2 = userName.trim().length > 0 && emailValidSignup && passwordValid

  const emailError = useMemo(() => {
    if (!touched.email) return ""
    if (!emailRegex.test(email)) return "Invalid email format"
    return ""
  }, [email, touched.email])

  const passwordError = useMemo(() => {
    if (!touched.password) return ""
    if (authMode === "signup" && !isStrongPassword(password))
      return "Password must be 7+ chars, include 1 uppercase letter, 1 number, and 1 special character"
    return ""
  }, [password, touched.password, authMode])

  const getBorder = (isValid: boolean, field: keyof typeof touched) => {
    if (!touched[field]) return "border-slate-800/70"
    return isValid ? "border-emerald-500/40" : "border-red-500/40"
  }

  const toggleAuthMode = () => {
    setAuthMode(prev => prev === "login" ? "signup" : "login")
    // Reset states
    setLoginStep(1)
    setSignupStep(1)
    setError("")
    setOrgKey("")
    setWorkspaceInput("")
    setWorkspace("")
    setAuthSettings(null)
    setTouched({ orgName: false, userName: false, email: false, password: false, orgKey: false, workspaceInput: false, workspace: false })
    setEmail("")
    setPassword("")
    setTimezone("Asia/Kolkata")
  }

  // --- Handlers ---

  const handleFetchAuthSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    setTouched(t => ({ ...t, workspaceInput: true }))
    if (!workspaceInput.trim()) {
      setError("Workspace identifier is required")
      return
    }

    setLoading(true)
    setError("")

    try {
      const res = await fetch(`${API_BASE}/api/org/byworkspace/${workspaceInput.trim()}/auth-settings`, {
        credentials: "include"
      })
      const data = await res.json()

      if (!res.ok || !data.success) {
        setError(data.message || "Organization not found for this workspace")
        return
      }

      setAuthSettings(data.data)
      setOrgKey(data.data.orgKey)
      setLoginStep(2)
    } catch (err) {
      setError("Failed to connect to the server")
    } finally {
      setLoading(false)
    }
  }

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setTouched(t => ({ ...t, email: true, password: true }))

    if (!email || !password) {
      setError("Email and password are required")
      return
    }

    setLoading(true)
    setError("")

    try {
      const isLdap = selectedAuthMethod === "LDAP"
      const endpoint = isLdap ? "/api/sso/login/ldap" : "/api/users/auth/login"
      const payload = isLdap
        ? { orgKey, email, password }
        : { userEmail: email, userPassword: password }

      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        if (data.status === "PENDING_VERIFICATION") {
          setError(data.message || "Please verify your email address. A link was sent to your inbox.")
        } else if (data.status === "SUSPENDED") {
          setError(data.message || "Your account has been suspended. Please contact your administrator.")
        } else {
          setError(data.message || data.error || "Invalid credentials")
        }
        return
      }

      onSuccess?.()
    } catch {
      setError("Network error occurred during login")
    } finally {
      setLoading(false)
    }
  }

  const [signupSuccess, setSignupSuccess] = useState(false)

  const handleSignupSubmit = async () => {
    setTouched({ orgName: true, userName: true, email: true, password: true, orgKey: false, workspaceInput: false, workspace: true })
    if (!emailValidSignup || !passwordValid || !orgName.trim() || !userName.trim() || !workspaceValid) return

    setLoading(true)
    setError("")

    try {
      const res = await fetch(`${API_BASE}/api/org/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ userName, userEmail: email, userPassword: password, orgName, workspace, timezone }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.message || "Something went wrong")
        return
      }

      setSignupSuccess(true)
      // Switch to login mode after 3 seconds
      setTimeout(() => {
        setAuthMode("login")
        setSignupSuccess(false)
        setSignupStep(1)
        setEmail("")
        setPassword("")
      }, 5000)

    } catch {
      setError("Network error")
    } finally {
      setLoading(false)
    }
  }

  const handleSSORedirect = () => {
    window.location.href = `${API_BASE}/api/sso/login/saml/${orgKey}`
  }

  // --- Renders ---

  const renderLoginStep1 = () => (
    <form onSubmit={handleFetchAuthSettings} className="mt-2 space-y-5">
      <Field label="Workspace" error={touched.workspaceInput && !workspaceInput.trim() ? "Required" : ""}>
        <input
          type="text"
          placeholder="e.g. acme_corp"
          value={workspaceInput}
          onChange={(e) => setWorkspaceInput(e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, workspaceInput: true }))}
          className={cn(
            "w-full rounded-xl border bg-slate-950/30 px-4 py-3 text-sm text-slate-100 outline-none",
            "placeholder:text-slate-600",
            "focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/20",
            getBorder(!!workspaceInput.trim(), "workspaceInput")
          )}
        />
      </Field>
      <button
        type="submit"
        disabled={loading || !workspaceInput.trim()}
        className={cn(
          "w-full rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-3 text-sm font-semibold",
          "text-slate-100 shadow-[0_0_0_1px_rgba(37,99,235,0.20)]",
          "hover:bg-blue-500/15 hover:border-blue-500/40 transition",
          "disabled:opacity-50 disabled:cursor-not-allowed"
        )}
      >
        {loading ? "Verifying..." : "Continue"}
      </button>
    </form>
  )

  const renderLoginStep2 = () => {
    const isLdapEnabled = authSettings?.authProviders?.ldap && authSettings?.ldap?.enabled
    const isSamlEnabled = authSettings?.authProviders?.saml && authSettings?.saml?.enabled
    const isLocalEnabled = authSettings?.authProviders?.local !== false

    const availableMethods: ("LOCAL" | "LDAP" | "SAML")[] = []
    if (isLocalEnabled) availableMethods.push("LOCAL")
    if (isLdapEnabled) availableMethods.push("LDAP")
    if (isSamlEnabled) availableMethods.push("SAML")

    if (selectedAuthMethod === null && availableMethods.length > 1) {
      return (
        <div className="mt-2 space-y-4">
          <div className="text-xs text-slate-400 mb-2">Choose your preferred login method:</div>

          {isLocalEnabled && (
            <button
              onClick={() => setSelectedAuthMethod("LOCAL")}
              className="w-full rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-4 text-sm font-semibold text-slate-100 hover:bg-blue-500/15 transition flex items-center justify-between"
            >
              <span>Standard Login</span>
              <span className="opacity-40 text-xs">Email / Password</span>
            </button>
          )}

          {isLdapEnabled && (
            <button
              onClick={() => setSelectedAuthMethod("LDAP")}
              className="w-full rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-4 text-sm font-semibold text-slate-100 hover:bg-blue-500/15 transition flex items-center justify-between"
            >
              <span>LDAP Login</span>
              <span className="opacity-40 text-xs text-right">Corporate Credentials</span>
            </button>
          )}

          {isSamlEnabled && (
            <button
              onClick={handleSSORedirect}
              className="w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-4 text-sm font-semibold text-slate-100 hover:bg-slate-800 transition flex items-center justify-between"
            >
              <span>SSO Login</span>
              <span className="opacity-40 text-xs">SAML / OKTA</span>
            </button>
          )}

          <button
            onClick={() => { setLoginStep(1); setAuthSettings(null); setError(""); setOrgKey(""); setWorkspaceInput(""); }}
            className="w-full text-xs text-slate-500 hover:text-slate-400 mt-6"
          >
            ← Back to Workspace Input
          </button>
        </div>
      )
    }

    const activeMethod = selectedAuthMethod || (availableMethods.length === 1 ? availableMethods[0] : "LOCAL")

    if (activeMethod === "SAML") {
      handleSSORedirect();
      return <div>Redirecting to SSO...</div>
    }

    return (
      <div className="mt-2 space-y-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider">{activeMethod === "LDAP" ? "LDAP authentication" : "Local authentication"}</span>
          {availableMethods.length > 1 && (
            <button
              onClick={() => setSelectedAuthMethod(null)}
              className="text-[10px] text-slate-500 hover:text-slate-300"
            >
              Change Method
            </button>
          )}
        </div>

        <form onSubmit={handleLoginSubmit} className="space-y-5">
          <Field label="Email" error={emailError}>
            <input
              type="email"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value.toLowerCase())}
              onBlur={() => setTouched((t) => ({ ...t, email: true }))}
              className={cn(
                "w-full rounded-xl border bg-slate-950/30 px-4 py-3 text-sm text-slate-100 outline-none",
                "placeholder:text-slate-600",
                "focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/20",
                getBorder(emailRegex.test(email), "email")
              )}
            />
          </Field>

          <Field label="Password" error={passwordError}>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, password: true }))}
                className={cn(
                  "w-full rounded-xl border bg-slate-950/30 px-4 py-3 pr-11 text-sm text-slate-100 outline-none",
                  "placeholder:text-slate-600",
                  "focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/20",
                  getBorder(password.length > 0, "password")
                )}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg border border-slate-800/70 bg-slate-950/40 p-2 text-slate-200 hover:bg-slate-900/40 transition"
              >
                {showPassword ? EyeOffIcon : EyeIcon}
              </button>
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => router.push("/forgot-password")}
                className="text-[11px] font-medium text-slate-500 hover:text-blue-300 transition"
              >
                Forgot password?
              </button>
            </div>
          </Field>

          <button
            type="submit"
            disabled={loading || !email || !password}
            className={cn(
              "w-full rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-3 text-sm font-semibold",
              "text-slate-100 shadow-[0_0_0_1px_rgba(37,99,235,0.20)]",
              "hover:bg-blue-500/15 hover:border-blue-500/40 transition",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            {loading ? "Signing in..." : (activeMethod === "LDAP" ? "Sign in with LDAP" : "Sign in")}
          </button>
        </form>

        <button
          onClick={() => { setLoginStep(1); setAuthSettings(null); setError(""); setOrgKey(""); setWorkspaceInput(""); setSelectedAuthMethod(null); }}
          className="w-full text-xs text-slate-500 hover:text-slate-400 mt-4"
        >
          ← Back to Workspace Input
        </button>
      </div >
    )
  }

  const renderSignup = () => (
    <div className="mt-2 space-y-6">
      <Stepper step={signupStep} />

      {signupStep === 1 && (
        <div className="space-y-5">
          <Field label="Organization name" hint="Required">
            <input
              type="text"
              placeholder="Acme Security"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, orgName: true }))}
              className={cn(
                "w-full rounded-xl border bg-slate-950/30 px-4 py-3 text-sm text-slate-100 outline-none",
                "placeholder:text-slate-600",
                "focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/20",
                getBorder(!!orgName.trim(), "orgName")
              )}
            />
          </Field>

          <Field
            label="Workspace identifier"
            hint="Alphanumeric & underscores only"
            error={touched.workspace && !workspaceValid ? "Invalid workspace name (only alphanumeric and underscores)" : ""}
          >
            <input
              type="text"
              placeholder="acme_corp"
              value={workspace}
              onChange={(e) => setWorkspace(e.target.value.toLowerCase())}
              onBlur={() => setTouched((t) => ({ ...t, workspace: true }))}
              className={cn(
                "w-full rounded-xl border bg-slate-950/30 px-4 py-3 text-sm text-slate-100 outline-none",
                "placeholder:text-slate-600",
                "focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/20",
                getBorder(workspaceValid, "workspace")
              )}
            />
          </Field>


          <button
            disabled={!canGoSignupStep1}
            onClick={() => setSignupStep(2)}
            className={cn(
              "w-full rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-3 text-sm font-semibold",
              "hover:bg-blue-500/15 hover:border-blue-500/40 transition",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            Continue
          </button>
        </div>
      )}

      {signupStep === 2 && (
        <div className="space-y-5">
          <Field label="Admin name" hint="Required">
            <input
              type="text"
              placeholder="First admin user"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, userName: true }))}
              className={cn(
                "w-full rounded-xl border bg-slate-950/30 px-4 py-3 text-sm text-slate-100 outline-none",
                "placeholder:text-slate-600",
                "focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/20",
                getBorder(!!userName.trim(), "userName")
              )}
            />
          </Field>

          <Field label="Business email" error={emailError} hint="Valid email required">
            <input
              type="email"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value.toLowerCase())}
              onBlur={() => setTouched((t) => ({ ...t, email: true }))}
              className={cn(
                "w-full rounded-xl border bg-slate-950/30 px-4 py-3 text-sm text-slate-100 outline-none",
                "placeholder:text-slate-600",
                "focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/20",
                getBorder(emailValidSignup, "email")
              )}
            />
          </Field>

          <Field label="Password" error={passwordError} hint="Strong required">
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Create a strong password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, password: true }))}
                className={cn(
                  "w-full rounded-xl border bg-slate-950/30 px-4 py-3 pr-11 text-sm text-slate-100 outline-none",
                  "placeholder:text-slate-600",
                  "focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/20",
                  getBorder(passwordValid, "password")
                )}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg border border-slate-800/70 bg-slate-950/40 p-2 text-slate-200 hover:bg-slate-900/40 transition"
              >
                {showPassword ? EyeOffIcon : EyeIcon}
              </button>
            </div>
          </Field>

          <Field label="Organization Timezone" hint="Searchable">
            <SearchableDropdown
              options={Object.values(CT.getAllTimezones())
                .sort((a, b) => a.utcOffset - b.utcOffset)
                .map((tz) => ({
                  value: tz.name,
                  label: `(${tz.utcOffsetStr}) ${tz.name}`,
                }))}
              value={timezone}
              onChange={(val) => setTimezone(val)}
              searchPlaceholder="Search timezone..."
            />
          </Field>

          <div className="flex gap-3">
            <button
              onClick={() => setSignupStep(1)}
              className="w-full rounded-xl border border-slate-800/70 bg-slate-950/40 px-4 py-3 text-sm font-semibold text-slate-200 hover:bg-slate-900/40 transition"
            >
              Back
            </button>

            <button
              onClick={handleSignupSubmit}
              disabled={loading || !canGoSignupStep2}
              className={cn(
                "w-full rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-semibold",
                "hover:bg-emerald-500/15 hover:border-emerald-500/40 transition",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              {loading ? "Creating account..." : "Complete signup"}
            </button>
          </div>
        </div>
      )}
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(37,99,235,0.20),transparent_45%),radial-gradient(circle_at_80%_30%,rgba(56,189,248,0.12),transparent_45%),radial-gradient(circle_at_50%_90%,rgba(37,99,235,0.08),transparent_55%)]" />
        <div className="absolute inset-0 opacity-[0.35] [background-image:linear-gradient(to_right,rgba(148,163,184,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.06)_1px,transparent_1px)] [background-size:44px_44px]" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-6xl items-center justify-center px-4 py-10">
        <div className="grid w-full items-stretch gap-6 lg:grid-cols-2">
          <div className="hidden lg:flex flex-col justify-center rounded-3xl border border-slate-800/70 bg-slate-950/30 p-10 shadow-[0_0_0_1px_rgba(15,23,42,0.35),0_20px_60px_-45px_rgba(37,99,235,0.45)]">
            <div className="flex items-center gap-4 mb-8">
              <img src="/logo.png" alt="Prompt Protect Logo" className="h-8 w-auto" />
              <div className="h-6 w-px bg-slate-800/70" />
              <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Security Console</div>
            </div>

            <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/25 bg-blue-500/10 px-4 py-2 text-xs text-slate-200 w-fit">
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_0_3px_rgba(16,185,129,0.15)]" />
              Enterprise AI Security & Governance
            </div>

            <h1 className="mt-6 text-4xl font-semibold tracking-tight text-slate-100 leading-[1.1]">
              Prompt Protect | <br />Enterprise Console
            </h1>

            <p className="mt-4 text-sm leading-relaxed text-slate-400 max-w-md">
              The industry-leading security control plane for generative AI. Safeguard your organization's AI interactions with real-time DLP, advanced policy governance, and comprehensive organizational visibility.
            </p>


            <div className="mt-8 grid gap-4">
              <div className="rounded-2xl border border-slate-800/70 bg-slate-950/25 p-5">
                <div className="text-xs uppercase tracking-wide text-slate-500 font-bold mb-4">
                  Platform Capabilities
                </div>
                <ul className="space-y-4">
                  <li className="flex gap-3">
                    <div className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                    <div>
                      <div className="text-sm font-medium text-slate-200">Dynamic Data Loss Prevention (DLP)</div>
                      <div className="text-xs text-slate-500">Real-time sanitization of PII, PHI, and credentials before they reach LLMs.</div>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <div className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                    <div>
                      <div className="text-sm font-medium text-slate-200">Context-Aware Governance</div>
                      <div className="text-xs text-slate-500">Real-time policy enforcement across ChatGPT, Claude, Gemini, and custom AI tools.</div>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <div className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                    <div>
                      <div className="text-sm font-medium text-slate-200">Unified Security Analytics</div>
                      <div className="text-xs text-slate-500">Centralized telemetry and granular audit logs for audit and compliance readiness.</div>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <div className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                    <div>
                      <div className="text-sm font-medium text-slate-200">Identity & Access Management</div>
                      <div className="text-xs text-slate-500">Secure enterprise SSO integration with precise role-based access controls (RBAC).</div>
                    </div>
                  </li>
                </ul>
              </div>
            </div>

            <p className="mt-8 text-[10px] text-slate-500 leading-relaxed uppercase tracking-widest opacity-60">
              Secure Access Protocol // Authorized Personnel Only // Real-Time Security Monitoring Active
            </p>
          </div>

          <div className="rounded-3xl border border-slate-800/70 bg-slate-950/30 p-8 pt-12 shadow-[0_0_0_1px_rgba(15,23,42,0.35),0_20px_60px_-45px_rgba(37,99,235,0.45)] backdrop-blur relative overflow-hidden group">
            {/* Ambient Background Glows */}
            <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-blue-600/10 blur-[100px] pointer-events-none group-hover:bg-blue-600/15 transition-colors" />
            <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-emerald-600/5 blur-[100px] pointer-events-none" />

            <div className="relative z-10">
              <div className="flex items-start justify-between gap-3 mb-12">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-1.5 w-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                    <div className="text-[10px] uppercase tracking-[0.2em] text-blue-400 font-bold">
                      System Gateway
                    </div>
                  </div>
                  <h2 className="text-3xl font-semibold tracking-tight text-white leading-tight">
                    {authMode === "login" ? "Console Access" : "Initialize Workspace"}
                  </h2>
                  {signupSuccess && (
                    <div className="mt-4 p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-200 text-sm animate-in fade-in slide-in-from-top-2">
                      Account created! Please check your email to verify your account before logging in.
                    </div>
                  )}
                  <p className="mt-3 text-sm text-slate-400 max-w-[280px] leading-relaxed">
                    {authMode === "login"
                      ? "Identify your organizational instance to access the centralized security control plane."
                      : "Configure your enterprise-grade security environment and administrative credentials."}
                  </p>
                </div>

                <button
                  onClick={toggleAuthMode}
                  className="shrink-0 rounded-xl border border-slate-800/70 bg-slate-950/40 px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-300 hover:bg-slate-900 transition hover:border-slate-700"
                >
                  {authMode === "login" ? "Sign up" : "Sign in"}
                </button>
              </div>

              {/* Security Context Info (Adds Density) */}
              <div className="mb-10 grid grid-cols-2 gap-4">
                <div className="rounded-2xl border border-white/[0.03] bg-white/[0.02] p-4">
                  <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">Status</div>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <div className="text-xs font-medium text-slate-300">Auth Systems OK</div>
                  </div>
                </div>
                <div className="rounded-2xl border border-white/[0.03] bg-white/[0.02] p-4">
                  <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">Protocol</div>
                  <div className="text-xs font-medium text-slate-300">v2.4 (Encrypted)</div>
                </div>
              </div>

              {error ? (
                <div className="mb-8 rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-xs text-red-200 flex items-center gap-2">
                  <div className="h-1 w-1 rounded-full bg-red-400" />
                  {error}
                </div>
              ) : null}

              <div className="space-y-6">
                {authMode === "login" ? (
                  loginStep === 1 ? renderLoginStep1() : renderLoginStep2()
                ) : (
                  renderSignup()
                )}
              </div>

              <div className="mt-12 pt-6 border-t border-slate-800/40 text-center text-[11px] text-slate-500">
                {authMode === "login" ? (
                  <p>
                    Unauthorized access is strictly prohibited. <br />
                    By signing in, you agree to the{" "}
                    <button className="text-blue-400 hover:underline">Security Protocols</button>.
                  </p>
                ) : (
                  <p>
                    Already have an organizational instance?{" "}
                    <button onClick={toggleAuthMode} className="font-bold text-blue-400 hover:underline">
                      Sign in directly
                    </button>
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
