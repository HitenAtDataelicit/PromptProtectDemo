"use client"

import React, { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { apiGet, apiPost } from "@/lib/api"
import {
  CheckCircle,
  AlertTriangle,
  Copy,
  RefreshCw,
  Save,
  Info,
  Braces,
  ListChecks,
  FileText,
  Pencil,
} from "lucide-react"

const FLAGS = ["g", "i", "m", "s", "u", "y"] as const

type Match = {
  match: string
  index: number
  length: number
  groups?: (string | undefined)[]
}

function cx(...classes: Array<string | false | undefined | null>) {
  return classes.filter(Boolean).join(" ")
}

export default function CreateCustomRegexPage() {
  /* ---------------- Org / User ---------------- */
  const [orgId, setOrgId] = useState<string>("")
  const [createdByUserId, setCreatedByUserId] = useState<string>("")
  const router = useRouter()

  useEffect(() => {
    async function init() {
      try {
        const res: any = await apiGet("/users/auth/me")
        if (res.success && res.user) {
          setOrgId(res.user.org?._id || res.user.orgId)
          setCreatedByUserId(res.user._id || res.user.userId)
        }
      } catch (err) {
        console.error("Failed to init custom regex page:", err)
      }
    }
    init()
  }, [])

  /* ---------------- Regex ---------------- */
  const [pattern, setPattern] = useState("")
  const [flags, setFlags] = useState<string[]>(["g"])
  const [testText, setTestText] = useState("")
  const [matches, setMatches] = useState<Match[]>([])
  const [regexError, setRegexError] = useState("")
  const [activeMatchIdx, setActiveMatchIdx] = useState<number>(-1)

  /* ---------------- Rule ---------------- */
  const [ruleName, setRuleName] = useState("")
  const [description, setDescription] = useState("")
  const [redactionLabel, setRedactionLabel] = useState("")
  const [labelTouched, setLabelTouched] = useState(false)

  const [loading, setLoading] = useState(false)
  const [resultMsg, setResultMsg] = useState<string>("")
  const [resultType, setResultType] = useState<"success" | "error" | "">("")

  /* ---------------- Auto Redaction Label ---------------- */
  useEffect(() => {
    if (!ruleName || labelTouched) return

    const cleaned = ruleName
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9 ]+/g, "")
      .replace(/\s+/g, "_")

    const label = cleaned ? `CUSTOM_${cleaned}` : ""
    setRedactionLabel(label)
  }, [ruleName, labelTouched])

  /* ---------------- Flags ---------------- */
  const toggleFlag = (f: string) => {
    setFlags((prev) => (prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]))
  }

  /* ---------------- Live Regex Engine ---------------- */
  useEffect(() => {
    setRegexError("")
    setMatches([])
    setActiveMatchIdx(-1)

    if (!pattern || !testText) return

    try {
      const re = new RegExp(pattern, flags.join(""))
      const found: Match[] = []

      if (re.global) {
        for (const m of testText.matchAll(re)) {
          if (m.index === undefined) continue
          found.push({
            match: m[0],
            index: m.index,
            length: m[0].length,
            groups: m.length > 1 ? (m.slice(1) as (string | undefined)[]) : [],
          })
        }
      } else {
        const m = re.exec(testText)
        if (m && m.index !== undefined) {
          found.push({
            match: m[0],
            index: m.index,
            length: m[0].length,
            groups: m.length > 1 ? (m.slice(1) as (string | undefined)[]) : [],
          })
        }
      }

      setMatches(found)
      if (found.length) setActiveMatchIdx(0)
    } catch (err) {
      setRegexError((err as Error).message)
    }
  }, [pattern, flags, testText])

  /* ---------------- Highlight Output ---------------- */
  const highlighted = useMemo(() => {
    if (!testText) return null
    if (!matches.length) return <span className="text-slate-200 whitespace-pre-wrap">{testText}</span>

    const sorted = [...matches].sort((a, b) => a.index - b.index)

    let cursor = 0
    const parts: React.ReactNode[] = []

    sorted.forEach((m, i) => {
      const before = testText.slice(cursor, m.index)
      if (before) {
        parts.push(
          <span key={`t-${i}`} className="text-slate-200 whitespace-pre-wrap">
            {before}
          </span>
        )
      }

      const isActive = i === activeMatchIdx
      const seg = testText.slice(m.index, m.index + m.length)

      parts.push(
        <mark
          key={`m-${i}`}
          className={cx(
            "whitespace-pre-wrap rounded-md px-1 py-0.5 border",
            isActive
              ? "bg-blue-500/20 border-blue-400/40 text-slate-50 shadow-[0_0_0_1px_rgba(37,99,235,0.25)]"
              : "bg-emerald-500/12 border-emerald-400/25 text-slate-50"
          )}
        >
          {seg}
        </mark>
      )

      cursor = m.index + m.length
    })

    const end = testText.slice(cursor)
    if (end) {
      parts.push(
        <span key="end" className="text-slate-200 whitespace-pre-wrap">
          {end}
        </span>
      )
    }

    return parts
  }, [matches, testText, activeMatchIdx])

  /* ---------------- Explain Panel ---------------- */
  const explanation = useMemo(() => {
    if (!pattern) return "An explanation of your regex will appear here."
    const f = flags.join("") || "(none)"
    const bits: string[] = []
    bits.push(`Pattern length: ${pattern.length}`)
    bits.push(`Flags: ${f}`)
    bits.push(`Global: ${flags.includes("g") ? "Yes" : "No"}`)
    bits.push(`Multiline: ${flags.includes("m") ? "Yes" : "No"}`)
    bits.push(`Case-insensitive: ${flags.includes("i") ? "Yes" : "No"}`)
    bits.push(`Matches found: ${matches.length}`)
    return bits.join("\n")
  }, [pattern, flags, matches.length])

  /* ---------------- Helpers ---------------- */
  const copyToClipboard = async (text: string) => {
    if (!text) return
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
  }

  const resetAll = () => {
    setPattern("")
    setFlags(["g"])
    setTestText("")
    setMatches([])
    setRegexError("")
    setActiveMatchIdx(-1)
    setRuleName("")
    setDescription("")
    setRedactionLabel("")
    setLabelTouched(false)
    setResultMsg("")
    setResultType("")
  }

  /* ---------------- Create Rule ---------------- */
  const createRule = async () => {
    if (!ruleName || !pattern || !redactionLabel) {
      setResultType("error")
      setResultMsg("Missing required fields: Rule Name, Pattern, Redaction Label.")
      return
    }
    if (regexError) {
      setResultType("error")
      setResultMsg("Fix the regex error before saving.")
      return
    }
    if (!createdByUserId) {
      setResultType("error")
      setResultMsg("Identity missing. Please re-login.")
      return
    }

    try {
      setLoading(true)
      setResultMsg("")
      setResultType("")

      await apiPost("/custom-rules", {
        ruleName,
        description,
        ruleType: "REGEX",
        pattern,
        flags: flags.join(""),
        redactionLabel,
      })

      setResultType("success")
      setResultMsg("Custom rule created successfully.")

      setTimeout(() => {
        router.push("/dashboard/custom-rules")
      }, 500)
    } catch (e: any) {
      setResultType("error")
      setResultMsg(e?.message || "Failed to create custom rule.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-transparent text-slate-100">
      <div className="relative mx-auto max-w-[1400px] px-5 py-10 lg:px-8">
        {/* Header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/35 p-2">
                <Braces className="h-6 w-6 text-blue-300" />
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Custom Regex Rule</h1>
                <p className="mt-1 text-sm text-slate-400">
                  Build and test regex rules with enterprise-grade preview before pushing to production.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => copyToClipboard(pattern)}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-800/80 bg-slate-900/35 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-900/55 transition"
            >
              <Copy className="h-4 w-4 text-slate-300" />
              Copy pattern
            </button>

            <button
              onClick={resetAll}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-800/80 bg-slate-900/35 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-900/55 transition"
            >
              <RefreshCw className="h-4 w-4 text-slate-300" />
              Reset
            </button>
          </div>
        </div>

        {/* Main Grid */}
        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_420px]">
          {/* LEFT */}
          <div className="space-y-6">
            <Panel
              title="Regular Expression"
              subtitle="Enter your regex and flags. Live results update as you type."
              icon={<Braces className="h-4 w-4 text-blue-300" />}
              right={
                <div className="flex items-center gap-2">
                  <div className="rounded-full border border-slate-800/70 bg-slate-900/30 px-3 py-1 text-xs text-slate-300">
                    {regexError
                      ? "error"
                      : matches.length
                        ? `${matches.length} match${matches.length > 1 ? "es" : ""}`
                        : "no match"}
                  </div>
                </div>
              }
            >
              <div className="space-y-3">
                <div className="relative">
                  <input
                    value={pattern}
                    onChange={(e) => setPattern(e.target.value)}
                    placeholder="insert your regular expression here"
                    className={cx(
                      "w-full rounded-2xl bg-slate-950/30 border px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500",
                      "outline-none focus:ring-2 focus:ring-blue-500/15 transition",
                      regexError ? "border-red-500/35 focus:border-red-400" : "border-blue-500/25 focus:border-blue-400"
                    )}
                  />
                  <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">
                    /{flags.join("")}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {FLAGS.map((f) => {
                    const on = flags.includes(f)
                    return (
                      <button
                        key={f}
                        onClick={() => toggleFlag(f)}
                        className={cx(
                          "inline-flex items-center justify-center rounded-xl border px-3 py-2 text-xs font-semibold transition",
                          on
                            ? "border-blue-500/25 bg-blue-500/10 text-slate-100"
                            : "border-slate-800/70 bg-slate-900/25 text-slate-300 hover:text-slate-100 hover:bg-slate-900/40"
                        )}
                      >
                        {f}
                      </button>
                    )
                  })}
                </div>

                {regexError ? (
                  <div className="rounded-2xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-200">
                    {regexError}
                  </div>
                ) : null}
              </div>
            </Panel>

            {/* FLUSH PANEL here to avoid box-in-box */}
            <Panel
              title="Test String"
              subtitle="Paste text here. Matches are highlighted below."
              icon={<FileText className="h-4 w-4 text-blue-300" />}
              right={
                <button
                  onClick={() => copyToClipboard(testText)}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-800/70 bg-slate-900/25 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-900/45 transition"
                >
                  <Copy className="h-4 w-4 text-slate-300" />
                  Copy text
                </button>
              }
              flush
            >
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border border-slate-800/70 bg-slate-950/20 p-4">
                  <textarea
                    value={testText}
                    onChange={(e) => setTestText(e.target.value)}
                    placeholder="..Insert your test string here"
                    rows={12}
                    className="w-full rounded-2xl bg-transparent border border-transparent px-0 py-0 text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:ring-0"
                  />
                </div>

                <div className="rounded-2xl border border-slate-800/70 bg-slate-950/20 p-4 min-h-[260px]">
                  {!testText ? (
                    <div className="text-sm text-slate-400">Highlighted output will appear here.</div>
                  ) : (
                    <div className="text-sm leading-relaxed">{highlighted}</div>
                  )}

                  {matches.length ? (
                    <div className="mt-4 flex items-center justify-between gap-3">
                      <div className="text-xs text-slate-400">
                        Active match:{" "}
                        <span className="font-semibold text-slate-200">
                          {activeMatchIdx + 1}/{matches.length}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setActiveMatchIdx((i) => Math.max(0, i - 1))}
                          disabled={activeMatchIdx <= 0}
                          className="rounded-xl border border-slate-800/70 bg-slate-900/25 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-900/45 transition disabled:opacity-50 disabled:hover:bg-slate-900/25"
                        >
                          Prev
                        </button>
                        <button
                          onClick={() => setActiveMatchIdx((i) => Math.min(matches.length - 1, i + 1))}
                          disabled={activeMatchIdx >= matches.length - 1}
                          className="rounded-xl border border-slate-800/70 bg-slate-900/25 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-900/45 transition disabled:opacity-50 disabled:hover:bg-slate-900/25"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </Panel>
          </div>

          {/* RIGHT */}
          <div className="space-y-6">
            <Panel
              title="Explanation"
              subtitle="Operational summary of the current regex config."
              icon={<Info className="h-4 w-4 text-blue-300" />}
            >
              <pre className="whitespace-pre-wrap text-sm text-slate-200 leading-relaxed">{explanation}</pre>
            </Panel>

            <Panel
              title="Match Information"
              subtitle="Detailed match list and selected match metadata."
              icon={<ListChecks className="h-4 w-4 text-blue-300" />}
            >
              {!pattern || !testText ? (
                <div className="text-sm text-slate-400">Enter a pattern and test text to see matches.</div>
              ) : matches.length === 0 ? (
                <div className="text-sm text-slate-400">No matches.</div>
              ) : (
                <div className="space-y-3">
                  <div className="max-h-56 overflow-auto rounded-2xl border border-slate-800/70 bg-slate-950/20">
                    {matches.map((m, i) => {
                      const active = i === activeMatchIdx
                      return (
                        <button
                          key={i}
                          onClick={() => setActiveMatchIdx(i)}
                          className={cx(
                            "w-full text-left px-4 py-3 border-b border-slate-800/70 last:border-b-0 transition",
                            active ? "bg-blue-500/10" : "hover:bg-slate-900/35"
                          )}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <div className="text-xs text-slate-400">
                                #{i + 1} at index {m.index}
                              </div>
                              <div className="mt-1 font-mono text-xs text-slate-100 break-all">{m.match}</div>
                            </div>
                            <div className="shrink-0 text-xs text-slate-400 tabular-nums">len {m.length}</div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </Panel>

            <Panel
              title="Create Custom Rule"
              subtitle="Save this regex as a production rule."
              icon={<Pencil className="h-4 w-4 text-blue-300" />}
            >
              {resultMsg ? (
                <div
                  className={cx(
                    "mb-4 rounded-2xl border px-4 py-3 text-sm",
                    resultType === "success"
                      ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-200"
                      : "border-red-500/20 bg-red-500/5 text-red-200"
                  )}
                >
                  <div className="flex items-start gap-2">
                    {resultType === "success" ? (
                      <CheckCircle className="h-5 w-5 text-emerald-300 mt-0.5" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-red-300 mt-0.5" />
                    )}
                    <div className="min-w-0">{resultMsg}</div>
                  </div>
                </div>
              ) : null}

              <div className="space-y-4">
                <Field label="Rule Name" required>
                  <input
                    value={ruleName}
                    onChange={(e) => setRuleName(e.target.value)}
                    placeholder="e.g., Email Address Detection"
                    className="w-full rounded-2xl bg-slate-950/30 border border-blue-500/25 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-blue-500/15 focus:border-blue-400 transition"
                  />
                </Field>

                <Field label="Description">
                  <input
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Optional context for admins"
                    className="w-full rounded-2xl bg-slate-950/30 border border-slate-800/70 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-blue-500/15 focus:border-blue-400 transition"
                  />
                </Field>

                <Field label="Redaction Label" required hint="Used in redacted output placeholders.">
                  <input
                    value={redactionLabel}
                    onChange={(e) => {
                      setLabelTouched(true)
                      setRedactionLabel(e.target.value)
                    }}
                    placeholder="e.g., CUSTOM_EMAIL_ADDRESS"
                    className="w-full rounded-2xl bg-slate-950/30 border border-blue-500/25 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-blue-500/15 focus:border-blue-400 transition"
                  />
                </Field>

                <button
                  onClick={createRule}
                  disabled={loading}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-blue-500/30 bg-blue-500/10 px-4 py-3 text-sm font-semibold text-slate-100 hover:bg-blue-500/18 hover:border-blue-400/40 transition disabled:opacity-60"
                >
                  <Save className="h-4 w-4 text-blue-200" />
                  {loading ? "Creating..." : "Create Rule"}
                </button>

                <div className="text-xs text-slate-500">
                  Saving requires a valid pattern and required rule fields. Fix regex errors before saving.
                </div>
              </div>
            </Panel>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ---------------- UI Helpers ---------------- */

function Panel({
  title,
  subtitle,
  right,
  icon,
  children,
  flush = false,
}: {
  title: string
  subtitle?: string
  right?: React.ReactNode
  icon?: React.ReactNode
  children: React.ReactNode
  flush?: boolean
}) {
  return (
    <div className="rounded-2xl border border-slate-800/80 bg-slate-900/35 p-5 shadow-[0_0_0_1px_rgba(15,23,42,0.35),0_22px_70px_-48px_rgba(37,99,235,0.55)]">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="rounded-xl border border-slate-800 bg-slate-950/20 p-2 text-blue-300">
              {icon ?? <div className="h-4 w-4" />}
            </div>
            <h2 className="text-sm font-semibold text-slate-100">{title}</h2>
          </div>
          {subtitle ? <p className="mt-2 text-xs text-slate-400">{subtitle}</p> : null}
        </div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </div>

      {flush ? <div>{children}</div> : <div className="rounded-2xl border border-slate-800/70 bg-slate-950/20 p-4">{children}</div>}
    </div>
  )
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string
  required?: boolean
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div className="text-[11px] uppercase tracking-wide text-slate-400">
          {label} {required ? <span className="text-blue-300">*</span> : null}
        </div>
        {hint ? <div className="text-xs text-slate-500">{hint}</div> : null}
      </div>
      <div className="mt-2">{children}</div>
    </div>
  )
}