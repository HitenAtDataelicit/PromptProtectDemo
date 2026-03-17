"use client"

import React, { useEffect, useState } from "react"
import { apiGet, apiPost, apiPut } from "@/lib/api"
import {
    RefreshCw,
    Save,
    AlertTriangle,
    CheckCircle2,
    Database,
    ExternalLink,
    Shield,
    Activity,
    X,
    ChevronRight,
    Settings2,
    Lock,
    Eye,
    EyeOff,
} from "lucide-react"


type ForwardingSettingsResponse = {
    splunk?: SplunkSettings
}

type SplunkSettings = {
    enabled?: boolean
    hecUrl?: string
    hecToken?: string
    sourcetype?: string
    index?: string
    allowInsecure?: boolean
}

function cx(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ")
}

function trimOrUndefined(v: any) {
    const s = String(v ?? "").trim()
    return s ? s : undefined
}

export default function DataForwardingPage() {
    const [orgId, setOrgId] = useState<string>("")
    const [orgName, setOrgName] = useState<string>("")

    const [selectedForwardingMethod, setSelectedForwardingMethod] = useState<"none" | "splunk">("none")
    const [loading, setLoading] = useState<boolean>(true)
    const [saving, setSaving] = useState<boolean>(false)
    const [error, setError] = useState<string>("")
    const [notice, setNotice] = useState<string>("")

    const [splunk, setSplunk] = useState<SplunkSettings>({
        enabled: false,
        hecUrl: "",
        hecToken: "",
        sourcetype: "promptprotect",
        index: "main",
        allowInsecure: false,
    })

    const [showToken, setShowToken] = useState(false)
    const [isInfoOpen, setIsInfoOpen] = useState(false)
    const [showOptionalSplunk, setShowOptionalSplunk] = useState(false)
    const [pendingMethod, setPendingMethod] = useState<"none" | "splunk" | null>(null)
    const [snapshot, setSnapshot] = useState<{ splunk: any } | null>(null)

    useEffect(() => {
        async function init() {
            try {
                const res: any = await apiGet("/users/auth/me")
                if (res.success && res.user) {
                    const id = res.user.org?._id || res.user.orgId
                    setOrgId(id)
                    setOrgName(res.user.org?.orgName || "")
                }
            } catch (err) {
                console.error("Failed to init forwarding settings:", err)
            }
        }
        init()
    }, [])

    async function loadData() {
        if (!orgId) return
        setLoading(true)
        setError("")
        try {
            const res = await apiGet<any>(`/org/auth-settings`)
            const authData: ForwardingSettingsResponse = res?.data ?? res ?? {}

            const splunkData = {
                enabled: !!authData.splunk?.enabled,
                hecUrl: authData.splunk?.hecUrl || "",
                hecToken: "", // Never display back
                sourcetype: authData.splunk?.sourcetype || "promptprotect",
                index: authData.splunk?.index || "main",
                allowInsecure: !!authData.splunk?.allowInsecure,
            }

            setSplunk(splunkData)
            setSnapshot({ splunk: authData.splunk })

            if (splunkData.enabled) setSelectedForwardingMethod("splunk")
            else setSelectedForwardingMethod("none")

        } catch (e: any) {
            setError(e?.message || "Failed to load forwarding settings")
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
            const res: any = await apiPost("/org/switch-forwarding-method", { method: pendingMethod })
            if (res.success) {
                setNotice(`Successfully switched to ${pendingMethod.toUpperCase()}`)
                setSelectedForwardingMethod(pendingMethod)
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
            if (selectedForwardingMethod === "splunk") {
                if (!splunk.hecUrl?.trim()) throw new Error("Splunk HEC URL is required")
                if (!splunk.hecToken?.trim() && !snapshot?.splunk?.hecToken) {
                    throw new Error("HEC Token is required for first-time setup")
                }

                await apiPut("/org/splunk", {
                    enabled: true,
                    hecUrl: splunk.hecUrl,
                    hecToken: splunk.hecToken || undefined,
                    sourcetype: splunk.sourcetype,
                    index: splunk.index,
                    allowInsecure: !!splunk.allowInsecure
                })
            }
            setNotice("Forwarding settings updated successfully")
            loadData()
        } catch (e: any) {
            setError(e?.message || "Failed to save settings")
        } finally {
            setSaving(false)
        }
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
                            Are you sure you want to switch to <span className="text-slate-100 font-bold uppercase">{pendingMethod}</span> forwarding?
                            This will explicitly disable other active forwarding configurations.
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
                    Settings <ChevronRight className="h-3 w-3" /> <span className="text-slate-200">Data Forwarding</span>
                </div>
                <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-100">Data Forwarding</h1>
                <p className="mt-1 text-sm text-slate-400">Select how audit logs and detection events should be forwarded.</p>
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
                        <div className="flex items-start gap-4">
                            <div className="w-24 mt-2 text-sm font-medium text-slate-400">Method</div>
                            <div className="flex-1 space-y-3">
                                {[
                                    { id: "none", label: "None", desc: "Keep data local" },
                                    { id: "splunk", label: "Splunk HEC", desc: "Stream to Splunk index" }
                                ].map((m) => (
                                    <label key={m.id} className={cx("flex items-center gap-3 cursor-pointer group transition-all", selectedForwardingMethod === m.id ? "text-slate-100" : "text-slate-400 hover:text-slate-200")}>
                                        <div className={cx("h-5 w-5 rounded-full border flex items-center justify-center transition-colors", selectedForwardingMethod === m.id ? "border-blue-500 bg-blue-500/10" : "border-slate-700")}>
                                            {selectedForwardingMethod === m.id && <div className="h-2.5 w-2.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />}
                                        </div>
                                        <input
                                            type="radio"
                                            name="forwardingMethod"
                                            className="hidden"
                                            checked={selectedForwardingMethod === m.id}
                                            onChange={() => {
                                                if (selectedForwardingMethod !== m.id) {
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

                    {selectedForwardingMethod !== "none" && (
                        <div className="pt-6 border-t border-slate-800">
                            <button
                                onClick={() => {
                                    const el = document.getElementById("config-section")
                                    el?.scrollIntoView({ behavior: "smooth" })
                                }}
                                className="text-blue-400 hover:text-blue-300 text-sm font-medium flex items-center gap-1.5 transition-colors group"
                            >
                                <Settings2 className="h-4 w-4" />
                                Configure {selectedForwardingMethod.toUpperCase()} settings
                                <ChevronRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                            </button>
                        </div>
                    )}
                </div>

                {/* Configuration Section */}
                {selectedForwardingMethod === "splunk" && (
                    <div id="config-section" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="rounded-3xl border border-slate-800 bg-slate-950/40 backdrop-blur-sm overflow-hidden shadow-xl">
                            <div className="border-b border-slate-800 p-6 flex items-center justify-between bg-slate-900/20">
                                <div className="flex items-center gap-4">
                                    <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-3">
                                        <Database className="h-6 w-6 text-blue-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-slate-100">Splunk HEC Configuration</h3>
                                        <p className="text-sm text-slate-400">Stream events directly to your Splunk index via HTTP Event Collector.</p>
                                    </div>
                                </div>
                                <div className="px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase border border-blue-500/30 bg-blue-500/10 text-blue-400 shadow-[0_0_12px_rgba(59,130,246,0.1)]">
                                    Active
                                </div>
                            </div>

                            <div className="p-8 space-y-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                                    <Input
                                        label="HEC URL"
                                        value={splunk.hecUrl || ""}
                                        onChange={(v) => setSplunk({ ...splunk, hecUrl: v })}
                                        placeholder="https://splunk-server:8088/services/collector"
                                    />
                                    <div className="relative">
                                        <Input
                                            label="HEC Token"
                                            type={showToken ? "text" : "password"}
                                            value={splunk.hecToken || ""}
                                            onChange={(v) => setSplunk({ ...splunk, hecToken: v })}
                                            placeholder="••••••••-••••-••••-••••-••••••••••••"
                                        />
                                        <button onClick={() => setShowToken(!showToken)} className="absolute right-4 top-[38px] text-slate-500 hover:text-slate-300 transition-colors">
                                            {showToken ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>

                                    <div className="md:col-span-2">
                                        <button
                                            onClick={() => setShowOptionalSplunk(!showOptionalSplunk)}
                                            className="flex items-center gap-2 text-sm font-semibold text-slate-400 hover:text-slate-200 transition-colors"
                                        >
                                            <div className={cx("transition-transform", showOptionalSplunk ? "rotate-90" : "")}>
                                                <ChevronRight size={16} />
                                            </div>
                                            Optional Settings
                                        </button>

                                        {showOptionalSplunk && (
                                            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-top-2">
                                                <Input
                                                    label="Index"
                                                    value={splunk.index || ""}
                                                    onChange={(v) => setSplunk({ ...splunk, index: v })}
                                                    placeholder="main"
                                                />
                                                <Input
                                                    label="Source Type"
                                                    value={splunk.sourcetype || ""}
                                                    onChange={(v) => setSplunk({ ...splunk, sourcetype: v })}
                                                    placeholder="promptprotect"
                                                />
                                                <div className="md:col-span-2">
                                                    <Toggle
                                                        label="Allow Insecure Connections (TLS)"
                                                        checked={!!splunk.allowInsecure}
                                                        onChange={(v) => setSplunk({ ...splunk, allowInsecure: v })}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex justify-end pt-4 border-t border-slate-800/50">
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
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FeatureCard
                                title="Audit Logs"
                                description="Capture all administrative actions and configuration changes."
                                icon={<Shield className="h-5 w-5 text-emerald-400" />}
                                status="Active"
                            />
                            <FeatureCard
                                title="Detection Events"
                                description="Real-time alerts for PII leeks and policy violations."
                                icon={<Activity className="h-5 w-5 text-blue-400" />}
                                status="Active"
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Help Card */}
            <div className="rounded-3xl border border-slate-800/40 bg-slate-950/20 p-6 flex items-center justify-between group cursor-help hover:bg-slate-900/20 transition-colors" onClick={() => setIsInfoOpen(true)}>
                <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
                        <Activity className="h-5 w-5" />
                    </div>
                    <div>
                        <h4 className="text-sm font-semibold text-slate-200">Need help configuring forwarding?</h4>
                        <p className="text-xs text-slate-500">Read our guides for Splunk HEC and SIEM integration.</p>
                    </div>
                </div>
                <ExternalLink className="h-4 w-4 text-slate-600 group-hover:text-blue-400 transition-colors" />
            </div>

            {/* Help Drawer */}
            <div className={`fixed top-0 right-0 h-full w-[400px] bg-slate-950/80 backdrop-blur-2xl border-l border-white/5 shadow-2xl transition-transform duration-500 ease-in-out z-50 ${isInfoOpen ? "translate-x-0" : "translate-x-full"}`}>
                <div className="h-full flex flex-col p-8 pt-24 overflow-y-auto">
                    <div className="flex items-center justify-between mb-8">
                        <h4 className="flex items-center gap-2 text-xl font-bold text-slate-100">SIEM Setup</h4>
                        <button onClick={() => setIsInfoOpen(false)} className="rounded-2xl border border-white/10 p-2.5 hover:bg-white/5 transition-colors">
                            <X className="h-5 w-5 text-slate-400" />
                        </button>
                    </div>

                    <div className="space-y-10 text-sm leading-relaxed text-slate-400">
                        <div className="space-y-4">
                            <p className="font-bold text-slate-100 text-lg">Splunk HEC</p>
                            <p>To enable data forwarding to Splunk, ensure HTTP Event Collector (HEC) is enabled and you have a valid token.</p>
                            <div className="p-6 rounded-2xl bg-amber-500/5 border border-amber-500/10">
                                <p className="text-amber-400 font-bold mb-2 flex items-center gap-2 uppercase tracking-widest text-[10px]"><AlertTriangle className="h-4 w-4" /> Important</p>
                                <p className="text-amber-200/60 text-xs">Verify that the HEC URL includes the full path including <code>/services/collector</code>.</p>
                            </div>
                        </div>

                        <div className="mt-8 p-5 rounded-2xl bg-slate-900/40 border border-slate-800 font-mono text-xs space-y-4">
                            <div>
                                <div className="text-slate-500 uppercase tracking-widest text-[9px] mb-1 font-bold">Recommended Sourcetype</div>
                                <div className="text-blue-400">promptprotect</div>
                            </div>
                            <div>
                                <div className="text-slate-500 uppercase tracking-widest text-[9px] mb-1 font-bold">Default Index</div>
                                <div className="text-blue-400">main</div>
                            </div>
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

function FeatureCard({ title, description, icon, status }: { title: string; description: string; icon: React.ReactNode; status: string }) {
    return (
        <div className="rounded-3xl border border-slate-800 bg-slate-950/20 p-6 flex flex-col gap-3">
            <div className="flex items-center justify-between">
                <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-2">
                    {icon}
                </div>
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">{status}</span>
            </div>
            <div>
                <h4 className="text-sm font-semibold text-slate-100">{title}</h4>
                <p className="mt-1 text-xs text-slate-400 leading-relaxed">{description}</p>
            </div>
        </div>
    )
}
