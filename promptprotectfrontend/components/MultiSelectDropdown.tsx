"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Check, ChevronDown, X } from "lucide-react"

interface Option {
  _id: string
  name: string
}

interface Props {
  label: string
  options: Option[]
  selected: string[]
  onChange: (val: string[]) => void
  placeholder?: string
}

export default function MultiSelectDropdown({
  label,
  options,
  selected,
  onChange,
  placeholder = "Select roles...",
}: Props) {
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  const selectedSet = useMemo(() => new Set(selected), [selected])

  const selectedOptions = useMemo(() => {
    const map = new Map(options.map((o) => [o._id, o]))
    return selected.map((id) => map.get(id)).filter(Boolean) as Option[]
  }, [options, selected])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  useEffect(() => {
    if (!open) return
    // clamp activeIndex if options length changes
    setActiveIndex((i) => Math.min(Math.max(i, 0), Math.max(options.length - 1, 0)))
  }, [open, options.length])

  const toggleSelect = (id: string) => {
    if (selectedSet.has(id)) onChange(selected.filter((x) => x !== id))
    else onChange([...selected, id])
  }

  const removeChip = (id: string) => {
    if (!selectedSet.has(id)) return
    onChange(selected.filter((x) => x !== id))
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault()
        setOpen(true)
      }
      return
    }

    if (e.key === "Escape") {
      e.preventDefault()
      setOpen(false)
      buttonRef.current?.focus()
      return
    }

    if (e.key === "ArrowDown") {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, options.length - 1))
      return
    }

    if (e.key === "ArrowUp") {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
      return
    }

    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      const opt = options[activeIndex]
      if (opt) toggleSelect(opt._id)
      return
    }
  }

  return (
    <div ref={ref} className="w-full">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </div>

      {/* Chips */}
      {selectedOptions.length ? (
        <div className="mb-2 flex flex-wrap gap-2">
          {selectedOptions.map((item) => (
            <span
              key={item._id}
              className={[
                "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold",
                "border-blue-500/25 bg-blue-500/10 text-slate-100",
              ].join(" ")}
            >
              <span className="max-w-[220px] truncate">{item.name}</span>
              <button
                type="button"
                onClick={() => removeChip(item._id)}
                className="rounded-full border border-white/10 bg-white/5 p-1 text-slate-200 hover:bg-white/10 hover:text-white transition"
                aria-label={`Remove ${item.name}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
        </div>
      ) : null}

      {/* Trigger */}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        onKeyDown={onKeyDown}
        aria-expanded={open}
        className={[
          "w-full rounded-2xl border px-3 py-2 text-left text-sm",
          "border-slate-800/80 bg-slate-950/20 text-slate-100",
          "shadow-[0_0_0_1px_rgba(15,23,42,0.35)]",
          "hover:bg-slate-900/30 transition",
          "focus:outline-none focus:ring-2 focus:ring-blue-500/15 focus:border-blue-400/30",
        ].join(" ")}
      >
        <div className="flex items-center justify-between gap-3">
          <span className="text-slate-400">
            {selected.length === 0 ? placeholder : `${selected.length} selected`}
          </span>
          <ChevronDown
            className={[
              "h-4 w-4 text-slate-400 transition-transform",
              open ? "rotate-180" : "",
            ].join(" ")}
          />
        </div>
      </button>

      {/* Dropdown */}
      {open ? (
        <div
          className={[
            "mt-2 overflow-hidden rounded-2xl border",
            "border-slate-800/80 bg-slate-950/85 backdrop-blur",
            "shadow-[0_0_0_1px_rgba(15,23,42,0.35),0_30px_120px_-70px_rgba(37,99,235,0.75)]",
          ].join(" ")}
          role="listbox"
          tabIndex={-1}
          onKeyDown={onKeyDown}
        >
          <div className="max-h-56 overflow-y-auto py-1">
            {options.map((o, idx) => {
              const isSelected = selectedSet.has(o._id)
              const isActive = idx === activeIndex

              return (
                <button
                  key={o._id}
                  type="button"
                  onMouseEnter={() => setActiveIndex(idx)}
                  onClick={() => toggleSelect(o._id)}
                  className={[
                    "w-full px-4 py-2 text-left text-sm",
                    "flex items-center justify-between gap-3",
                    "transition",
                    isActive ? "bg-blue-500/12" : "bg-transparent",
                    isSelected ? "text-slate-100" : "text-slate-200",
                    "hover:bg-blue-500/12",
                  ].join(" ")}
                >
                  <span className="truncate">{o.name}</span>
                  {isSelected ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-200">
                      <Check className="h-4 w-4" />
                    </span>
                  ) : (
                    <span className="h-4 w-4" />
                  )}
                </button>
              )
            })}

            {!options.length ? (
              <div className="px-4 py-6 text-center text-sm text-slate-400">
                No options available.
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}
