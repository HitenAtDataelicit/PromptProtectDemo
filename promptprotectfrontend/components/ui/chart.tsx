"use client"

import * as React from "react"
import * as RechartsPrimitive from "recharts"
import { cn } from "@/lib/utils"

// Format: { THEME_NAME: CSS_SELECTOR }
const THEMES = { light: "", dark: ".dark" } as const

export type ChartConfig = {
  [k in string]: {
    label?: React.ReactNode
    icon?: React.ComponentType
  } & (
    | { color?: string; theme?: never }
    | { color?: never; theme: Record<keyof typeof THEMES, string> }
  )
}

type ChartContextProps = {
  config: ChartConfig
}

const ChartContext = React.createContext<ChartContextProps | null>(null)

function useChart() {
  const context = React.useContext(ChartContext)
  if (!context) throw new Error("useChart must be used within a <ChartContainer />")
  return context
}

function ChartContainer({
  id,
  className,
  children,
  config,
  ...props
}: React.ComponentProps<"div"> & {
  config: ChartConfig
  children: React.ComponentProps<typeof RechartsPrimitive.ResponsiveContainer>["children"]
}) {
  const uniqueId = React.useId()
  const chartId = `chart-${id || uniqueId.replace(/:/g, "")}`

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-slot="chart"
        data-chart={chartId}
        className={cn(
          [
            // Layout
            "relative flex w-full items-center justify-center",
            "rounded-2xl border border-slate-800/70 bg-slate-950/20 p-3",
            "shadow-[0_0_0_1px_rgba(15,23,42,0.35),0_20px_60px_-45px_rgba(37,99,235,0.40)]",
            "text-xs text-slate-200",
            "overflow-hidden",

            // Axis ticks and labels
            "[&_.recharts-cartesian-axis-tick_text]:fill-slate-400",
            "[&_.recharts-cartesian-axis-line]:stroke-slate-800/80",
            "[&_.recharts-cartesian-axis-tick-line]:stroke-slate-800/80",

            // Grid
            "[&_.recharts-cartesian-grid-horizontal_line]:stroke-slate-800/60",
            "[&_.recharts-cartesian-grid-vertical_line]:stroke-slate-800/30",

            // Tooltip cursor
            "[&_.recharts-curve.recharts-tooltip-cursor]:stroke-slate-700/70",
            "[&_.recharts-rectangle.recharts-tooltip-cursor]:fill-slate-900/40",

            // Pie/Radial
            "[&_.recharts-polar-grid_[stroke='#ccc']]:stroke-slate-800/60",
            "[&_.recharts-radial-bar-background-sector]:fill-slate-900/40",

            // Remove default strokes/outlines
            "[&_.recharts-dot[stroke='#fff']]:stroke-transparent",
            "[&_.recharts-sector[stroke='#fff']]:stroke-transparent",
            "[&_.recharts-layer]:outline-none",
            "[&_.recharts-sector]:outline-none",
            "[&_.recharts-surface]:outline-none",

            // Improve hit areas and clarity
            "[&_.recharts-tooltip-wrapper]:outline-none",
          ].join(" "),
          className
        )}
        {...props}
      >
        {/* subtle glows like your dashboard */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-24 -right-28 h-56 w-56 rounded-full bg-blue-500/10 blur-3xl" />
          <div className="absolute -bottom-28 -left-28 h-56 w-56 rounded-full bg-sky-400/8 blur-3xl" />
        </div>

        <ChartStyle id={chartId} config={config} />
        <div className="relative h-full w-full">
          <RechartsPrimitive.ResponsiveContainer>{children}</RechartsPrimitive.ResponsiveContainer>
        </div>
      </div>
    </ChartContext.Provider>
  )
}

const ChartStyle = ({ id, config }: { id: string; config: ChartConfig }) => {
  const colorConfig = Object.entries(config).filter(([, cfg]) => cfg.theme || cfg.color)
  if (!colorConfig.length) return null

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: Object.entries(THEMES)
          .map(
            ([theme, prefix]) => `
${prefix} [data-chart=${id}] {
${colorConfig
  .map(([key, itemConfig]) => {
    const color =
      itemConfig.theme?.[theme as keyof typeof itemConfig.theme] || itemConfig.color
    return color ? `  --color-${key}: ${color};` : null
  })
  .filter(Boolean)
  .join("\n")}
}
`
          )
          .join("\n"),
      }}
    />
  )
}

const ChartTooltip = RechartsPrimitive.Tooltip

