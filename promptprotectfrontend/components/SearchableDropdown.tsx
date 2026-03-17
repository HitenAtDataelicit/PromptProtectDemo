"use client"

import React, { useState, useRef, useEffect, useMemo } from "react"
import { ChevronDown, Check, Search } from "lucide-react"
import { cn } from "@/lib/utils"

interface Option {
    value: string
    label: string
}

interface SearchableDropdownProps {
    options: Option[]
    value: string
    onChange: (value: string) => void
    placeholder?: string
    className?: string
    disabled?: boolean
    searchPlaceholder?: string
}

export function SearchableDropdown({
    options,
    value,
    onChange,
    placeholder = "Select an option",
    className,
    disabled = false,
    searchPlaceholder = "Search...",
}: SearchableDropdownProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [search, setSearch] = useState("")
    const containerRef = useRef<HTMLDivElement>(null)
    const searchInputRef = useRef<HTMLInputElement>(null)

    const selectedOption = options.find((opt) => opt.value === value)

    const filteredOptions = useMemo(() => {
        return options.filter((opt) =>
            opt.label.toLowerCase().includes(search.toLowerCase())
        )
    }, [options, search])

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    useEffect(() => {
        if (isOpen && searchInputRef.current) {
            searchInputRef.current.focus()
        }
        if (!isOpen) {
            setSearch("")
        }
    }, [isOpen])

    return (
        <div ref={containerRef} className={cn("relative w-full", className)}>
            <button
                type="button"
                disabled={disabled}
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "flex h-11 w-full items-center justify-between rounded-2xl border border-slate-800/70 bg-slate-950/35 px-4 text-sm text-slate-100 outline-none transition",
                    "focus:border-blue-500/45 focus:ring-2 focus:ring-blue-500/15",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                    isOpen && "border-blue-500/45 ring-2 ring-blue-500/15"
                )}
            >
                <span className={cn("truncate", !selectedOption && "text-slate-500")}>
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <ChevronDown
                    className={cn(
                        "h-4 w-4 shrink-0 text-slate-500 transition-transform duration-200",
                        isOpen && "rotate-180 text-blue-400"
                    )}
                />
            </button>

            {isOpen && !disabled && (
                <div className="absolute z-[100] mt-2 w-full overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-950/90 p-1.5 shadow-[0_0_0_1px_rgba(15,23,42,0.35),0_20px_60px_-40px_rgba(37,99,235,0.6)] backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="relative mb-1.5 px-2 py-1">
                        <Search className="absolute left-4 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
                        <input
                            ref={searchInputRef}
                            type="text"
                            className="w-full rounded-xl border border-slate-800/50 bg-slate-900/50 py-2 pl-9 pr-3 text-xs text-slate-100 placeholder:text-slate-600 outline-none focus:border-blue-500/30 transition"
                            placeholder={searchPlaceholder}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="max-h-60 overflow-y-auto custom-scrollbar">
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((option) => {
                                const isSelected = option.value === value
                                return (
                                    <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => {
                                            onChange(option.value)
                                            setIsOpen(false)
                                        }}
                                        className={cn(
                                            "flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition",
                                            isSelected
                                                ? "bg-blue-500/10 text-blue-200 shadow-[inset_0_0_0_1px_rgba(37,99,235,0.2)]"
                                                : "text-slate-400 hover:bg-slate-900/50 hover:text-slate-100"
                                        )}
                                    >
                                        <span className="truncate">{option.label}</span>
                                        {isSelected && <Check className="h-3.5 w-3.5 shrink-0 text-blue-400" />}
                                    </button>
                                )
                            })
                        ) : (
                            <div className="px-3 py-6 text-center text-xs text-slate-500">
                                No matching options
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
