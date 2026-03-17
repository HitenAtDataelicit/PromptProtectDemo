"use client"

import { useEffect } from "react"
import { X, AlertTriangle } from "lucide-react"

interface Props {
  message: string
  onClose: () => void
  title?: string
}

export default function ErrorPopup({ message, onClose, title = "Something went wrong" }: Props) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-800/80 bg-slate-950/85 shadow-[0_0_0_1px_rgba(15,23,42,0.35),0_30px_120px_-60px_rgba(239,68,68,0.85)] backdrop-blur">
        <div className="flex items-start justify-between gap-4 border-b border-slate-800/70 bg-slate-900/35 px-6 py-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-xl border border-red-500/25 bg-red-500/10 p-2 text-red-200">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-100">{title}</h2>
              <p className="mt-1 text-sm text-slate-400">
                Please review the error details and try again.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-800 bg-slate-950/30 p-2 text-slate-300 hover:bg-slate-900/40 hover:text-slate-100 transition"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-5">
          <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-slate-200">
            {message}
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="inline-flex items-center justify-center rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-semibold text-slate-100 hover:bg-red-500/18 hover:border-red-400/40 transition"
            >
              Go back
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
