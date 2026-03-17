"use client"

import React, { useEffect, useState } from "react"
import {
    Settings,
    Plus,
    Edit2,
    Trash2,
    Save,
    X,
    ChevronDown,
    ChevronRight,
    Shield,
    ShieldCheck,
    ShieldX,
    KeyRound,
    Server,
    Coins,
    Loader2,
    AlertCircle,
    CheckCircle2,
} from "lucide-react"

import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api"

// Category icons mapping
const CATEGORY_ICONS: Record<string, any> = {
    PII: Shield,
    PHI: ShieldCheck,
    PCI: ShieldX,
    SECRETS: KeyRound,
    INFRASTRUCTURE: Server,
    CRYPTOCURRENCY: Coins,
}

// Category colors
const CATEGORY_COLORS: Record<string, string> = {
    PII: "blue",
    PHI: "green",
    PCI: "red",
    SECRETS: "purple",
    INFRASTRUCTURE: "orange",
    CRYPTOCURRENCY: "yellow",
}

interface Rule {
    name: string
    enabled: boolean
}

interface RuleConfiguration {
    _id: string
    org: string
    configName: string
    category: string
    description: string
    rules: Rule[]
    createdBy?: string
    updatedBy?: string
    createdAt: string
    updatedAt: string
}

interface RuleCatalog {
    _id: string
    category: string
    displayName: string
    description: string
    rules: string[]
}

