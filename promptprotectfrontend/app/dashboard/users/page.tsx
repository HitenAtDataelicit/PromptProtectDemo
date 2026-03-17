"use client"

import { useEffect, useState } from "react"
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api"
import { cn } from "@/lib/utils"
import { DataTable } from "@/components/DataTable"
import MultiSelectDropdown from "@/components/MultiSelectDropdown"
import ErrorPopup from "@/components/ErrorPopup"
import { SuccessToast } from "@/components/SuccessToast"
import { Users, Plus, X, Trash2, Shield, Eye, EyeOff, AlertTriangle, Send } from "lucide-react"

interface User {
  _id: string
  userName: string
  userRole: string[]
  userEmail: string
  status: "PENDING_VERIFICATION" | "ACTIVE" | "SUSPENDED"
  emailVerified: boolean
  createdBy: string
  updatedBy: string
  createdAt: string
  updatedAt: string
}

export default function UsersPage() {
  const [orgId, setOrgId] = useState<string | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [confirmAction, setConfirmAction] = useState<{
    type: "suspend" | "activate" | "resend"
    user: User
  } | null>(null)

  const [touched, setTouched] = useState({
    userName: false,
    userEmail: false,
    userPassword: false,
  })

  const [formData, setFormData] = useState({
    userName: "",
    userRole: [] as string[],
    userEmail: "",
    userPassword: "",
    createdBy: "system",
    updatedBy: "system",
    orgId: "",
  })

  const ROLE_LIST = ["ADMIN", "USER_MANAGER", "POLICY_MANAGER", "GROUP_MANAGER", "DEFAULT"]

  const isBusinessEmail = (email: string) => {
    return email.includes("@") && email.length > 5
  }

  const isStrongPassword = (password: string) => {
    const regex = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{7,}$/
    return regex.test(password)
  }

  const getBorder = (isValid: boolean, field: keyof typeof touched) => {
    if (!touched[field]) return "border-blue-500/30 focus:border-blue-400"
    return isValid ? "border-emerald-500/40 focus:border-emerald-400" : "border-red-500/40 focus:border-red-400"
  }

  useEffect(() => {
    // We now rely on the backend JWT. orgId and userId are fetched from /auth/me in layouts or here if needed.
    // For this page, we can fetch them from /auth/me if they aren't provided by a context.
    async function init() {
      try {
        const res: any = await apiGet("/users/auth/me")
        if (res.success && res.user) {
          const fetchedOrgId = res.user.org?._id || res.user.org;
          setOrgId(fetchedOrgId);
          setUserId(res.user._id);
          setFormData(prev => ({ ...prev, orgId: fetchedOrgId }));
        }
      } catch (err) {
        console.error("Failed to init users page:", err)
      }
    }
    init()
  }, [])

  const fetchUsers = async () => {
    if (!orgId) return
    try {
      const res = await apiGet<{ success: boolean; data: User[] }>(`/users`);
      if (res.success && res.data) {
        setUsers(res.data.filter((u) => u._id !== userId).map((u: any) => ({ ...u, _key: u._id })));
      }
    } catch (error) {
      console.error("Failed to fetch users:", error)
    }
  }

  useEffect(() => {
    if (orgId && userId) fetchUsers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, userId])

  const resetForm = () => {
    setFormData({
      userName: "",
      userRole: [],
      userEmail: "",
      userPassword: "",
      createdBy: "system",
      updatedBy: "system",
      orgId: orgId || "",
    })

    setTouched({
      userName: false,
      userEmail: false,
      userPassword: false,
    })
    setShowPassword(false)
  }

  const performResendVerification = async (user: User) => {
    try {
      await apiPost("/users/auth/resend-verification", { userEmail: user.userEmail })
      setSuccessMessage(`Verification email sent to ${user.userEmail}`)
    } catch (error: any) {
      setError(error.message)
    } finally {
      setConfirmAction(null)
    }
  }

  const performToggleSuspension = async (user: User) => {
    try {
      const isSuspended = user.status === "SUSPENDED"
      const endpoint = isSuspended ? `/users/auth/activate/${user._id}` : `/users/auth/suspend/${user._id}`
      await apiPut(endpoint, {})
      setSuccessMessage(isSuspended ? `User ${user.userName} activated` : `User ${user.userName} suspended`)
      fetchUsers()
    } catch (error: any) {
      setError(error.message)
    } finally {
      setConfirmAction(null)
    }
  }

  const handleAddUser = async () => {
    if (isSubmitting) return
    setIsSubmitting(true)

    try {
      const payload = {
        ...formData,
        ...(formData.userPassword ? {} : { userPassword: undefined }),
      }

      if (editingUser) {
        await apiPut(`/users/${editingUser._id}`, payload)
        setEditingUser(null)
      } else {
        await apiPost("/users", formData)
      }

      setShowModal(false)
      resetForm()
      fetchUsers()
    } catch (error: any) {
      setError(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = (user: User) => {
    setFormData({
      userName: user.userName,
      userEmail: user.userEmail,
      userRole: user.userRole,
      userPassword: "",
      createdBy: user.createdBy,
      updatedBy: user.updatedBy,
      orgId: orgId || "",
    })

    setTouched({
      userName: false,
      userEmail: false,
      userPassword: false,
    })

    setEditingUser(user)
    setShowModal(true)
  }

  // Derived validation state
  const nameValid = formData.userName.trim().length > 0
  const emailValid = isBusinessEmail(formData.userEmail)
  const passwordValid = isStrongPassword(formData.userPassword)

  return (
    <div className="min-h-screen bg-transparent text-slate-100">

      <div className="relative mx-auto max-w-7xl px-5 py-10 lg:px-8">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/35 p-2">
                <Users className="h-6 w-6 text-blue-300" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Users</h1>
            </div>
            <p className="mt-2 text-sm text-slate-400">
              Manage organization users, roles, and access
            </p>
          </div>

          <button
            onClick={() => {
              setEditingUser(null)
              resetForm()
              setShowModal(true)
            }}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-sm font-semibold text-slate-100 shadow-[0_0_0_1px_rgba(37,99,235,0.25),0_18px_50px_-35px_rgba(37,99,235,0.8)] hover:bg-blue-500/18 hover:border-blue-400/40 transition"
          >
            <Plus className="h-4 w-4 text-blue-200" />
            Add User
          </button>
        </div>

        {/* Table shell */}
        <div className="mt-8 rounded-2xl border border-slate-800/80 bg-slate-900/35 p-5 shadow-[0_0_0_1px_rgba(15,23,42,0.35),0_20px_60px_-45px_rgba(37,99,235,0.5)]">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-100">Directory</h2>
              <p className="mt-1 text-xs text-slate-400">Search, edit, and remove users.</p>
            </div>
            <span className="hidden sm:inline-flex items-center gap-2 rounded-full border border-slate-700/60 bg-slate-950/20 px-3 py-1 text-xs text-slate-400">
              <Shield className="h-4 w-4 text-slate-300" />
              Org scoped
            </span>
          </div>

          <DataTable<User>
            data={users}
            columns={[
              { key: "userName", label: "Name" },
              { key: "userEmail", label: "Email" },
              { key: "userRole", label: "Role" },
              {
                key: "status",
                label: "Status",
                render: (row: User) => {
                  const val = row.status
                  return (
                    <div className="flex items-center gap-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${val === "ACTIVE" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                        val === "SUSPENDED" ? "bg-red-500/10 text-red-400 border-red-500/20" :
                          "bg-blue-500/10 text-blue-400 border-blue-500/20"
                        }`}>
                        {val || "PENDING"}
                      </span>
                    </div>
                  )
                }
              },
              { key: "createdBy", label: "Created By" },
              { key: "updatedBy", label: "Updated By" },
              { key: "createdAt", label: "Created At" },
              { key: "updatedAt", label: "Updated At" },
            ]}
            searchKeys={["userName", "userEmail", "userRole", "createdBy"]}
            onEdit={handleEdit}
            onDelete={(id) => setConfirmDeleteId(id)}
            renderActions={(row) => (
              <div className="flex items-center gap-2">
                {row.status === "PENDING_VERIFICATION" && (
                  <button
                    onClick={() => setConfirmAction({ type: "resend", user: row })}
                    className="rounded-lg border border-blue-500/25 bg-blue-500/10 px-3 py-1.5 text-xs font-semibold text-blue-200 hover:bg-blue-500/15 transition"
                  >
                    Resend
                  </button>
                )}
                {(row.status === "ACTIVE" || row.status === "SUSPENDED") && !row.userRole.includes("ORG_ADMIN") && (
                  <button
                    onClick={() => setConfirmAction({ type: row.status === "SUSPENDED" ? "activate" : "suspend", user: row })}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${row.status === "SUSPENDED"
                      ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/15"
                      : "border-orange-500/25 bg-orange-500/10 text-orange-200 hover:bg-orange-500/15"
                      }`}
                  >
                    {row.status === "SUSPENDED" ? "Activate" : "Suspend"}
                  </button>
                )}
              </div>
            )}
          />
        </div>

        {error && <ErrorPopup message={error} onClose={() => setError("")} />}
        {successMessage && <SuccessToast message={successMessage} onClose={() => setSuccessMessage(null)} />}
      </div>

      {/* ---------- ACTION CONFIRM MODAL ---------- */}
      {confirmAction && (
        <ModalShell
          title={`Confirm ${confirmAction.type.charAt(0).toUpperCase() + confirmAction.type.slice(1)}`}
          subtitle="Please confirm you want to proceed."
          onClose={() => setConfirmAction(null)}
          danger={confirmAction.type === "suspend"}
        >
          <div className={cn(
            "rounded-2xl border p-4 text-sm text-slate-200",
            confirmAction.type === "suspend" ? "border-red-500/20 bg-red-500/5" : "border-blue-500/20 bg-blue-500/5"
          )}>
            <div className="flex items-center gap-3">
              {confirmAction.type === "suspend" ? (
                <AlertTriangle className="h-5 w-5 text-red-400" />
              ) : confirmAction.type === "resend" ? (
                <Send className="h-5 w-5 text-blue-400" />
              ) : (
                <Shield className="h-5 w-5 text-emerald-400" />
              )}
              <p>
                Are you sure you want to <strong>{confirmAction.type}</strong> user <strong>{confirmAction.user.userName}</strong>?
              </p>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={() => setConfirmAction(null)}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900/30 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-900/50 transition"
            >
              Cancel
            </button>

            <button
              onClick={() => {
                if (confirmAction.type === "resend") {
                  performResendVerification(confirmAction.user)
                } else {
                  performToggleSuspension(confirmAction.user)
                }
              }}
              className={cn(
                "inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition",
                confirmAction.type === "suspend"
                  ? "border-red-500/30 bg-red-500/10 text-slate-100 hover:bg-red-500/20"
                  : "border-blue-500/30 bg-blue-500/10 text-slate-100 hover:bg-blue-500/20"
              )}
            >
              Confirm
            </button>
          </div>
        </ModalShell>
      )}

      {/* ---------- ADD/EDIT MODAL ---------- */}
      {showModal && (
        <ModalShell
          title={editingUser ? "Edit User" : "Add User"}
          subtitle={editingUser ? "Update user details and roles." : "Create a new user for your organization."}
          onClose={() => {
            setShowModal(false)
            setEditingUser(null)
          }}
        >
          {/* Name */}
          <Field label="Name" hint={touched.userName && !nameValid ? "Name is required." : ""}>
            <input
              type="text"
              placeholder="Full name"
              value={formData.userName}
              onChange={(e) => setFormData({ ...formData, userName: e.target.value })}
              onBlur={() => setTouched({ ...touched, userName: true })}
              className={[
                "w-full rounded-xl bg-slate-950/30 border px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500",
                "outline-none focus:ring-2 focus:ring-blue-500/15 transition",
                getBorder(nameValid, "userName"),
              ].join(" ")}
            />
          </Field>

          {/* Email */}
          <Field
            label="Business Email"
            hint={
              touched.userEmail && !emailValid
                ? "Invalid email format."
                : ""
            }
          >
            <input
              type="email"
              placeholder="name@company.com"
              value={formData.userEmail}
              onChange={(e) => setFormData({ ...formData, userEmail: e.target.value })}
              onBlur={() => setTouched({ ...touched, userEmail: true })}
              className={[
                "w-full rounded-xl bg-slate-950/30 border px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500",
                "outline-none focus:ring-2 focus:ring-blue-500/15 transition",
                getBorder(emailValid, "userEmail"),
              ].join(" ")}
            />
          </Field>

          {/* Roles */}
          <div className="mt-4">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Roles
            </div>
            <div className="rounded-2xl border border-slate-800/80 bg-slate-950/20 p-3">
              <MultiSelectDropdown
                label=""
                options={ROLE_LIST.map((r) => ({ _id: r, name: r }))}
                selected={formData.userRole}
                onChange={(val) => setFormData({ ...formData, userRole: val })}
              />
            </div>
          </div>

          {/* Password */}
          <Field
            label={editingUser ? "New Password (optional)" : "Password"}
            hint={!editingUser && touched.userPassword && !passwordValid ? "Min 7 chars, 1 uppercase, 1 number, 1 symbol." : ""}
          >
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder={editingUser ? "Set a new password (optional)" : "Set a strong password"}
                value={formData.userPassword}
                onChange={(e) => setFormData({ ...formData, userPassword: e.target.value })}
                onBlur={() => setTouched({ ...touched, userPassword: true })}
                className={[
                  "w-full rounded-xl bg-slate-950/30 border px-3 py-2 pr-10 text-sm text-slate-100 placeholder:text-slate-500",
                  "outline-none focus:ring-2 focus:ring-blue-500/15 transition",
                  getBorder(editingUser ? true : passwordValid, "userPassword"),
                ].join(" ")}
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-100 transition"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </Field>

          {/* Actions */}
          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={() => {
                setShowModal(false)
                setEditingUser(null)
              }}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900/30 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-900/50 transition"
            >
              <X className="h-4 w-4" />
              Cancel
            </button>

            <button
              onClick={handleAddUser}
              disabled={isSubmitting || !nameValid || !emailValid || (!editingUser && !passwordValid)}
              className={[
                "inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold",
                "border-blue-500/30 bg-blue-500/10 text-slate-100 hover:bg-blue-500/18 hover:border-blue-400/40 transition",
                "disabled:opacity-50 disabled:cursor-not-allowed",
              ].join(" ")}
            >
              {isSubmitting && (
                <span className="h-4 w-4 border-2 border-white/60 border-t-transparent rounded-full animate-spin" />
              )}
              {isSubmitting ? (editingUser ? "Updating..." : "Adding...") : editingUser ? "Update User" : "Add User"}
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
            Are you sure you want to delete this user?
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
                  await apiDelete(`/users/${confirmDeleteId}`)
                  setConfirmDeleteId(null)
                  fetchUsers()
                } catch (error: any) {
                  setError(error.message)
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
