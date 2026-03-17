"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { apiGet, apiPost } from "@/lib/api"
import {
  UserCircle,
  Mail,
  ShieldCheck,
  ArrowLeft,
  Loader2,
  KeyRound,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  Save,
  Lock,
} from "lucide-react"

interface User {
  _id: string
  userName: string
  userEmail: string
  userRole: string[]
  orgId?: string
}

type Banner =
  | null
  | {
    type: "success" | "error"
    title: string
    message?: string
  }

function cx(...classes: Array<string | false | undefined | null>) {
  return classes.filter(Boolean).join(" ")
}

export default function ProfilePage() {
  const router = useRouter()

  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // Change password form
  const [oldPassword, setOldPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  const [showOld, setShowOld] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const [saving, setSaving] = useState(false)
  const [banner, setBanner] = useState<Banner>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        const res: any = await apiGet("/users/auth/me")
        if (res?.success && res?.user) setUser(res.user)
        else setUser(null)
      } catch (err) {
        console.error("Failed to fetch profile data:", err)
        setUser(null)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const passwordPolicy = useMemo(() => {
    const v = newPassword

    const rules = [
      { ok: v.length >= 8, label: "At least 8 characters" },
      { ok: /[A-Z]/.test(v), label: "One uppercase letter" },
      { ok: /[a-z]/.test(v), label: "One lowercase letter" },
      { ok: /\d/.test(v), label: "One number" },
      { ok: /[^A-Za-z0-9]/.test(v), label: "One special character" },
    ]

    const okCount = rules.filter((r) => r.ok).length
    const ok = okCount === rules.length

    return { ok, okCount, rules }
  }, [newPassword])

  const confirmError = useMemo(() => {
    if (!confirmPassword) return ""
    if (newPassword !== confirmPassword) return "Passwords do not match."
    return ""
  }, [newPassword, confirmPassword])

  const sameAsOldError = useMemo(() => {
    if (!oldPassword || !newPassword) return ""
    if (oldPassword === newPassword) return "New password cannot be the same as the current password."
    return ""
  }, [oldPassword, newPassword])

  const canSubmit = useMemo(() => {
    if (saving) return false
    if (!oldPassword.trim()) return false
    if (!newPassword) return false
    if (!confirmPassword) return false
    if (!!confirmError) return false
    if (!passwordPolicy.ok) return false
    if (!!sameAsOldError) return false
    return true
  }, [saving, oldPassword, newPassword, confirmPassword, confirmError, passwordPolicy.ok, sameAsOldError])

  async function onSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault()
    setBanner(null)

    if (!canSubmit) {
      setBanner({
        type: "error",
        title: "Fix the form first",
        message: "Make sure passwords match and the new password meets the policy.",
      })
      return
    }

    setSaving(true)
    try {
      const payload = { oldPassword, newPassword }
      const res: any = await apiPost("/users/change-password", payload)

      if (res?.success === false) {
        throw new Error(res?.message || res?.error || "Password change failed")
      }

      setBanner({
        type: "success",
        title: "Password updated",
        message: "Use the new password the next time you sign in.",
      })

      setOldPassword("")
      setNewPassword("")
      setConfirmPassword("")
      setShowOld(false)
      setShowNew(false)
      setShowConfirm(false)
    } catch (e: any) {
      setBanner({
        type: "error",
        title: "Could not update password",
        message: e?.message || "Something went wrong.",
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen text-slate-100">
        <div className="relative mx-auto max-w-5xl px-5 py-12 lg:px-8">
          <div className="rounded-[28px] border border-slate-800/80 bg-slate-900/30 p-8 shadow-[0_0_0_1px_rgba(15,23,42,0.35),0_30px_120px_-70px_rgba(37,99,235,0.75)]">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-slate-800 bg-slate-950/30 p-2">
                <Loader2 className="h-5 w-5 animate-spin text-blue-200" />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-100">Loading profile</div>
                <div className="text-xs text-slate-400">Fetching user data...</div>
              </div>
            </div>

            <div className="mt-7 grid grid-cols-1 md:grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-24 rounded-2xl border border-slate-800/70 bg-slate-950/20 animate-pulse"
                />
              ))}
            </div>

            <div className="mt-6 h-52 rounded-2xl border border-slate-800/70 bg-slate-950/20 animate-pulse" />
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen text-slate-100">
        <div className="relative mx-auto max-w-5xl px-5 py-12 lg:px-8">
          <div className="rounded-[28px] border border-red-500/25 bg-slate-950/70 p-8 text-center shadow-[0_30px_120px_-70px_rgba(239,68,68,0.6)]">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-red-500/25 bg-red-500/10">
              <ShieldCheck className="h-6 w-6 text-red-200" />
            </div>
            <h2 className="text-lg font-semibold text-red-200">User not found</h2>
            <p className="mt-2 text-sm text-slate-300">Identity data could not be retrieved.</p>
            <button
              onClick={() => router.push("/dashboard")}
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-2xl border border-blue-500/30 bg-blue-500/10 px-4 py-3 text-sm font-semibold text-slate-100 hover:bg-blue-500/18 hover:border-blue-400/40 transition"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen text-slate-100">
      <div className="relative mx-auto max-w-5xl px-5 py-10 lg:px-8">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl border border-blue-500/25 bg-blue-500/10 p-2">
              <UserCircle className="h-6 w-6 text-blue-200" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-100">Profile</h1>
              <p className="mt-1 text-sm text-slate-400">Account details and password management.</p>
            </div>
          </div>

          <button
            onClick={() => router.push("/dashboard")}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-800/70 bg-slate-900/25 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-900/40 hover:text-slate-100 transition"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </button>
        </div>

        {/* Cards */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Identity */}
          <div className="lg:col-span-2">
            <Card>
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-2xl border border-blue-500/25 bg-blue-500/10 flex items-center justify-center text-blue-200 font-semibold text-xl">
                  {user.userEmail?.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="text-xs text-slate-400">Signed in as</div>
                  <div className="truncate text-lg font-semibold text-slate-100">{user.userName}</div>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                <InfoRow icon={Mail} label="Email" value={user.userEmail} mono={false} />
                <div>
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl border border-slate-800 bg-slate-950/30 p-2 text-blue-200">
                      <ShieldCheck className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-[11px] uppercase tracking-wide text-slate-400">Roles</div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {user.userRole?.length ? user.userRole.map((role) => <RolePill key={role} role={role} />) : null}
                        {!user.userRole?.length ? (
                          <span className="text-sm text-slate-500">No roles assigned</span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>


              </div>
            </Card>
          </div>

          {/* Change Password */}
          <div className="lg:col-span-3">
            <Card>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <KeyRound className="h-5 w-5 text-blue-200" />
                    <h2 className="text-sm font-semibold text-slate-100">Change Password</h2>
                  </div>

                </div>

                <button
                  onClick={() => onSubmit()}
                  disabled={!canSubmit}
                  className={cx(
                    "inline-flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-semibold transition",
                    canSubmit
                      ? "border-blue-500/30 bg-blue-500/10 text-slate-100 hover:bg-blue-500/15 hover:border-blue-400/40"
                      : "border-slate-800/70 bg-slate-900/20 text-slate-500 cursor-not-allowed"
                  )}
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {saving ? "Saving..." : "Update"}
                </button>
              </div>

              {banner ? <BannerCard banner={banner} /> : null}

              <form onSubmit={onSubmit} className="mt-6 space-y-5">
                <PasswordField
                  label="Current password"
                  value={oldPassword}
                  onChange={setOldPassword}
                  show={showOld}
                  onToggle={() => setShowOld((v) => !v)}
                  autoComplete="current-password"
                  placeholder="Enter current password"

                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="md:col-span-1">
                    <PasswordField
                      label="New password"
                      value={newPassword}
                      onChange={setNewPassword}
                      show={showNew}
                      onToggle={() => setShowNew((v) => !v)}
                      autoComplete="new-password"
                      placeholder="Create a new password"
                      error={sameAsOldError}
                    />
                    <StrengthMeter value={passwordPolicy.okCount} total={passwordPolicy.rules.length} />
                  </div>

                  <div className="md:col-span-1">
                    <PasswordField
                      label="Confirm new password"
                      value={confirmPassword}
                      onChange={setConfirmPassword}
                      show={showConfirm}
                      onToggle={() => setShowConfirm((v) => !v)}
                      autoComplete="new-password"
                      placeholder="Re-enter new password"
                      error={confirmError}
                    />
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-800/70 bg-slate-950/20 p-4">
                  <div className="text-[11px] uppercase tracking-wide text-slate-400">Password policy</div>
                  <ul className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {passwordPolicy.rules.map((r) => (
                      <li key={r.label} className="flex items-center gap-2">
                        <span
                          className={cx(
                            "inline-flex h-5 w-5 items-center justify-center rounded-full border",
                            r.ok
                              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                              : "border-slate-700/60 bg-slate-950/20 text-slate-400"
                          )}
                          aria-hidden="true"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        </span>
                        <span className={cx(r.ok ? "text-slate-200" : "text-slate-400")}>{r.label}</span>
                      </li>
                    ))}
                  </ul>


                </div>

                <div className="flex items-center justify-end gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setOldPassword("")
                      setNewPassword("")
                      setConfirmPassword("")
                      setBanner(null)
                      setShowOld(false)
                      setShowNew(false)
                      setShowConfirm(false)
                    }}
                    className="inline-flex items-center justify-center rounded-2xl border border-slate-800/70 bg-slate-900/25 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-900/40 hover:text-slate-100 transition"
                  >
                    Reset
                  </button>

                  <button
                    type="submit"
                    disabled={!canSubmit}
                    className={cx(
                      "inline-flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-semibold transition",
                      canSubmit
                        ? "border-blue-500/30 bg-blue-500/10 text-slate-100 hover:bg-blue-500/15 hover:border-blue-400/40"
                        : "border-slate-800/70 bg-slate-900/20 text-slate-500 cursor-not-allowed"
                    )}
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    {saving ? "Saving..." : "Update password"}
                  </button>
                </div>
              </form>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ---------------- UI bits ---------------- */


function Card({ children }: { children: any }) {
  return (
    <div className="rounded-[28px] border border-slate-800/80 bg-slate-900/28 p-6 shadow-[0_0_0_1px_rgba(15,23,42,0.35),0_22px_70px_-55px_rgba(37,99,235,0.55)] backdrop-blur">
      {children}
    </div>
  )
}

function InfoRow({
  icon: Icon,
  label,
  value,
  mono,
}: {
  icon: any
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 rounded-xl border border-slate-800 bg-slate-950/30 p-2 text-blue-200">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <div className="text-[11px] uppercase tracking-wide text-slate-400">{label}</div>
        {value ? (
          <div className={cx("mt-1 text-sm text-slate-100 break-words", mono ? "font-mono" : "")}>{value}</div>
        ) : null}
      </div>
    </div>
  )
}

function RolePill({ role }: { role: string }) {
  const r = role.toLowerCase()
  const cls = r.includes("admin")
    ? "border-amber-500/30 bg-amber-500/10 text-amber-200"
    : r.includes("manager")
      ? "border-blue-500/30 bg-blue-500/10 text-blue-200"
      : "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"

  return (
    <span className={cx("inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold", cls)}>
      {role}
    </span>
  )
}

function BannerCard({ banner }: { banner: Exclude<Banner, null> }) {
  return (
    <div
      className={cx(
        "mt-5 rounded-2xl border p-4",
        banner.type === "success" ? "border-emerald-500/25 bg-emerald-500/10" : "border-red-500/25 bg-red-500/10"
      )}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <div
          className={cx(
            "mt-0.5 rounded-xl border p-2",
            banner.type === "success"
              ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-200"
              : "border-red-500/25 bg-red-500/10 text-red-200"
          )}
          aria-hidden="true"
        >
          {banner.type === "success" ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
        </div>
        <div className="min-w-0">
          <div className={cx("text-sm font-semibold", banner.type === "success" ? "text-emerald-100" : "text-red-100")}>
            {banner.title}
          </div>
          {banner.message ? <div className="mt-1 text-xs text-slate-200/80">{banner.message}</div> : null}
        </div>
      </div>
    </div>
  )
}

function PasswordField({
  label,
  value,
  onChange,
  show,
  onToggle,
  autoComplete,
  placeholder,
  error,
  inputHint,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  show: boolean
  onToggle: () => void
  autoComplete?: string
  placeholder?: string
  error?: string
  inputHint?: string
}) {
  const hasError = !!error

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-wide text-slate-400">{label}</div>
          {inputHint ? <div className="mt-1 text-xs text-slate-500">{inputHint}</div> : null}
        </div>

        <button
          type="button"
          onClick={onToggle}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/25 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-900/45 transition"
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          {show ? "Hide" : "Show"}
        </button>
      </div>

      <div
        className={cx(
          "mt-2 rounded-2xl border bg-slate-950/18 px-3 py-2",
          hasError ? "border-red-500/35" : "border-slate-800/70",
          "focus-within:border-blue-400/40 focus-within:bg-slate-950/25 focus-within:shadow-[0_0_0_3px_rgba(59,130,246,0.12)]"
        )}
      >
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          type={show ? "text" : "password"}
          autoComplete={autoComplete}
          placeholder={placeholder}
          className="w-full bg-transparent px-1 py-1.5 text-sm text-slate-100 placeholder:text-slate-600 outline-none"
          aria-invalid={hasError ? "true" : "false"}
        />
      </div>

      {hasError ? <div className="mt-2 text-xs text-red-200">{error}</div> : null}
    </div>
  )
}

function StrengthMeter({ value, total }: { value: number; total: number }) {
  const pct = total ? Math.round((value / total) * 100) : 0

  const label =
    pct >= 100 ? "Strong" : pct >= 80 ? "Good" : pct >= 60 ? "Okay" : pct >= 40 ? "Weak" : "Very weak"

  return (
    <div className="mt-3">
      <div className="flex items-center justify-between">
        <div className="text-[11px] uppercase tracking-wide text-slate-400">Strength</div>
        <div className="text-xs text-slate-400">{label}</div>
      </div>
      <div className="mt-2 h-2 rounded-full border border-slate-800/70 bg-slate-950/20 overflow-hidden">
        <div
          className="h-full bg-blue-500/35"
          style={{ width: `${pct}%` }}
          aria-hidden="true"
        />
      </div>
    </div>
  )
}