export default function RuleConfigurationsPage() {
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState("")
    const [success, setSuccess] = useState("")

    const [catalog, setCatalog] = useState<RuleCatalog[]>([])
    const [configurations, setConfigurations] = useState<RuleConfiguration[]>([])

    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
    const [showModal, setShowModal] = useState(false)
    const [editingConfig, setEditingConfig] = useState<RuleConfiguration | null>(null)

    // Modal form state
    const [formConfigName, setFormConfigName] = useState("")
    const [formCategory, setFormCategory] = useState("")
    const [formDescription, setFormDescription] = useState("")
    const [formRules, setFormRules] = useState<Rule[]>([])

    const [apiKey, setApiKey] = useState<string | null>(null)
    const [userEmail, setUserEmail] = useState<string | null>(null)

    useEffect(() => {
        fetchData()
    }, [])

    async function fetchData() {
        setLoading(true)
        setError("")
        try {
            const res: any = await apiGet("/users/auth/me")
            if (res.success && res.user) {
                setApiKey(res.user.orgKey || res.user.org?.orgKey)
                setUserEmail(res.user.userEmail)
            }
            await Promise.all([fetchCatalog(), fetchConfigurations()])
        } catch (err: any) {
            setError(err.message || "Failed to load data")
        } finally {
            setLoading(false)
        }
    }

    async function fetchCatalog() {
        try {
            const res = await apiGet<{ data: RuleCatalog[] }>(`/rules/catalog`)
            setCatalog(res.data || [])
        } catch (err) {
            console.error("Failed to fetch catalog:", err)
        }
    }

    async function fetchConfigurations() {
        try {
            const res = await apiGet<{ data: RuleConfiguration[] }>(`/rule-configurations`)
            setConfigurations(res.data || [])
        } catch (err) {
            console.error("Failed to fetch configurations:", err)
        }
    }

    function openCreateModal(category: string) {
        const catalogItem = catalog.find((c) => c.category === category)
        if (!catalogItem) return

        setEditingConfig(null)
        setFormConfigName("")
        setFormCategory(category)
        setFormDescription("")
        setFormRules(catalogItem.rules.map((name) => ({ name, enabled: true })))
        setShowModal(true)
    }

    function openEditModal(config: RuleConfiguration) {
        setEditingConfig(config)
        setFormConfigName(config.configName)
        setFormCategory(config.category)
        setFormDescription(config.description)
        setFormRules([...config.rules])
        setShowModal(true)
    }

    function closeModal() {
        setShowModal(false)
        setEditingConfig(null)
        setFormConfigName("")
        setFormCategory("")
        setFormDescription("")
        setFormRules([])
    }

    async function handleSave() {
        if (!formConfigName.trim()) {
            setError("Configuration name is required")
            return
        }

        setSaving(true)
        setError("")
        setSuccess("")

        try {
            const body = {
                configName: formConfigName.trim(),
                category: formCategory,
                description: formDescription.trim(),
                rules: formRules,
                createdBy: userEmail,
                updatedBy: userEmail,
            }

            if (editingConfig) {
                await apiPut(`/rule-configurations/${editingConfig._id}`, body)
            } else {
                await apiPost("/rule-configurations", body)
            }


            setSuccess(editingConfig ? "Configuration updated successfully" : "Configuration created successfully")
            closeModal()
            await fetchConfigurations()

            setTimeout(() => setSuccess(""), 3000)
        } catch (err: any) {
            setError(err.message || "Failed to save configuration")
        } finally {
            setSaving(false)
        }
    }

    async function handleDelete(config: RuleConfiguration) {
        if (!confirm(`Are you sure you want to delete "${config.configName}"?`)) return

        setSaving(true)
        setError("")
        setSuccess("")

        try {
            await apiDelete(`/rule-configurations/${config._id}`)


            setSuccess("Configuration deleted successfully")
            await fetchConfigurations()

            setTimeout(() => setSuccess(""), 3000)
        } catch (err: any) {
            setError(err.message || "Failed to delete configuration")
        } finally {
            setSaving(false)
        }
    }

    function toggleRule(ruleName: string) {
        setFormRules((prev) =>
            prev.map((r) => (r.name === ruleName ? { ...r, enabled: !r.enabled } : r))
        )
    }

    function toggleAllRules(enabled: boolean) {
        setFormRules((prev) => prev.map((r) => ({ ...r, enabled })))
    }

    function toggleCategory(category: string) {
        setExpandedCategories((prev) => {
            const next = new Set(prev)
            if (next.has(category)) {
                next.delete(category)
            } else {
                next.add(category)
            }
            return next
        })
    }

    // Group configurations by category
    const configsByCategory = configurations.reduce((acc, config) => {
        if (!acc[config.category]) acc[config.category] = []
        acc[config.category].push(config)
        return acc
    }, {} as Record<string, RuleConfiguration[]>)

    if (loading) {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-transparent text-slate-100">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Rule Configurations</h1>
                        <p className="mt-1 text-sm text-slate-400">
                            Create and manage multiple rule configurations per category
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={fetchData}
                            disabled={loading}
                            className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-2 text-sm hover:bg-slate-900/60"
                        >
                            <Settings className="h-4 w-4" />
                            Refresh
                        </button>
                    </div>
                </div>
            </div>

            {/* Notifications */}
            {error && (
                <div className="mb-6 flex items-center gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-4">
                    <AlertCircle className="h-5 w-5 text-red-400" />
                    <span className="text-sm text-red-200">{error}</span>
                    <button onClick={() => setError("")} className="ml-auto">
                        <X className="h-4 w-4" />
                    </button>
                </div>
            )}

            {success && (
                <div className="mb-6 flex items-center gap-3 rounded-2xl border border-green-500/30 bg-green-500/10 p-4">
                    <CheckCircle2 className="h-5 w-5 text-green-400" />
                    <span className="text-sm text-green-200">{success}</span>
                    <button onClick={() => setSuccess("")} className="ml-auto">
                        <X className="h-4 w-4" />
                    </button>
                </div>
            )}

            {/* Category Sections */}
            <div className="space-y-4">
                {catalog.map((catalogItem) => {
                    const Icon = CATEGORY_ICONS[catalogItem.category] || Shield
                    const color = CATEGORY_COLORS[catalogItem.category] || "blue"
                    const isExpanded = expandedCategories.has(catalogItem.category)
                    const configs = configsByCategory[catalogItem.category] || []

                    return (
                        <div
                            key={catalogItem.category}
                            className="rounded-2xl border border-slate-800/70 bg-slate-900/20 overflow-hidden"
                        >
                            {/* Category Header */}
                            <div className="flex items-center justify-between p-4 border-b border-slate-800/50">
                                <button
                                    onClick={() => toggleCategory(catalogItem.category)}
                                    className="flex items-center gap-3 flex-1"
                                >
                                    {isExpanded ? (
                                        <ChevronDown className="h-5 w-5 text-slate-400" />
                                    ) : (
                                        <ChevronRight className="h-5 w-5 text-slate-400" />
                                    )}
                                    <Icon className={`h-5 w-5 text-${color}-400`} />
                                    <div className="text-left">
                                        <div className="font-semibold">{catalogItem.displayName}</div>
                                        <div className="text-xs text-slate-400">
                                            {configs.length} configuration{configs.length !== 1 ? "s" : ""} • {catalogItem.rules.length} rules available
                                        </div>
                                    </div>
                                </button>
                                <button
                                    onClick={() => openCreateModal(catalogItem.category)}
                                    className="flex items-center gap-2 rounded-xl border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-sm text-blue-200 hover:bg-blue-500/20"
                                >
                                    <Plus className="h-4 w-4" />
                                    New Config
                                </button>
                            </div>

                            {/* Configurations List */}
                            {isExpanded && (
                                <div className="p-4 space-y-3">
                                    {configs.length === 0 ? (
                                        <div className="text-center py-8 text-slate-400 text-sm">
                                            No configurations yet. Click "New Config" to create one.
                                        </div>
                                    ) : (
                                        configs.map((config) => (
                                            <ConfigCard
                                                key={config._id}
                                                config={config}
                                                onEdit={() => openEditModal(config)}
                                                onDelete={() => handleDelete(config)}
                                            />
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>

            {/* Create/Edit Modal */}
            {showModal && (
                <Modal
                    title={editingConfig ? "Edit Configuration" : "Create Configuration"}
                    onClose={closeModal}
                >
                    <div className="space-y-4">
                        {/* Config Name */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Configuration Name *
                            </label>
                            <input
                                type="text"
                                value={formConfigName}
                                onChange={(e) => setFormConfigName(e.target.value)}
                                placeholder="e.g., PII - Marketing Safe"
                                className="w-full rounded-xl border border-slate-700 bg-slate-900/50 px-4 py-2 text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                            />
                        </div>

                        {/* Category (read-only when editing) */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Category
                            </label>
                            <input
                                type="text"
                                value={formCategory}
                                disabled
                                className="w-full rounded-xl border border-slate-700 bg-slate-900/30 px-4 py-2 text-slate-400 cursor-not-allowed"
                            />
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Description
                            </label>
                            <textarea
                                value={formDescription}
                                onChange={(e) => setFormDescription(e.target.value)}
                                placeholder="Describe what this configuration does..."
                                rows={2}
                                className="w-full rounded-xl border border-slate-700 bg-slate-900/50 px-4 py-2 text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none resize-none"
                            />
                        </div>

                        {/* Rules */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="block text-sm font-medium text-slate-300">
                                    Rules ({formRules.filter((r) => r.enabled).length}/{formRules.length} enabled)
                                </label>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => toggleAllRules(true)}
                                        className="text-xs text-blue-400 hover:text-blue-300"
                                    >
                                        Enable All
                                    </button>
                                    <span className="text-slate-600">|</span>
                                    <button
                                        onClick={() => toggleAllRules(false)}
                                        className="text-xs text-slate-400 hover:text-slate-300"
                                    >
                                        Disable All
                                    </button>
                                </div>
                            </div>
                            <div className="max-h-64 overflow-y-auto rounded-xl border border-slate-700 bg-slate-900/30 p-3 space-y-2">
                                {formRules.map((rule) => (
                                    <label
                                        key={rule.name}
                                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-800/50 cursor-pointer"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={rule.enabled}
                                            onChange={() => toggleRule(rule.name)}
                                            className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-2 focus:ring-blue-500"
                                        />
                                        <span className={rule.enabled ? "text-slate-200" : "text-slate-500"}>
                                            {rule.name}
                                        </span>
                                        {rule.enabled && (
                                            <span className="ml-auto text-xs text-green-400">✓ Enabled</span>
                                        )}
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3 pt-4">
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-blue-500/15 border border-blue-500/30 px-4 py-2 text-blue-200 hover:bg-blue-500/25 disabled:opacity-50"
                            >
                                {saving ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <Save className="h-4 w-4" />
                                        {editingConfig ? "Update" : "Create"}
                                    </>
                                )}
                            </button>
                            <button
                                onClick={closeModal}
                                disabled={saving}
                                className="flex-1 rounded-xl border border-slate-700 bg-slate-900/50 px-4 py-2 text-slate-300 hover:bg-slate-800/50 disabled:opacity-50"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    )
}

function ConfigCard({
    config,
    onEdit,
    onDelete,
}: {
    config: RuleConfiguration
    onEdit: () => void
    onDelete: () => void
}) {
    const enabledCount = config.rules.filter((r) => r.enabled).length
    const totalCount = config.rules.length

    return (
        <div className="rounded-xl border border-slate-800/60 bg-slate-950/40 p-4">
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <h3 className="font-semibold text-slate-100">{config.configName}</h3>
                    {config.description && (
                        <p className="mt-1 text-sm text-slate-400">{config.description}</p>
                    )}
                    <div className="mt-2 flex items-center gap-4 text-xs text-slate-500">
                        <span>
                            {enabledCount}/{totalCount} rules enabled
                        </span>
                        {config.updatedBy && <span>Updated by {config.updatedBy}</span>}
                    </div>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={onEdit}
                        className="rounded-lg border border-slate-700 bg-slate-900/40 p-2 hover:bg-slate-800/60"
                        title="Edit"
                    >
                        <Edit2 className="h-4 w-4 text-blue-400" />
                    </button>
                    <button
                        onClick={onDelete}
                        className="rounded-lg border border-red-500/30 bg-red-500/10 p-2 hover:bg-red-500/20"
                        title="Delete"
                    >
                        <Trash2 className="h-4 w-4 text-red-400" />
                    </button>
                </div>
            </div>

            {/* Rules Preview */}
            <div className="mt-3 flex flex-wrap gap-2">
                {config.rules.slice(0, 5).map((rule) => (
                    <span
                        key={rule.name}
                        className={`text-xs px-2 py-1 rounded-lg ${rule.enabled
                            ? "bg-green-500/10 text-green-300 border border-green-500/30"
                            : "bg-slate-800/50 text-slate-500 border border-slate-700"
                            }`}
                    >
                        {rule.name}
                    </span>
                ))}
                {config.rules.length > 5 && (
                    <span className="text-xs px-2 py-1 rounded-lg bg-slate-800/50 text-slate-400 border border-slate-700">
                        +{config.rules.length - 5} more
                    </span>
                )}
            </div>
        </div>
    )
}

function Modal({
    title,
    onClose,
    children,
}: {
    title: string
    onClose: () => void
    children: React.ReactNode
}) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-800 bg-slate-950 p-6">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold">{title}</h2>
                    <button
                        onClick={onClose}
                        className="rounded-lg p-2 hover:bg-slate-800/50"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>
                {children}
            </div>
        </div>
    )
}
