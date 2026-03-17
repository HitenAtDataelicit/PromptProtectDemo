"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Mail, Loader2, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { apiPost } from "@/lib/api"

export default function ForgotPasswordPage() {
    const router = useRouter()
    const [email, setEmail] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    const [success, setSuccess] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!email) return

        setLoading(true)
        setError("")

        try {
            await apiPost("/users/forgot-password", { userEmail: email })
            setSuccess(true)
        } catch (err: any) {
            setError(err.message || "Failed to send reset email")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
            <div className="pointer-events-none fixed inset-0">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(37,99,235,0.20),transparent_45%),radial-gradient(circle_at_80%_30%,rgba(56,189,248,0.12),transparent_45%)]" />
            </div>

            <div className="relative w-full max-w-md">
                <button
                    onClick={() => router.push("/")}
                    className="mb-8 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-slate-100 transition"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Login
                </button>

                <div className="rounded-3xl border border-slate-800/70 bg-slate-950/30 p-8 shadow-[0_20px_60px_-45px_rgba(37,99,235,0.45)] backdrop-blur">
                    <div className="text-xs uppercase tracking-wide text-slate-500">Security</div>
                    <h1 className="mt-2 text-2xl font-semibold tracking-tight">Forgot Password</h1>
                    <p className="mt-1 text-sm text-slate-400">
                        Enter your email and we'll send you a password reset link.
                    </p>

                    {success ? (
                        <div className="mt-8 space-y-6 text-center">
                            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-500/25 bg-emerald-500/10">
                                <CheckCircle2 className="h-8 w-8 text-emerald-300" />
                            </div>
                            <div className="space-y-2">
                                <h2 className="text-lg font-medium text-slate-100">Check your email</h2>
                                <p className="text-sm text-slate-400 leading-relaxed">
                                    If an account exists for {email}, we've sent instructions to reset your password.
                                </p>
                            </div>
                            <button
                                onClick={() => router.push("/")}
                                className="w-full rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-3 text-sm font-semibold text-slate-100 hover:bg-blue-500/15 transition"
                            >
                                Return to Login
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
                            <div className="space-y-1.5">
                                <div className="text-[11px] uppercase tracking-wide text-slate-400">Business Email</div>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                                    <input
                                        type="email"
                                        placeholder="name@company.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        className={cn(
                                            "w-full rounded-xl border border-slate-800/70 bg-slate-950/30 px-10 py-3 text-sm text-slate-100 outline-none",
                                            "focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/20"
                                        )}
                                    />
                                </div>
                            </div>

                            {error && (
                                <div className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading || !email}
                                className={cn(
                                    "w-full flex items-center justify-center gap-2 rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-3 text-sm font-semibold text-slate-100",
                                    "hover:bg-blue-500/15 transition",
                                    "disabled:opacity-50 disabled:cursor-not-allowed"
                                )}
                            >
                                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send Reset Link"}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    )
}
