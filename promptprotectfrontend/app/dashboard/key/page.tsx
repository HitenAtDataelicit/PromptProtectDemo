"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  Eye,
  EyeOff,
  Copy,
  Shield,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Key as KeyIcon,
  Trash2,
  Plus,
  Clock,
  User as UserIcon,
  X,
  Send,
} from "lucide-react"
import { apiGet, apiPost, apiDelete, apiPut } from "@/lib/api"
import { cn } from "@/lib/utils"
import { CustomDropdown } from "@/components/CustomDropdown"
import { SearchableDropdown } from "@/components/SearchableDropdown"
import { SuccessToast } from "@/components/SuccessToast"

type Tab = "activation" | "deactivation"
type KeyType = "SINGLE_USER" | "ORG_WIDE"

function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode
  tone?: "neutral" | "blue" | "emerald" | "amber" | "purple" | "red"
  className?: string
}) {
  const tones: Record<string, string> = {
    neutral: "border-slate-800/70 bg-slate-950/40 text-slate-300",
    blue: "border-blue-500/25 bg-blue-500/10 text-blue-200",
    emerald: "border-emerald-500/25 bg-emerald-500/10 text-emerald-200",
    amber: "border-amber-500/25 bg-amber-500/10 text-amber-200",
    purple: "border-purple-500/25 bg-purple-500/10 text-purple-200",
    red: "border-red-500/25 bg-red-500/10 text-red-200",
  }
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold",
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  )
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "relative rounded-3xl border border-slate-800/70 bg-slate-950/30 backdrop-blur",
        "shadow-[0_0_0_1px_rgba(15,23,42,0.35),0_28px_110px_-70px_rgba(37,99,235,0.45)]",
        className
      )}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl opacity-60">
        <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute -right-24 -bottom-24 h-72 w-72 rounded-full bg-sky-400/8 blur-3xl" />
        <div className="absolute inset-0 opacity-[0.20] [background-image:linear-gradient(to_right,rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.08)_1px,transparent_1px)] [background-size:34px_34px]" />
      </div>
      <div className={cn(!className?.includes("p-0") && "p-6 sm:p-7", "relative", className)}>{children}</div>
    </div>
  )
}

function IconButton({
  onClick,
  title,
  children,
  tone = "neutral",
  disabled,
}: {
  onClick?: () => void
  title: string
  children: React.ReactNode
  tone?: "neutral" | "emerald" | "blue" | "red"
  disabled?: boolean
}) {
  const toneCls =
    tone === "emerald"
      ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/15"
      : tone === "blue"
        ? "border-blue-500/25 bg-blue-500/10 text-blue-200 hover:bg-blue-500/15"
        : tone === "red"
          ? "border-red-500/25 bg-red-500/10 text-red-200 hover:bg-red-500/15"
          : "border-slate-800/70 bg-slate-950/35 text-slate-200 hover:bg-slate-900/35"

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        "inline-flex h-10 w-10 items-center justify-center rounded-2xl border transition",
        "focus:outline-none focus:ring-2 focus:ring-blue-500/20",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        toneCls
      )}
    >
      {children}
    </button>
  )
}

function PrimaryButton({
  children,
  onClick,
  disabled,
  loading,
  className,
}: {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  loading?: boolean
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        "group inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-blue-500/30",
        "bg-blue-500/12 px-4 text-sm font-semibold text-slate-100 transition",
        "hover:bg-blue-500/16 hover:border-blue-500/45",
        "focus:outline-none focus:ring-2 focus:ring-blue-500/20",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        className
      )}
    >
      {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : null}
      {children}
    </button>
  )
}

function Input({
  value,
  onChange,
  placeholder,
  type = "text",
  disabled,
  className,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
  disabled?: boolean
  className?: string
}) {
  return (
    <input
      type={type}
      value={value}
      disabled={disabled}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "h-11 w-full rounded-2xl border border-slate-800/70 bg-slate-950/35 px-4 text-sm text-slate-100 outline-none transition",
        "placeholder:text-slate-600",
        "focus:border-blue-500/45 focus:ring-2 focus:ring-blue-500/15",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        className
      )}
    />
  )
}

