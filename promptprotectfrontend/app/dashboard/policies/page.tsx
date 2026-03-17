"use client"

import { useEffect, useMemo, useState } from "react"
import { apiGet, apiPost, apiPut, apiDelete, apiPatch } from "@/lib/api"
import MultiSelectDropdown from "@/components/MultiSelectDropdown"
import { DataTable } from "@/components/DataTable"
import ErrorPopup from "@/components/ErrorPopup"
import { Shield, Plus, X, Trash2, Sliders, ChevronUp, ChevronDown } from "lucide-react"

type PolicyCustomRule = {
  _id: string
  ruleName: string
  redactionLabel?: string
}

// Backend-approved enum values (EXACT)
type ActionMode = "BLOCK" | "REDACT" | "PARTIAL_REDACT" | "PROMPT_USER" | "REPORT_ONLY"

interface Policy {
  _id: string
  policyName: string
  rulesForPolicy: string[]
  customRules?: PolicyCustomRule[] | string[]
  action: ActionMode
  promptUserChoice?: string
  org: any
  createdBy: string
  updatedBy: string
  ruleConfigurations?: any[] | string[]
  createdAt: string
  updatedAt: string
}

type CustomRule = {
  _id: string
  ruleName: string
  redactionLabel?: string
  pattern?: string
  flags?: string
  ruleType?: string
}

type RuleConfig = {
  _id: string
  configName: string
  category: string
}

const RULES_LIST = ["PII", "PCI", "PHI", "SECRETS", "INFRASTRUCTURE", "CRYPTOCURRENCY"]
const ACTION_MODES: ActionMode[] = ["BLOCK", "REDACT", "PARTIAL_REDACT", "PROMPT_USER", "REPORT_ONLY"]

function prettyActionLabel(mode: ActionMode) {
  if (mode === "PROMPT_USER") return "Prompt User"
  if (mode === "PARTIAL_REDACT") return "Partial Redact"
  if (mode === "REPORT_ONLY") return "Report Only"
  return mode.charAt(0) + mode.slice(1).toLowerCase()
}

function buildPolicyPayload(input: {
  policyName: string
  rulesForPolicy: string[]
  customRules: string[]
  action: ActionMode
  promptUserChoice: string
  createdBy: string
  updatedBy: string
  orgId: string
  ruleConfigurations: string[]
}) {
  const payload: any = {
    policyName: input.policyName,
    rulesForPolicy: input.rulesForPolicy,
    customRules: input.customRules,
    action: input.action,
    createdBy: input.createdBy,
    updatedBy: input.updatedBy,
    orgId: input.orgId,
    ruleConfigurations: input.ruleConfigurations,
  }

  if (input.action === "PROMPT_USER") {
    payload.promptUserChoice = input.promptUserChoice.trim()
  }

  return payload
}

