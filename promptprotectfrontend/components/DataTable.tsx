"use client"

import React, { Fragment, useMemo, useState } from "react"

interface Column<T> {
  key: keyof T
  label: string
  render?: (row: T) => React.ReactNode

  // NEW: control cell behavior per column
  wrap?: boolean
  className?: string
}

interface DataTableProps<T> {
  data: T[]
  columns: Column<T>[]
  searchKeys: (keyof T)[]
  onEdit?: (row: T) => void
  onDelete?: (id: string) => void
  renderActions?: (row: T) => React.ReactNode
}

const HIDDEN_FIELDS = ["_id", "__v", "_user", "id", "orgId", "groupUsers", "policiesAttached", "customRulesForPolicy"]

function SortIcon({ active, dir }: { active: boolean; dir: "asc" | "desc" }) {
  return (
    <span className="ml-2 inline-flex flex-col -space-y-[2px] align-middle text-[10px] leading-none text-slate-500">
      <span className={active && dir === "asc" ? "text-slate-200" : ""}>▲</span>
      <span className={active && dir === "desc" ? "text-slate-200" : ""}>▼</span>
    </span>
  )
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      className={[
        "h-4 w-4 shrink-0 text-slate-400 transition-transform",
        open ? "rotate-90" : "rotate-0",
      ].join(" ")}
      viewBox="0 0 20 20"
      fill="none"
    >
      <path
        d="M7.5 4.75L12.75 10L7.5 15.25"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function formatCell(value: any): string {
  if (value === null || value === undefined) return ""

  const isProbablyDate = (val: string) =>
    typeof val === "string" &&
    (/^\d{4}-\d{2}-\d{2}/.test(val) || /^\d{1,2}\/\d{1,2}\/\d{2,4}/.test(val))

  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (item === null || item === undefined) return ""

        if (typeof item === "object") {
          return (
            item.ruleName ||
            item.redactionLabel ||
            item.configName ||
            item.userName ||
            item.policyName ||
            item.groupName ||
            item.orgName ||
            item.name ||
            ""
          )
        }

        return String(item)
      })
      .filter(Boolean)
      .join(", ")
  }

  if (typeof value === "object") {
    return (
      value.ruleName ||
      value.redactionLabel ||
      value.configName ||
      value.userName ||
      value.policyName ||
      value.groupName ||
      value.orgName ||
      value.name ||
      ""
    )
  }

  if (typeof value === "string" && isProbablyDate(value)) {
    try {
      return new Date(value).toLocaleString()
    } catch {
      return value
    }
  }

  return String(value)
}

