"use client"

import React, { useEffect, useMemo, useRef, useState } from "react"
import { apiPost, apiGet } from "@/lib/api"
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts"
import {
  Activity,
  ShieldAlert,
  ScanSearch,
  Shield,
  ShieldCheck,
  ShieldX,
  KeyRound,
  Server,
  Flame,
  Ban,
  Eraser,
  Percent,
  Users as UsersIcon,
  Settings,
  History,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Search,
  Filter,
  Copy,
  ExternalLink,
  Maximize2,
  X,
} from "lucide-react"

const COLORS = ["#2563eb", "#38bdf8", "#1e40af", "#60a5fa", "#0ea5e9"] as const

function extractFindings(r: any) {
  const findingsArr = arr(r?.findings)

  const categoriesFromArr = findingsArr.map((x: any) => x?.category).filter(Boolean)
  const groupsFromArr = findingsArr.map((x: any) => x?.group).filter(Boolean)
  const valuesFromArr = findingsArr.map((x: any) => x?.value).filter(Boolean)
  const confFromArr = findingsArr.map((x: any) => x?.confidence).filter((v: any) => v != null)

  const categoriesRaw = r?.["findings.category"] ?? r?.findings?.category ?? r?.findings?.categories
  const groupsRaw = r?.["findings.group"] ?? r?.findings?.group ?? r?.findings?.groups
  const valuesRaw = r?.["findings.value"] ?? r?.findings?.value ?? r?.findings?.values
  const confRaw = r?.["findings.confidence"] ?? r?.findings?.confidence ?? r?.findings?.confidences

  const categories = arr(categoriesRaw).length ? arr(categoriesRaw).map((x: any) => String(x)) : categoriesFromArr.map(String)
  const groups = arr(groupsRaw).length ? arr(groupsRaw).map((x: any) => String(x)) : groupsFromArr.map(String)
  const values = arr(valuesRaw).length ? arr(valuesRaw).map((x: any) => String(x)) : valuesFromArr.map(String)
  const confidence = arr(confRaw).length ? arr(confRaw).map((x: any) => asNum(x, 0)) : confFromArr.map((x: any) => asNum(x, 0))

  const explicit = asNum(
    r?.findings_count ?? r?.risk_findings_count ?? r?.findingsCount ?? r?.riskFindingsCount,
    0
  )

  const derived = Math.max(categories.length, groups.length, values.length, confidence.length)

  return {
    categories,
    groups,
    values,
    confidence,
    findingsCount: explicit > 0 ? explicit : derived,
  }
}

/* ---------------- Utils ---------------- */

function normalizeSinglePromptRow(r: any, idx = 0) {
  const originalFull = String(r?.original || r?.original_full || "")
  const redactedFull = String(r?.redacted_conversation || r?.redacted || r?.redacted_full || "")
  const preview = originalFull.slice(0, 80) + (originalFull.length > 80 ? "..." : "")

  const f = extractFindings(r)

  return {
    requestId: r?.request_id || r?.requestId || "-",
    user: r?.actor_email || r?.user || "-",
    findingsCount: f.findingsCount,
    source: r?.source || "-",
    ts: fmtTs(r?.ts),
    originalPreview: preview,
    originalFull,
    redactedFull,
    categories: f.categories,
    groups: f.groups,
    values: f.values,
    confidence: f.confidence,
    _idx: idx,
  }
}

function arr(v: any) {
  return Array.isArray(v) ? v : []
}
function asNum(v: any, fallback = 0) {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}
function fmtNum(v: any) {
  if (v == null) return "0"
  const n = Number(v)
  if (Number.isNaN(n)) return String(v)
  return n.toLocaleString()
}
function fmtPct(v: any, digits = 0) {
  const n = Number(v)
  if (!Number.isFinite(n)) return "-"
  return `${n.toFixed(digits)}%`
}
function fmtTs(ts: any) {
  if (!ts) return "-"
  return String(ts)
}
function safeText(v: any) {
  if (v == null) return ""
  return String(v)
}
function uniq<T>(xs: T[]) {
  return Array.from(new Set(xs))
}

/* ---------------- Production-grade row keys ---------------- */
function makeRowKey(prefix: string, r: any, idx: number) {
  const requestId = safeText(r?.requestId || r?.request_id || "na")
  const ts = safeText(r?.ts || "na")
  const user = safeText(r?.user || r?.actor_email || "na")
  const src = safeText(r?.source || "na")
  const fc = safeText(r?.findingsCount ?? r?.findings_count ?? r?.risk_findings_count ?? "na")
  const sig = safeText((r?.originalPreview || r?.original || r?.originalFull || "").length)
  return `${prefix}|${requestId}|${ts}|${user}|${src}|${fc}|${sig}|${idx}`
}

/* ---------------- Risk inference ---------------- */

function inferRiskFromFindings(groups: any[], riskFindingsCount?: any) {
  const rfc = asNum(riskFindingsCount, -1)
  if (rfc >= 6) return "High"
  if (rfc >= 3) return "Medium"

  const g = arr(groups).map((x) => String(x).toLowerCase())
  if (g.includes("pci")) return "High"
  if (g.includes("phi")) return "Medium"
  if (g.includes("secrets")) return "Medium"
  if (g.includes("infrastructure") || g.includes("infra")) return "Medium"
  if (g.includes("pii")) return "Low"
  return "Low"
}

/* ---------------- Payload shape picker ---------------- */

function pickPayloadShape(res: any) {
  if (!res) return null
  if (res?.data?.kpis || res?.data?.charts || res?.data?.tables) return res.data
  if (res?.kpis || res?.charts || res?.tables) return res
  if (res?.data?.data?.kpis || res?.data?.data?.charts || res?.data?.data?.tables) return res.data.data
  return null
}

/* ---------------- Normalize chart arrays to {k, v} ---------------- */

function normalizeKVArray(input: any): { k: string; v: number }[] {
  const xs = arr(input)

  const out = xs
    .map((x: any, idx: number) => {
      if (x == null) return null

      // already correct
      if (x.k != null && x.v != null) {
        return { k: safeText(x.k), v: asNum(x.v, 0) }
      }

      // common backend keys
      const k =
        x.category ??
        x.type ??
        x.name ??
        x.label ??
        x.key ??
        x.risk_level ??
        x.riskLevel ??
        x.group ??
        x.finding ??
        x.findings ??
        x.kind ??
        x.id ??
        idx

      const v =
        x.v ??
        x.value ??
        x.count ??
        x.events ??
        x.total ??
        x.num ??
        x.qty ??
        x.amount ??
        x.detections

      return { k: safeText(k), v: asNum(v, 0) }
    })
    .filter(Boolean) as { k: string; v: number }[]

  return out.filter((p) => p.k !== "" && Number.isFinite(p.v))
}

/* ---------------- Normalizer: maps backend -> UI ---------------- */

function normalizeDashboard(payload: any) {
  const kpisIn = payload?.kpis || {}
  const chartsIn = payload?.charts || {}
  const tablesIn = payload?.tables || {}

  const totalEvents = asNum(kpisIn.total_events, 0)
  const detectedEvents = asNum(kpisIn.detected_events, 0)
  const detectionRatePct = asNum(kpisIn.detection_rate_percentage, 0)
  const detectionRate = detectionRatePct / 100

  const highRiskEventsIn = arr(tablesIn.highRiskEvents)
  const eventRiskTimelineIn = arr(tablesIn.eventRiskTimeline)

  const kpis = {
    org: safeText(kpisIn.org || ""),
    totalEvents,
    promptsScanned: totalEvents,
    detectedEvents,
    piiDetected: asNum(kpisIn.pii_detected_count, 0),
    phiDetected: asNum(kpisIn.phi_detected_count, 0),
    pciDetected: asNum(kpisIn.pci_detected_count, 0),
    secretsDetected: asNum(kpisIn.secrets_detected_count, 0),
    infrastructureDetected: asNum(kpisIn.infrastructure_detected_count, 0),
    customDetected: asNum(kpisIn.custom_detected_count, 0),
    detectionRate,
    detectionRatePct,
    highRisk: highRiskEventsIn.length,

    blocked: asNum(kpisIn.block_count ?? kpisIn.blocked_count ?? kpisIn.blocked, 0),
    redacted: asNum(kpisIn.redact_count ?? kpisIn.redacted_count ?? kpisIn.redacted, 0),

    partialRedacted: asNum(kpisIn.partial_redact_count ?? kpisIn.partial_redacted_count ?? 0, 0),
  }

  const eventsTimeSeries = arr(chartsIn.eventsOverTime).map((x: any) => ({
    t: x?.date ?? x?.t ?? x?.day ?? x?.bucket,
    detected: asNum(x?.detected_events ?? x?.detected ?? x?.detections, 0),
    total: asNum(x?.total_events ?? x?.total ?? x?.events, 0),
    ratePct: asNum(x?.detection_rate_percentage ?? x?.ratePct ?? x?.rate, 0),
  }))

  const categoryBar = [
    { k: "PII", v: kpis.piiDetected },
    { k: "PHI", v: kpis.phiDetected },
    { k: "PCI", v: kpis.pciDetected },
    { k: "Secrets", v: kpis.secretsDetected },
    { k: "Infrastructure", v: kpis.infrastructureDetected },
    { k: "Custom", v: kpis.customDetected },
  ]

  const categoryDistributionMajor = categoryBar.filter((x) => asNum(x.v, 0) > 0)

  const piiRaw = chartsIn.categoryDistributionPII ?? chartsIn.category_distribution_pii
  const phiRaw = chartsIn.categoryDistributionPHI ?? chartsIn.category_distribution_phi
  const pciRaw = chartsIn.categoryDistributionPCI ?? chartsIn.category_distribution_pci
  const secretsRaw =
    chartsIn.categoryDistributionSECRETS ??
    chartsIn.categoryDistributionSecrets ??
    chartsIn.category_distribution_secrets
  const infraRaw =
    chartsIn.categoryDistributionINFRA ??
    chartsIn.categoryDistributionInfra ??
    chartsIn.category_distribution_infra
  const customRaw =
    chartsIn.categoryDistributionCUSTOM ??
    chartsIn.categoryDistributionCustom ??
    chartsIn.category_distribution_custom

  const piiCategoryBar = normalizeKVArray(piiRaw)
  const phiCategoryBar = normalizeKVArray(phiRaw)
  const pciCategoryBar = normalizeKVArray(pciRaw)
  const secretsCategoryBar = normalizeKVArray(secretsRaw)
  const infrastructureCategoryBar = normalizeKVArray(infraRaw)
  const customCategoryBar = normalizeKVArray(customRaw)

  const categoryDistributionDetailed = normalizeKVArray(
    chartsIn.categoryDistributionDetailed ?? chartsIn.category_distribution_detailed
  )

  const lastDetectionsIn = arr(tablesIn.lastDetections ?? tablesIn.last5Detections)

  const lastDetections = lastDetectionsIn
    .slice(0, 5)
    .map((r: any) => {
      const findings = arr(r?.["findings.category"])
      const groups = arr(r?.["findings.group"])
      return {
        ts: fmtTs(r?.ts),
        requestId: r?.request_id || "-",
        user: r?.actor_email || "-",
        source: r?.source || "-",
        risk: inferRiskFromFindings(groups, r?.risk_findings_count),
        findings: findings.length ? findings.join(", ") : "-",
        original: safeText(r?.original || ""),
        redacted: safeText(r?.redacted_conversation || ""),
        categories: arr(r?.["findings.category"]).map((x: any) => String(x)),
        groups: arr(r?.["findings.group"]).map((x: any) => String(x)),
        values: arr(r?.["findings.value"]).map((x: any) => String(x)),
        confidence: arr(r?.["findings.confidence"]).map((x: any) => asNum(x, 0)),
      }
    })

  const top5RiskyUsers = arr(tablesIn.top5RiskyUsers)
    .slice(0, 5)
    .map((u: any) => ({
      user: u?.actor_email || "-",
      detections: asNum(u?.detection_count, 0),
      total: asNum(u?.total_events, 0),
      rate: asNum(u?.detection_rate_percentage, 0),
    }))

  const top5SinglePromptDetections = arr(tablesIn.top5SinglePromptDetections)
    .slice(0, 5)
    .map((r: any) => {
      const originalFull = String(r?.original || "")
      const redactedFull = String(r?.redacted_conversation || "")
      const preview = originalFull.slice(0, 80) + (originalFull.length > 80 ? "..." : "")

      return {
        requestId: r?.request_id || "-",
        user: r?.actor_email || "-",
        findingsCount: asNum(r?.findings_count, 0),
        source: r?.source || "-",
        ts: fmtTs(r?.ts),
        originalPreview: preview,
        originalFull,
        redactedFull,
        categories: arr(r?.["findings.category"]).map((x: any) => String(x)),
        groups: arr(r?.["findings.group"]).map((x: any) => String(x)),
        values: arr(r?.["findings.value"]).map((x: any) => String(x)),
        confidence: arr(r?.["findings.confidence"]).map((x: any) => asNum(x, 0)),
      }
    })

  const highRiskEvents = highRiskEventsIn.map((r: any) => {
    const categories = arr(r?.["findings.category"]).map((x: any) => String(x))
    const groups = arr(r?.["findings.group"]).map((x: any) => String(x))
    return {
      ts: fmtTs(r?.ts),
      requestId: r?.request_id || "-",
      user: r?.actor_email || "-",
      source: r?.source || "-",
      findingsCount: asNum(r?.risk_findings_count, asNum(r?.findings_count, 0)),
      risk: inferRiskFromFindings(groups, r?.risk_findings_count),
      categories,
      groups,
      piiDetected: asNum(r?.pii_detected, 0),
    }
  })

  const eventRiskTimeline = eventRiskTimelineIn.map((x: any) => ({
    ts: fmtTs(x?.ts),
    requestId: x?.request_id || "-",
    findingsCount: asNum(x?.risk_findings_count ?? x?.findingsCount ?? x?.count, 0),
  }))

  const riskDistribution = normalizeKVArray(chartsIn.riskDistribution ?? chartsIn.risk_distribution).map((x) => ({
    k: safeText(x.k),
    v: asNum(x.v, 0),
  }))

  return {
    kpis,
    charts: {
      eventsTimeSeries,
      categoryDistribution: categoryDistributionMajor,
      categoryDistributionDetailed,
      categoryBar,
      piiCategoryBar,
      phiCategoryBar,
      pciCategoryBar,
      secretsCategoryBar,
      infrastructureCategoryBar,
      customCategoryBar,
      riskDistribution,
      eventRiskTimeline,
    },
    tables: {
      // ✅ renamed output key too, so UI reads tables.lastDetections
      lastDetections,
      top5RiskyUsers,
      top5SinglePromptDetections,
      highRiskEvents,
    },
  }
}

