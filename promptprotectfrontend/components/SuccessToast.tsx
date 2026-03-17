"use client"

import React, { useEffect } from "react"
import { CheckCircle2, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface SuccessToastProps {
    message: string
    onClose: () => void
    duration?: number
}

export function SuccessToast({ message, onClose, duration = 3000 }: SuccessToastProps) {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose()
        }, duration)

        return () => clearTimeout(timer)
    }, [onClose, duration])

    return (
        <div className="fixed bottom-8 left-1/2 z-[10000] -translate-x-1/2 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-slate-950/90 px-5 py-3 shadow-[0_0_0_1px_rgba(15,23,42,0.35),0_20px_60px_-30px_rgba(16,185,129,0.5)] backdrop-blur-xl">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/10">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                </div>
                <p className="text-sm font-medium text-slate-200">{message}</p>
                <button
                    type="button"
                    onClick={onClose}
                    className="ml-2 rounded-lg p-1 text-slate-500 hover:bg-slate-900/50 hover:text-slate-200 transition"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>
        </div>
    )
}
