"use client"

import { useEffect, useState } from "react"
import { CheckCircle, Eye, EyeOff, Pencil, Settings, Link2, KeyRound } from "lucide-react"
import { apiPut, apiGet } from "@/lib/api"

const HEC_TOKEN_REGEX = /^[A-Za-z0-9-]{16,128}$/
const HEC_URL_REGEX = /^https?:\/\/[^\s]+$/

type OrgByIdResponse = {
  // Add common variants because backend naming is usually chaotic
  hecToken?: string
  hec_token?: string
  orgHEC_TOKEN?: string
  orgHecToken?: string

  hecUrl?: string
  hec_url?: string
  orgHEC?: string
  orgHecUrl?: string

  splunk_sourcetype?: string
  splunkSourcetype?: string
  sourcetype?: string

  orgName?: string
  name?: string
}

export default function HecKeyPage() {
  const [orgId, setOrgId] = useState<string | null>(null)
  const [orgName, setOrgName] = useState("")

  const [hecToken, setHecToken] = useState("")
  const [hecUrl, setHecUrl] = useState("")
  const [splunkSourcetype, setSplunkSourcetype] = useState("")

  const [showHecToken, setShowHecToken] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isConfigured, setIsConfigured] = useState(false)

  const [status, setStatus] = useState("")
  const [statusType, setStatusType] = useState<"success" | "error" | "">("")

  const [errors, setErrors] = useState<{ hecToken?: string; hecUrl?: string }>({})

  // Load basics from auth state
  useEffect(() => {
    async function init() {
      try {
        const res: any = await apiGet("/users/auth/me")
        if (res.success && res.user) {
          setOrgId(res.user.org?._id || res.user.orgId)
          setOrgName(res.user.org?.orgName || "")
        }
      } catch (err) {
        console.error("Failed to init HEC key page:", err)
      }
    }
    init()
  }, [])

  // Fetch real config from backend: /byid/:orgId
  useEffect(() => {
    if (!orgId) return

      ; (async () => {
        try {
          setStatus("")
          setStatusType("")

          // If your backend needs headers, apiGet must support headers.
          // If it doesn't, this still works if the endpoint is public/doesn't require headers.
          const res = await apiGet<OrgByIdResponse>(`/org/me`)

          const token = res.hecToken || res.hec_token || res.orgHEC_TOKEN || res.orgHecToken || ""

          const url = res.hecUrl || res.hec_url || res.orgHEC || res.orgHecUrl || ""

          const st = res.splunk_sourcetype || res.splunkSourcetype || res.sourcetype || ""

          // Sometimes orgName is also in this response
          const fetchedOrgName = res.orgName || res.name || ""
          if (fetchedOrgName) setOrgName(fetchedOrgName)

          setHecToken(token)
          setHecUrl(url)
          setSplunkSourcetype(st || fetchedOrgName || orgName || "")

          const configured = !!url && !!token
          setIsConfigured(configured)
          setIsEditing(!configured)
        } catch (e: any) {
          setStatus(e?.message || "Failed to load org config")
          setStatusType("error")
          setIsConfigured(false)
          setIsEditing(true)
        }
      })()
  }, [orgId])

  const handleSave = async () => {
    if (!orgId) return

    const newErrors: { hecToken?: string; hecUrl?: string } = {}

    if (!HEC_TOKEN_REGEX.test(hecToken)) {
      newErrors.hecToken = "Invalid HEC token (16–128 chars, letters/numbers/dashes only)"
    }
    if (!HEC_URL_REGEX.test(hecUrl)) {
      newErrors.hecUrl = "Invalid HEC URL."
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      setStatus("Please fix validation errors")
      setStatusType("error")
      return
    }

    setErrors({})
    setStatus("")
    setStatusType("")

    try {
      await apiPut("/org/hec-config", { hecToken, hecUrl, splunk_sourcetype: splunkSourcetype })

      setIsConfigured(true)
      setIsEditing(false)

      setStatus("Configuration saved")
      setStatusType("success")
    } catch (err: any) {
      setStatus(err?.message || "Error saving configuration")
      setStatusType("error")
    }
  }

  const maskedToken = "••••••••••••••••••••••••••••••••••••••••••••••••"

  return (
    <div className="min-h-screen text-slate-100">
      <div className="relative mx-auto max-w-5xl px-5 py-10 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/35 p-2">
                <Link2 className="h-6 w-6 text-blue-300" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Splunk HEC Settings</h1>
            </div>
            <p className="mt-2 text-sm text-slate-400">
              Admin-only configuration for sending events to Splunk via HTTP Event Collector.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-2xl border border-blue-500/25 bg-blue-500/10 px-4 py-2">
              <div className="text-[11px] uppercase tracking-wide text-slate-400">Org</div>
              <div className="text-sm font-semibold text-slate-100">{orgName || "Unknown"}</div>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/35 px-4 py-2">
              <div className="text-[11px] uppercase tracking-wide text-slate-400">Status</div>
              <div className="inline-flex items-center gap-2 text-sm font-semibold text-slate-100">
                <span
                  className={[
                    "h-2 w-2 rounded-full",
                    isConfigured ? "bg-emerald-400" : "bg-amber-400",
                    "shadow-[0_0_0_3px_rgba(16,185,129,0.15)]",
                  ].join(" ")}
                />
                {isConfigured ? "Configured" : "Not configured"}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8">
          {/* Header removed to avoid duplicating the page title */}
          <Card hideHeader>
            {isConfigured && !isEditing ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                  <CheckCircle size={22} className="text-emerald-300" />
                  <div>
                    <div className="text-sm font-semibold text-slate-100">Splunk configured</div>
                    <div className="text-xs text-slate-400">HEC settings are currently active.</div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-800/80 bg-slate-950/25 p-4 space-y-4">
                  <KV label="HEC URL" value={hecUrl || "Not set"} />

                  <div>
                    <div className="text-[11px] uppercase tracking-wide text-slate-400">HEC Token</div>
                    <div className="mt-2 flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/30 p-3">
                      <span className="font-mono text-xs text-slate-100 break-all">
                        {showHecToken ? hecToken || "" : maskedToken}
                      </span>
                      <button
                        onClick={() => setShowHecToken(!showHecToken)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-800 bg-slate-950/30 text-slate-200 hover:bg-slate-900/55 transition"
                        aria-label={showHecToken ? "Hide token" : "Show token"}
                      >
                        {showHecToken ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <KV label="Sourcetype" value={splunkSourcetype || orgName || "Not set"} />
                </div>

                <button
                  onClick={() => setIsEditing(true)}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-2 text-sm font-semibold text-slate-100 hover:bg-amber-500/18 transition"
                >
                  <Pencil size={16} className="text-amber-200" />
                  Edit configuration
                </button>
              </div>
            ) : (
              <div>
                <div className="mb-3">
                  <div className="text-sm font-semibold text-slate-100">
                    {isConfigured ? "Edit configuration" : "Configure Splunk"}
                  </div>
                  <div className="text-xs text-slate-400">Provide the HEC URL and token. Sourcetype is optional.</div>
                </div>

                {status ? (
                  <div
                    className={[
                      "mb-4 rounded-2xl border p-3 text-sm",
                      statusType === "error"
                        ? "border-red-500/20 bg-red-500/5 text-red-200"
                        : "border-emerald-500/20 bg-emerald-500/5 text-emerald-200",
                    ].join(" ")}
                  >
                    {status}
                  </div>
                ) : null}

                <div className="space-y-4">
                  <Field label="HEC Token" error={errors.hecToken}>
                    <div className="relative">
                      <input
                        placeholder="Token"
                        value={hecToken}
                        onChange={(e) => setHecToken(e.target.value)}
                        className={[
                          "w-full rounded-2xl bg-slate-950/30 border px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500",
                          "outline-none focus:ring-2 focus:ring-blue-500/15 transition",
                          errors.hecToken
                            ? "border-red-500/35 focus:border-red-400"
                            : "border-blue-500/25 focus:border-blue-400",
                        ].join(" ")}
                        type={showHecToken ? "text" : "password"}
                      />
                      <button
                        type="button"
                        onClick={() => setShowHecToken(!showHecToken)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-800 bg-slate-900/35 text-slate-200 hover:bg-slate-900/55 transition"
                        aria-label={showHecToken ? "Hide token" : "Show token"}
                      >
                        {showHecToken ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </Field>

                  <Field label="HEC URL" error={errors.hecUrl}>
                    <input
                      placeholder="https://x.x.x.x:8088/services/collector/event"
                      value={hecUrl}
                      onChange={(e) => setHecUrl(e.target.value)}
                      className={[
                        "w-full rounded-2xl bg-slate-950/30 border px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500",
                        "outline-none focus:ring-2 focus:ring-blue-500/15 transition",
                        errors.hecUrl ? "border-red-500/35 focus:border-red-400" : "border-blue-500/25 focus:border-blue-400",
                      ].join(" ")}
                    />
                  </Field>

                  <Field label="Splunk Sourcetype">
                    <div className="relative">
                      <input
                        placeholder="Optional"
                        value={splunkSourcetype}
                        onChange={(e) => setSplunkSourcetype(e.target.value)}
                        className="w-full rounded-2xl bg-slate-950/30 border border-blue-500/25 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-blue-500/15 focus:border-blue-400 transition"
                      />
                      <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">
                        <KeyRound size={16} />
                      </div>
                    </div>
                  </Field>

                  <button
                    onClick={handleSave}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-blue-500/30 bg-blue-500/10 px-4 py-3 text-sm font-semibold text-slate-100 hover:bg-blue-500/18 hover:border-blue-400/40 transition"
                  >
                    <Settings size={16} className="text-blue-200" />
                    Save configuration
                  </button>

                  {isConfigured ? (
                    <button
                      onClick={() => setIsEditing(false)}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-slate-900/30 px-4 py-3 text-sm font-semibold text-slate-200 hover:bg-slate-900/50 transition"
                    >
                      Cancel
                    </button>
                  ) : null}
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}

/* ---------------- Small UI Helpers ---------------- */

function Card({
  title,
  subtitle,
  icon: Icon,
  children,
  hideHeader = false,
}: {
  title?: string
  subtitle?: string
  icon?: any
  children: any
  hideHeader?: boolean
}) {
  return (
    <div className="rounded-2xl border border-slate-800/80 bg-slate-900/35 p-5 shadow-[0_0_0_1px_rgba(15,23,42,0.35),0_20px_60px_-45px_rgba(37,99,235,0.5)]">
      {!hideHeader && title ? (
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              {Icon ? (
                <div className="rounded-xl border border-slate-800 bg-slate-950/20 p-2 text-blue-300">
                  <Icon className="h-5 w-5" />
                </div>
              ) : null}
              <h2 className="text-sm font-semibold text-slate-100">{title}</h2>
            </div>
            {subtitle ? <p className="mt-2 text-xs text-slate-400">{subtitle}</p> : null}
          </div>
        </div>
      ) : null}

      <div className="rounded-2xl border border-slate-800/70 bg-slate-950/20 p-4">{children}</div>
    </div>
  )
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-2 text-sm text-slate-100 break-all">{value}</div>
    </div>
  )
}

function Field({ label, error, children }: { label: string; error?: string; children: any }) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <div className="text-[11px] uppercase tracking-wide text-slate-400">{label}</div>
        {error ? <div className="text-xs text-red-300">{error}</div> : null}
      </div>
      <div className="mt-2">{children}</div>
    </div>
  )
}