function Select({
  value,
  onChange,
  disabled,
  children,
}: {
  value: string
  onChange: (v: string) => void
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "h-11 w-full rounded-2xl border border-slate-800/70 bg-slate-950/35 px-4 text-sm text-slate-100 outline-none transition",
        "focus:border-blue-500/45 focus:ring-2 focus:ring-blue-500/15",
        "disabled:opacity-50 disabled:cursor-not-allowed"
      )}
    >
      {children}
    </select>
  )
}

function formatExpiry(expiresAt: any) {
  const d = new Date(expiresAt)
  const date = d.toLocaleDateString()
  const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  return `${date} ${time}`
}

function shortKey(k: string) {
  if (!k) return ""
  if (k.length <= 16) return k
  return `${k.slice(0, 8)}…${k.slice(-6)}`
}

export default function KeyManagement() {
  const [activeTab, setActiveTab] = useState<Tab>("activation")
  const [orgKey, setOrgKey] = useState<string | null>(null)
  const [orgName, setOrgName] = useState("")
  const [userRole, setUserRole] = useState<string[]>([])
  const [deactivationKeys, setDeactivationKeys] = useState<any[]>([])

  const [showKey, setShowKey] = useState(false)
  const [copied, setCopied] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState("")

  const [newKeyType, setNewKeyType] = useState<KeyType>("SINGLE_USER")
  const [newKeyUserEmail, setNewKeyUserEmail] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [showGenerateModal, setShowGenerateModal] = useState(false)
  const [orgUsers, setOrgUsers] = useState<{ value: string; label: string }[]>([])
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const [showRegenConfirm, setShowRegenConfirm] = useState(false)
  const [keyToDelete, setKeyToDelete] = useState<string | null>(null)

  const isAdmin = userRole.some((r) => ["ADMIN", "ORG_ADMIN"].includes(r))
  const maskedOrgKey = "••••••••••••••••••••••••••••••••"

  useEffect(() => {
    async function init() {
      try {
        const res: any = await apiGet("/users/auth/me")
        if (res.success && res.user) {
          const user = res.user
          setOrgKey(user.orgKey || user.org?.orgKey)
          setOrgName(user.org?.orgName || "")
          setUserRole(user.userRole || [])
        }
      } catch (err) {
        console.error("Failed to init key page:", err)
      }
    }
    init()
  }, [])

  useEffect(() => {
    if (activeTab === "deactivation") {
      fetchDeactivationKeys()
      fetchOrgUsers()
    }
  }, [activeTab])

  async function fetchOrgUsers() {
    try {
      const res: any = await apiGet("/users")
      if (res.success && res.data) {
        setOrgUsers(res.data.map((u: any) => ({
          value: u.userEmail,
          label: `${u.userName} (${u.userEmail})`
        })))
      }
    } catch (err) {
      console.error("Failed to fetch org users:", err)
    }
  }

  async function fetchDeactivationKeys() {
    try {
      const res: any = await apiGet("/org/deactivate/keys")
      if (res.success) setDeactivationKeys(res.keys || [])
    } catch (err) {
      console.error("Failed to fetch deactivation keys", err)
    }
  }

  const banner = useMemo(() => {
    if (error) return { tone: "red" as const, icon: <AlertCircle className="h-4 w-4" />, text: error }
    if (copied) return { tone: "blue" as const, icon: <CheckCircle2 className="h-4 w-4" />, text: "Copied to clipboard" }
    return null
  }, [error, copied])

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const textarea = document.createElement("textarea")
      textarea.value = text
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand("copy")
      textarea.remove()
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 1200)
  }

  const handleRegenerateKey = async () => {
    setShowRegenConfirm(false)
    setIsUpdating(true)
    setError("")

    try {
      const newKey = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "")
      const res: any = await apiPut("/org/update-key", { newOrgKey: newKey })

      if (res.success) {
        setOrgKey(newKey)
        setSuccessMessage("Organization key updated.")
      } else {
        setError(res.message || "Failed to update key")
      }
    } catch (err: any) {
      setError(err.message || "An error occurred")
    } finally {
      setIsUpdating(false)
    }
  }

  const handleGenerateDeactivation = async () => {
    if (newKeyType === "SINGLE_USER" && !newKeyUserEmail.trim()) {
      setError("User email is required for single-user keys")
      return
    }

    setIsGenerating(true)
    setError("")

    try {
      const res: any = await apiPost("/org/deactivate/generate", {
        type: newKeyType,
        userEmail: newKeyType === "SINGLE_USER" ? newKeyUserEmail : undefined,
      })

      if (res.success) {
        setSuccessMessage("Override key generated.")
        setNewKeyUserEmail("")
        setShowGenerateModal(false)
        fetchDeactivationKeys()
        // you can also show the key in UI, but not forcing it here
      } else {
        setError(res.message || "Failed to generate key")
      }
    } catch (err: any) {
      setError(err.message || "Error generating key")
    } finally {
      setIsGenerating(false)
    }
  }

  const handleDeleteDeactivation = async (id: string) => {
    setKeyToDelete(null)
    try {
      const res: any = await apiDelete(`/org/deactivate/keys/${id}`)
      if (res.success) {
        setSuccessMessage("Override key deleted.")
        fetchDeactivationKeys()
      }
    } catch (err) {
      console.error("Delete failed", err)
    }
  }

  return (
    <div className="min-h-screen bg-transparent text-slate-100 px-4 py-8 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Header */}


        {/* Tabs */}
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-2xl border border-slate-800/70 bg-slate-950/35 p-1">
            <button
              type="button"
              onClick={() => setActiveTab("activation")}
              className={cn(
                "rounded-xl px-3 py-2 text-sm font-semibold transition",
                activeTab === "activation"
                  ? "bg-blue-500/14 text-blue-200 shadow-[0_0_0_1px_rgba(37,99,235,0.24)]"
                  : "text-slate-400 hover:text-slate-200"
              )}
            >
              Activation Key
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("deactivation")}
              className={cn(
                "rounded-xl px-3 py-2 text-sm font-semibold transition",
                activeTab === "deactivation"
                  ? "bg-blue-500/14 text-blue-200 shadow-[0_0_0_1px_rgba(37,99,235,0.24)]"
                  : "text-slate-400 hover:text-slate-200"
              )}
            >
              Deactivation Keys
            </button>
          </div>
          <div className="ml-auto hidden sm:flex items-center gap-2">
            {isAdmin ? <Badge tone="emerald">Admin</Badge> : <Badge>Member</Badge>}
          </div>
        </div>

        {/* Banner */}
        {banner ? (
          <div
            className={cn(
              "flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm",
              banner.tone === "red"
                ? "border-red-500/25 bg-red-500/10 text-red-200"
                : "border-blue-500/25 bg-blue-500/10 text-blue-200"
            )}
          >
            {banner.icon}
            <span className="font-medium">{banner.text}</span>
          </div>
        ) : null}

        {/* Content */}
        {activeTab === "activation" ? (
          <Card>
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-emerald-300" />
                  <h2 className="text-lg font-semibold">Registration Key</h2>

                </div>
                <p className="max-w-2xl text-sm text-slate-400">
                  Used to activate the Prompt Protect extension on managed devices.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <IconButton
                  onClick={() => setShowKey((v) => !v)}
                  title={showKey ? "Hide key" : "Reveal key"}
                >
                  {showKey ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </IconButton>

                <IconButton
                  onClick={() => orgKey && handleCopy(orgKey)}
                  title="Copy key"
                  tone="emerald"
                  disabled={!orgKey}
                >
                  <Copy className="h-5 w-5" />
                </IconButton>

                {isAdmin ? (
                  <IconButton
                    onClick={() => setShowRegenConfirm(true)}
                    title="Regenerate key"
                    tone="blue"
                    disabled={isUpdating}
                  >
                    <RefreshCw className={cn("h-5 w-5", isUpdating ? "animate-spin" : "")} />
                  </IconButton>
                ) : null}
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-slate-800/70 bg-slate-950/45 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Organization Key
                </div>
                {orgKey ? (
                  <div className="text-[11px] text-slate-500">
                    {showKey ? "Visible" : "Masked"} • {orgKey.length} chars
                  </div>
                ) : (
                  <div className="text-[11px] text-slate-500">Not available</div>
                )}
              </div>

              <div className="mt-3 break-all rounded-xl border border-slate-800/70 bg-slate-950/35 px-4 py-3 font-mono text-sm tracking-wider text-slate-200">
                {orgKey ? (showKey ? orgKey : maskedOrgKey) : "—"}
              </div>


            </div>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Generator Button */}
            {isAdmin ? (
              <div className="flex items-center justify-between gap-4 rounded-3xl border border-slate-800/70 bg-slate-950/30 p-6 backdrop-blur">
                <div className="space-y-1">
                  <h2 className="text-lg font-semibold">Generate Override Key</h2>
                  <p className="text-sm text-slate-400">
                    Create a time-bound key used to deactivate the extension for a user or the entire organization.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowGenerateModal(true)}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-blue-500/30 bg-blue-500/12 px-6 text-sm font-semibold text-slate-100 transition hover:bg-blue-500/16 hover:border-blue-500/45 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <Plus className="h-4 w-4" />
                  Generate Key
                </button>
              </div>
            ) : null}

            {/* List */}
            <Card className="p-0">
              <div className="flex items-center justify-between px-6 pt-6">
                <div className="space-y-1">
                  <div className="text-sm font-semibold">Active Override Keys</div>
                  <div className="text-xs text-slate-500">
                    {deactivationKeys.length} active key{deactivationKeys.length === 1 ? "" : "s"}
                  </div>
                </div>
                <div className="hidden sm:flex items-center gap-2">
                  <Badge tone="neutral">
                    <Clock className="h-4 w-4" />
                    Expires automatically
                  </Badge>
                </div>
              </div>

              <div className="mt-5 overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-y border-slate-800/70 bg-slate-950/35">
                      <th className="px-6 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Key
                      </th>
                      <th className="px-6 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                        User / Scope
                      </th>
                      <th className="px-6 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Expires
                      </th>
                      <th className="px-6 py-3 text-right text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-800/70">
                    {deactivationKeys.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12">
                          <div className="mx-auto max-w-md text-center">
                            <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl border border-slate-800/70 bg-slate-950/30">
                              <KeyIcon className="h-6 w-6 text-slate-400" />
                            </div>
                            <div className="mt-4 text-sm font-semibold text-slate-200">No override keys</div>
                            <div className="mt-1 text-sm text-slate-500">
                              Generate one when you need to disable the extension for troubleshooting or containment.
                            </div>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      deactivationKeys.map((k) => (
                        <tr key={k._id} className="hover:bg-slate-900/25 transition">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <span className="font-mono text-sm text-blue-200">{shortKey(k.key)}</span>
                              <button
                                type="button"
                                onClick={() => handleCopy(k.key)}
                                className="inline-flex items-center gap-1 rounded-xl border border-slate-800/70 bg-slate-950/30 px-2 py-1 text-xs text-slate-300 transition hover:bg-slate-900/35"
                                title="Copy key"
                              >
                                <Copy className="h-3.5 w-3.5" />
                                Copy
                              </button>
                            </div>
                          </td>

                          <td className="px-6 py-4">
                            {k.type === "SINGLE_USER" ? (
                              <Badge tone="amber">Single use</Badge>
                            ) : (
                              <Badge tone="purple">Org wide</Badge>
                            )}
                          </td>

                          <td className="px-6 py-4 text-sm text-slate-300">
                            {k.type === "SINGLE_USER" ? (
                              <div className="flex items-center gap-2">
                                <UserIcon size={14} className="text-slate-500" />
                                <span className="truncate">{k.userEmail}</span>
                              </div>
                            ) : (
                              <span className="text-slate-400">Entire organization</span>
                            )}
                          </td>

                          <td className="px-6 py-4">
                            {k.isUsed ? (
                              <Badge tone="emerald">Used</Badge>
                            ) : (
                              <Badge tone="neutral">Not used</Badge>
                            )}
                          </td>

                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2 text-xs text-slate-400">
                              <Clock size={14} />
                              {formatExpiry(k.expiresAt)}
                            </div>
                          </td>

                          <td className="px-6 py-4">
                            <div className="flex items-center justify-end gap-2">
                              <IconButton
                                title="Delete key"
                                tone="red"
                                onClick={() => setKeyToDelete(k._id)}
                              >
                                <Trash2 className="h-5 w-5" />
                              </IconButton>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="px-6 pb-6 pt-4 text-xs text-slate-600">
                Keys expire automatically. Delete manually only if you need to revoke access early.
              </div>
            </Card>
          </div>
        )}
        {successMessage && <SuccessToast message={successMessage} onClose={() => setSuccessMessage(null)} />}
      </div>

      {/* ---------- GENERATE MODAL ---------- */}
      {showGenerateModal && (
        <ModalShell
          title="Generate Override Key"
          subtitle="Create a time-bound deactivation key."
          onClose={() => setShowGenerateModal(false)}
        >
          <div className="space-y-4">
            <Field label="Key Type">
              <CustomDropdown
                options={[
                  { value: "SINGLE_USER", label: "Single User (one-time)" },
                  { value: "ORG_WIDE", label: "Organization-wide (24h)" },
                ]}
                value={newKeyType}
                onChange={(v) => setNewKeyType(v as KeyType)}
              />
            </Field>

            <div className={cn(newKeyType === "ORG_WIDE" && "opacity-40 pointer-events-none")}>
              <Field label="Target User Email">
                <SearchableDropdown
                  options={orgUsers}
                  value={newKeyUserEmail}
                  onChange={setNewKeyUserEmail}
                  placeholder="Select user email"
                  searchPlaceholder="Search users..."
                  disabled={newKeyType === "ORG_WIDE"}
                />
              </Field>
            </div>

            <div className="mt-8">
              <PrimaryButton onClick={handleGenerateDeactivation} loading={isGenerating}>
                {isGenerating ? "Generating..." : "Generate Key"}
              </PrimaryButton>
            </div>
          </div>
        </ModalShell>
      )}

      {/* ---------- CONFIRM DELETE MODAL ---------- */}
      {keyToDelete && (
        <ModalShell
          title="Delete Override Key?"
          subtitle="Users will no longer be able to use it to bypass restrictions."
          onClose={() => setKeyToDelete(null)}
          danger
        >
          <div className="flex flex-col gap-4">
            <p className="text-sm text-slate-400">
              Are you sure you want to delete this deactivation key? This action cannot be undone.
            </p>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setKeyToDelete(null)}
                className="flex-1 h-11 rounded-2xl border border-slate-800 bg-slate-900/40 text-sm font-semibold text-slate-300 transition hover:bg-slate-900/60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteDeactivation(keyToDelete)}
                className="flex-1 h-11 rounded-2xl bg-red-500/15 border border-red-500/30 text-sm font-semibold text-red-200 transition hover:bg-red-500/25"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </ModalShell>
      )}

      {/* ---------- REGENERATE CONFIRM MODAL ---------- */}
      {showRegenConfirm && (
        <ModalShell
          title="Regenerate Org Key?"
          subtitle="This will invalidate the current key immediately."
          onClose={() => setShowRegenConfirm(false)}
          danger
        >
          <div className="flex flex-col gap-4">
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-xs text-amber-200 leading-relaxed">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <p>
                  Any agents or extensions currently using the old key will lose connectivity until they are updated with the new key.
                </p>
              </div>
            </div>

            <p className="text-sm text-slate-400">
              Are you sure you want to regenerate the organization registration key?
            </p>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowRegenConfirm(false)}
                className="flex-1 h-11 rounded-2xl border border-slate-800 bg-slate-900/40 text-sm font-semibold text-slate-300 transition hover:bg-slate-900/60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRegenerateKey}
                className="flex-1 h-11 rounded-2xl bg-blue-500/15 border border-blue-500/30 text-sm font-semibold text-blue-200 transition hover:bg-blue-500/25"
              >
                Yes, Regenerate
              </button>
            </div>
          </div>
        </ModalShell>
      )}
    </div>
  )
}

/* ---------------- Small UI Helpers ---------------- */

function ModalShell({
  title,
  subtitle,
  children,
  onClose,
  danger,
}: {
  title: string
  subtitle?: string
  children: any
  onClose: () => void
  danger?: boolean
}) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-[460px] rounded-3xl border border-slate-800/80 bg-slate-950/85 shadow-[0_0_0_1px_rgba(15,23,42,0.35),0_30px_120px_-60px_rgba(37,99,235,0.8)] backdrop-blur">
        <div className="rounded-t-3xl border-b border-slate-800/70 bg-slate-900/35 px-6 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className={`text-lg font-semibold ${danger ? "text-red-200" : "text-slate-100"}`}>{title}</h2>
              {subtitle ? <p className="mt-1 text-sm text-slate-400">{subtitle}</p> : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-800 bg-slate-950/30 p-2 text-slate-300 hover:text-slate-100 hover:bg-slate-900/40 transition"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: any }) {
  return (
    <div className="mt-4">
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</div>
        {hint ? <div className="text-xs text-red-300">{hint}</div> : null}
      </div>
      <div className="mt-2">{children}</div>
    </div>
  )
}