/* ---------------- Admin churn helpers ---------------- */

function safeJsonParse(v: any) {
  if (v == null) return null
  if (typeof v === "object") return v
  const s = String(v).trim()
  if (!s) return null
  try {
    return JSON.parse(s)
  } catch {
    return s
  }
}

function normalizeAdminLogs(raw: any[]) {
  return arr(raw).map((r: any, idx: number) => {
    const contextObj = safeJsonParse(r?.context)
    return {
      key: `${r?.ts || "na"}|${r?.event || "na"}|${r?.actor_email || "na"}|${idx}`,
      ts: fmtTs(r?.ts),
      level: safeText(r?.level || "-"),
      event: safeText(r?.event || "-"),
      actor: safeText(r?.actor_email || "-"),
      targetType: safeText(r?.target_type || "-"),
      targetName: safeText(r?.target_name || "-"),
      outcome: safeText(r?.outcome_status || "-"),
      http: r?.http_status != null ? String(r.http_status) : "-",
      contextRaw: r?.context ?? "",
      contextObj,
      old_value: r?.old_value ?? null,
      new_value: r?.new_value ?? null
    }
  })
}

function normalizeOutcome(v: any) {
  const s = String(v ?? "").toLowerCase()
  if (!s) return "unknown"
  if (s.includes("success") || s.includes("ok") || s.includes("allowed")) return "success"
  if (s.includes("fail") || s.includes("error") || s.includes("denied") || s.includes("blocked")) return "fail"
  return s
}

