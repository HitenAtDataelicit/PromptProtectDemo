"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { apiGet, apiPut, apiDelete, apiPatch } from "@/lib/api"
import { DataTable } from "@/components/DataTable"
import ErrorPopup from "@/components/ErrorPopup"
import { Braces, Plus, X, Trash2, Sliders, ChevronUp, ChevronDown } from "lucide-react"

type CustomRule = {
  _id: string
  ruleName: string
  description?: string
  ruleType?: string
  pattern?: string
  flags?: string
  redactionLabel?: string

  createdBy?: string
  updatedBy?: string
  createdAt?: string
  updatedAt?: string
}

export default function CustomRulesPage() {
  const router = useRouter()

  const [orgId, setOrgId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  const [rules, setRules] = useState<CustomRule[]>([])

  const [showModal, setShowModal] = useState(false)
  const [editingRule, setEditingRule] = useState<CustomRule | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [priorityBusyId, setPriorityBusyId] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    ruleName: "",
    description: "",
    ruleType: "REGEX",
    pattern: "",
    flags: "g",
    redactionLabel: "",
  })

  const [touched, setTouched] = useState({
    ruleName: false,
    redactionLabel: false,
    pattern: false,
  })

  const isRuleNameValid = formData.ruleName.trim().length >= 3
  const isRedactionLabelValid = formData.redactionLabel.trim().length >= 3
  const isPatternValid = formData.pattern.trim().length >= 1
  const isFormValid = isRuleNameValid && isRedactionLabelValid && isPatternValid

  const getBorder = (isValid: boolean, field: keyof typeof touched) => {
    if (!touched[field]) return "border-blue-500/30 focus:border-blue-400"
    return isValid ? "border-emerald-500/40 focus:border-emerald-400" : "border-red-500/40 focus:border-red-400"
  }

  useEffect(() => {
    async function init() {
      try {
        const res: any = await apiGet("/users/auth/me")
        if (res.success && res.user) {
          setOrgId(res.user.org?._id || res.user.orgId)
          setUserId(res.user._id || res.user.userId)
        }
      } catch (err) {
        console.error("Failed to init custom rules page:", err)
      }
    }
    init()
  }, [])

  useEffect(() => {
    if (!orgId) return
      ; (async () => {
        await fetchRules()
      })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId])

  const fetchRules = async () => {
    try {
      const res = await apiGet<any>(`/custom-rules`)
      console.log("CUSTOM RULES RAW =>", res)

      // Handle both { success: true, rules: [...] } and direct array [...]
      const rulesData = Array.isArray(res) ? res : (res?.rules || [])
      setRules(rulesData)
    } catch (err) {
      console.error("Failed to fetch rules:", err)
      setRules([])
    }
  }


  const resetForm = () => {
    setFormData({
      ruleName: "",
      description: "",
      ruleType: "REGEX",
      pattern: "",
      flags: "g",
      redactionLabel: "",
    })
    setTouched({ ruleName: false, redactionLabel: false, pattern: false })
  }

  const handleEdit = (rule: CustomRule) => {
    setEditingRule(rule)
    setFormData({
      ruleName: rule.ruleName || "",
      description: rule.description || "",
      ruleType: rule.ruleType || "REGEX",
      pattern: rule.pattern || "",
      flags: rule.flags || "g",
      redactionLabel: rule.redactionLabel || "",
    })
    setTouched({ ruleName: false, redactionLabel: false, pattern: false })
    setShowModal(true)
  }

  const handleSave = async () => {
    setTouched({ ruleName: true, redactionLabel: true, pattern: true })
    if (!isFormValid || isSubmitting) return
    if (!editingRule?._id) return
    if (!userId) {
      setError("Identity missing. Please re-login.")
      return
    }

    setIsSubmitting(true)
    try {
      await apiPut(`/custom-rules/${editingRule._id}`, formData)
      setShowModal(false)
      setEditingRule(null)
      resetForm()
      fetchRules()
    } catch (err: any) {
      setError(err?.message || "Something went wrong while updating the rule.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleMovePriority = async (ruleId: string, direction: "UP" | "DOWN") => {
    if (priorityBusyId) return
    const prev = [...rules]
    setPriorityBusyId(ruleId)
    try {
      await apiPatch(`/custom-rules/${ruleId}/priority`, { direction })
      await fetchRules()
    } catch (err: any) {
      setRules(prev)
      setError(err?.message || "Failed to update custom rule priority.")
    } finally {
      setPriorityBusyId(null)
    }
  }

  const toSafeISO = (v?: string) => {
    if (!v) return undefined
    return v.replace(/\+00:00$/, "Z")
  }

  const rulesForTable = useMemo(() => {
    return (rules || []).map((r: any) => {
      const createdAt = toSafeISO(r.createdAt)
      const updatedAt = toSafeISO(r.updatedAt)

      return {
        ...r,
        ...(createdAt ? { createdAt } : {}),
        ...(updatedAt ? { updatedAt } : {}),
        ruleType: r.ruleType ?? "REGEX",
      }
    })
  }, [rules])




  return (
    <div className="min-h-screen bg-transparent text-slate-100">

      <div className="relative mx-auto max-w-7xl px-5 py-10 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/35 p-2">
                <Braces className="h-6 w-6 text-blue-300" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Custom Rules</h1>
            </div>
            <p className="mt-2 text-sm text-slate-400">Create, edit, and remove your organization custom detection rules.</p>
          </div>

          <button
            onClick={() => router.push("/dashboard/custom-regex")}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-sm font-semibold text-slate-100 shadow-[0_0_0_1px_rgba(37,99,235,0.25),0_18px_50px_-35px_rgba(37,99,235,0.8)] hover:bg-blue-500/18 hover:border-blue-400/40 transition"
          >
            <Plus className="h-4 w-4 text-blue-200" />
            Add Rule
          </button>
        </div>

        <div className="mt-8 rounded-2xl border border-slate-800/80 bg-slate-900/35 p-5 shadow-[0_0_0_1px_rgba(15,23,42,0.35),0_20px_60px_-45px_rgba(37,99,235,0.5)]">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-100">Rule List</h2>
              <p className="mt-1 text-xs text-slate-400">Search, edit, and remove custom rules.</p>
            </div>

          </div>

          <DataTable<any>
            data={rulesForTable}
            columns={[
              {
                key: "_priority",
                label: "Priority",
                render: (row: any) => {
                  const idx = rules.findIndex((r) => r._id === row._id)
                  const isFirst = idx === 0
                  const isLast = idx === rules.length - 1
                  const busy = priorityBusyId === row._id

                  const btnBase =
                    "inline-flex items-center justify-center rounded-lg border px-2 py-1 transition disabled:opacity-40 disabled:cursor-not-allowed"
                  const btnStyle = "border-slate-700/70 bg-slate-950/25 hover:bg-slate-900/40 text-slate-200"

                  return (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={isFirst || busy}
                        onClick={() => handleMovePriority(row._id, "UP")}
                        className={[btnBase, btnStyle].join(" ")}
                      >
                        {busy ? (
                          <span className="h-4 w-4 border-2 border-white/60 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <ChevronUp className="h-4 w-4" />
                        )}
                      </button>
                      <button
                        type="button"
                        disabled={isLast || busy}
                        onClick={() => handleMovePriority(row._id, "DOWN")}
                        className={[btnBase, btnStyle].join(" ")}
                      >
                        {busy ? (
                          <span className="h-4 w-4 border-2 border-white/60 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  )
                },
              },
              { key: "ruleName", label: "Rule Name" },
              { key: "redactionLabel", label: "Redaction Label" },
              { key: "flags", label: "Flags" },
              { key: "pattern", label: "Pattern" },
            ]}

            searchKeys={["ruleName", "ruleType", "redactionLabel", "pattern"]}
            onEdit={handleEdit}
            onDelete={(id) => setConfirmDeleteId(id)}
          />
        </div>

        {error && <ErrorPopup message={error} onClose={() => setError("")} />}
      </div>

      {showModal && (
        <ModalShell
          title="Edit Custom Rule"
          subtitle="Update rule details. This updates production behavior."
          onClose={() => {
            setShowModal(false)
            setEditingRule(null)
          }}
        >
          <Field label="Rule Name" hint={touched.ruleName && !isRuleNameValid ? "Minimum 3 characters." : ""}>
            <input
              type="text"
              value={formData.ruleName}
              onChange={(e) => setFormData({ ...formData, ruleName: e.target.value })}
              onBlur={() => setTouched((t) => ({ ...t, ruleName: true }))}
              className={[
                "w-full rounded-xl bg-slate-950/30 border px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500",
                "outline-none focus:ring-2 focus:ring-blue-500/15 transition",
                getBorder(isRuleNameValid, "ruleName"),
              ].join(" ")}
            />
          </Field>

          <Field label="Description">
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full rounded-xl bg-slate-950/30 border border-slate-800/70 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-blue-500/15 focus:border-blue-400 transition"
            />
          </Field>

          <Field label="Rule Type">
            <input
              type="text"
              value={formData.ruleType}
              onChange={(e) => setFormData({ ...formData, ruleType: e.target.value })}
              className="w-full rounded-xl bg-slate-950/30 border border-slate-800/70 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-blue-500/15 focus:border-blue-400 transition"
            />
          </Field>

          <Field label="Pattern" hint={touched.pattern && !isPatternValid ? "Pattern is required." : ""}>
            <input
              type="text"
              value={formData.pattern}
              onChange={(e) => setFormData({ ...formData, pattern: e.target.value })}
              onBlur={() => setTouched((t) => ({ ...t, pattern: true }))}
              className={[
                "w-full rounded-xl bg-slate-950/30 border px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500",
                "outline-none focus:ring-2 focus:ring-blue-500/15 transition",
                getBorder(isPatternValid, "pattern"),
              ].join(" ")}
            />
          </Field>

          <Field label="Flags" hint="Example: gim">
            <input
              type="text"
              value={formData.flags}
              onChange={(e) => setFormData({ ...formData, flags: e.target.value })}
              className="w-full rounded-xl bg-slate-950/30 border border-slate-800/70 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-blue-500/15 focus:border-blue-400 transition"
            />
          </Field>

          <Field
            label="Redaction Label"
            hint={touched.redactionLabel && !isRedactionLabelValid ? "Minimum 3 characters." : "Used in redacted output placeholders."}
          >
            <input
              type="text"
              value={formData.redactionLabel}
              onChange={(e) => setFormData({ ...formData, redactionLabel: e.target.value })}
              onBlur={() => setTouched((t) => ({ ...t, redactionLabel: true }))}
              className={[
                "w-full rounded-xl bg-slate-950/30 border px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500",
                "outline-none focus:ring-2 focus:ring-blue-500/15 transition",
                getBorder(isRedactionLabelValid, "redactionLabel"),
              ].join(" ")}
            />
          </Field>

          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={() => {
                setShowModal(false)
                setEditingRule(null)
              }}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900/30 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-900/50 transition"
            >
              <X className="h-4 w-4" />
              Cancel
            </button>

            <button
              onClick={handleSave}
              disabled={!isFormValid || isSubmitting}
              className={[
                "inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold",
                "border-blue-500/30 bg-blue-500/10 text-slate-100 hover:bg-blue-500/18 hover:border-blue-400/40 transition",
                "disabled:opacity-50 disabled:cursor-not-allowed",
              ].join(" ")}
            >
              {isSubmitting && <span className="h-4 w-4 border-2 border-white/60 border-t-transparent rounded-full animate-spin" />}
              {isSubmitting ? "Updating..." : "Update Rule"}
            </button>
          </div>
        </ModalShell>
      )}

      {confirmDeleteId && (
        <ModalShell title="Confirm Delete" subtitle="This cannot be undone." onClose={() => setConfirmDeleteId(null)} danger>
          <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-slate-200">
            Are you sure you want to delete this rule?
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={() => setConfirmDeleteId(null)}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900/30 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-900/50 transition"
            >
              Cancel
            </button>

            <button
              onClick={async () => {
                if (!userId) {
                  setError("Identity missing. Please re-login.")
                  return
                }
                try {
                  await apiDelete(`/custom-rules/${confirmDeleteId}`)
                  setConfirmDeleteId(null)
                  fetchRules()
                } catch (err: any) {
                  setError(err?.message || "Failed to delete rule.")
                }
              }}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-semibold text-slate-100 hover:bg-red-500/20 hover:border-red-400/40 transition"
            >
              <Trash2 className="h-4 w-4 text-red-200" />
              Delete
            </button>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-[520px] overflow-hidden rounded-3xl border border-slate-800/80 bg-slate-950/85 shadow-[0_0_0_1px_rgba(15,23,42,0.35),0_30px_120px_-60px_rgba(37,99,235,0.8)] backdrop-blur">
        <div className="border-b border-slate-800/70 bg-slate-900/35 px-6 py-4">
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