function ChartTooltipContent({
  active,
  payload,
  className,
  indicator = "dot",
  hideLabel = false,
  hideIndicator = false,
  label,
  labelFormatter,
  labelClassName,
  formatter,
  color,
  nameKey,
  labelKey,
}: React.ComponentProps<typeof RechartsPrimitive.Tooltip> &
  React.ComponentProps<"div"> & {
    hideLabel?: boolean
    hideIndicator?: boolean
    indicator?: "line" | "dot" | "dashed"
    nameKey?: string
    labelKey?: string
  }) {
  const { config } = useChart()

  const tooltipLabel = React.useMemo(() => {
    if (hideLabel || !payload?.length) return null

    const [item] = payload
    const key = `${labelKey || item?.dataKey || item?.name || "value"}`
    const itemConfig = getPayloadConfigFromPayload(config, item, key)

    const value =
      !labelKey && typeof label === "string"
        ? (config[label as keyof typeof config]?.label || label)
        : itemConfig?.label

    if (!value) return null

    if (labelFormatter) {
      return (
        <div className={cn("text-xs font-semibold text-slate-100", labelClassName)}>
          {labelFormatter(value, payload)}
        </div>
      )
    }

    return <div className={cn("text-xs font-semibold text-slate-100", labelClassName)}>{value}</div>
  }, [label, labelFormatter, payload, hideLabel, labelClassName, config, labelKey])

  if (!active || !payload?.length) return null

  const nestLabel = payload.length === 1 && indicator !== "dot"

  return (
    <div
      className={cn(
        [
          "grid min-w-[10rem] items-start gap-2 rounded-2xl border px-3 py-2 text-xs",
          "border-blue-500/25 bg-slate-950/90 backdrop-blur",
          "shadow-[0_0_0_1px_rgba(37,99,235,0.20),0_18px_60px_-25px_rgba(2,6,23,0.85)]",
        ].join(" "),
        className
      )}
    >
      {!nestLabel ? tooltipLabel : null}

      <div className="grid gap-2">
        {payload
          .filter((item) => item.type !== "none")
          .map((item, index) => {
            const key = `${nameKey || item.name || item.dataKey || "value"}`
            const itemConfig = getPayloadConfigFromPayload(config, item, key)
            const indicatorColor = color || (item.payload as any)?.fill || item.color

            return (
              <div
                key={`${item.dataKey}-${index}`}
                className={cn(
                  "flex w-full items-center gap-2 rounded-xl border border-slate-800/70 bg-slate-950/40 px-2 py-1.5",
                  indicator !== "dot" && "items-stretch"
                )}
              >
                {formatter && item?.value !== undefined && item.name ? (
                  formatter(item.value, item.name, item, index, item.payload)
                ) : (
                  <>
                    {itemConfig?.icon ? (
                      <span className="text-slate-300">
                        <itemConfig.icon />
                      </span>
                    ) : (
                      !hideIndicator && (
                        <div
                          className={cn("shrink-0", {
                            "h-2.5 w-2.5 rounded-sm": indicator === "dot",
                            "w-1 rounded-sm": indicator === "line",
                            "w-0 border-[1.5px] border-dashed bg-transparent":
                              indicator === "dashed",
                          })}
                          style={
                            {
                              backgroundColor:
                                indicator === "dashed" ? "transparent" : indicatorColor,
                              borderColor: indicatorColor,
                            } as React.CSSProperties
                          }
                        />
                      )
                    )}

                    <div
                      className={cn(
                        "flex flex-1 justify-between gap-3",
                        nestLabel ? "items-end" : "items-center"
                      )}
                    >
                      <div className="grid gap-1">
                        {nestLabel ? tooltipLabel : null}
                        <span className="text-slate-300">
                          {itemConfig?.label || item.name}
                        </span>
                      </div>

                      {item.value !== undefined && item.value !== null && (
                        <span className="font-mono font-semibold tabular-nums text-slate-100">
                          {Number(item.value).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>
            )
          })}
      </div>
    </div>
  )
}

const ChartLegend = RechartsPrimitive.Legend

function ChartLegendContent({
  className,
  hideIcon = false,
  payload,
  verticalAlign = "bottom",
  nameKey,
}: React.ComponentProps<"div"> &
  Pick<RechartsPrimitive.LegendProps, "payload" | "verticalAlign"> & {
    hideIcon?: boolean
    nameKey?: string
  }) {
  const { config } = useChart()
  if (!payload?.length) return null

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-center gap-2",
        verticalAlign === "top" ? "pb-3" : "pt-3",
        className
      )}
    >
      {payload
        .filter((item) => item.type !== "none")
        .map((item) => {
          const key = `${nameKey || item.dataKey || "value"}`
          const itemConfig = getPayloadConfigFromPayload(config, item, key)

          return (
            <div
              key={`${item.value}-${key}`}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px]",
                "border-slate-800/70 bg-slate-950/25 text-slate-300"
              )}
            >
              {itemConfig?.icon && !hideIcon ? (
                <span className="text-slate-300">
                  <itemConfig.icon />
                </span>
              ) : (
                <span
                  className="h-2.5 w-2.5 rounded-sm"
                  style={{ backgroundColor: item.color }}
                />
              )}
              <span className="whitespace-nowrap">{itemConfig?.label}</span>
            </div>
          )
        })}
    </div>
  )
}

// Helper to extract item config from a payload.
function getPayloadConfigFromPayload(config: ChartConfig, payload: unknown, key: string) {
  if (typeof payload !== "object" || payload === null) return undefined

  const payloadPayload =
    "payload" in payload &&
    typeof (payload as any).payload === "object" &&
    (payload as any).payload !== null
      ? (payload as any).payload
      : undefined

  let configLabelKey: string = key

  if (key in (payload as any) && typeof (payload as any)[key] === "string") {
    configLabelKey = (payload as any)[key] as string
  } else if (
    payloadPayload &&
    key in payloadPayload &&
    typeof payloadPayload[key as keyof typeof payloadPayload] === "string"
  ) {
    configLabelKey = payloadPayload[key as keyof typeof payloadPayload] as string
  }

  return configLabelKey in config ? config[configLabelKey] : config[key as keyof typeof config]
}

export {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  ChartStyle,
}