export function DataTable<T extends { _id: string }>({
  data,
  columns,
  searchKeys,
  onEdit,
  onDelete,
  renderActions,
}: DataTableProps<T>) {
  const [search, setSearch] = useState("")
  const [sortKey, setSortKey] = useState<keyof T | null>(null)
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")
  const [page, setPage] = useState(1)
  const [expandedRow, setExpandedRow] = useState<string | null>(null)

  const rowsPerPage = 5

  const filtered = useMemo(() => {
    const lower = search.toLowerCase()

    return data.filter((row) =>
      searchKeys.some((key) => {
        const value = (row as any)[key]
        if (!value) return false

        if (Array.isArray(value)) {
          return value.some((item) => {
            if (typeof item === "object") return JSON.stringify(item).toLowerCase().includes(lower)
            return String(item).toLowerCase().includes(lower)
          })
        }

        if (typeof value === "object") {
          return JSON.stringify(value).toLowerCase().includes(lower)
        }

        return String(value).toLowerCase().includes(lower)
      })
    )
  }, [data, search, searchKeys])

  const sorted = useMemo(() => {
    if (!sortKey) return filtered

    return [...filtered].sort((a, b) => {
      const x = (a as any)[sortKey]
      const y = (b as any)[sortKey]

      // make arrays/objects sortable in a stable, human way
      const xs = typeof x === "object" ? formatCell(x) : String(x ?? "")
      const ys = typeof y === "object" ? formatCell(y) : String(y ?? "")

      if (xs < ys) return sortOrder === "asc" ? -1 : 1
      if (xs > ys) return sortOrder === "asc" ? 1 : -1
      return 0
    })
  }, [filtered, sortKey, sortOrder])

  const paginated = useMemo(() => {
    const start = (page - 1) * rowsPerPage
    return sorted.slice(start, start + rowsPerPage)
  }, [sorted, page])

  const totalPages = Math.max(1, Math.ceil(sorted.length / rowsPerPage))
  const hasData = sorted.length > 0

  function toggleRow(id: string) {
    setExpandedRow(expandedRow === id ? null : id)
  }

  const showingFrom = hasData ? (page - 1) * rowsPerPage + 1 : 0
  const showingTo = hasData ? Math.min(page * rowsPerPage, sorted.length) : 0

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-slate-800/70 bg-slate-950/30 shadow-[0_0_0_1px_rgba(15,23,42,0.35),0_18px_50px_-40px_rgba(37,99,235,0.35)] backdrop-blur">
      {/* Top bar */}
      <div className="flex flex-col gap-3 border-b border-slate-800/70 bg-slate-950/40 p-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="text-xs uppercase tracking-wide text-slate-500">Records</div>
          <div className="text-sm font-medium text-slate-200">{sorted.length.toLocaleString()}</div>
        </div>

        <div className="relative w-full md:w-[360px]">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none">
              <path
                d="M8.5 15.5a7 7 0 1 1 0-14 7 7 0 0 1 0 14Zm6 1-3.2-3.2"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>

          <input
            className="w-full rounded-xl border border-slate-800/70 bg-slate-950/30 py-2.5 pl-9 pr-3 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/20"
            placeholder="Search..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
          />
        </div>
      </div>

      {/* Table */}
      <div className="w-full overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="sticky top-0 z-10 bg-slate-950/70 backdrop-blur">
            <tr className="border-b border-slate-800/70">
              {columns.map((col) => {
                const active = sortKey === col.key
                return (
                  <th
                    key={String(col.key)}
                    onClick={() => {
                      if (sortKey === col.key) setSortOrder(sortOrder === "asc" ? "desc" : "asc")
                      else {
                        setSortKey(col.key)
                        setSortOrder("asc")
                      }
                    }}
                    className={cn(
                      "whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400 hover:text-slate-200 cursor-pointer select-none",
                      col.className
                    )}
                  >
                    <span className="inline-flex items-center">
                      {col.label}
                      <SortIcon active={active} dir={sortOrder} />
                    </span>
                  </th>
                )
              })}

              <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Actions
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-800/60">
            {!hasData ? (
              <tr>
                <td colSpan={columns.length + 1} className="px-4 py-10 text-center text-slate-500">
                  No data available
                </td>
              </tr>
            ) : (
              paginated.map((row) => (
                <Fragment key={row._id}>
                  <tr
                    onClick={(e) => {
                      if ((e.target as HTMLElement).closest("button")) return
                      toggleRow(row._id)
                    }}
                    className="group cursor-pointer bg-transparent transition hover:bg-slate-900/35"
                  >
                    {columns.map((col, idx) => {
                      const content = col.render ? col.render(row) : formatCell((row as any)[col.key])
                      const wrap = !!col.wrap

                      return (
                        <td key={String(col.key)} className={cn("px-4 py-3 text-slate-200", col.className)}>
                          <div className="flex items-center gap-2">
                            {idx === 0 ? <Chevron open={expandedRow === row._id} /> : null}

                            {/* Default: truncate. If wrap: allow line breaks */}
                            <span className={wrap ? "whitespace-normal break-words" : "truncate"}>
                              {content as any}
                            </span>
                          </div>
                        </td>
                      )
                    })}

                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {renderActions && renderActions(row)}

                        {onEdit && (
                          <button
                            onClick={() => onEdit(row)}
                            className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-200 hover:bg-emerald-500/15 hover:border-emerald-500/35 transition"
                          >
                            Edit
                          </button>
                        )}

                        {onDelete && (
                          <button
                            onClick={() => onDelete(row._id)}
                            className="rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-200 hover:bg-red-500/15 hover:border-red-500/35 transition"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>

                  {expandedRow === row._id && (
                    <tr className="bg-slate-950/20">
                      <td colSpan={columns.length + 1} className="px-4 py-4">
                        <div className="rounded-2xl border border-slate-800/70 bg-slate-950/30 p-4">
                          <div className="mb-3 flex items-center justify-between">
                            <div className="text-xs uppercase tracking-wide text-slate-500">Details</div>
                            <div className="text-xs text-slate-500">
                              ID: <span className="font-mono text-slate-400">{row._id}</span>
                            </div>
                          </div>

                          <div className="grid gap-3 md:grid-cols-2">
                            {Object.entries(row as any)
                              .filter(([key]) => !HIDDEN_FIELDS.includes(key))
                              .map(([key, value]) => (
                                <div
                                  key={key}
                                  className="rounded-xl border border-slate-800/70 bg-slate-950/25 p-3"
                                >
                                  <div className="text-[11px] uppercase tracking-wide text-slate-500">
                                    {key.replace(/([A-Z])/g, " $1")}
                                  </div>
                                  <div className="mt-1 break-words text-sm text-slate-200">
                                    {formatCell(value)}
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="flex flex-col gap-3 border-t border-slate-800/70 bg-slate-950/40 p-4 md:flex-row md:items-center md:justify-between">
        <div className="text-xs text-slate-500">
          Showing <span className="text-slate-200">{showingFrom}</span> to{" "}
          <span className="text-slate-200">{showingTo}</span> of{" "}
          <span className="text-slate-200">{sorted.length}</span>
        </div>

        <div className="flex items-center justify-between gap-3 md:justify-end">
          <button
            disabled={!hasData || page === 1}
            onClick={() => setPage(page - 1)}
            className="rounded-xl border border-slate-800/70 bg-slate-950/30 px-4 py-2 text-sm text-slate-200 hover:bg-slate-900/35 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Prev
          </button>

          <div className="text-sm text-slate-400">
            Page <span className="text-slate-200">{hasData ? page : 0}</span> of{" "}
            <span className="text-slate-200">{hasData ? totalPages : 0}</span>
          </div>

          <button
            disabled={!hasData || page >= totalPages}
            onClick={() => setPage(page + 1)}
            className="rounded-xl border border-slate-800/70 bg-slate-950/30 px-4 py-2 text-sm text-slate-200 hover:bg-slate-900/35 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  )
}

/** local helper because you used cn elsewhere */
function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(" ")
}
