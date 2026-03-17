"use client"

import React, { useEffect, useMemo, useState } from "react"
import { apiDelete, apiGet, apiPost, apiPut } from "@/lib/api"
import {
    ShieldCheck,
    RefreshCw,
    Save,
    AlertTriangle,
    CheckCircle2,
    Info,
    Search,
    Trash2,
    Plus,
    Lock,
    Eye,
    EyeOff,
    Link2,
    KeyRound,
    Users,
    ChevronRight,
    Settings2,
    X,
    ExternalLink,
    Pencil,
} from "lucide-react"

type LdapSettings = {
    enabled?: boolean
    url?: string
    baseDN?: string
    adminDN?: string // We'll keep this as adminDN internally for state but rename in UI if needed, or rename fully
    serviceDN?: string
    servicePassword?: string
    caCert?: string
}

type SamlSettings = {
    enabled?: boolean
    ssoUrl?: string
    entityId?: string
    idpCert?: string
    acsUrl?: string
    logoutUrl?: string
}

type SsoMapping = {
    org?: string
    orgId?: string
    provider?: string
    externalGroupId?: string
    externalGroupName?: string
    role?: string // This stores the ROLE name
    isActive: boolean
    createdAt?: string
}

type InternalGroup = { _id: string; groupName: string }

type ExternalGroup = {
    provider: "LDAP" | "SAML"
    externalGroupId: string
    externalGroupName: string
}

function cx(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ")
}

function mappingKey(provider: string, externalGroupId: string) {
    return `${provider.toLowerCase()}::${String(externalGroupId || "").trim()}`
}

