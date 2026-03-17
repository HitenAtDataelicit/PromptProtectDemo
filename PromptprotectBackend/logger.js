const fs = require("fs")
const path = require("path")
const { insertAuditLog } = require("./analytics/sendAnalyticsEvent");

const streams = new Map()
const logsDir = path.join(__dirname, "logs")
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true })



function getStream(org) {
  const safeOrg = String(org).replace(/[^a-zA-Z0-9_-]/g, "_")

  if (!streams.has(safeOrg)) {
    const stream = fs.createWriteStream(
      path.join(logsDir, `${safeOrg}.log`),
      { flags: "a" }
    )

    stream.on("error", err => {
      console.error("Audit log stream error:", err)
    })

    streams.set(safeOrg, stream)
  }

  return streams.get(safeOrg)
}

function sanitize(obj) {
  if (!obj || typeof obj !== "object") return obj
  const SENSITIVE = ["password", "userPassword", "token", "apiKey"]
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => {
      if (SENSITIVE.includes(k)) return [k, "***REDACTED***"]
      return [k, typeof v === "object" ? sanitize(v) : v]
    })
  )
}

function auditLog(org, payload = {}) {
  if (!payload.event) {
    throw new Error("auditLog requires 'event'")
  }

  const entry = sanitize({
    ts: Date.now(),
    org,
    level: payload.level || "INFO",
    ...payload
  })

  if (!entry.event.startsWith("pii.scan") && !entry.event.startsWith("user.action")) {
    insertAuditLog(entry).catch(err => {
      console.error("ClickHouse audit insert failed:", err.message);
    });
  }


  getStream(org).write(JSON.stringify(entry) + "\n")
}

module.exports = { auditLog }