export default function PoliciesPage() {
  const [orgId, setOrgId] = useState<string | null>(null)
  const [policies, setPolicies] = useState<Policy[]>([])
  const [customRules, setCustomRules] = useState<CustomRule[]>([])
  const [ruleConfigs, setRuleConfigs] = useState<RuleConfig[]>([])

  const [showModal, setShowModal] = useState(false)
  const [editingPolicy, setEditingPolicy] = useState<Policy | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const [userId, setUserId] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Priority UX control
  const [priorityBusyId, setPriorityBusyId] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    policyName: "",
    rulesForPolicy: [] as string[],
    customRules: [] as string[],
    ruleConfigurations: [] as string[],
    action: "REDACT" as ActionMode,
    promptUserChoice: "",
    createdBy: "system",
    updatedBy: "system",
    orgId: "",
  })

  const [touched, setTouched] = useState({
    policyName: false,
    rulesForPolicy: false,
    customRules: false,
    ruleConfigurations: false,
    promptUserChoice: false,
  })

  const isPolicyNameValid = formData.policyName.trim().length >= 3
  const hasAnyRules = formData.rulesForPolicy.length > 0 || formData.customRules.length > 0

  const needsPromptChoice = formData.action === "PROMPT_USER"
  const isPromptChoiceValid = !needsPromptChoice || formData.promptUserChoice.trim().length > 0

  const isFormValid = isPolicyNameValid && hasAnyRules && isPromptChoiceValid

  const getBorder = (isValid: boolean, field: keyof typeof touched) => {
    if (!touched[field]) return "border-blue-500/30 focus:border-blue-400"
    return isValid ? "border-emerald-500/40 focus:border-emerald-400" : "border-red-500/40 focus:border-red-400"
  }

  useEffect(() => {
    async function init() {
      try {
        const res: any = await apiGet("/users/auth/me")
        if (res.success && res.user) {
          const user = res.user
          const org = user.org
          setOrgId(org?._id || user.orgId)
          setUserId(user._id || user.userId)
          setFormData((prev) => ({
            ...prev,
            orgId: org?._id || user.orgId,
            createdBy: prev.createdBy || "system",
            updatedBy: prev.updatedBy || "system",
          }))
        }
      } catch (err) {
        console.error("Failed to init policies page:", err)
      }
    }
    init()
  }, [])

  useEffect(() => {
    if (!orgId) return
      ; (async () => {
        await fetchCustomRules()
        await fetchRuleConfigs()
        await fetchPolicies()
      })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId])

  const fetchPolicies = async () => {
    try {
      const res = await apiGet<{ success: boolean; policies: Policy[] }>(`/policies`)
      const list = Array.isArray(res.policies) ? res.policies : []
      const normalized = list.map((p: any) => ({
        ...p,
        action: (p?.action as ActionMode) || "REDACT",
      }))
      setPolicies(normalized)
    } catch (err) {
      console.error("Failed to fetch policies:", err)
    }
  }

  const fetchCustomRules = async () => {
    try {
      const res = await apiGet<any>(`/custom-rules`)
      // Handle both { success: true, rules: [...] } and direct array [...]
      const rulesData = Array.isArray(res) ? res : (res?.rules || [])
      setCustomRules(rulesData)
    } catch (err) {
      console.error("Failed to fetch custom rules:", err)
      setCustomRules([])
    }
  }

  const fetchRuleConfigs = async () => {
    try {
      const res = await apiGet<any>(`/rule-configurations`)
      // Handle both { success: true, data: [...] } and direct array [...]
      const configData = Array.isArray(res) ? res : (res?.data || [])
      setRuleConfigs(configData)
    } catch (err) {
      console.error("Failed to fetch rule configs:", err)
      setRuleConfigs([])
    }
  }

  const resetForm = () => {
    setFormData({
      policyName: "",
      rulesForPolicy: [],
      customRules: [],
      ruleConfigurations: [],
      action: "REDACT",
      promptUserChoice: "",
      createdBy: "system",
      updatedBy: "system",
      orgId: orgId || "",
    })
    setTouched({
      policyName: false,
      rulesForPolicy: false,
      customRules: false,
      ruleConfigurations: false,
      promptUserChoice: false,
    })
  }

  const handleAddPolicy = async () => {
    setTouched({
      policyName: true,
      rulesForPolicy: true,
      customRules: true,
      ruleConfigurations: true,
      promptUserChoice: true,
    })
    if (!isFormValid || isSubmitting) return

    setIsSubmitting(true)
    try {
      const payload = buildPolicyPayload(formData)

      if (editingPolicy) {
        await apiPut(`/policies/${editingPolicy._id}`, payload)
        setEditingPolicy(null)
      } else {
        await apiPost("/policies", payload)
      }

      setShowModal(false)
      resetForm()
      fetchPolicies()
    } catch (err: any) {
      setError(err?.message || "Something went wrong while saving policy.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = (policy: Policy) => {
    setEditingPolicy(policy)

    let selectedCustomRuleIds: string[] = []
    if (Array.isArray(policy.customRules) && policy.customRules.length > 0) {
      const first = policy.customRules[0] as any
      if (typeof first === "string") {
        selectedCustomRuleIds = policy.customRules as string[]
      } else {
        selectedCustomRuleIds = (policy.customRules as PolicyCustomRule[]).map((cr) => cr._id)
      }
    }

    let selectedConfigIds: string[] = []
    if (Array.isArray(policy.ruleConfigurations) && policy.ruleConfigurations.length > 0) {
      const first = policy.ruleConfigurations[0] as any
      if (typeof first === "string") {
        selectedConfigIds = policy.ruleConfigurations as string[]
      } else {
        selectedConfigIds = (policy.ruleConfigurations as any[]).map((c) => c._id)
      }
    }

    const action = (policy.action as ActionMode) || "REDACT"

    setFormData({
      policyName: policy.policyName,
      rulesForPolicy: policy.rulesForPolicy || [],
      customRules: selectedCustomRuleIds,
      ruleConfigurations: selectedConfigIds,
      action,
      promptUserChoice: action === "PROMPT_USER" ? policy.promptUserChoice || "" : "",
      createdBy: policy.createdBy || "system",
      updatedBy: policy.updatedBy || "system",
      orgId: orgId || "",
    })

    setTouched({
      policyName: false,
      rulesForPolicy: false,
      customRules: false,
      ruleConfigurations: false,
      promptUserChoice: false,
    })
    setShowModal(true)
  }

  const customRuleOptions = useMemo(() => customRules.map((r) => ({ _id: r._id, name: r.ruleName })), [customRules])
  const ruleConfigOptions = useMemo(
    () => ruleConfigs.map((c) => ({ _id: c._id, name: `${c.configName} (${c.category})` })),
    [ruleConfigs]
  )

  const customRuleNameById = useMemo(() => {
    const m = new Map<string, string>()
    for (const r of customRules) m.set(r._id, r.ruleName)
    return m
  }, [customRules])

  const policiesForTable = useMemo(() => {
    return (policies || []).map((p) => {
      let customNames: string[] = []

      if (Array.isArray(p.customRules) && p.customRules.length > 0) {
        const first = p.customRules[0] as any
        if (typeof first === "string") {
          customNames = (p.customRules as string[]).map((id) => customRuleNameById.get(id) || id)
        } else {
          customNames = (p.customRules as PolicyCustomRule[]).map((x) => x.ruleName).filter(Boolean)
        }
      }

      return {
        ...p,
        actionLabel: prettyActionLabel((p.action as ActionMode) || "REDACT"),
        customRulesForPolicy: customNames,
      } as any
    })
  }, [policies, customRuleNameById])

  const policyIndexById = useMemo(() => {
    const m = new Map<string, number>()
    policiesForTable.forEach((p: any, idx: number) => m.set(p._id, idx))
    return m
  }, [policiesForTable])

  const movePriority = async (policyId: string, direction: "UP" | "DOWN") => {
    if (priorityBusyId) return

    const idx = policyIndexById.get(policyId)
    if (idx === undefined) return

    const targetIdx = direction === "UP" ? idx - 1 : idx + 1
    if (targetIdx < 0 || targetIdx >= policies.length) return

    const prev = policies
    const next = [...policies]
    const a = next[idx]
    const b = next[targetIdx]
    if (!a || !b) return
    next[idx] = b
    next[targetIdx] = a
    setPolicies(next)

    setPriorityBusyId(policyId)
    try {
      await apiPatch(`/policies/${policyId}/priority`, { direction })
      await fetchPolicies()
    } catch (err: any) {
      setPolicies(prev)
      setError(err?.message || "Failed to update policy priority.")
    } finally {
      setPriorityBusyId(null)
    }
  }

  return (
    <div className="min-h-screen bg-transparent text-slate-100">
      <div className="relative mx-auto max-w-7xl px-5 py-10 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/35 p-2">
                <Shield className="h-6 w-6 text-blue-300" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Policies</h1>
            </div>
            <p className="mt-2 text-sm text-slate-400">Create and manage detection policies for your organization.</p>
          </div>

          <button
            onClick={() => {
              setEditingPolicy(null)
              resetForm()
              setShowModal(true)
            }}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-sm font-semibold text-slate-100 shadow-[0_0_0_1px_rgba(37,99,235,0.25),0_18px_50px_-35px_rgba(37,99,235,0.8)] hover:bg-blue-500/18 hover:border-blue-400/40 transition"
          >
            <Plus className="h-4 w-4 text-blue-200" />
            Add Policy
          </button>
        </div>

        <div className="mt-8 rounded-2xl border border-slate-800/80 bg-slate-900/35 p-5 shadow-[0_0_0_1px_rgba(15,23,42,0.35),0_20px_60px_-45px_rgba(37,99,235,0.5)]">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-100">Policy List</h2>
              <p className="mt-1 text-xs text-slate-400">Search, edit, and remove policies.</p>
            </div>
            <span className="hidden sm:inline-flex items-center gap-2 rounded-full border border-slate-700/60 bg-slate-950/20 px-3 py-1 text-xs text-slate-400">
              <Sliders className="h-4 w-4 text-slate-300" />
              Rules driven
            </span>
          </div>

          <DataTable<any>
            data={policiesForTable}
            columns={[
              {
                key: "_priority",
                label: "Priority",
                render: (row: any) => {
                  const idx = policyIndexById.get(row._id) ?? -1
                  const isFirst = idx <= 0
                  const isLast = idx >= policiesForTable.length - 1
                  const busy = priorityBusyId === row._id

                  const btnBase =
                    "inline-flex items-center justify-center rounded-lg border px-2 py-1 transition disabled:opacity-40 disabled:cursor-not-allowed"
                  const btnStyle = "border-slate-700/70 bg-slate-950/25 hover:bg-slate-900/40 text-slate-200"

                  return (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        aria-label="Move up"
                        disabled={isFirst || busy}
                        onClick={() => movePriority(row._id, "UP")}
                        className={[btnBase, btnStyle].join(" ")}
                        title={isFirst ? "Already highest priority" : "Move up"}
                      >
                        {busy ? (
                          <span className="h-4 w-4 border-2 border-white/60 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <ChevronUp className="h-4 w-4" />
                        )}
                      </button>

                      <button
                        type="button"
                        aria-label="Move down"
                        disabled={isLast || busy}
                        onClick={() => movePriority(row._id, "DOWN")}
                        className={[btnBase, btnStyle].join(" ")}
                        title={isLast ? "Already lowest priority" : "Move down"}
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

              { key: "policyName", label: "Policy Name" },
              { key: "actionLabel", label: "Action" },
              { key: "rulesForPolicy", label: "Rules" },
              { key: "customRulesForPolicy", label: "Custom Rules" },
              {
                key: "ruleConfigurations",
                label: "Rule Configs",
                render: (row: any) =>
                  Array.isArray(row.ruleConfigurations)
                    ? row.ruleConfigurations.map((v: any) => v.configName || v).join(", ")
                    : "",
              },
              { key: "createdBy", label: "Created By" },
              { key: "updatedBy", label: "Updated By" },
              { key: "createdAt", label: "Created At" },
              { key: "updatedAt", label: "Updated At" },
            ]}
            searchKeys={["policyName", "actionLabel", "rulesForPolicy", "createdBy"]}
            onEdit={handleEdit}
            onDelete={(id) => setConfirmDeleteId(id)}
          />
        </div>

        {error && <ErrorPopup message={error} onClose={() => setError("")} />}
      </div>

      {showModal && (
        <ModalShell
          title={editingPolicy ? "Edit Policy" : "Add Policy"}
          subtitle={editingPolicy ? "Update policy name and rule set." : "Create a new policy and assign detection rules."}
          onClose={() => {
            setShowModal(false)
            setEditingPolicy(null)
          }}
        >
          <Field label="Policy Name" hint={touched.policyName && !isPolicyNameValid ? "Minimum 3 characters." : ""}>
            <input
              type="text"
              placeholder="e.g. Default Policy"
              value={formData.policyName}
              onChange={(e) => setFormData({ ...formData, policyName: e.target.value })}
              onBlur={() => setTouched((t) => ({ ...t, policyName: true }))}
              className={[
                "w-full rounded-xl bg-slate-950/30 border px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500",
                "outline-none focus:ring-2 focus:ring-blue-500/15 transition",
                getBorder(isPolicyNameValid, "policyName"),
              ].join(" ")}
            />
          </Field>

          {/* Action (single select) */}
          <div className="mt-4">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Action</div>
              <div className="text-xs text-slate-500">What happens when a rule matches.</div>
            </div>

            <div className="mt-2 rounded-2xl border border-slate-800/80 bg-slate-950/20 p-3">
              <div className="grid grid-cols-2 gap-2">
                {ACTION_MODES.map((mode) => {
                  const active = formData.action === mode
                  return (
                    <button
                      key={mode}
                      type="button"
                      onClick={() =>
                        setFormData((p) => ({
                          ...p,
                          action: mode,
                          promptUserChoice: mode === "PROMPT_USER" ? p.promptUserChoice : "",
                        }))
                      }
                      className={[
                        "rounded-xl border px-3 py-2 text-sm font-semibold transition text-left",
                        active
                          ? "border-blue-400/40 bg-blue-500/15 text-slate-100 shadow-[0_0_0_1px_rgba(37,99,235,0.25)]"
                          : "border-slate-700/70 bg-slate-900/20 text-slate-300 hover:bg-slate-900/40 hover:text-slate-100",
                      ].join(" ")}
                    >
                      {prettyActionLabel(mode)}
                    </button>
                  )
                })}
              </div>

              {formData.action === "PROMPT_USER" && (
                <div className="mt-3">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">User Choice</div>
                    {touched.promptUserChoice && formData.promptUserChoice.trim().length === 0 ? (
                      <div className="text-xs text-red-300">Required.</div>
                    ) : null}
                  </div>

                  <input
                    type="text"
                    placeholder="Enter the user choice (stored with policy)"
                    value={formData.promptUserChoice}
                    onChange={(e) => setFormData((p) => ({ ...p, promptUserChoice: e.target.value }))}
                    onBlur={() => setTouched((t) => ({ ...t, promptUserChoice: true }))}
                    className={[
                      "mt-2 w-full rounded-xl bg-slate-950/30 border px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500",
                      "outline-none focus:ring-2 focus:ring-blue-500/15 transition",
                      getBorder(formData.promptUserChoice.trim().length > 0, "promptUserChoice"),
                    ].join(" ")}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Rules */}
          <div className="mt-4">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Rules</div>
              {touched.rulesForPolicy && !hasAnyRules ? (
                <div className="text-xs text-red-300">Select at least one rule or custom rule.</div>
              ) : null}
            </div>

            <div className="mt-2 rounded-2xl border border-slate-800/80 bg-slate-950/20 p-3">
              <MultiSelectDropdown
                label=""
                options={RULES_LIST.map((r) => ({ _id: r, name: r }))}
                selected={formData.rulesForPolicy}
                onChange={(val) => {
                  setFormData({ ...formData, rulesForPolicy: val })
                  setTouched((t) => ({ ...t, rulesForPolicy: true }))
                }}
              />
            </div>
          </div>

          {/* Custom Rules (RESTORED) */}
          <div className="mt-4">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Custom Rules</div>
            </div>

            <div className="mt-2 rounded-2xl border border-slate-800/80 bg-slate-950/20 p-3">
              <MultiSelectDropdown
                label=""
                options={customRuleOptions}
                selected={formData.customRules}
                onChange={(val) => {
                  setFormData({ ...formData, customRules: val })
                  setTouched((t) => ({ ...t, customRules: true }))
                }}
              />
            </div>
          </div>

          {/* Rule Configurations */}
          <div className="mt-4">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Rule Configurations</div>
            </div>

            <div className="mt-2 rounded-2xl border border-slate-800/80 bg-slate-950/20 p-3">
              <MultiSelectDropdown
                label=""
                options={ruleConfigOptions}
                selected={formData.ruleConfigurations}
                onChange={(val) => {
                  setFormData({ ...formData, ruleConfigurations: val })
                  setTouched((t) => ({ ...t, ruleConfigurations: true }))
                }}
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={() => {
                setShowModal(false)
                setEditingPolicy(null)
              }}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900/30 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-900/50 transition"
            >
              <X className="h-4 w-4" />
              Cancel
            </button>

            <button
              onClick={handleAddPolicy}
              disabled={!isFormValid || isSubmitting}
              className={[
                "inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold",
                "border-blue-500/30 bg-blue-500/10 text-slate-100 hover:bg-blue-500/18 hover:border-blue-400/40 transition",
                "disabled:opacity-50 disabled:cursor-not-allowed",
              ].join(" ")}
            >
              {isSubmitting && (
                <span className="h-4 w-4 border-2 border-white/60 border-t-transparent rounded-full animate-spin" />
              )}
              {isSubmitting ? (editingPolicy ? "Updating..." : "Adding...") : editingPolicy ? "Update Policy" : "Add Policy"}
            </button>
          </div>
        </ModalShell>
      )}

      {confirmDeleteId && (
        <ModalShell title="Confirm Delete" subtitle="This cannot be undone." onClose={() => setConfirmDeleteId(null)} danger>
          <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-slate-200">
            Are you sure you want to delete this policy?
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
                try {
                  await apiDelete(`/policies/${confirmDeleteId}`)
                  setConfirmDeleteId(null)
                  fetchPolicies()
                } catch (err: any) {
                  setError(err?.message || "Failed to delete policy.")
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
    <div className="fixed inset-0 z-[9999] overflow-y-auto bg-black/70 px-4 py-10 pointer-events-auto" role="dialog" aria-modal="true">
      <div className="min-h-full flex items-start justify-center">
        <div className="w-full max-w-[460px] overflow-hidden rounded-3xl border border-slate-800/80 bg-slate-950/85 shadow-[0_0_0_1px_rgba(15,23,42,0.35),0_30px_120px_-60px_rgba(37,99,235,0.8)] backdrop-blur">
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

          <div className="px-6 py-5 max-h-[calc(100vh-160px)] overflow-y-auto">{children}</div>
        </div>
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