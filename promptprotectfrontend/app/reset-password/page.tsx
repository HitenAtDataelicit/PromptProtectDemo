"use client"

import React, { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ShieldCheck, Eye, EyeOff, Loader2, CheckCircle2, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { apiPost } from "@/lib/api"

function ResetPasswordForm() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const token = searchParams.get("token")

    const [password, setPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    const [success, setSuccess] = useState(false)

    useEffect(() => {
        if (!token) {
            setError("Invalid or missing reset token. Please request a new link.")
        }
    }, [token])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!token || !password) return

        if (password !== confirmPassword) {
            setError("Passwords do not match")
            return
        }

        if (password.length < 7) {
            setError("Password must be at least 7 characters")
            return
        }

        setLoading(true)
        setError("")

        try {
            await apiPost("/users/reset-password", { token, newPassword: password })
            setSuccess(true)
            setTimeout(() => router.push("/"), 3000)
        } catch (err: any) {
            setError(err.message || "Failed to reset password")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="rounded-3xl border border-slate-800/70 bg-slate-950/30 p-8 shadow-[0_20px_60px_-45px_rgba(37,99,235,0.45)] backdrop-blur">
            <div className="text-xs uppercase tracking-wide text-slate-500">Secure Reset</div>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">Set New Password</h1>
            <p className="mt-1 text-sm text-slate-400">
                Choose a strong password to secure your account.
            </p>

            {success ? (
                <div className="mt-8 space-y-6 text-center">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-500/25 bg-emerald-500/10">
                        <CheckCircle2 className="h-8 w-8 text-emerald-300" />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-lg font-medium text-slate-100">Password reset successful</h2>
                        <p className="text-sm text-slate-400 leading-relaxed">
                            Your password has been updated. Redirecting to login...
                        </p>
                    </div>
                    <button
                        onClick={() => router.push("/")}
                        className="w-full rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-3 text-sm font-semibold text-slate-100 hover:bg-blue-500/15 transition"
                    >
                        Go to Login Now
                    </button>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                    <div className="space-y-1.5">
                        <div className="text-[11px] uppercase tracking-wide text-slate-400">New Password</div>
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                placeholder="Enter new password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className={cn(
                                    "w-full rounded-xl border border-slate-800/70 bg-slate-950/30 px-4 py-3 pr-11 text-sm text-slate-100 outline-none",
                                    "focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/20"
                                )}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-slate-500 hover:text-slate-200 transition"
                            >
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <div className="text-[11px] uppercase tracking-wide text-slate-400">Confirm Password</div>
                        <input
                            type={showPassword ? "text" : "password"}
                            placeholder="Confirm new password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            className={cn(
                                "w-full rounded-xl border border-slate-800/70 bg-slate-950/30 px-4 py-3 text-sm text-slate-100 outline-none",
                                "focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/20"
                            )}
                        />
                    </div>

                    {error && (
                        <div className="flex items-center gap-2 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                            <AlertCircle className="h-4 w-4 shrink-0" />
                            {error}
                        </div>
                    )}

                    {!token ? (
                        <button
                            type="button"
                            onClick={() => router.push("/forgot-password")}
                            className="w-full rounded-xl border border-slate-800/70 bg-slate-950/40 px-4 py-3 text-sm font-semibold text-slate-200 hover:bg-slate-900/40 transition"
                        >
                            Request New Link
                        </button>
                    ) : (
                        <button
                            type="submit"
                            disabled={loading || !password || !confirmPassword}
                            className={cn(
                                "w-full flex items-center justify-center gap-2 rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-3 text-sm font-semibold text-slate-100",
                                "hover:bg-blue-500/15 transition",
                                "disabled:opacity-50 disabled:cursor-not-allowed"
                            )}
                        >
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Reset Password"}
                        </button>
                    )}
                </form>
            )}
        </div>
    )
}

export default function ResetPasswordPage() {
    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
            <div className="pointer-events-none fixed inset-0">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(37,99,235,0.20),transparent_45%),radial-gradient(circle_at_80%_30%,rgba(56,189,248,0.12),transparent_45%)]" />
            </div>

            <div className="relative w-full max-w-md">
                <Suspense fallback={
                    <div className="flex items-center justify-center p-12">
                        <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
                    </div>
                }>
                    <ResetPasswordForm />
                </Suspense>
            </div>
        </div>
    )
}