export default function AuthenticationSettingsPage() {
    const [orgId, setOrgId] = useState<string>("")
    const [orgName, setOrgName] = useState<string>("")

    const [selectedExternalMethod, setSelectedExternalMethod] = useState<"none" | "ldap" | "saml">("none")
    const [loading, setLoading] = useState<boolean>(true)
    const [saving, setSaving] = useState<boolean>(false)
    const [error, setError] = useState<string>("")
    const [notice, setNotice] = useState<string>("")

    const [ldap, setLdap] = useState<LdapSettings>({
        enabled: false,
        url: "",
        baseDN: "",
        serviceDN: "",
        servicePassword: "",
        caCert: "",
    })

    const [saml, setSaml] = useState<SamlSettings>({
        enabled: false,
        ssoUrl: "",
        entityId: "",
        idpCert: "",
        acsUrl: "",
        logoutUrl: "",
    })

    const [showOptionalLdap, setShowOptionalLdap] = useState(false)
    const [showOptionalSaml, setShowOptionalSaml] = useState(false)
    const [isEditingConfig, setIsEditingConfig] = useState(false)

    useEffect(() => {
        if (selectedExternalMethod === "saml" && !saml.acsUrl) {
            setSaml(prev => ({
                ...prev,
                acsUrl: `${window.location.origin.replace(":3000", ":5005")}/api/sso/callback/saml`
            }))
        }
    }, [selectedExternalMethod])

    const [snapshot, setSnapshot] = useState<{ ldap: any; saml: any } | null>(null)
    const [showPassword, setShowPassword] = useState(false)
    const [mappings, setMappings] = useState<SsoMapping[]>([])
    const [internalGroups, setInternalGroups] = useState<InternalGroup[]>([])
    const [externalGroups, setExternalGroups] = useState<ExternalGroup[]>([])
    const [newSamlGroupName, setNewSamlGroupName] = useState<string>("")
    const [rowSavingKey, setRowSavingKey] = useState<string>("")
    const [isInfoOpen, setIsInfoOpen] = useState(false)
    const [groupsLoading, setGroupsLoading] = useState(false)
    const [groupsError, setGroupsError] = useState(false)

    // New state for confirmation modal
    const [pendingMethod, setPendingMethod] = useState<"none" | "ldap" | "saml" | null>(null)

    useEffect(() => {
        async function init() {
            try {
                const res: any = await apiGet("/users/auth/me")
                if (res.success && res.user) {
                    const id = res.user.org?._id || res.user.orgId || res.user.org?.$oid
                    setOrgId(id)
                    setOrgName(res.user.org?.orgName || "")
                }
            } catch (err) {
                console.error("Failed to init auth settings:", err)
            }
        }
        init()
    }, [])

    async function loadData() {
        if (!orgId) return
        setLoading(true)
        setError("")
        try {
            // Use allSettled to prevent groups timeout from blocking auth settings
            const results = await Promise.allSettled([
                apiGet<any>(`/org/auth-settings`),
                apiGet<any>(`/sso/groups`),
            ])

            const authResult = results[0]
            if (authResult.status === "fulfilled") {
                const authData = authResult.value?.data ?? authResult.value ?? {}
                console.log("Auth settings data loaded:", authData)

                const ldapData = {
                    enabled: !!authData.ldap?.enabled,
                    url: authData.ldap?.url || "",
                    baseDN: authData.ldap?.baseDN || "",
                    serviceDN: authData.ldap?.serviceDN || "",
                    servicePassword: "", // Don't populate password from server
                    caCert: "", // Don't populate cert from server (comes as ********)
                }

                const samlData = {
                    enabled: !!authData.saml?.enabled,
                    ssoUrl: authData.saml?.ssoUrl || "",
                    entityId: authData.saml?.entityId || "",
                    idpCert: "", // Don't populate cert from server (comes as ********)
                    acsUrl: authData.saml?.acsUrl || "",
                    logoutUrl: authData.saml?.logoutUrl || "",
                }

                setLdap(ldapData)
                setSaml(samlData)
                setSnapshot({ ldap: authData.ldap, saml: authData.saml })

                // Determine active method from server state
                if (authData.authProviders?.saml && samlData.enabled) setSelectedExternalMethod("saml")
                else if (authData.authProviders?.ldap && ldapData.enabled) setSelectedExternalMethod("ldap")
                else setSelectedExternalMethod("none")
            } else {
                console.error("Auth settings load failed:", authResult.reason)
                setError("Failed to load authentication settings")
            }

            const groupsResult = results[1]
            if (groupsResult.status === "fulfilled") {
                const groupsRes = groupsResult.value
                setMappings(groupsRes.mappings || [])
                setInternalGroups(groupsRes.internalGroups || [])

                const ad = (groupsRes.adGroups || []).map((g: any) => ({
                    provider: "LDAP",
                    externalGroupId: g.dn || g.id,
                    externalGroupName: g.name || g.displayName,
                }))
                const sm = (groupsRes.samlGroups || []).map((g: any) => ({
                    provider: "SAML",
                    externalGroupId: g.id || g.groupId,
                    externalGroupName: g.name || g.displayName,
                }))
                setExternalGroups([...ad, ...sm])
                setGroupsError(false)
            } else {
                console.warn("Groups load failed (gracefully handled):", groupsResult.reason)
                setGroupsError(true)
            }
        } catch (e: any) {
            console.error("Critical error in loadData:", e)
            setError(e?.message || "An unexpected error occurred")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (orgId) loadData()
    }, [orgId])

    const confirmSwitch = async () => {
        if (!pendingMethod) return
        setLoading(true)
        try {
            const res: any = await apiPost("/sso/switch-method", { method: pendingMethod })
            if (res.success) {
                setNotice(`Successfully switched to ${pendingMethod.toUpperCase()}`)
                setSelectedExternalMethod(pendingMethod)
                await loadData()
            } else {
                setError(res.message || "Failed to switch method")
            }
        } catch (e: any) {
            setError(e.message || "Failed to switch method")
        } finally {
            setPendingMethod(null)
            setLoading(false)
        }
    }

    async function handleSave() {
        setSaving(true)
        setError("")
        setNotice("")

        try {
            if (selectedExternalMethod === "ldap") {
                if (!ldap.url?.trim()) throw new Error("LDAP URL is required")
                if (!ldap.baseDN?.trim()) throw new Error("Base DN is required")
                if (!ldap.serviceDN?.trim()) throw new Error("Service DN is required")
                if (ldap.url.toLowerCase().startsWith("ldaps://") && !ldap.caCert?.trim() && !snapshot?.ldap?.caCert) {
                    throw new Error("CA Certificate is required for LDAPS connections")
                }
                if (!ldap.servicePassword?.trim() && !snapshot?.ldap?.enabled) {
                    throw new Error("Service Password is required for first-time setup")
                }

                await apiPut("/org/ldap", {
                    enabled: true,
                    url: ldap.url,
                    baseDN: ldap.baseDN,
                    serviceDN: ldap.serviceDN,
                    servicePassword: ldap.servicePassword || undefined,
                    caCert: ldap.caCert || null,
                })
            } else if (selectedExternalMethod === "saml") {
                if (!saml.ssoUrl?.trim()) throw new Error("SSO URL is required")
                if (!saml.entityId?.trim()) throw new Error("Entity ID is required")
                if (!saml.acsUrl?.trim()) throw new Error("ACS URL is required")

                await apiPut("/org/saml", {
                    enabled: true,
                    ssoUrl: saml.ssoUrl,
                    entityId: saml.entityId,
                    idpCert: saml.idpCert || undefined,
                    acsUrl: saml.acsUrl,
                    logoutUrl: saml.logoutUrl || undefined
                })
            }
            setNotice("Settings updated successfully")
            setIsEditingConfig(false)
            loadData()
        } catch (e: any) {
            setError(e?.message || "Failed to save settings")
        } finally {
            setSaving(false)
        }
    }

    // Determine if config already exists (has been saved before)
    const hasExistingLdapConfig = !!(snapshot?.ldap?.url && snapshot?.ldap?.enabled)
    const hasExistingSamlConfig = !!(snapshot?.saml?.ssoUrl && snapshot?.saml?.enabled)
    const hasExistingConfig = selectedExternalMethod === "ldap" ? hasExistingLdapConfig : hasExistingSamlConfig

    function handleStartEditing() {
        // Reset sensitive fields so user doesn't accidentally submit ********
        if (selectedExternalMethod === "ldap") {
            setLdap(prev => ({ ...prev, servicePassword: "", caCert: "" }))
        } else if (selectedExternalMethod === "saml") {
            setSaml(prev => ({ ...prev, idpCert: "" }))
        }
        setIsEditingConfig(true)
    }

    async function handleMappingUpdate(g: ExternalGroup, internalId: string) {
        const key = mappingKey(g.provider, g.externalGroupId)
        setRowSavingKey(key)
        try {
            if (!internalId) {
                await apiDelete(`/sso/map/${g.provider}/${encodeURIComponent(g.externalGroupId)}`)
            } else {
                await apiPost("/sso/map", {
                    provider: g.provider,
                    externalGroupId: g.externalGroupId,
                    externalGroupName: g.externalGroupName,
                    internalGroup: internalId, // The controller still expects internalGroup in body for mapping
                })
            }
            const groupsRes = await apiGet<any>(`/sso/groups`)
            setMappings(groupsRes.mappings || [])
        } catch (e: any) {
            setError(e?.message || "Failed to update mapping")
        } finally {
            setRowSavingKey("")
        }
    }

    async function handleAddManualGroup() {
        if (!newSamlGroupName.trim()) return
        const groupName = newSamlGroupName.trim()
        if (externalGroups.some(g => g.provider === "SAML" && g.externalGroupId === groupName)) {
            setNotice("Group already exists in the list")
            return
        }
        const newGroup: ExternalGroup = {
            provider: "SAML",
            externalGroupId: groupName,
            externalGroupName: groupName
        }
        setExternalGroups(prev => [...prev, newGroup])
        setNewSamlGroupName("")
    }

    if (loading && !orgId) {
        return (
            <div className="flex h-[400px] items-center justify-center">
                <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
            </div>
        )
    }

    return (
        <div className="space-y-6 max-w-5xl mx-auto pb-12">
            {/* Confirmation Modal */}
            {pendingMethod && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex items-center gap-3 mb-4 text-amber-400">
                            <AlertTriangle className="h-6 w-6" />
                            <h3 className="text-xl font-bold text-slate-100">Confirm Switch</h3>
                        </div>
                        <p className="text-slate-400 text-sm leading-relaxed mb-8">
                            Are you sure you want to switch to <span className="text-slate-100 font-bold uppercase">{pendingMethod}</span>?
                            This will explicitly disable the current configuration for other external providers.
                        </p>
                        <div className="flex gap-4">
                            <button
                                onClick={() => setPendingMethod(null)}
                                className="flex-1 py-3 rounded-2xl bg-slate-800 text-slate-200 text-sm font-semibold hover:bg-slate-700 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmSwitch}
                                className="flex-1 py-3 rounded-2xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-500 shadow-lg shadow-blue-900/20 active:scale-95 transition-all"
                            >
                                Confirm Switch
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                    Settings <ChevronRight className="h-3 w-3" /> <span className="text-slate-200">Authentication</span>
                </div>
                <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-100">Authentication method</h1>
                <p className="mt-1 text-sm text-slate-400">Select how users should authenticate to access PromptProtect Console.</p>
            </div>

            {(error || notice) && (
                <div className={cx("rounded-2xl border p-4 flex items-start gap-3 animate-in fade-in slide-in-from-top-2", error ? "border-red-500/25 bg-red-500/5" : "border-emerald-500/25 bg-emerald-500/5")}>
                    {error ? <AlertTriangle className="h-5 w-5 text-red-400 shrink-0" /> : <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />}
                    <div className="text-sm text-slate-200 flex-1">{error || notice}</div>
                    <button onClick={() => { setError(""); setNotice("") }} className="text-slate-500 hover:text-slate-300 transition-colors">
                        <X size={16} />
                    </button>
                </div>
            )}

            <div className="grid grid-cols-1 gap-6">
                {/* Method Selection Card */}
                <div className="rounded-3xl border border-slate-800 bg-slate-900/40 backdrop-blur-sm p-8 space-y-8 shadow-xl">
                    <div className="space-y-4">
                        <div className="flex items-center gap-4">
                            <div className="w-24 text-sm font-medium text-slate-400">Internal</div>
                            <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-slate-950/40 border border-slate-800">
                                <div className="h-4 w-4 rounded border border-blue-500 flex items-center justify-center bg-blue-500/10">
                                    <CheckCircle2 className="h-3.5 w-3.5 text-blue-400" />
                                </div>
                                <span className="text-sm text-slate-200">Local Authentication (always on)</span>
                            </div>
                        </div>

                        <div className="flex items-start gap-4">
                            <div className="w-24 mt-2 text-sm font-medium text-slate-400">External</div>
                            <div className="flex-1 space-y-3">
                                {[
                                    { id: "none", label: "None", desc: "No external authentication" },
                                    { id: "ldap", label: "LDAP", desc: "Active Directory, OpenLDAP" },
                                    { id: "saml", label: "SAML", desc: "Okta, Azure AD, Auth0" }
                                ].map((m) => (
                                    <label key={m.id} className={cx("flex items-center gap-3 cursor-pointer group transition-all", selectedExternalMethod === m.id ? "text-slate-100" : "text-slate-400 hover:text-slate-200")}>
                                        <div className={cx("h-5 w-5 rounded-full border flex items-center justify-center transition-colors", selectedExternalMethod === m.id ? "border-blue-500 bg-blue-500/10" : "border-slate-700")}>
                                            {selectedExternalMethod === m.id && <div className="h-2.5 w-2.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />}
                                        </div>
                                        <input
                                            type="radio"
                                            name="authMethod"
                                            className="hidden"
                                            checked={selectedExternalMethod === m.id}
                                            onChange={() => {
                                                if (selectedExternalMethod !== m.id) {
                                                    setPendingMethod(m.id as any)
                                                }
                                            }}
                                        />
                                        <span className="text-sm font-semibold">{m.label}</span>
                                        <span className="text-xs opacity-60">— {m.desc}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>

                    {selectedExternalMethod !== "none" && (
                        <div className="pt-6 border-t border-slate-800">
                            <button
                                onClick={() => {
                                    const el = document.getElementById("config-section")
                                    el?.scrollIntoView({ behavior: "smooth" })
                                }}
                                className="text-blue-400 hover:text-blue-300 text-sm font-medium flex items-center gap-1.5 transition-colors group"
                            >
                                <Settings2 className="h-4 w-4" />
                                Configure PromptProtect to use {selectedExternalMethod.toUpperCase()}
                                <ChevronRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                            </button>
                        </div>
                    )}
                </div>

                {/* Configuration Section */}
                {selectedExternalMethod !== "none" && (
                    <div id="config-section" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="rounded-3xl border border-slate-800 bg-slate-950/40 backdrop-blur-sm overflow-hidden shadow-xl">
                            <div className="border-b border-slate-800 p-6 flex items-center justify-between bg-slate-900/20">
                                <div>
                                    <h3 className="text-lg font-semibold text-slate-100">{selectedExternalMethod === "ldap" ? "LDAP Configuration" : "SAML Configuration"}</h3>
                                    <p className="text-sm text-slate-400">
                                        {hasExistingConfig && !isEditingConfig
                                            ? `Your ${selectedExternalMethod.toUpperCase()} provider is configured and active.`
                                            : `Provide the required details to connect your ${selectedExternalMethod.toUpperCase()} provider.`
                                        }
                                    </p>
                                </div>
                                <div className="flex items-center gap-3">
                                    {hasExistingConfig && !isEditingConfig && (
                                        <button
                                            onClick={handleStartEditing}
                                            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl border border-slate-700 bg-slate-800/60 text-sm font-semibold text-slate-200 hover:bg-slate-700 hover:border-slate-600 transition-all active:scale-95"
                                        >
                                            <Pencil className="h-3.5 w-3.5" />
                                            Edit Configuration
                                        </button>
                                    )}
                                    <div className="px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.1)]">
                                        {hasExistingConfig ? "Active" : `${selectedExternalMethod.toUpperCase()} Mode`}
                                    </div>
                                </div>
                            </div>

                            {/* READ-ONLY SUMMARY VIEW */}
                            {hasExistingConfig && !isEditingConfig ? (
                                <div className="p-8">
                                    {selectedExternalMethod === "ldap" ? (
                                        <div className="space-y-5">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                                <ReadOnlyField label="LDAP URL" value={ldap.url} />
                                                <ReadOnlyField label="Base DN" value={ldap.baseDN} />
                                                <ReadOnlyField label="Service DN" value={ldap.serviceDN} />
                                                <ReadOnlyField label="Service Password" value="Configured" isSecret />
                                                <div className="md:col-span-2">
                                                    <ReadOnlyField label="CA Certificate" value={snapshot?.ldap?.caCert ? "Configured" : "None"} isSecret={!!snapshot?.ldap?.caCert} />
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-5">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                                <ReadOnlyField label="SSO URL" value={saml.ssoUrl} />
                                                <ReadOnlyField label="Entity ID" value={saml.entityId} />
                                                <ReadOnlyField label="ACS URL" value={saml.acsUrl} />
                                                <ReadOnlyField label="IdP Certificate" value="Configured" isSecret />
                                            </div>
                                            {saml.logoutUrl && (
                                                <div className="pt-4 border-t border-slate-800/50">
                                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Optional Settings</p>
                                                    <ReadOnlyField label="Logout URL" value={saml.logoutUrl} />
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                /* EDITABLE FORM VIEW */
                                <div className="p-8 space-y-8">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                                        {selectedExternalMethod === "ldap" ? (
                                            <>
                                                <Input label="LDAP URL" value={ldap.url || ""} onChange={(v) => setLdap({ ...ldap, url: v })} placeholder="ldaps://ldap.company.com:636" />
                                                <Input label="Base DN" value={ldap.baseDN || ""} onChange={(v) => setLdap({ ...ldap, baseDN: v })} placeholder="DC=company,DC=com" />
                                                <Input label="Service DN" value={ldap.serviceDN || ""} onChange={(v) => setLdap({ ...ldap, serviceDN: v })} placeholder="CN=admin,OU=Users,DC=company" />
                                                <div className="relative">
                                                    <Input label={hasExistingConfig ? "Service Password (leave blank to keep current)" : "Service Password"} type={showPassword ? "text" : "password"} value={ldap.servicePassword || ""} onChange={(v) => setLdap({ ...ldap, servicePassword: v })} placeholder="••••••••" />
                                                    <button onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-[38px] text-slate-500 hover:text-slate-300 transition-colors">
                                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                                    </button>
                                                </div>

                                                <div className="md:col-span-2">
                                                    <TextArea label={hasExistingConfig ? "CA Certificate (leave blank to keep current)" : "CA Certificate"} value={ldap.caCert || ""} onChange={(v) => setLdap({ ...ldap, caCert: v })} placeholder="-----BEGIN CERTIFICATE-----" />
                                                </div>

                                                <div className="md:col-span-2">
                                                    <button
                                                        onClick={() => setShowOptionalLdap(!showOptionalLdap)}
                                                        className="flex items-center gap-2 text-sm font-semibold text-slate-400 hover:text-slate-200 transition-colors"
                                                    >
                                                        <div className={cx("transition-transform", showOptionalLdap ? "rotate-90" : "")}>
                                                            <ChevronRight size={16} />
                                                        </div>
                                                        Optional Settings
                                                    </button>

                                                    {showOptionalLdap && (
                                                        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-top-2">
                                                            {/* Add any actual optional settings here if needed later */}
                                                            <p className="text-xs text-slate-500 italic">No additional optional settings available.</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <Input label="SSO URL" value={saml.ssoUrl || ""} onChange={(v) => setSaml({ ...saml, ssoUrl: v })} placeholder="https://okta.com/auth/..." />
                                                <Input label="Entity ID" value={saml.entityId || ""} onChange={(v) => setSaml({ ...saml, entityId: v })} placeholder="promptprotect-sp" />
                                                <Input label="ACS URL" value={saml.acsUrl || ""} onChange={(v) => setSaml({ ...saml, acsUrl: v })} placeholder="https://api.promptprotect.com/api/sso/callback/saml" />
                                                <TextArea label={hasExistingConfig ? "IdP Certificate (leave blank to keep current)" : "IdP Certificate (X.509)"} value={saml.idpCert || ""} onChange={(v) => setSaml({ ...saml, idpCert: v })} placeholder="-----BEGIN CERTIFICATE-----" />

                                                <div className="md:col-span-2">
                                                    <button
                                                        onClick={() => setShowOptionalSaml(!showOptionalSaml)}
                                                        className="flex items-center gap-2 text-sm font-semibold text-slate-400 hover:text-slate-200 transition-colors"
                                                    >
                                                        <div className={cx("transition-transform", showOptionalSaml ? "rotate-90" : "")}>
                                                            <ChevronRight size={16} />
                                                        </div>
                                                        Optional Settings
                                                    </button>

                                                    {showOptionalSaml && (
                                                        <div className="mt-4 animate-in fade-in slide-in-from-top-2">
                                                            <Input label="Logout URL" value={saml.logoutUrl || ""} onChange={(v) => setSaml({ ...saml, logoutUrl: v })} placeholder="https://okta.com/auth/logout" />
                                                        </div>
                                                    )}
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-800/50">
                                        {hasExistingConfig && (
                                            <button
                                                onClick={() => { setIsEditingConfig(false); loadData() }}
                                                className="flex items-center gap-2 rounded-2xl border border-slate-700 px-6 py-3 text-sm font-semibold text-slate-300 hover:bg-slate-800 transition-all active:scale-95"
                                            >
                                                Cancel
                                            </button>
                                        )}
                                        <button
                                            onClick={handleSave}
                                            disabled={saving}
                                            className="flex items-center gap-2 rounded-2xl bg-blue-600 px-8 py-3 text-sm font-semibold text-white hover:bg-blue-500 transition-all disabled:opacity-50 shadow-lg shadow-blue-900/20 active:scale-95"
                                        >
                                            {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                            Save Configuration
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Mappings Table */}
                        <div className="rounded-3xl border border-slate-800 bg-slate-950/40 backdrop-blur-sm overflow-hidden">
                            <div className="border-b border-slate-800 p-6 flex items-center justify-between bg-slate-900/20">
                                <div>
                                    <h3 className="text-lg font-semibold text-slate-100">{selectedExternalMethod.toUpperCase()} Group Mappings</h3>
                                    <p className="text-sm text-slate-400">Map your {selectedExternalMethod.toUpperCase()} groups to local roles.</p>
                                </div>
                                <button
                                    onClick={loadData}
                                    className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                                    title="Reload mappings"
                                >
                                    <RefreshCw className={cx("h-4 w-4", groupsLoading && "animate-spin")} />
                                </button>
                            </div>

                            <div className="p-8">
                                {groupsError ? (
                                    <div className="text-center py-12 space-y-4">
                                        <div className="bg-red-500/10 text-red-400 p-4 rounded-2xl border border-red-500/20 inline-block">
                                            <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
                                            <p className="text-sm font-medium">Failed to load group mappings (API Timeout)</p>
                                        </div>
                                        <div className="flex justify-center gap-3">
                                            <button onClick={loadData} className="px-4 py-2 rounded-xl border border-slate-800 hover:bg-slate-900 text-sm font-medium">Try Again</button>
                                            <button onClick={() => setGroupsError(false)} className="px-4 py-2 rounded-xl text-slate-400 hover:text-slate-200 text-sm font-medium">Dismiss</button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-10">
                                        {/* Mapped Groups Section */}
                                        <div>
                                            <div className="mb-6">
                                                <h3 className="text-lg font-semibold text-slate-100 italic">Mapped Groups</h3>
                                                <p className="text-sm text-slate-500">Groups that have active role assignments.</p>
                                            </div>

                                            <div className="overflow-x-auto">
                                                <table className="w-full text-left text-sm">
                                                    <thead>
                                                        <tr className="border-b border-slate-800 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                                                            <th className="pb-4 pr-4">External Group Name</th>
                                                            <th className="pb-4 pr-4">PromptProtect Role</th>
                                                            <th className="pb-4 w-24 text-center">Actions</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-800/50">
                                                        {(mappings || []).filter(m => m.provider?.toLowerCase() === selectedExternalMethod && m.isActive).map((m) => {
                                                            const isSaving = rowSavingKey === mappingKey(m.provider!, m.externalGroupId!)
                                                            return (
                                                                <tr key={m.externalGroupId} className="group hover:bg-slate-900/30 transition-colors">
                                                                    <td className="py-5 pr-4">
                                                                        <div className="font-semibold text-slate-200 flex items-center gap-2">
                                                                            <Users className="h-4 w-4 text-slate-500" />
                                                                            {m.externalGroupName}
                                                                        </div>
                                                                        <div className="text-[10px] text-slate-600 font-mono mt-1 max-w-[280px] truncate">{m.externalGroupId}</div>
                                                                    </td>
                                                                    <td className="py-5 pr-4">
                                                                        <div className="relative group/select">
                                                                            <select
                                                                                value={m.role || ""}
                                                                                onChange={(e) => handleMappingUpdate({ provider: m.provider as any, externalGroupId: m.externalGroupId!, externalGroupName: m.externalGroupName! }, e.target.value)}
                                                                                disabled={isSaving}
                                                                                className="w-full appearance-none rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-2 text-xs text-slate-200 outline-none focus:border-blue-500/50 hover:border-slate-700 transition-all cursor-pointer disabled:opacity-50"
                                                                            >
                                                                                <option value="" className="bg-slate-950 text-slate-500">None (No Access)</option>
                                                                                {["ADMIN", "USER_MANAGER", "POLICY_MANAGER", "GROUP_MANAGER", "DEFAULT"].map(role => (
                                                                                    <option key={role} value={role} className="bg-slate-950 text-slate-200">
                                                                                        {role}
                                                                                    </option>
                                                                                ))}
                                                                            </select>
                                                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-600 group-hover/select:text-slate-400 transition-colors">
                                                                                <ChevronRight className="h-3 w-3 rotate-90" />
                                                                            </div>
                                                                        </div>
                                                                    </td>
                                                                    <td className="py-5 text-center">
                                                                        <div className="flex items-center justify-center gap-2">
                                                                            {isSaving ? (
                                                                                <RefreshCw className="h-4 w-4 animate-spin text-blue-400" />
                                                                            ) : (
                                                                                <button
                                                                                    onClick={() => handleMappingUpdate({ provider: m.provider as any, externalGroupId: m.externalGroupId!, externalGroupName: m.externalGroupName! }, "")}
                                                                                    className="p-2 rounded-lg border border-red-500/20 bg-red-500/5 text-red-400 hover:bg-red-500/10 transition-colors shadow-sm active:scale-95"
                                                                                    title="Remove Mapping"
                                                                                >
                                                                                    <Trash2 className="h-4 w-4" />
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            )
                                                        })}
                                                        {(mappings || []).filter(m => m.provider?.toLowerCase() === selectedExternalMethod && m.isActive).length === 0 && (
                                                            <tr>
                                                                <td colSpan={3} className="py-12 text-center text-slate-500 italic">
                                                                    No mappings active. Set roles for groups below.
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>

                                        {/* Available Groups Section */}
                                        <div>
                                            <div className="mb-6 flex justify-between items-end">
                                                <div>
                                                    <h3 className="text-lg font-semibold text-slate-100 italic">Available Groups</h3>
                                                    <p className="text-sm text-slate-500">Unmapped groups discovered from {selectedExternalMethod === "saml" ? "manual entry" : "your directory"}.</p>
                                                </div>
                                                {selectedExternalMethod === "saml" && (
                                                    <div className="flex gap-3 items-end">
                                                        <div className="w-[240px]">
                                                            <Input
                                                                label="Add Manual SAML Group"
                                                                value={newSamlGroupName}
                                                                onChange={setNewSamlGroupName}
                                                                placeholder="e.g. Administrators"
                                                            />
                                                        </div>
                                                        <button
                                                            onClick={handleAddManualGroup}
                                                            disabled={!newSamlGroupName.trim()}
                                                            className="flex h-[46px] items-center gap-2 rounded-xl bg-slate-800 px-6 text-sm font-semibold text-slate-200 hover:bg-slate-700 disabled:opacity-50 transition-all active:scale-95"
                                                        >
                                                            <Plus className="h-4 w-4" />
                                                            Add
                                                        </button>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="overflow-x-auto">
                                                <table className="w-full text-left text-sm">
                                                    <thead>
                                                        <tr className="border-b border-slate-800 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                                                            <th className="pb-4 pr-4">External Group Name</th>
                                                            <th className="pb-4 pr-4">Assign Role</th>
                                                            <th className="pb-4 w-12 text-center">Status</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-800/50">
                                                        {externalGroups
                                                            .filter(g => g.provider.toLowerCase() === selectedExternalMethod)
                                                            .filter(g => !mappings.some(m => m.externalGroupId === g.externalGroupId && m.isActive))
                                                            .map((g) => {
                                                                return (
                                                                    <tr key={g.externalGroupId} className="group hover:bg-slate-900/30 transition-colors">
                                                                        <td className="py-5 pr-4">
                                                                            <div className="font-semibold text-slate-200 flex items-center gap-2">
                                                                                <Users className="h-4 w-4 text-slate-500" />
                                                                                {g.externalGroupName}
                                                                            </div>
                                                                            <div className="text-[10px] text-slate-600 font-mono mt-1 max-w-[280px] truncate">{g.externalGroupId}</div>
                                                                        </td>
                                                                        <td className="py-5 pr-4">
                                                                            <div className="relative group/select">
                                                                                <select
                                                                                    value=""
                                                                                    onChange={(e) => handleMappingUpdate(g, e.target.value)}
                                                                                    disabled={rowSavingKey === mappingKey(g.provider, g.externalGroupId)}
                                                                                    className="w-full appearance-none rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-2 text-xs text-slate-200 outline-none focus:border-blue-500/50 hover:border-slate-700 transition-all cursor-pointer disabled:opacity-50"
                                                                                >
                                                                                    <option value="" className="bg-slate-950 text-slate-500 text-center">--- Select Role to Map ---</option>
                                                                                    {["ADMIN", "USER_MANAGER", "POLICY_MANAGER", "GROUP_MANAGER", "DEFAULT"].map(role => (
                                                                                        <option key={role} value={role} className="bg-slate-950 text-slate-200">
                                                                                            {role}
                                                                                        </option>
                                                                                    ))}
                                                                                </select>
                                                                                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-600 group-hover/select:text-slate-400 transition-colors">
                                                                                    <ChevronRight className="h-3 w-3 rotate-90" />
                                                                                </div>
                                                                            </div>
                                                                        </td>
                                                                        <td className="py-5 text-center">
                                                                            {rowSavingKey === mappingKey(g.provider, g.externalGroupId) ? (
                                                                                <RefreshCw className="h-4 w-4 animate-spin text-blue-400 mx-auto" />
                                                                            ) : (
                                                                                <div className="h-6 w-6 rounded-full bg-slate-800/20 border border-slate-800/50 flex items-center justify-center mx-auto" title="Not Mapped">
                                                                                    <X className="h-3 w-3 text-slate-600" />
                                                                                </div>
                                                                            )}
                                                                        </td>
                                                                    </tr>
                                                                )
                                                            })}
                                                        {externalGroups.filter(g => g.provider.toLowerCase() === selectedExternalMethod).filter(g => !mappings.some(m => m.externalGroupId === g.externalGroupId && m.isActive)).length === 0 && (
                                                            <tr>
                                                                <td colSpan={3} className="py-12 text-center text-slate-500 italic">
                                                                    No additional groups found.
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Help Link Card */}
            <div className="rounded-3xl border border-slate-800/40 bg-slate-950/20 p-6 flex items-center justify-between group cursor-help hover:bg-slate-900/20 transition-colors" onClick={() => setIsInfoOpen(true)}>
                <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
                        <Info className="h-5 w-5" />
                    </div>
                    <div>
                        <h4 className="text-sm font-semibold text-slate-200">Need help configuring?</h4>
                        <p className="text-xs text-slate-500">Read our guides for Okta, Azure AD, and Active Directory.</p>
                    </div>
                </div>
                <ExternalLink className="h-4 w-4 text-slate-600 group-hover:text-blue-400 transition-colors" />
            </div>

            {/* Quick Info Drawer */}
            <div className={`fixed top-0 right-0 h-full w-[400px] bg-slate-950/80 backdrop-blur-2xl border-l border-white/5 shadow-2xl transition-transform duration-500 ease-in-out z-50 ${isInfoOpen ? "translate-x-0" : "translate-x-full"}`}>
                <div className="h-full flex flex-col p-8 pt-24 overflow-y-auto">
                    <div className="flex items-center justify-between mb-8">
                        <h4 className="flex items-center gap-2 text-xl font-bold text-slate-100">
                            Access Controls
                        </h4>
                        <button onClick={() => setIsInfoOpen(false)} className="rounded-2xl border border-white/10 p-2.5 hover:bg-white/5 transition-colors">
                            <X className="h-5 w-5 text-slate-400" />
                        </button>
                    </div>

                    <div className="space-y-10 text-sm leading-relaxed text-slate-400">
                        <div className="space-y-4">
                            <p className="font-bold text-slate-100 text-lg">SAML 2.0</p>
                            <p>To configure SAML SSO, create a new application in your IdP and use these PromptProtect values:</p>
                            <div className="bg-slate-900/60 rounded-2xl p-5 border border-slate-800 font-mono text-xs space-y-4 shadow-inner">
                                <div>
                                    <div className="text-slate-500 uppercase tracking-widest text-[9px] mb-1 font-bold">ACS URL</div>
                                    <div className="text-blue-400 break-all select-all font-semibold">https://api.pp.dataelicit.com/api/auth/saml/callback</div>
                                </div>
                                <div>
                                    <div className="text-slate-500 uppercase tracking-widest text-[9px] mb-1 font-bold">Entity ID</div>
                                    <div className="text-blue-400 break-all select-all font-semibold">promptprotect-sp</div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <p className="font-bold text-slate-100 text-lg">LDAP / AD</p>
                            <ul className="space-y-3 list-none pl-0">
                                <li className="flex gap-2"><div className="h-1.5 w-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" /> <span className="text-slate-300 font-medium">LDAP URL:</span> ldaps://... (use 636 for TLS)</li>
                                <li className="flex gap-2"><div className="h-1.5 w-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" /> <span className="text-slate-300 font-medium">Service DN:</span> Bind account with read access</li>
                            </ul>
                        </div>

                        <div className="p-6 rounded-2xl bg-amber-500/5 border border-amber-500/10">
                            <p className="text-amber-400 font-bold mb-2 flex items-center gap-2 uppercase tracking-widest text-[10px]"><AlertTriangle className="h-4 w-4" /> Important</p>
                            <p className="text-amber-200/60 text-xs">Switching methods will immediately disconnect the active provider configuration. Ensure you have local admin credentials as a fallback.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
    return (
        <div className="flex items-center justify-between p-5 rounded-2xl border border-slate-800 bg-slate-900/20 hover:bg-slate-900/30 transition-colors">
            <span className="text-sm font-semibold text-slate-200">{label}</span>
            <button
                onClick={() => onChange(!checked)}
                className={cx("w-11 h-6 rounded-full relative transition-all duration-300", checked ? "bg-blue-600" : "bg-slate-700")}
            >
                <div className={cx("absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-300 shadow-md", checked ? "right-1" : "right-6")} />
            </button>
        </div>
    )
}

function Input({ label, value, onChange, placeholder, type = "text" }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
    return (
        <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">{label}</label>
            <input
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="w-full rounded-2xl border border-slate-800 bg-slate-950/60 px-5 py-3 text-sm text-slate-100 placeholder:text-slate-700 outline-none focus:border-blue-500/40 focus:bg-slate-950 transition-all shadow-sm"
            />
        </div>
    )
}

function TextArea({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
    return (
        <div className="space-y-2 md:col-span-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">{label}</label>
            <textarea
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                rows={4}
                className="w-full rounded-2xl border border-slate-800 bg-slate-950/60 px-5 py-3 text-xs text-slate-100 font-mono placeholder:text-slate-700 outline-none focus:border-blue-500/40 focus:bg-slate-950 transition-all resize-none shadow-sm"
            />
        </div>
    )
}

function ReadOnlyField({ label, value, isSecret }: { label: string; value?: string; isSecret?: boolean }) {
    return (
        <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">{label}</label>
            <div className="flex items-center gap-3 w-full rounded-2xl border border-slate-800/60 bg-slate-900/30 px-5 py-3 text-sm text-slate-200 min-h-[46px]">
                {isSecret ? (
                    <>
                        <Lock className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                        <span className="text-emerald-400 font-medium text-xs">{value || "Configured"}</span>
                    </>
                ) : (
                    <span className="truncate">{value || "—"}</span>
                )}
            </div>
        </div>
    )
}
