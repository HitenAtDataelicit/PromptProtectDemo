"use client"

import React, { useState, useRef, useEffect } from "react"
import { ChevronDown, Check } from "lucide-react"
import { cn } from "@/lib/utils"

interface Option {
    value: string
    label: string
}

interface CustomDropdownProps {
    options: Option[]
    value: string
    onChange: (value: string) => void
    placeholder?: string
    className?: string
    disabled?: boolean
}

export function CustomDropdown({
    options,
    value,
    onChange,
    placeholder = "Select an option",
    className,
    disabled = false,
}: CustomDropdownProps) {
    const [isOpen, setIsOpen] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)

    const selectedOption = options.find((opt) => opt.value === value)

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

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
                    <div className="max-h-60 overflow-y-auto custom-scrollbar">
                        {options.map((option) => {
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
                        })}
                    </div>
                </div>
            )}
        </div>
    )
}
