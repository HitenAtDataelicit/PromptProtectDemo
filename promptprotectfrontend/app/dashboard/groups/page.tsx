"use client"

import { useEffect, useState } from "react"
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api"
import MultiSelectDropdown from "@/components/MultiSelectDropdown"
import { CustomDropdown } from "@/components/CustomDropdown"
import { DataTable } from "@/components/DataTable"
import ErrorPopup from "@/components/ErrorPopup"
import { Users2, Plus, X, Trash2, Layers } from "lucide-react"

interface User {
  _id: string
  userName: string
}

interface Policy {
  _id: string
  policyName: string
}

interface Group {
  _id: string
  groupName: string
  org: string
  groupUsers: User[]
  policiesAttached: Policy[]
  externalSsoGroups: string[]
  createdBy: string
  updatedBy: string
  createdAt: string
  updatedAt: string
}

export default function GroupsPage() {
  const [orgId, setOrgId] = useState<string | null>(null)
  const [groups, setGroups] = useState<Group[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [policies, setPolicies] = useState<Policy[]>([])
  const [showModal, setShowModal] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [editingGroup, setEditingGroup] = useState<Group | null>(null)
  const [isLdapEnabled, setIsLdapEnabled] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    groupName: "",
    groupUsers: [] as string[],
    policiesAttached: [] as string[],
    externalSsoGroups: [] as string[],
    orgId: "",
  })

  const [touched, setTouched] = useState({
    groupName: false,
    groupUsers: false,
    policiesAttached: false,
  })

  const isGroupNameValid = formData.groupName.trim().length >= 3
  const areUsersValid = formData.groupUsers.length > 0
  const arePoliciesValid = formData.policiesAttached.length > 0
  const isFormValid = isGroupNameValid && areUsersValid && arePoliciesValid

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
          setFormData((p) => ({ ...p, orgId: org?._id || user.orgId }))

          // Fetch Auth Settings to check LDAP
          const authRes: any = await apiGet("/org/auth-settings")
          if (authRes.success && authRes.data) {
            setIsLdapEnabled(!!authRes.data.authProviders?.ldap || !!authRes.data.ldap?.enabled)
          }
        }
      } catch (err) {
        console.error("Failed to init groups page:", err)
      }
    }
    init()
    fetchExternalGroups()
  }, [])

  const [allExternalGroups, setAllExternalGroups] = useState<{ _id: string, name: string }[]>([])

  const fetchExternalGroups = async () => {
    try {
      const res: any = await apiGet("/sso/groups")
      if (res.success) {
        const ad = (res.adGroups || []).map((g: any) => ({ _id: g.name || g.dn, name: g.name || g.displayName }))
        const saml = (res.samlGroups || []).map((g: any) => ({ _id: g.name || g.id, name: g.name || g.displayName }))
        setAllExternalGroups([...ad, ...saml])
      }
    } catch (err) {
      console.error("Failed to fetch external groups:", err)
    }
  }

  useEffect(() => {
    if (!orgId) return
    fetchGroups()
    fetchUsersAndPolicies()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId])

  const fetchGroups = async () => {
    try {
      const res = await apiGet<{ success: boolean; groups: Group[] }>(`/groups`)
      setGroups(res.groups)
    } catch (err) {
      console.error("Failed to fetch groups:", err)
    }
  }

  const fetchUsersAndPolicies = async () => {
    try {
      const usersRes = await apiGet<{ success: boolean; data: User[] }>(`/users`)
      const policiesRes = await apiGet<{ success: boolean; policies: Policy[] }>(`/policies`)
      setUsers(usersRes.data || [])
      setPolicies(policiesRes.policies || [])
    } catch (err) {
      console.error("Failed to fetch users/policies:", err)
    }
  }

  const resetForm = () => {
    setFormData({
      groupName: "",
      groupUsers: [],
      policiesAttached: [],
      externalSsoGroups: [],
      orgId: orgId || "",
    })
    setTouched({ groupName: false, groupUsers: false, policiesAttached: false })
  }

  const handleSaveGroup = async () => {
    setTouched({ groupName: true, groupUsers: true, policiesAttached: true })
    if (!isFormValid || isSubmitting) return

    setIsSubmitting(true)

    try {
      if (editingGroup) {
        await apiPut(`/groups/${editingGroup._id}`, formData)
        setEditingGroup(null)
      } else {
        await apiPost("/groups", formData)
      }

      setShowModal(false)
      resetForm()
      fetchGroups()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = (group: Group) => {
    setEditingGroup(group)
    setFormData({
      groupName: group.groupName,
      groupUsers: group.groupUsers.map((u) => u._id),
      policiesAttached: group.policiesAttached.map((p) => p._id),
      externalSsoGroups: group.externalSsoGroups || [],
      orgId: orgId || "",
    })
    setTouched({ groupName: false, groupUsers: false, policiesAttached: false })
    setShowModal(true)
  }

  return (
    <div className="min-h-screen bg-transparent text-slate-100">

      <div className="relative mx-auto max-w-7xl px-5 py-10 lg:px-8">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/35 p-2">
                <Users2 className="h-6 w-6 text-blue-300" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Groups</h1>
            </div>
            <p className="mt-2 text-sm text-slate-400">
              Assign users to groups and attach policies for enforcement.
            </p>
          </div>

          <button
            onClick={() => {
              setEditingGroup(null)
              resetForm()
              setShowModal(true)
            }}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-sm font-semibold text-slate-100 shadow-[0_0_0_1px_rgba(37,99,235,0.25),0_18px_50px_-35px_rgba(37,99,235,0.8)] hover:bg-blue-500/18 hover:border-blue-400/40 transition"
          >
            <Plus className="h-4 w-4 text-blue-200" />
            Add Group
          </button>
        </div>

        {/* Table shell */}
        <div className="mt-8 rounded-2xl border border-slate-800/80 bg-slate-900/35 p-5 shadow-[0_0_0_1px_rgba(15,23,42,0.35),0_20px_60px_-45px_rgba(37,99,235,0.5)]">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-100">Group Directory</h2>
              <p className="mt-1 text-xs text-slate-400">Search, edit, and remove groups.</p>
            </div>
            <span className="hidden sm:inline-flex items-center gap-2 rounded-full border border-slate-700/60 bg-slate-950/20 px-3 py-1 text-xs text-slate-400">
              <Layers className="h-4 w-4 text-slate-300" />
              Membership based
            </span>
          </div>

          <DataTable<Group>
            data={groups}
            columns={[
              { key: "groupName", label: "Group Name" },
              { key: "groupUsers", label: "Users" },
              { key: "policiesAttached", label: "Policies" },
              { key: "createdBy", label: "Created By" },
              { key: "updatedBy", label: "Updated By" },
              { key: "createdAt", label: "Created At" },
              { key: "updatedAt", label: "Updated At" },
            ]}
            searchKeys={["groupName", "createdBy"]}
            onEdit={handleEdit}
            onDelete={(id) => setConfirmDeleteId(id)}
          />
        </div>

        {error && <ErrorPopup message={error} onClose={() => setError("")} />}
      </div>

      {/* ---------- ADD/EDIT MODAL ---------- */}
      {showModal && (
        <ModalShell
          title={editingGroup ? "Edit Group" : "Add Group"}
          subtitle={editingGroup ? "Update group membership and policy attachments." : "Create a group and attach users + policies."}
          onClose={() => {
            setShowModal(false)
            setEditingGroup(null)
          }}
        >
          {/* Group Name */}
          <Field
            label="Group Name"
            hint={touched.groupName && !isGroupNameValid ? "Minimum 3 characters." : ""}
          >
            <input
              type="text"
              placeholder="e.g. SOC Tier 1"
              value={formData.groupName}
              onChange={(e) => setFormData({ ...formData, groupName: e.target.value })}
              onBlur={() => setTouched((t) => ({ ...t, groupName: true }))}
              className={[
                "w-full rounded-xl bg-slate-950/30 border px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500",
                "outline-none focus:ring-2 focus:ring-blue-500/15 transition",
                getBorder(isGroupNameValid, "groupName"),
              ].join(" ")}
            />
          </Field>

          {/* SSO Group Mapping */}
          {isLdapEnabled && (
             <div className="mt-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Map to SSO Groups</div>
                <div className="mt-2 rounded-2xl border border-slate-800/80 bg-slate-950/20 p-3">
                  <MultiSelectDropdown
                    label="External Groups"
                    options={allExternalGroups}
                    selected={formData.externalSsoGroups}
                    onChange={(val) => setFormData({ ...formData, externalSsoGroups: val })}
                  />
                </div>
                <p className="mt-1.5 text-[10px] text-slate-500">
                  Users from these SSO groups will be automatically resolved to this PromptProtect group.
                </p>
             </div>
          )}

          {/* Users */}
          <div className="mt-4">
            <div className="flex items-center justify-between">

              {touched.groupUsers && !areUsersValid ? <div className="text-xs text-red-300">Select at least one user.</div> : null}
            </div>
            <div className="mt-2 rounded-2xl border border-slate-800/80 bg-slate-950/20 p-3">
              <MultiSelectDropdown
                label="Users"
                options={(users || []).map((u) => ({ _id: u._id, name: u.userName }))}
                selected={formData.groupUsers}
                onChange={(val) => {
                  setFormData({ ...formData, groupUsers: val })
                  setTouched((t) => ({ ...t, groupUsers: true }))
                }}
              />
            </div>
          </div>

          {/* Policies */}
          <div className="mt-4">
            <div className="flex items-center justify-between">

              {touched.policiesAttached && !arePoliciesValid ? (
                <div className="text-xs text-red-300">Select at least one policy.</div>
              ) : null}
            </div>
            <div className="mt-2 rounded-2xl border border-slate-800/80 bg-slate-950/20 p-3">
              <MultiSelectDropdown
                label="Policies"
                options={(policies || []).map((p) => ({ _id: p._id, name: p.policyName }))}
                selected={formData.policiesAttached}
                onChange={(val) => {
                  setFormData({ ...formData, policiesAttached: val })
                  setTouched((t) => ({ ...t, policiesAttached: true }))
                }}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={() => {
                setShowModal(false)
                setEditingGroup(null)
              }}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900/30 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-900/50 transition"
            >
              <X className="h-4 w-4" />
              Cancel
            </button>

            <button
              onClick={handleSaveGroup}
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
              {isSubmitting ? (editingGroup ? "Updating..." : "Adding...") : editingGroup ? "Update Group" : "Add Group"}
            </button>
          </div>
        </ModalShell>
      )}

      {/* ---------- DELETE CONFIRM ---------- */}
      {confirmDeleteId && (
        <ModalShell
          title="Confirm Delete"
          subtitle="This cannot be undone."
          onClose={() => setConfirmDeleteId(null)}
          danger
        >
          <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-slate-200">
            Are you sure you want to delete this group?
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
                  await apiDelete(`/groups/${confirmDeleteId}`)
                  setConfirmDeleteId(null)
                  fetchGroups()
                } catch (err: any) {
                  setError(err.message)
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
    <div
      className="fixed inset-0 z-[9999] overflow-y-auto bg-black/70 px-4 py-10 pointer-events-auto"
      role="dialog"
      aria-modal="true"
    >
      <div className="min-h-full flex items-start justify-center">
        <div className="w-full max-w-[520px] rounded-3xl border border-slate-800/80 bg-slate-950/85 shadow-[0_0_0_1px_rgba(15,23,42,0.35),0_30px_120px_-60px_rgba(37,99,235,0.8)] backdrop-blur">
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

          {/* Scrollable content area */}
          <div className="px-6 py-5 max-h-[calc(100vh-160px)] overflow-visible">
            {children}
          </div>
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