function toTimeBucket(ts: any, granularity: "hour" | "day" = "hour") {
  const d = new Date(ts)
  if (Number.isNaN(d.getTime())) return null
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  if (granularity === "day") return `${yyyy}-${mm}-${dd}`
  const hh = String(d.getHours()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd} ${hh}:00`
}

function countBy<T extends string>(items: any[], keyFn: (x: any) => T) {
  const map = new Map<T, number>()
  for (const it of items) {
    const k = keyFn(it)
    map.set(k, (map.get(k) || 0) + 1)
  }
  return map
}

function topNFromMap(map: Map<string, number>, n = 8) {
  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([k, v]) => ({ k, v }))
}

function buildAdminCharts(rows: any[]) {
  const safe = arr(rows)

  const eventsMap = countBy(safe, (r) => safeText(r.event || "unknown"))
  const actorsMap = countBy(safe, (r) => safeText(r.actor || "unknown"))
  const httpMap = countBy(safe, (r) => {
    const s = safeText(r.http || "")
    if (!s || s === "-" || s.toLowerCase() === "unknown") return "other"
    return s
  })

  const outcomeMap = countBy(safe, (r) => normalizeOutcome(r.outcome))

  const timeMap = new Map<string, number>()
  for (const r of safe) {
    const bucket = toTimeBucket(r.ts, "hour")
    if (!bucket) continue
    timeMap.set(bucket, (timeMap.get(bucket) || 0) + 1)
  }

  const eventsByType = topNFromMap(eventsMap, 10)
  const topActors = topNFromMap(actorsMap, 10)
  const httpStatus = topNFromMap(httpMap, 8)
  const outcomeSplit = Array.from(outcomeMap.entries()).map(([k, v]) => ({ k, v }))

  const activityOverTime = Array.from(timeMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-48)
    .map(([t, v]) => ({ t, v }))

  const total = safe.length
  const success = outcomeMap.get("success") || 0
  const fail = outcomeMap.get("fail") || 0
  const successRatePct = total ? (success / total) * 100 : 0
  const uniqueActors = new Set(safe.map((x) => x.actor).filter(Boolean)).size
  const uniqueEvents = new Set(safe.map((x) => x.event).filter(Boolean)).size

  return {
    kpis: { total, success, fail, successRatePct, uniqueActors, uniqueEvents },
    eventsByType,
    topActors,
    httpStatus,
    outcomeSplit,
    activityOverTime,
  }
}

/* ===================== PAGE ===================== */

type TabKey = "overview" | "detections" | "users" | "highrisk" | "admin"

export default function DashboardPage() {
  const [orgId, setOrgId] = useState("")
  const [orgName, setOrgName] = useState("")
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState("")
  const [dash, setDash] = useState<any>(null)

  // Detections tab pagination (FULL list)
  const [detRows, setDetRows] = useState<any[]>([])
  const [detTotal, setDetTotal] = useState(0)
  const [detPage, setDetPage] = useState(1)
  const [detPageSize, setDetPageSize] = useState(25)
  const [detLoading, setDetLoading] = useState(false)
  const [detError, setDetError] = useState("")

  const [activeTab, setActiveTab] = useState<TabKey>("overview")
  const [lastUpdated, setLastUpdated] = useState<string>("")

  const [userEmail, setUserEmail] = useState("")
  const [userRole, setUserRole] = useState("")

  // Global filters
  const [searchText, setSearchText] = useState("")
  const [sourceFilter, setSourceFilter] = useState<string>("all")
  const [userFilter, setUserFilter] = useState<string>("all")

  // Admin churn state
  const [adminLogs, setAdminLogs] = useState<any[]>([])
  const [adminLoading, setAdminLoading] = useState(false)
  const [adminError, setAdminError] = useState("")
  const [adminEventFilter, setAdminEventFilter] = useState("all")
  const [adminLevelFilter, setAdminLevelFilter] = useState("all")

  // refresh
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [refreshPulse, setRefreshPulse] = useState(false)

  const [expandedChart, setExpandedChart] = useState<{ title: string; data: any[] } | null>(null)
  const refreshInFlight = useRef(false)

  async function fetchDetectionsPage() {
    if (!orgId) return

    setDetLoading(true)
    setDetError("")

    try {
      const res = await apiPost<any>("/dashboard", {
        page: detPage,
        pageSize: detPageSize,
        sort: "ts_desc",
        searchText: searchText || "",
        source: sourceFilter === "all" ? "" : sourceFilter,
        user: userFilter === "all" ? "" : userFilter,
      })


      const payload = res?.data?.data || res?.data || res
      const rows = arr(
        payload?.rows ||
        payload?.items ||
        payload?.results ||
        payload?.tables?.lastDetections
      )
      const total = asNum(payload?.total ?? payload?.count ?? rows.length, rows.length)

      setDetRows(rows.map((r: any, i: number) => normalizeSinglePromptRow(r, i)))
      setDetTotal(total)
    } catch (e: any) {
      console.error(e)
      setDetRows([])
      setDetTotal(0)
      setDetError(e?.message || "Failed to fetch detections")
    } finally {
      setDetLoading(false)
    }
  }

  async function fetchDash(orgIdValue: string, emailStr?: string) {
    if (refreshInFlight.current) return
    refreshInFlight.current = true
    setIsRefreshing(true)
    setErrorMsg("")

    const emailToUse = emailStr || userEmail
    void emailToUse

    try {
      const res = await apiPost<any>("/dashboard", {})
      const payload = pickPayloadShape(res)

      if (!payload) {
        setErrorMsg("Dashboard payload shape is not recognized. Check console logs.")
        setDash(null)
        return
      }

      const normalized = normalizeDashboard(payload)

      if (!normalized?.kpis) {
        setErrorMsg("Dashboard normalized to empty. Check backend fields.")
        setDash(null)
        return
      }

      setDash(normalized)
      setLastUpdated(new Date().toLocaleString())
      setRefreshPulse(true)
      window.setTimeout(() => setRefreshPulse(false), 1200)
    } catch (e: any) {
      console.error(e)
      setErrorMsg(e?.message || "Dashboard fetch failed")
      setDash(null)
    } finally {
      refreshInFlight.current = false
      setIsRefreshing(false)
    }
  }

  async function fetchAdminChurns(orgIdValue: string) {
    if (!orgIdValue) {
      setAdminError("Missing orgId. Cannot fetch admin logs.")
      setAdminLogs([])
      return
    }

    setAdminLoading(true)
    setAdminError("")
    try {
      const res = await apiPost<any>("/adminChurns", {})

      const rows = Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res?.data?.data)
          ? res.data.data
          : Array.isArray(res?.data?.data?.data)
            ? res.data.data.data
            : []

      setAdminLogs(normalizeAdminLogs(rows))
    } catch (e: any) {
      console.error(e)
      setAdminError(e?.message || "Admin churns fetch failed")
      setAdminLogs([])
    } finally {
      setAdminLoading(false)
    }
  }

  useEffect(() => {
    ; (async () => {
      setLoading(true)
      try {
        const { apiGet } = await import("@/lib/api")
        const res: any = await apiGet("/users/auth/me")
        if (res.success && res.user) {
          const user = res.user
          const org = user.org
          setOrgName(org?.orgName || "")
          setOrgId(org?._id || org?._key || "")
          setUserEmail(user.userEmail || "")
          setUserRole(Array.isArray(user.userRole) ? user.userRole.join(",") : user.userRole || "")

          await fetchDash(org?._id || org?._key || "", user.userEmail)
        } else {
          setErrorMsg("Failed to fetch user profile")
        }
      } catch (err: any) {
        console.error(err)
        setErrorMsg(err.message || "Session expired or invalid")
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  // When filters/search/pageSize change on detections tab, reset to page 1
  useEffect(() => {
    if (activeTab !== "detections") return
    setDetPage(1)
  }, [activeTab, searchText, sourceFilter, userFilter, detPageSize])

  // Fetch detections whenever page/tab/filters change
  useEffect(() => {
    if (activeTab !== "detections") return
    fetchDetectionsPage()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, detPage, detPageSize, searchText, sourceFilter, userFilter, orgId])

  useEffect(() => {
    if (activeTab !== "admin") return
    if (!orgId) return
    fetchAdminChurns(orgId)
  }, [activeTab, orgId])

  const kpis = dash?.kpis
  const charts = dash?.charts
  const tables = dash?.tables

  const allSources = useMemo(() => {
    if (!tables) return []
    const s1 = (tables.lastDetections || []).map((x: any) => x.source)
    const s2 = (tables.top5SinglePromptDetections || []).map((x: any) => x.source)
    const s3 = (tables.highRiskEvents || []).map((x: any) => x.source)
    return uniq([...s1, ...s2, ...s3].filter(Boolean))
  }, [tables])

  const allUsers = useMemo(() => {
    if (!tables) return []
    const u1 = (tables.lastDetections || []).map((x: any) => x.user)
    const u2 = (tables.top5RiskyUsers || []).map((x: any) => x.user)
    const u3 = (tables.top5SinglePromptDetections || []).map((x: any) => x.user)
    const u4 = (tables.highRiskEvents || []).map((x: any) => x.user)
    return uniq([...u1, ...u2, ...u3, ...u4].filter((x) => x && x !== "-"))
  }, [tables])

  const adminEvents = useMemo(() => uniq(adminLogs.map((x) => x.event).filter(Boolean)), [adminLogs])
  const adminLevels = useMemo(() => uniq(adminLogs.map((x) => x.level).filter(Boolean)), [adminLogs])
  const adminActors = useMemo(() => uniq(adminLogs.map((x) => x.actor).filter((x) => x && x !== "-")), [adminLogs])

  const filteredSinglePrompt = useMemo(() => {
    const base = arr(tables?.top5SinglePromptDetections)
    return base.filter((r: any) => {
      const st = searchText.trim().toLowerCase()
      const okSearch =
        !st ||
        safeText(r.user).toLowerCase().includes(st) ||
        safeText(r.source).toLowerCase().includes(st) ||
        safeText(r.originalFull).toLowerCase().includes(st) ||
        safeText(r.redactedFull).toLowerCase().includes(st) ||
        safeText(r.requestId).toLowerCase().includes(st)

      const okSource = sourceFilter === "all" ? true : r.source === sourceFilter
      const okUser = userFilter === "all" ? true : r.user === userFilter
      return okSearch && okSource && okUser
    })
  }, [tables, searchText, sourceFilter, userFilter])

  const filteredHighRisk = useMemo(() => {
    const base = arr(tables?.highRiskEvents)
    return base.filter((r: any) => {
      const st = searchText.trim().toLowerCase()
      const okSearch =
        !st ||
        safeText(r.user).toLowerCase().includes(st) ||
        safeText(r.source).toLowerCase().includes(st) ||
        safeText(r.requestId).toLowerCase().includes(st) ||
        safeText(r.ts).toLowerCase().includes(st) ||
        safeText(r.categories?.join(",")).toLowerCase().includes(st)

      const okSource = sourceFilter === "all" ? true : r.source === sourceFilter
      const okUser = userFilter === "all" ? true : r.user === userFilter
      return okSearch && okSource && okUser
    })
  }, [tables, searchText, sourceFilter, userFilter])

  const filteredAdminLogs = useMemo(() => {
    const st = searchText.trim().toLowerCase()
    return adminLogs.filter((r: any) => {
      const okSearch =
        !st ||
        safeText(r.event).toLowerCase().includes(st) ||
        safeText(r.actor).toLowerCase().includes(st) ||
        safeText(r.targetName).toLowerCase().includes(st) ||
        safeText(r.targetType).toLowerCase().includes(st) ||
        safeText(r.outcome).toLowerCase().includes(st) ||
        safeText(r.ts).toLowerCase().includes(st) ||
        safeText(r.http).toLowerCase().includes(st)

      const okEvent = adminEventFilter === "all" ? true : r.event === adminEventFilter
      const okLevel = adminLevelFilter === "all" ? true : r.level === adminLevelFilter
      const okUser = userFilter === "all" ? true : r.actor === userFilter

      return okSearch && okEvent && okLevel && okUser
    })
  }, [adminLogs, searchText, adminEventFilter, adminLevelFilter, userFilter])

  const adminCharts = useMemo(() => buildAdminCharts(filteredAdminLogs), [filteredAdminLogs])

  function copyToClipboard(text: string) {
    try {
      navigator.clipboard.writeText(text)
    } catch {
      // ignore
    }
  }

  if (loading) return <DashboardSkeleton />
  if (!dash) return <EmptyState message={errorMsg} />

  return (
    <div className="min-h-screen bg-transparent text-slate-100">
      <div className="relative mx-auto max-w-7xl px-5 py-10 lg:px-8">
        <Header
          orgName={orgName}
          lastUpdated={lastUpdated}
          onRefresh={() => fetchDash(orgId)}
          isRefreshing={isRefreshing}
          refreshPulse={refreshPulse}
        />

        <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-4">
          <div className="shrink-0">
            <Tabs active={activeTab} onChange={setActiveTab} userRole={userRole} />
          </div>

          <div className="flex flex-1 flex-wrap items-center justify-end gap-3">
            <SearchBox value={searchText} onChange={setSearchText} />

            {activeTab === "admin" ? (
              <>
                <SelectDropdown
                  value={adminEventFilter}
                  onChange={setAdminEventFilter}
                  icon={Filter}
                  label="Event"
                  options={[{ value: "all", label: "All events" }, ...adminEvents.map((e) => ({ value: e, label: e }))]}
                />
                <SelectDropdown
                  value={adminLevelFilter}
                  onChange={setAdminLevelFilter}
                  icon={Filter}
                  label="Level"
                  options={[{ value: "all", label: "All levels" }, ...adminLevels.map((l) => ({ value: l, label: l }))]}
                />
              </>
            ) : (
              <SelectDropdown
                value={sourceFilter}
                onChange={setSourceFilter}
                icon={Filter}
                label="Source"
                options={[{ value: "all", label: "All sources" }, ...allSources.map((s) => ({ value: s, label: s }))]}
              />
            )}

            <SelectDropdown
              value={userFilter}
              onChange={setUserFilter}
              icon={UsersIcon}
              label={activeTab === "admin" ? "Actor" : "User"}
              options={[
                { value: "all", label: activeTab === "admin" ? "All actors" : "All users" },
                ...(activeTab === "admin" ? adminActors : allUsers).map((u) => ({ value: u, label: u })),
              ]}
            />
          </div>
        </div>

        {/* OVERVIEW */}
        {activeTab === "overview" ? (
          <>
            <section className="mt-8">
              <div className="mb-4 flex items-end justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold tracking-tight text-slate-100">Security Overview</h2>
                  <p className="text-sm text-slate-400">KPIs and trends for your org, without the chaos.</p>
                </div>
                <div className="hidden sm:flex items-center">
                  <CardActionPill label="Live telemetry" icon={Activity} />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                <KPI icon={Activity} label="Total Events" value={fmtNum(kpis.totalEvents)} />
                <KPI icon={ScanSearch} label="Prompts Scanned" value={fmtNum(kpis.promptsScanned)} />
                <KPI icon={ShieldAlert} label="Detected Events" value={fmtNum(kpis.detectedEvents)} />

                <KPI icon={Shield} label="PII Detected" value={fmtNum(kpis.piiDetected)} />
                <KPI icon={ShieldCheck} label="PHI Detected" value={fmtNum(kpis.phiDetected)} />
                <KPI icon={ShieldX} label="PCI Detected" value={fmtNum(kpis.pciDetected)} />

                <KPI icon={KeyRound} label="Secrets Detected" value={fmtNum(kpis.secretsDetected)} />
                <KPI icon={Server} label="Infrastructure Detected" value={fmtNum(kpis.infrastructureDetected)} />

                <KPI
                  icon={Flame}
                  label="High Risk"
                  value={fmtNum(kpis.highRisk)}
                  accent="text-red-200"
                  ring="ring-red-500/20"
                  glow="shadow-[0_0_0_1px_rgba(239,68,68,0.18),0_20px_60px_-30px_rgba(239,68,68,0.55)]"
                />
                <KPI icon={Ban} label="Blocked" value={fmtNum(kpis.blocked)} />
                <KPI icon={Eraser} label="Redacted" value={fmtNum(kpis.redacted)} />
                <KPI icon={Percent} label="Detection Rate" value={fmtPct(kpis.detectionRatePct, 0)} />
              </div>
            </section>

            <section className="mt-10 space-y-6">
              <Grid3>
                <CardShell
                  title="Events Over Time"
                  subtitle="Detected vs total events by day."
                  right={<CardActionPill label="Live" icon={Activity} />}
                >
                  <LineMulti data={charts.eventsTimeSeries} />
                </CardShell>

                <CardShell
                  title="Category Distribution"
                  subtitle="Aggregated categories across PII, PHI, PCI, Secrets, Infra, Custom."
                  right={<CardActionPill label="Breakdown" icon={ShieldAlert} />}
                >
                  <PieC data={charts.categoryDistribution} />
                </CardShell>

                <CardShell
                  title="Category Volume"
                  subtitle="Totals per major group."
                  right={<CardActionPill label="Volume" icon={Activity} />}
                  onExpand={() => setExpandedChart({ title: "Category Volume", data: charts.categoryBar })}
                >
                  <BarC data={charts.categoryBar} />
                </CardShell>
              </Grid3>

              <Grid3>
                <CardShell
                  title="PII Categories"
                  subtitle="PII detections by type."
                  right={<CardActionPill label="PII" icon={Shield} />}
                  onExpand={() => setExpandedChart({ title: "PII Categories", data: charts.piiCategoryBar })}
                >
                  <BarC data={charts.piiCategoryBar} />
                </CardShell>

                <CardShell
                  title="PHI Categories"
                  subtitle="PHI detections by type."
                  right={<CardActionPill label="PHI" icon={ShieldCheck} />}
                  onExpand={() => setExpandedChart({ title: "PHI Categories", data: charts.phiCategoryBar })}
                >
                  <BarC data={charts.phiCategoryBar} />
                </CardShell>

                <CardShell
                  title="PCI Categories"
                  subtitle="PCI detections by type."
                  right={<CardActionPill label="PCI" icon={ShieldX} />}
                  onExpand={() => setExpandedChart({ title: "PCI Categories", data: charts.pciCategoryBar })}
                >
                  <BarC data={charts.pciCategoryBar} />
                </CardShell>
              </Grid3>

              <Grid3>
                <CardShell
                  title="Secrets Categories"
                  subtitle="Secrets detections by type."
                  right={<CardActionPill label="Secrets" icon={KeyRound} />}
                  onExpand={() => setExpandedChart({ title: "Secrets Categories", data: charts.secretsCategoryBar })}
                >
                  <BarC data={charts.secretsCategoryBar} />
                </CardShell>

                <CardShell
                  title="Infrastructure Categories"
                  subtitle="Infrastructure detections by type."
                  right={<CardActionPill label="Infra" icon={Server} />}
                  onExpand={() => setExpandedChart({ title: "Infrastructure Categories", data: charts.infrastructureCategoryBar })}
                >
                  <BarC data={charts.infrastructureCategoryBar} />
                </CardShell>

                <CardShell
                  title="Risk Distribution"
                  subtitle="events by risk_level from backend."
                  right={<CardActionPill label="Risk" icon={Flame} />}
                  onExpand={() => setExpandedChart({ title: "Risk Distribution", data: charts.riskDistribution })}
                >
                  <BarC data={charts.riskDistribution} />
                </CardShell>
              </Grid3>
            </section>

            <section className="mt-10 space-y-6">
              <Grid2>
                <CardShell title="Last 5 Detections" subtitle="Most recent detection events." right={<CardActionPill label="Audit" icon={History} />}>
                  <TableWrap maxHClass="max-h-[420px]">
                    <ExpandableTable
                      headers={["Time", "User", "Source", "Risk", "Findings"]}
                      rows={tables.lastDetections.map((r: any, idx: number) => {
                        const rowKey = makeRowKey("lastDetections", r, idx)
                        return {
                          key: rowKey,
                          cells: [
                            r.ts,
                            r.user,
                            <Tag key={`${rowKey}-src`} value={r.source} />,
                            <RiskPill key={`${rowKey}-risk`} value={r.risk} />,
                            r.findings,
                          ],
                          expanded: <ExpandedDetection r={r} onCopy={copyToClipboard} />,
                        }
                      })}
                    />
                  </TableWrap>
                </CardShell>

                <CardShell title="Top Risky Users" subtitle="Highest detection counts and rates." right={<CardActionPill label="Top" icon={UsersIcon} />}>
                  <TableWrap maxHClass="max-h-[420px]">
                    <Table
                      headers={["User", "Detections", "Total Events", "Rate %"]}
                      rows={tables.top5RiskyUsers.map((u: any) => [
                        <div key={u.user} className="flex items-center justify-between gap-3">
                          <span className="truncate">{u.user}</span>
                          <button
                            className="inline-flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950/20 px-2 py-1 text-xs text-slate-300 hover:bg-slate-900/30"
                            onClick={(e) => {
                              e.stopPropagation()
                              copyToClipboard(u.user)
                            }}
                            type="button"
                          >
                            <Copy className="h-3.5 w-3.5" />
                            Copy
                          </button>
                        </div>,
                        fmtNum(u.detections),
                        fmtNum(u.total),
                        fmtNum(u.rate),
                      ])}
                    />
                  </TableWrap>
                </CardShell>
              </Grid2>
            </section>
          </>
        ) : null}

        {/* DETECTIONS */}
        {activeTab === "detections" ? (
          <section className="mt-8 space-y-6">
            <div className="flex items-end justify-between gap-4">


            </div>

            <CardShell
              title={`Detections (${detTotal.toLocaleString()})`}
              subtitle="Most recent first. Click a row to expand."
              right={<CardActionPill label="Audit" icon={ShieldAlert} />}
            >
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                  <div className="text-xs text-slate-400">
                    Showing{" "}
                    <span className="text-slate-100 font-semibold">{detTotal ? (detPage - 1) * detPageSize + 1 : 0}</span>{" "}
                    to{" "}
                    <span className="text-slate-100 font-semibold">{Math.min(detPage * detPageSize, detTotal)}</span> of{" "}
                    <span className="text-slate-100 font-semibold">{detTotal.toLocaleString()}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">Rows</span>
                    <select
                      value={detPageSize}
                      onChange={(e) => setDetPageSize(Number(e.target.value))}
                      className="rounded-xl border border-slate-800/70 bg-slate-900/30 px-2 py-1 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/25"
                    >
                      {[10, 25, 50, 100].map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={() => fetchDetectionsPage()}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-2 text-sm font-semibold text-slate-100 hover:bg-slate-900/55"
                    >
                      <RefreshCw className={`h-4 w-4 ${detLoading ? "animate-spin" : ""}`} />
                      Refresh
                    </button>
                  </div>
                </div>

                {detLoading ? (
                  <div className="p-6 text-sm text-slate-400">Loading detections...</div>
                ) : detError ? (
                  <div className="p-6">
                    <InlineError message={detError} />
                  </div>
                ) : (
                  <TableWrap maxHClass="max-h-[560px]">
                    <ExpandableTable
                      headers={["Time", "User", "Source", "Findings", "Prompt (preview)"]}
                      rows={detRows.map((r: any, idx: number) => {
                        const rowKey = makeRowKey("detectionsPage", r, idx)
                        return {
                          key: rowKey,
                          cells: [r.ts, r.user, <Tag key={`${rowKey}-src`} value={r.source} />, (r.categories?.length ? r.categories.join(", ") : "-"), r.originalPreview],
                          expanded: <ExpandedDetection r={r} onCopy={copyToClipboard} />,
                        }
                      })}
                    />
                  </TableWrap>
                )}

                <div className="flex items-center justify-between gap-2 px-1">
                  <button
                    type="button"
                    onClick={() => setDetPage((p) => Math.max(1, p - 1))}
                    disabled={detPage <= 1 || detLoading}
                    className={[
                      "rounded-xl border border-slate-800 px-3 py-2 text-sm font-semibold",
                      detPage <= 1 || detLoading
                        ? "bg-slate-900/20 text-slate-500 cursor-not-allowed"
                        : "bg-slate-900/40 text-slate-100 hover:bg-slate-900/55",
                    ].join(" ")}
                  >
                    Prev
                  </button>

                  <div className="text-sm text-slate-300">
                    Page <span className="font-semibold text-slate-100">{detPage}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setDetPage((p) => p + 1)}
                    disabled={detLoading || detPage * detPageSize >= detTotal}
                    className={[
                      "rounded-xl border border-slate-800 px-3 py-2 text-sm font-semibold",
                      detLoading || detPage * detPageSize >= detTotal
                        ? "bg-slate-900/20 text-slate-500 cursor-not-allowed"
                        : "bg-slate-900/40 text-slate-100 hover:bg-slate-900/55",
                    ].join(" ")}
                  >
                    Next
                  </button>
                </div>
              </div>
            </CardShell>

            {/* TOP 5 SINGLE-PROMPT DETECTIONS */}
            {filteredSinglePrompt.length > 0 && (
              <CardShell
                title="Top 5 Single-Prompt Detections"
                subtitle="Prompts with the most detections found in a single submission."
                right={<CardActionPill label="Hotspots" icon={Flame} />}
              >
                <TableWrap maxHClass="max-h-[480px]">
                  <ExpandableTable
                    headers={["Time", "User", "Source", "Findings Count", "Prompt (preview)"]}
                    rows={filteredSinglePrompt.map((r: any, idx: number) => {
                      const rowKey = makeRowKey("top5single", r, idx)
                      return {
                        key: rowKey,
                        cells: [
                          r.ts,
                          r.user,
                          <Tag key={`${rowKey}-src`} value={r.source} />,
                          <span key={`${rowKey}-cnt`} className="font-bold text-amber-400">{r.findingsCount}</span>,
                          r.originalPreview,
                        ],
                        expanded: <ExpandedDetection r={r} onCopy={copyToClipboard} />,
                      }
                    })}
                  />
                </TableWrap>
              </CardShell>
            )}
          </section>
        ) : null}

        {/* USERS */}
        {activeTab === "users" ? (
          <section className="mt-8 space-y-6">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-slate-100">Users</h2>
                <p className="text-sm text-slate-400">Who is triggering detections and how often.</p>
              </div>
              <div className="hidden sm:flex items-center gap-2">
                <CardActionPill label="User risk" icon={UsersIcon} />
              </div>
            </div>

            <Grid2>
              <CardShell title="Top Risky Users" subtitle="Detection counts and rates." right={<CardActionPill label="Leaderboard" icon={UsersIcon} />}>
                <TableWrap maxHClass="max-h-[520px]">
                  <Table
                    headers={["User", "Detections", "Total Events", "Rate %"]}
                    rows={tables.top5RiskyUsers.map((u: any) => [
                      <div key={u.user} className="flex items-center justify-between gap-3">
                        <span className="truncate">{u.user}</span>
                        <div className="flex items-center gap-2">
                          <button
                            className="inline-flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950/20 px-2 py-1 text-xs text-slate-300 hover:bg-slate-900/30"
                            onClick={(e) => {
                              e.stopPropagation()
                              copyToClipboard(u.user)
                            }}
                            type="button"
                          >
                            <Copy className="h-3.5 w-3.5" />
                            Copy
                          </button>
                          <button
                            className="inline-flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950/20 px-2 py-1 text-xs text-slate-300 hover:bg-slate-900/30"
                            onClick={(e) => {
                              e.stopPropagation()
                              setUserFilter(u.user)
                            }}
                            type="button"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            Filter
                          </button>
                        </div>
                      </div>,
                      fmtNum(u.detections),
                      fmtNum(u.total),
                      fmtNum(u.rate),
                    ])}
                  />
                </TableWrap>
              </CardShell>

              <CardShell
                title="Risk Distribution"
                subtitle="Backend risk_level buckets."
                right={<CardActionPill label="Risk" icon={Flame} />}
                onExpand={() => setExpandedChart({ title: "Risk Distribution", data: charts.riskDistribution })}
              >
                <BarC data={charts.riskDistribution} />
              </CardShell>
            </Grid2>
          </section>
        ) : null}

        {/* HIGH RISK */}
        {activeTab === "highrisk" ? (
          <section className="mt-8 space-y-6">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-slate-100">High Risk Events</h2>
                <p className="text-sm text-slate-400">These are the events that make security teams pretend they are calm.</p>
              </div>
              <div className="hidden sm:flex items-center gap-2">
                <CardActionPill label="Escalation" icon={Flame} />
              </div>
            </div>

            <Grid2>
              <CardShell title={`High Risk List (${filteredHighRisk.length})`} subtitle="Search and filters apply." right={<CardActionPill label="High" icon={Flame} />}>
                <TableWrap maxHClass="max-h-[560px]">
                  <Table
                    headers={["Time", "User", "Source", "Findings", "Categories"]}
                    rows={filteredHighRisk.map((r: any, idx: number) => {
                      const rowKey = makeRowKey("highRisk", r, idx)
                      return [
                        r.ts,
                        r.user,
                        <Tag key={`${rowKey}-src`} value={r.source} />,
                        <div key={`${rowKey}-find`} className="flex items-center gap-2">
                          <RiskPill value={r.risk} />
                          <span className="text-slate-200 tabular-nums">{fmtNum(r.findingsCount)}</span>
                        </div>,
                        <div key={`${rowKey}-cats`} className="flex flex-wrap gap-2">
                          {arr(r.categories)
                            .slice(0, 6)
                            .map((c: string, i: number) => (
                              <MiniTag key={`${rowKey}-${safeText(c)}-${i}`} value={c} />
                            ))}
                          {arr(r.categories).length > 6 ? <MiniTag value={`+${arr(r.categories).length - 6}`} /> : null}
                        </div>,
                      ]
                    })}
                  />
                </TableWrap>
              </CardShell>

              <CardShell
                title="Event Risk Timeline"
                subtitle="risk_findings_count per request."
                right={<CardActionPill label="Timeline" icon={History} />}
                onExpand={() => setExpandedChart({ title: "Event Risk Timeline", data: charts.eventRiskTimeline })}
              >
                <RiskTimeline data={charts.eventRiskTimeline} />
              </CardShell>
            </Grid2>
          </section>
        ) : null}

        {/* ADMIN */}
        {activeTab === "admin" ? (
          <section className="mt-8 space-y-6">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-slate-100">Admin Activity</h2>
                <p className="text-sm text-slate-400">Authentication and configuration changes across the org.</p>
              </div>
              <div className="hidden sm:flex items-center gap-2">
                <CardActionPill label="Audit log" icon={Settings} />
              </div>
            </div>

            <section className="space-y-6">
              <Grid3>
                <div className="grid grid-cols-2 gap-4 lg:col-span-1">
                  <KPI icon={Activity} label="Admin Events" value={fmtNum(adminCharts.kpis.total)} />
                  <KPI icon={UsersIcon} label="Unique Actors" value={fmtNum(adminCharts.kpis.uniqueActors)} />
                  <KPI icon={Settings} label="Unique Events" value={fmtNum(adminCharts.kpis.uniqueEvents)} />
                  <KPI icon={ShieldCheck} label="Success Rate" value={fmtPct(adminCharts.kpis.successRatePct, 0)} />
                </div>

                <CardShell
                  title="Admin Activity Over Time"
                  subtitle="Last 48 hours (hour buckets)."
                  right={<CardActionPill label="Trend" icon={History} />}
                  onExpand={() => setExpandedChart({ title: "Admin Activity Over Time", data: adminCharts.activityOverTime.map((x: any) => ({ k: x.t, v: x.v })) })}
                >
                  <BarCCompact data={adminCharts.activityOverTime.map((x: any) => ({ k: x.t, v: x.v }))} />
                </CardShell>

                <CardShell title="Outcome Split" subtitle="success vs fail from outcome_status." right={<CardActionPill label="Outcome" icon={ShieldAlert} />}>
                  <PieC data={adminCharts.outcomeSplit} />
                </CardShell>
              </Grid3>

              <Grid3>
                <CardShell
                  title="Events by Type"
                  subtitle="Top event names by count."
                  right={<CardActionPill label="Events" icon={Filter} />}
                  onExpand={() => setExpandedChart({ title: "Events by Type", data: adminCharts.eventsByType })}
                >
                  <BarC data={adminCharts.eventsByType} />
                </CardShell>

                <CardShell
                  title="Top Actors"
                  subtitle="Most active users making changes."
                  right={<CardActionPill label="Actors" icon={UsersIcon} />}
                  onExpand={() => setExpandedChart({ title: "Top Actors", data: adminCharts.topActors })}
                >
                  <BarC data={adminCharts.topActors} />
                </CardShell>

                <CardShell
                  title="HTTP Status"
                  subtitle="Most common status codes."
                  right={<CardActionPill label="HTTP" icon={Server} />}
                  onExpand={() => setExpandedChart({ title: "HTTP Status", data: adminCharts.httpStatus })}
                >
                  <BarC data={adminCharts.httpStatus} />
                </CardShell>
              </Grid3>
            </section>

            <div className="w-full">
              <CardShell
                title={`Admin Activity (${filteredAdminLogs.length})`}
                subtitle="Shows login + CRUD events. Expand to view context."
                right={
                  <button
                    type="button"
                    onClick={() => fetchAdminChurns(orgId)}
                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900/40 px-4 py-2 text-sm font-semibold text-slate-100 hover:bg-slate-900/55"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Refresh
                  </button>
                }
              >
                {adminLoading ? (
                  <div className="p-6 text-sm text-slate-400">Loading admin logs...</div>
                ) : adminError ? (
                  <div className="p-6">
                    <InlineError message={adminError} />
                  </div>
                ) : (
                  <TableWrap maxHClass="max-h-[640px]">
                    <ExpandableTable
                      headers={["Time", "Level", "Event", "Actor", "Target", "Outcome", "HTTP"]}
                      rows={filteredAdminLogs.map((r: any) => ({
                        key: r.key,
                        cells: [
                          r.ts,
                          <AdminLevelPill key={`${r.key}-lvl`} value={r.level} />,
                          r.event,
                          r.actor,
                          `${r.targetType}:${r.targetName}`,
                          <AdminOutcomePill key={`${r.key}-out`} value={r.outcome} />,
                          String(r.http),
                        ],
                        expanded: <ExpandedAdminLog r={r} onCopy={copyToClipboard} />,
                      }))}
                    />
                  </TableWrap>
                )}
              </CardShell>
            </div>
          </section>
        ) : null}

        {errorMsg ? (
          <div className="mt-8">
            <InlineError message={errorMsg} />
          </div>
        ) : null}
      </div>

      <FullScreenChartModal chart={expandedChart} onClose={() => setExpandedChart(null)} />
    </div>
  )
}

/* ===================== UI COMPONENTS ===================== */

function InlineError({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100">
      <div className="font-semibold">Something went wrong</div>
      <div className="mt-1 text-red-200/90">{message}</div>
    </div>
  )
}

function CardShell({
  title,
  subtitle,
  right,
  onExpand,
  children,
}: {
  title: string
  subtitle?: string
  right?: React.ReactNode
  onExpand?: () => void
  children: React.ReactNode
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/35 p-5 shadow-[0_0_0_1px_rgba(15,23,42,0.35),0_22px_70px_-48px_rgba(37,99,235,0.55)]">
      <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
        <div className="absolute -top-24 -right-24 h-56 w-56 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute -bottom-28 -left-28 h-56 w-56 rounded-full bg-sky-400/8 blur-3xl" />
      </div>

      <div className="relative mb-4 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-slate-100 tracking-tight">{title}</h3>
          {subtitle ? <p className="mt-1 text-xs text-slate-400">{subtitle}</p> : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {onExpand ? (
            <button
              onClick={onExpand}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700/60 bg-slate-900/40 text-slate-300 hover:bg-slate-800 hover:text-slate-100 transition-colors"
              title="View All"
            >
              <Maximize2 className="h-4 w-4" />
            </button>
          ) : null}
          {right ? <div className="shrink-0">{right}</div> : null}
        </div>
      </div>
      {/* <div className="relative">{children}</div> */}
      <div className="relative rounded-2xl border border-slate-800/70 bg-slate-950/25 p-3">{children}</div>
    </div>
  )
}

function CardActionPill({ label, icon: Icon }: any) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-slate-700/60 bg-slate-900/40 px-3 py-1 text-xs text-slate-300">
      <Icon className="h-4 w-4 text-slate-300" />
      {label}
    </div>
  )
}

function TableWrap({ children, maxHClass = "max-h-[420px]" }: { children: React.ReactNode; maxHClass?: string }) {
  return (
    <div className="overflow-hidden rounded-2xl bg-slate-950/20">
      <div className={["overflow-auto", maxHClass, "overscroll-contain"].join(" ")}>{children}</div>
    </div>
  )
}

function Header({
  orgName,
  lastUpdated,
  onRefresh,
  isRefreshing,
  refreshPulse,
}: {
  orgName: string
  lastUpdated: string
  onRefresh: () => void
  isRefreshing: boolean
  refreshPulse: boolean
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-100">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-400">Threat signals and detections in one view.</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="rounded-2xl border border-blue-500/25 bg-blue-500/10 px-4 py-2">
          <div className="text-[11px] uppercase tracking-wide text-slate-400">Org</div>
          <div className="text-sm font-semibold text-slate-100">{orgName ? orgName : "Unknown"}</div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 px-4 py-2">
          <div className="text-[11px] uppercase tracking-wide text-slate-400">Status</div>
          <div className="inline-flex items-center gap-2 text-sm font-semibold text-slate-100">
            <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_0_3px_rgba(16,185,129,0.15)]" />
            Active
          </div>
        </div>

        <div
          className={[
            "rounded-2xl border border-slate-800 bg-slate-900/40 px-4 py-2 transition-all",
            refreshPulse ? "ring-2 ring-blue-500/25 shadow-[0_0_0_1px_rgba(56,189,248,0.25)]" : "",
          ].join(" ")}
        >
          <div className="text-[11px] uppercase tracking-wide text-slate-400">Updated</div>
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
            <span>{lastUpdated || "-"}</span>
            {refreshPulse ? (
              <span className="inline-flex items-center rounded-full border border-blue-500/25 bg-blue-500/10 px-2 py-0.5 text-[11px] text-blue-200">
                Just now
              </span>
            ) : null}
          </div>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          disabled={isRefreshing}
          className={[
            "inline-flex items-center gap-2 rounded-2xl border border-slate-800 px-4 py-2 text-sm font-semibold",
            isRefreshing ? "bg-slate-900/30 text-slate-400 cursor-not-allowed" : "bg-slate-900/40 text-slate-100 hover:bg-slate-900/55",
          ].join(" ")}
        >
          <RefreshCw className={["h-4 w-4", isRefreshing ? "animate-spin" : ""].join(" ")} />
          {isRefreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>
    </div>
  )
}

function Tabs({ active, onChange, userRole }: { active: TabKey; onChange: (k: TabKey) => void; userRole: string }) {
  const userRolesList = userRole.split(",").map(r => r.trim());
  const isAdmin = userRolesList.some(r => ["ADMIN", "ORG_ADMIN"].includes(r));
  const items: { k: TabKey; label: string; icon: any }[] = [
    { k: "overview", label: "Overview", icon: Activity },
    { k: "detections", label: "Detections", icon: ShieldAlert },
    { k: "users", label: "Users", icon: UsersIcon },
    { k: "highrisk", label: "High Risk", icon: Flame },
    ...(isAdmin ? [{ k: "admin" as TabKey, label: "Admin", icon: Settings }] : []),
  ]
  return (
    <div className="inline-flex flex-wrap items-center gap-2 rounded-2xl border border-slate-800/70 bg-slate-900/30 p-2">
      {items.map((it) => {
        const Icon = it.icon
        const isActive = active === it.k
        return (
          <button
            key={it.k}
            type="button"
            onClick={() => onChange(it.k)}
            className={[
              "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-colors",
              isActive ? "bg-blue-500/12 text-slate-100 border border-blue-500/25" : "text-slate-300 hover:bg-slate-900/40 border border-transparent",
            ].join(" ")}
          >
            <Icon className="h-4 w-4" />
            {it.label}
          </button>
        )
      })}
    </div>
  )
}

function SearchBox({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search requestId, user, source, prompt..."
        className="w-full sm:w-[360px] lg:w-[460px] rounded-2xl border border-slate-800/70 bg-slate-900/30 pl-10 pr-4 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/25"
      />
    </div>
  )
}

/* ===================== DROPDOWN ===================== */

function SelectDropdown({
  value,
  onChange,
  icon: Icon,
  label,
  options,
}: {
  value: string
  onChange: (v: string) => void
  icon: any
  label: string
  options: { value: string; label: string }[]
}) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement | null>(null)

  const selected = options.find((o) => o.value === value) || options[0]

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!wrapRef.current) return
      if (wrapRef.current.contains(e.target as Node)) return
      setOpen(false)
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", onDocClick)
    document.addEventListener("keydown", onEsc)
    return () => {
      document.removeEventListener("mousedown", onDocClick)
      document.removeEventListener("keydown", onEsc)
    }
  }, [])

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((s) => !s)}
        className={[
          "flex items-center gap-2 rounded-2xl border border-slate-800/70 bg-slate-900/30 px-3 py-2",
          "hover:bg-slate-900/45 transition-colors",
          "focus:outline-none focus:ring-2 focus:ring-blue-500/25",
          "w-full sm:w-[220px]",
        ].join(" ")}
      >
        <Icon className="h-4 w-4 text-slate-400" />
        <div className="text-[11px] uppercase tracking-wide text-slate-500">{label}</div>
        <div className="ml-2 flex-1 text-left text-sm font-semibold text-slate-100 truncate">{selected?.label}</div>
        <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open ? (
        <div
          className={[
            "absolute right-0 mt-2 w-full z-50",
            "rounded-2xl border border-slate-800/80 bg-slate-950/95 backdrop-blur",
            "shadow-[0_0_0_1px_rgba(15,23,42,0.6),0_24px_80px_-40px_rgba(37,99,235,0.55)]",
            "overflow-hidden",
          ].join(" ")}
        >
          <div className="max-h-64 overflow-auto py-1">
            {options.map((opt) => {
              const active = opt.value === value
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value)
                    setOpen(false)
                  }}
                  className={[
                    "w-full text-left px-3 py-2 text-sm",
                    active ? "bg-blue-500/15 text-slate-100" : "text-slate-200 hover:bg-slate-900/50",
                    "transition-colors",
                  ].join(" ")}
                >
                  <span className="truncate block">{opt.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      ) : null}
    </div>
  )
}

function Tag({ value }: { value: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-slate-700/60 bg-slate-900/40 px-3 py-1 text-xs text-slate-200">
      {value}
    </span>
  )
}
function MiniTag({ value }: { value: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-slate-700/60 bg-slate-900/30 px-2 py-0.5 text-[11px] text-slate-200">
      {value}
    </span>
  )
}

const KPI = ({ label, value, accent, icon: Icon, ring, glow }: any) => (
  <div
    className={[
      "group relative overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/35 p-4",
      "shadow-[0_0_0_1px_rgba(15,23,42,0.35),0_20px_60px_-45px_rgba(37,99,235,0.55)]",
      "transition-transform duration-200 hover:-translate-y-[1px]",
      ring ? `ring-1 ${ring}` : "ring-1 ring-blue-500/10",
      glow || "",
    ].join(" ")}
  >
    <div className="absolute inset-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
      <div className="absolute -top-20 -right-24 h-44 w-44 rounded-full bg-blue-500/15 blur-2xl" />
      <div className="absolute -bottom-20 -left-24 h-44 w-44 rounded-full bg-sky-400/10 blur-2xl" />
    </div>

    <div className="relative flex items-start justify-between gap-4">
      <div>
        <div className="text-[11px] uppercase tracking-wide text-slate-400">{label}</div>
        <div className={`mt-2 text-2xl font-semibold tracking-tight tabular-nums ${accent || "text-slate-100"}`}>{value}</div>
      </div>

      <div className="mt-1 rounded-xl border border-slate-800 bg-slate-950/30 p-2 text-blue-300">
        <Icon className="h-5 w-5" />
      </div>
    </div>
  </div>
)

const Grid3 = ({ children }: any) => <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">{children}</div>
const Grid2 = ({ children }: any) => <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">{children}</div>

/* ===================== CHARTS ===================== */

function ChartEmpty({ message = "No data available." }: { message?: string }) {
  return (
    <div className="flex h-[280px] items-center justify-center rounded-2xl border border-slate-800/60 bg-slate-950/20">
      <div className="text-sm text-slate-400">{message}</div>
    </div>
  )
}

const CHART = {
  grid: "rgba(148,163,184,0.10)",
  axis: "rgba(51,65,85,0.75)",
  tick: "rgba(148,163,184,0.90)",
  cursor: "rgba(148,163,184,0.06)",
  strokeMain: "#2563eb",
  strokeAlt: "#38bdf8",
}

const axisTick = { fill: CHART.tick, fontSize: 12 }
const axisLine = { stroke: CHART.axis }
const tickLine = { stroke: CHART.axis }

function clampText(s: string, n = 10) {
  if (!s) return ""
  return s.length > n ? s.slice(0, n - 1) + "…" : s
}

function isDateLike(s: any) {
  if (typeof s !== "string") return false
  return /^\d{4}-\d{2}-\d{2}/.test(s) || /^\d{1,2}\/\d{1,2}\/\d{2,4}/.test(s)
}

function fmtXAxisLabel(v: any) {
  if (!v) return ""
  const s = String(v)
  if (!isDateLike(s)) return clampText(s, 10)
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return clampText(s, 10)
  return d.toLocaleDateString(undefined, { month: "short", day: "2-digit" })
}

function fmtYAxisLabel(v: any) {
  const n = Number(v)
  if (!Number.isFinite(n)) return ""
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}m`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return String(n)
}
function fmtTooltipLabel(v: any) {
  if (v == null) return ""
  const s = String(v)
  if (!isDateLike(s)) return s
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return s
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" })
}

