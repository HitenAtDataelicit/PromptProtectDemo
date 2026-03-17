import * as React from "react"
import { cn } from "@/lib/utils"

function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card"
      className={cn(
        [
          // Layout
          "relative flex flex-col gap-6 rounded-2xl border p-6",
          // Enterprise dark glass
          "bg-slate-950/25 backdrop-blur",
          // Border and shadow
          "border-slate-800/70",
          "shadow-[0_0_0_1px_rgba(15,23,42,0.35),0_20px_60px_-45px_rgba(37,99,235,0.45)]",
          // Text
          "text-slate-100",
          // Hover polish
          "transition-transform transition-shadow duration-200",
          "hover:-translate-y-[1px]",
          "hover:shadow-[0_0_0_1px_rgba(59,130,246,0.25),0_30px_90px_-55px_rgba(37,99,235,0.75)]",
          // Focus accessibility
          "focus-within:ring-1 focus-within:ring-blue-500/25",
        ].join(" "),
        className
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        [
          "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-2",
          "has-data-[slot=card-action]:grid-cols-[1fr_auto]",
          // subtle divider spacing if you add border-b manually
          "[.border-b]:pb-5",
        ].join(" "),
        className
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn(
        "text-sm font-semibold tracking-tight text-slate-100",
        className
      )}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-xs text-slate-400 leading-relaxed", className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("text-sm text-slate-200", className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        [
          "flex items-center",
          // if you add border-t manually, it gets correct padding
          "[.border-t]:pt-5",
          "text-xs text-slate-400",
        ].join(" "),
        className
      )}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}