function TooltipShell({ label, children }: { label?: any; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-700/70 bg-slate-950/95 px-3 py-2 shadow-[0_0_0_1px_rgba(15,23,42,0.6),0_24px_80px_-40px_rgba(37,99,235,0.55)] backdrop-blur">
      {label != null ? <div className="text-[11px] font-semibold text-slate-200 break-words max-w-[320px]">{fmtTooltipLabel(label)}</div> : null}
      <div className="mt-1 space-y-1">{children}</div>
    </div>
  )
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null

  return (
    <TooltipShell label={label}>
      {payload.map((p: any, i: number) => {
        const name = p?.name ?? p?.dataKey ?? p?.payload?.k ?? "-"
        const val = p?.value
        return (
          <div key={i} className="flex items-center justify-between gap-8 text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              <span className="h-2 w-2 rounded-full" style={{ background: p.color || CHART.strokeAlt }} />
              <span className="truncate max-w-[190px]">{String(name)}</span>
            </div>
            <div className="font-semibold text-slate-100 tabular-nums">{typeof val === "number" ? val.toLocaleString() : String(val)}</div>
          </div>
        )
      })}
    </TooltipShell>
  )
}

function DonutLegend({ data }: { data: { k: string; v: number }[] }) {
  const total = data.reduce((a, b) => a + (Number(b.v) || 0), 0)
  return (
    <div className="mt-3 grid grid-cols-2 gap-2">
      {data.slice(0, 8).map((x, i) => {
        const pct = total ? ((x.v / total) * 100).toFixed(0) : "0"
        return (
          <div key={`${x.k}-${i}`} className="flex items-center justify-between gap-3 rounded-xl border border-slate-800/70 bg-slate-950/20 px-3 py-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
              <span className="text-xs text-slate-200 truncate">{x.k}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-slate-400 tabular-nums">{pct}%</span>
              <span className="text-xs font-semibold text-slate-100 tabular-nums">{Number(x.v).toLocaleString()}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function LineMulti({ data }: any) {
  const d = Array.isArray(data) ? data : []
  if (!d.length) return <ChartEmpty />

  return (
    <div className="h-[280px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={d} margin={{ top: 10, right: 14, bottom: 10, left: 6 }}>
          <CartesianGrid stroke={CHART.grid} strokeDasharray="3 6" vertical={false} />
          <XAxis dataKey="t" tick={axisTick} axisLine={axisLine} tickLine={tickLine} tickFormatter={fmtXAxisLabel} minTickGap={16} />
          <YAxis tick={axisTick} axisLine={axisLine} tickLine={tickLine} tickFormatter={fmtYAxisLabel} width={44} />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: CHART.cursor, strokeWidth: 1 }} />
          <Line type="monotone" dataKey="total" name="Total" stroke={CHART.strokeMain} strokeWidth={2} dot={false} opacity={0.9} />
          <Line type="monotone" dataKey="detected" name="Detected" stroke={CHART.strokeAlt} strokeWidth={3} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export function BarC({ data }: { data: any }) {
  const raw = Array.isArray(data) ? data : []
  if (!raw.length) return <ChartEmpty />

  const nonZero = raw.filter((x: any) => asNum(x?.v, 0) > 0)
  // Sort descending and take top 12 for the overview
  const sorted = [...nonZero].sort((a, b) => (Number(b.v) || 0) - (Number(a.v) || 0))
  const d = sorted.length > 0 ? sorted.slice(0, 6) : raw.slice(0, 6)

  const labelMax = d.reduce((m: number, x: any) => Math.max(m, safeText(x?.k).length), 0)

  // Vertical columns with angled labels
  const rotate = labelMax >= 6 || d.length >= 6
  const angle = -45
  const height = rotate ? 100 : 44
  const tickClamp = rotate ? 24 : 12

  return (
    <div className="h-[340px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={d} margin={{ top: 10, right: 14, bottom: 20, left: 6 }}>
          <defs>
            <linearGradient id="barFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CHART.strokeMain} stopOpacity={0.95} />
              <stop offset="100%" stopColor={CHART.strokeMain} stopOpacity={0.35} />
            </linearGradient>
          </defs>

          <CartesianGrid stroke={CHART.grid} strokeDasharray="3 6" vertical={false} />

          <XAxis
            dataKey="k"
            tick={axisTick}
            axisLine={axisLine}
            tickLine={tickLine}
            tickFormatter={(v) => clampText(String(v), tickClamp)}
            interval={0}
            angle={angle}
            textAnchor="end"
            height={height}
            tickMargin={12}
          />
          <YAxis tick={axisTick} axisLine={axisLine} tickLine={tickLine} tickFormatter={fmtYAxisLabel} width={44} />

          <Tooltip cursor={{ fill: CHART.cursor }} content={<ChartTooltip />} />
          <Bar dataKey="v" name="Count" fill="url(#barFill)" radius={[12, 12, 4, 4]} barSize={d.length > 8 ? 24 : 34} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function FullScreenChartModal({ chart, onClose }: { chart: { title: string; data: any[] } | null; onClose: () => void }) {
  if (!chart) return null

  // In the modal, we use the FULL dataset and HORIZONTAL bars (layout="vertical")
  const data = [...chart.data].sort((a, b) => (Number(b.v) || 0) - (Number(a.v) || 0))
  const labelMax = data.reduce((m, x) => Math.max(m, safeText(x?.k).length), 0)
  const yWidth = Math.min(260, Math.max(120, labelMax * 8))

  const chartHeight = Math.max(500, data.length * 36)

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 md:p-8">
      <div className="relative flex h-full w-full max-w-5xl flex-col rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <div>
            <h2 className="text-xl font-bold text-slate-100">{chart.title}</h2>
            <p className="text-sm text-slate-400">Complete dataset ({data.length} items)</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-6 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900">
          <div style={{ height: chartHeight }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} layout="vertical" margin={{ top: 20, right: 30, bottom: 20, left: 10 }}>
                <defs>
                  <linearGradient id="barFillModal" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor={CHART.strokeMain} stopOpacity={0.95} />
                    <stop offset="100%" stopColor={CHART.strokeMain} stopOpacity={0.35} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={CHART.grid} strokeDasharray="3 6" horizontal={false} />
                <XAxis type="number" tick={axisTick} axisLine={axisLine} tickLine={tickLine} tickFormatter={fmtYAxisLabel} />
                <YAxis
                  type="category"
                  dataKey="k"
                  tick={axisTick}
                  axisLine={axisLine}
                  tickLine={tickLine}
                  width={yWidth}
                  tickFormatter={(v) => String(v)}
                />
                <Tooltip cursor={{ fill: CHART.cursor }} content={<ChartTooltip />} />
                <Bar dataKey="v" name="Count" fill="url(#barFillModal)" radius={[0, 10, 10, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="border-t border-slate-800 bg-slate-950/50 px-6 py-4 text-center">
          <p className="text-xs text-slate-500">Horizontal layout used for readability of large datasets.</p>
        </div>
      </div>
    </div>
  )
}

export function BarCCompact({ data, onExpand }: { data: any; onExpand?: () => void }) {
  const d = Array.isArray(data) ? data : []
  if (!d.length) return <ChartEmpty />

  return (
    <div className="h-[280px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={d} margin={{ top: 10, right: 14, bottom: 10, left: 6 }}>
          <defs>
            <linearGradient id="barFillCompact" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CHART.strokeMain} stopOpacity={0.9} />
              <stop offset="100%" stopColor={CHART.strokeMain} stopOpacity={0.25} />
            </linearGradient>
          </defs>

          <CartesianGrid stroke={CHART.grid} strokeDasharray="3 6" vertical={false} />
          <XAxis dataKey="k" tick={false} axisLine={axisLine} tickLine={false} />
          <YAxis tick={axisTick} axisLine={axisLine} tickLine={tickLine} tickFormatter={fmtYAxisLabel} width={44} />
          <Tooltip cursor={{ fill: CHART.cursor }} content={<ChartTooltip />} />
          <Bar dataKey="v" name="Count" fill="url(#barFillCompact)" radius={[12, 12, 8, 8]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function RiskTimeline({ data }: any) {
  const d = Array.isArray(data) ? data : []
  if (!d.length) return <ChartEmpty message="No risk timeline data." />

  const mapped = d.slice(0, 100).map((x: any, i: number) => ({
    i: i + 1,
    v: asNum(x.findingsCount, 0),
  }))

  return (
    <div className="h-[280px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={mapped} margin={{ top: 10, right: 14, bottom: 10, left: 6 }}>
          <defs>
            <linearGradient id="riskAreaFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CHART.strokeAlt} stopOpacity={0.4} />
              <stop offset="100%" stopColor={CHART.strokeAlt} stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid stroke={CHART.grid} strokeDasharray="3 6" vertical={false} />
          <XAxis dataKey="i" tick={axisTick} axisLine={axisLine} tickLine={tickLine} />
          <YAxis tick={axisTick} axisLine={axisLine} tickLine={tickLine} tickFormatter={fmtYAxisLabel} width={44} />
          <Tooltip content={<ChartTooltip />} />
          <Area
            type="monotone"
            dataKey="v"
            name="Risk Findings"
            stroke={CHART.strokeAlt}
            strokeWidth={2}
            fill="url(#riskAreaFill)"
            animationDuration={800}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

export function PieC({ data }: any) {
  const dRaw = Array.isArray(data) ? data : []
  const d = dRaw.filter((x: any) => Number(x?.v) > 0)
  if (!d.length) return <ChartEmpty />

  const total = d.reduce((a: number, b: any) => a + (Number(b.v) || 0), 0)

  return (
    <div>
      <div className="h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <defs>
              <filter id="donutShadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="6" stdDeviation="10" floodColor="rgba(37,99,235,0.35)" />
              </filter>
            </defs>

            <Pie
              data={d}
              dataKey="v"
              nameKey="k"
              outerRadius={92}
              innerRadius={58}
              paddingAngle={2}
              stroke="rgba(15,23,42,0.92)"
              strokeWidth={2}
              isAnimationActive={true}
              filter="url(#donutShadow)"
            >
              {d.map((_: any, i: number) => (
                <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>

            <text x="50%" y="48%" textAnchor="middle" dominantBaseline="middle" fill="rgba(226,232,240,0.95)" fontSize="20" fontWeight="700">
              {total.toLocaleString()}
            </text>
            <text x="50%" y="58%" textAnchor="middle" dominantBaseline="middle" fill="rgba(148,163,184,0.9)" fontSize="11">
              Total detections
            </text>

            <Tooltip content={<ChartTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <DonutLegend data={d} />
    </div>
  )
}

/* ===================== TABLES ===================== */

const Table = ({ headers, rows }: any) => (
  <div className="w-full overflow-x-auto">
    <table className="min-w-[640px] w-full text-sm">
      <thead className="bg-slate-950/55 backdrop-blur">
        <tr>
          {headers.map((h: any) => (
            <th key={h} className="p-3 text-left text-[11px] uppercase tracking-wide text-slate-400">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r: any[], i: number) => (
          <tr
            key={i}
            className={[
              "border-t border-slate-800/70",
              "hover:bg-slate-900/35 transition-colors",
              i % 2 === 0 ? "bg-slate-950/10" : "bg-transparent",
            ].join(" ")}
          >
            {r.map((c, j) => (
              <td key={j} className="p-3 text-slate-200 align-top">
                {c}
              </td>
            ))}
          </tr>
        ))}
        {!rows.length ? (
          <tr className="border-t border-slate-800/70">
            <td className="p-6 text-center text-sm text-slate-400" colSpan={headers.length}>
              No rows to display.
            </td>
          </tr>
        ) : null}
      </tbody>
    </table>
  </div>
)

const ExpandableTable = ({
  headers,
  rows,
}: {
  headers: string[]
  rows: { key: string; cells: React.ReactNode[]; expanded: React.ReactNode }[]
}) => {
  const [openKey, setOpenKey] = useState<string | null>(null)

  return (
    <div className="w-full overflow-x-auto">
      <table className="min-w-[760px] w-full text-sm">
        <thead className="bg-slate-950/55 backdrop-blur">
          <tr>
            <th className="p-3 w-[52px]" />
            {headers.map((h: any) => (
              <th key={h} className="p-3 text-left text-[11px] uppercase tracking-wide text-slate-400">
                {h}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {rows.map((row, i) => {
            const isOpen = openKey === row.key
            return (
              <React.Fragment key={row.key}>
                <tr
                  className={[
                    "border-t border-slate-800/70",
                    "hover:bg-slate-900/35 transition-colors",
                    i % 2 === 0 ? "bg-slate-950/10" : "bg-transparent",
                    "cursor-pointer",
                  ].join(" ")}
                  onClick={() => setOpenKey(isOpen ? null : row.key)}
                >
                  <td className="p-3 text-slate-300 align-top">
                    <span className="inline-flex items-center justify-center h-7 w-7 rounded-lg border border-slate-800 bg-slate-950/30">
                      {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </span>
                  </td>

                  {row.cells.map((c, j) => (
                    <td key={j} className="p-3 text-slate-200 align-top">
                      {c}
                    </td>
                  ))}
                </tr>

                {isOpen ? (
                  <tr className="border-t border-slate-800/70 bg-slate-950/20">
                    <td className="p-0" colSpan={headers.length + 1}>
                      <div className="p-4">{row.expanded}</div>
                    </td>
                  </tr>
                ) : null}
              </React.Fragment>
            )
          })}

          {!rows.length ? (
            <tr className="border-t border-slate-800/70">
              <td className="p-6 text-center text-sm text-slate-400" colSpan={headers.length + 1}>
                No rows to display.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  )
}

function ExpandedDetection({ r, onCopy }: { r: any; onCopy: (t: string) => void }) {
  const pairs = Array.isArray(r.categories) ? r.categories.length : 0
  const findingsCount = r.findingsCount != null ? r.findingsCount : pairs

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <span className="inline-flex items-center rounded-full border border-slate-700/60 bg-slate-900/40 px-3 py-1 text-xs text-slate-200">
          Request ID: <span className="ml-2 font-semibold text-slate-100">{r.requestId || "-"}</span>
        </span>
        <span className="inline-flex items-center rounded-full border border-slate-700/60 bg-slate-900/40 px-3 py-1 text-xs text-slate-200">
          Findings: <span className="ml-2 font-semibold text-slate-100">{fmtNum(findingsCount)}</span>
        </span>
        <span className="inline-flex items-center rounded-full border border-slate-700/60 bg-slate-900/40 px-3 py-1 text-xs text-slate-200">
          Source: <span className="ml-2 font-semibold text-slate-100">{r.source || "-"}</span>
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onCopy(safeText(r.originalFull || r.original || ""))
          }}
          className="inline-flex items-center gap-2 rounded-full border border-slate-700/60 bg-slate-900/40 px-3 py-1 text-xs text-slate-200 hover:bg-slate-900/55"
        >
          <Copy className="h-3.5 w-3.5" />
          Copy original
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onCopy(safeText(r.redactedFull || r.redacted || ""))
          }}
          className="inline-flex items-center gap-2 rounded-full border border-slate-700/60 bg-slate-900/40 px-3 py-1 text-xs text-slate-200 hover:bg-slate-900/55"
        >
          <Copy className="h-3.5 w-3.5" />
          Copy redacted
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-slate-800/70 bg-slate-950/30 p-3">
          <div className="text-[11px] uppercase tracking-wide text-slate-400">Original prompt</div>
          <pre className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-200">{r.originalFull || r.original || "-"}</pre>
        </div>

        <div className="rounded-2xl border border-slate-800/70 bg-slate-950/30 p-3">
          <div className="text-[11px] uppercase tracking-wide text-slate-400">Redacted prompt</div>
          <pre className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-200">{r.redactedFull || r.redacted || "-"}</pre>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800/70 bg-slate-950/30">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800/70">
          <div className="text-[11px] uppercase tracking-wide text-slate-400">Findings detail</div>
          <div className="text-xs text-slate-400">pairs: {fmtNum(pairs)}</div>
        </div>

        <div className="w-full overflow-x-auto">
          <table className="min-w-[760px] w-full text-sm">
            <thead className="bg-slate-950/40">
              <tr>
                <th className="p-3 text-left text-[11px] uppercase tracking-wide text-slate-400">Category</th>
                <th className="p-3 text-left text-[11px] uppercase tracking-wide text-slate-400">Group</th>
                <th className="p-3 text-left text-[11px] uppercase tracking-wide text-slate-400">Value</th>
                <th className="p-3 text-left text-[11px] uppercase tracking-wide text-slate-400">Confidence</th>
              </tr>
            </thead>
            <tbody>
              {pairs ? (
                Array.from({ length: pairs }).map((_, i) => (
                  <tr key={i} className="border-t border-slate-800/70 hover:bg-slate-900/25 transition-colors">
                    <td className="p-3 text-slate-200">{r.categories?.[i] ?? "-"}</td>
                    <td className="p-3 text-slate-200">{r.groups?.[i] ?? "-"}</td>
                    <td className="p-3 text-slate-200">{r.values?.[i] ?? "-"}</td>
                    <td className="p-3 text-slate-200">{r.confidence?.[i] != null ? String(r.confidence[i]) : "-"}</td>
                  </tr>
                ))
              ) : (
                <tr className="border-t border-slate-800/70">
                  <td className="p-4 text-slate-400" colSpan={4}>
                    No findings detail found on this record.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function RiskPill({ value }: { value: any }) {
  const v = String(value ?? "").toLowerCase()
  const isHigh = v.includes("high") || v.includes("critical") || v.includes("sev")
  const isMed = v.includes("med") || v.includes("moderate")
  const cls = isHigh
    ? "border-red-500/30 bg-red-500/10 text-red-200"
    : isMed
      ? "border-amber-500/30 bg-amber-500/10 text-amber-200"
      : "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"

  return <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${cls}`}>{value}</span>
}

/* ---------------- Admin UI bits ---------------- */

function AdminLevelPill({ value }: { value: any }) {
  const v = String(value ?? "").toLowerCase()
  const cls =
    v.includes("error") || v.includes("fatal")
      ? "border-red-500/30 bg-red-500/10 text-red-200"
      : v.includes("warn")
        ? "border-amber-500/30 bg-amber-500/10 text-amber-200"
        : "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"

  return <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${cls}`}>{value}</span>
}

function AdminOutcomePill({ value }: { value: any }) {
  const v = String(value ?? "").toLowerCase()
  const cls =
    v.includes("fail") || v.includes("error")
      ? "border-red-500/30 bg-red-500/10 text-red-200"
      : "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"

  return <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${cls}`}>{value}</span>
}

function humanizeKey(s: string) {
  if (!s) return ""
  return s
    .replace(/_/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (c) => c.toUpperCase())
}

function isDiffContext(obj: any) {
  if (!obj || typeof obj !== "object") return false
  return typeof obj.diff === "object" || typeof obj.updatedFields === "object"
}

function normalizeDiff(contextObj: any) {
  const diff = contextObj?.diff || {}
  const updated = contextObj?.updatedFields || null

  const keys = updated
    ? Object.keys(updated)
      .sort((a, b) => Number(a) - Number(b))
      .map((k) => String(updated[k]))
    : Object.keys(diff)

  function normalizeDiffCell(v: any) {
    if (v == null) return "-"
    if (typeof v === "string") {
      const s = v.trim()
      if (!s) return "-"
      if (s === "[object Object]") return { note: "Backend sent invalid value", raw: s }
      if ((s.startsWith("{") && s.endsWith("}")) || (s.startsWith("[") && s.endsWith("]"))) {
        const parsed = safeJsonParse(s)
        return parsed == null ? s : parsed
      }
      return s
    }
    return normalizeWeirdObject(v)
  }

  return keys
    .map((k) => {
      const d = diff[k]
      if (!d) return null
      return {
        field: k,
        label: humanizeKey(k),
        oldVal: normalizeDiffCell(d.old),
        newVal: normalizeDiffCell(d.new),
      }
    })
    .filter(Boolean)
}

function isPlainObject(v: any) {
  return v != null && typeof v === "object" && !Array.isArray(v)
}

function safeStringify(v: any) {
  try {
    return JSON.stringify(v, null, 2)
  } catch {
    return String(v)
  }
}

function truncate(s: string, max = 220) {
  if (!s) return ""
  return s.length > max ? s.slice(0, max - 1) + "…" : s
}

function renderDiffValue(v: any) {
  if (v == null) return <span className="text-slate-500">-</span>

  if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
    return <span className="break-words">{String(v)}</span>
  }

  if (Array.isArray(v)) {
    const preview = truncate(safeStringify(v), 260)
    return (
      <div className="space-y-1">
        <div className="text-xs text-slate-400">Array ({v.length})</div>
        <pre className="whitespace-pre-wrap break-words text-xs text-slate-200">{preview}</pre>
      </div>
    )
  }

  if (isPlainObject(v)) {
    const preview = truncate(safeStringify(v), 260)
    return (
      <div className="space-y-1">
        <div className="text-xs text-slate-400">Object</div>
        <pre className="whitespace-pre-wrap break-words text-xs text-slate-200">{preview}</pre>
      </div>
    )
  }

  return <span className="break-words">{truncate(String(v), 220)}</span>
}

function normalizeWeirdObject(v: any) {
  if (!v || typeof v !== "object") return v

  const keys = Object.keys(v)

  // If keys are numeric ("0","1","2") → convert to array
  if (keys.length && keys.every(k => /^\d+$/.test(k))) {
    return keys
      .sort((a, b) => Number(a) - Number(b))
      .map(k => v[k])
  }

  return v
}

function deepCleanObject(obj: any): any {
  if (!obj || typeof obj !== "object") return obj

  // If this is Mongo ObjectId buffer → remove it
  if ("buffer" in obj && typeof obj.buffer === "object") {
    return undefined
  }

  const cleaned: any = {}

  for (const [key, value] of Object.entries(obj)) {
    // Remove internal Mongo fields
    if (
      key === "_id" ||
      key === "__v" ||
      key === "org" ||
      key === "updatedAt" ||
      key === "createdAt"
    ) {
      continue
    }

    const cleanedValue = deepCleanObject(value)

    if (cleanedValue !== undefined) {
      cleaned[key] = cleanedValue
    }
  }

  return cleaned
}

function ExpandedAdminLog({ r, onCopy }: { r: any; onCopy: (t: string) => void }) {
  const target = `${r.targetType}:${r.targetName}`
  const contextObj = r.contextObj
  const isDiff = isDiffContext(contextObj)
  const changes = isDiff ? normalizeDiff(contextObj) : []
  const oldObj = normalizeWeirdObject(
    deepCleanObject(safeJsonParse(r.old_value))
  )

  const newObj = normalizeWeirdObject(
    deepCleanObject(safeJsonParse(r.new_value))
  )
  const hasOldData = oldObj && typeof oldObj === "object" && Object.keys(oldObj).length > 0
  const hasNewData = newObj && typeof newObj === "object" && Object.keys(newObj).length > 0
  const event = r.event || ""

  const isUpdate = event.includes(".update")
  const isCreate = event.includes(".create")
  const isDelete = event.includes(".delete")
  const isLogin =
    event.includes("login") ||
    event.includes("email_verified") ||
    event.includes("signup")

  const rawText = typeof r.contextRaw === "string" ? r.contextRaw : JSON.stringify(contextObj ?? {}, null, 2)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <span className="inline-flex items-center rounded-full border border-slate-700/60 bg-slate-900/40 px-3 py-1 text-xs">
          Event: <span className="ml-2 font-semibold text-slate-100">{r.event}</span>
        </span>
        <span className="inline-flex items-center rounded-full border border-slate-700/60 bg-slate-900/40 px-3 py-1 text-xs">
          Actor: <span className="ml-2 font-semibold text-slate-100">{r.actor}</span>
        </span>
        <span className="inline-flex items-center rounded-full border border-slate-700/60 bg-slate-900/40 px-3 py-1 text-xs">
          Target: <span className="ml-2 font-semibold text-slate-100">{target}</span>
        </span>
        <span className="inline-flex items-center rounded-full border border-slate-700/60 bg-slate-900/40 px-3 py-1 text-xs">
          HTTP: <span className="ml-2 font-semibold text-slate-100">{r.http}</span>
        </span>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onCopy(rawText)
          }}
          className="inline-flex items-center gap-2 rounded-full border border-slate-700/60 bg-slate-900/40 px-3 py-1 text-xs hover:bg-slate-900/55"
        >
          <Copy className="h-3.5 w-3.5" />
          Copy context
        </button>
      </div>

      <div className="rounded-2xl border border-slate-800/70 bg-slate-950/30 p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-[11px] uppercase tracking-wide text-slate-400">Context</div>
          {isDiff ? (
            <span className="rounded-full border border-blue-500/25 bg-blue-500/10 px-2 py-0.5 text-[11px] text-blue-200">
              Change summary
            </span>
          ) : null}
        </div>

        {/* UPDATE EVENTS */}
        {isUpdate && isDiff && changes.length ? (
          <DiffTable changes={changes} />
        ) : null}

        {/* CREATE EVENTS */}
        {isCreate && hasNewData ? (
          <SnapshotTable title="Created Resource Details" data={newObj} />
        ) : null}

        {/* DELETE EVENTS */}
        {isDelete && hasOldData ? (
          <SnapshotTable title="Deleted Resource Snapshot" data={oldObj} />
        ) : null}

        {/* LOGIN / AUTH EVENTS */}
        {isLogin ? (
          <AuthEventBlock r={r} />
        ) : null}

        {/* Fallback */}
        {!isUpdate && !isCreate && !isDelete && !isLogin ? (
          <pre className="whitespace-pre-wrap break-words text-sm text-slate-200">
            {rawText || "Empty"}
          </pre>
        ) : null}
      </div>
    </div>
  )
}

function DiffTable({ changes }: any) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-800/70">
      <table className="min-w-[720px] w-full text-sm">
        <thead className="bg-slate-950/60">
          <tr>
            <th className="p-3 text-left text-[11px] uppercase tracking-wide text-slate-400">Field</th>
            <th className="p-3 text-left text-[11px] uppercase tracking-wide text-slate-400">Old</th>
            <th className="p-3 text-left text-[11px] uppercase tracking-wide text-slate-400">New</th>
          </tr>
        </thead>
        <tbody>
          {changes.map((c: any, i: number) => (
            <tr key={i} className="border-t border-slate-800/70">
              <td className="p-3 font-semibold text-slate-200">{c.label}</td>
              <td className="p-3 text-slate-300">{renderNiceValue(c.oldVal)}</td>
              <td className="p-3 text-slate-100">{renderNiceValue(c.newVal)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function SnapshotTable({ title, data }: any) {
  const cleanData = deepCleanObject(data || {})
  const entries = Object.entries(cleanData)

  return (
    <div>
      <div className="text-xs text-slate-400 mb-2">{title}</div>
      <div className="overflow-hidden rounded-xl border border-slate-800/70">
        <table className="min-w-[720px] w-full text-sm">
          <thead className="bg-slate-950/60">
            <tr>
              <th className="p-3 text-left text-[11px] uppercase tracking-wide text-slate-400">Field</th>
              <th className="p-3 text-left text-[11px] uppercase tracking-wide text-slate-400">Value</th>
            </tr>
          </thead>
          <tbody>
            {entries.map(([k, v]: any, i: number) => (
              <tr key={i} className="border-t border-slate-800/70">
                <td className="p-3 font-semibold text-slate-200">{humanizeKey(k)}</td>
                <td className="p-3 text-slate-100">
                  {renderNiceValue(normalizeWeirdObject(v))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function AuthEventBlock({ r }: any) {
  return (
    <div className="rounded-xl border border-slate-800/70 bg-slate-950/30 p-4">
      <div className="text-xs text-slate-400 mb-3">Authentication Event</div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
        <div>
          <div className="text-slate-400 text-xs">Actor</div>
          <div className="text-slate-100 font-semibold">{r.actor}</div>
        </div>

        <div>
          <div className="text-slate-400 text-xs">Outcome</div>
          <div className="text-slate-100 font-semibold">{r.outcome}</div>
        </div>

        <div>
          <div className="text-slate-400 text-xs">HTTP</div>
          <div className="text-slate-100 font-semibold">{r.http}</div>
        </div>

        <div>
          <div className="text-slate-400 text-xs">Timestamp</div>
          <div className="text-slate-100 font-semibold">{r.ts}</div>
        </div>
      </div>
    </div>
  )
}

function renderNiceValue(v: any) {
  if (v == null) return <span className="text-slate-500">-</span>

  if (Array.isArray(v)) {
    return (
      <div className="flex flex-wrap gap-2">
        {v.map((x, i) => (
          <span key={i} className="px-2 py-1 text-xs rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-200">
            {String(x)}
          </span>
        ))}
      </div>
    )
  }

  if (typeof v === "object") {
    return (
      <pre className="whitespace-pre-wrap text-xs text-slate-300">
        {JSON.stringify(v, null, 2)}
      </pre>
    )
  }

  return <span>{String(v)}</span>
}

/* ===================== STATES ===================== */

function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
        <div className="h-8 w-44 rounded-lg bg-slate-800/50 animate-pulse" />
        <div className="mt-2 h-4 w-96 rounded bg-slate-800/40 animate-pulse" />
        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="h-[92px] rounded-2xl border border-slate-800/70 bg-slate-900/30 animate-pulse" />
          ))}
        </div>
        <div className="mt-6 h-12 rounded-2xl border border-slate-800/70 bg-slate-900/30 animate-pulse" />
        <div className="mt-10 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-[380px] rounded-2xl border border-slate-800/70 bg-slate-900/30 animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  )
}

function EmptyState({ message }: { message?: string }) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-6">
      <div className="max-w-md rounded-2xl border border-slate-800/80 bg-slate-900/35 p-6 text-center">
        <UsersIcon className="mx-auto h-10 w-10 text-blue-300" />
        <h2 className="mt-3 text-lg font-semibold">No dashboard data</h2>
        <p className="mt-1 text-sm text-slate-400">{message || "The API returned no payload, or org is missing from session."}</p>
      </div>
    </div>
  )
}