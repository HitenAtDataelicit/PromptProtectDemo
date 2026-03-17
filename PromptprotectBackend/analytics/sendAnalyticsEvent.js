const { clickhouse } = require("../config/clickhouse.js");

function normalize(obj) {
  if (!obj || typeof obj !== "object") return obj;

  if (obj._bsontype === "ObjectId") return obj.toString();
  if (Buffer.isBuffer(obj)) return obj.toString("hex");
  if (Array.isArray(obj)) return obj.map(normalize);

  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [k, normalize(v)])
  );
}

function formatTimestamp(inputTs) {
  const d = inputTs ? new Date(inputTs) : new Date();
  return d.toISOString().slice(0, 19).replace("T", " ");
}

async function sendAnalyticsEvent(event) {
  try {
    const normalized = normalize({
      ...event,
      ts: formatTimestamp(event.ts),
    });


    await clickhouse.insert({
      table: "pii_analytics_final",
      values: [normalized],
      format: "JSONEachRow",
    });

  } catch (err) {
    console.error("ClickHouse insert failed:", err.message);
  }
}

function toClickHouseDateTime(input) {
  if (!input) return null;
  const d = new Date(input);
  return d.toISOString().replace("T", " ").replace("Z", "").split(".")[0];
}

async function insertAuditLog(log) {
  const row = {
    ts: toClickHouseDateTime(log.ts),
    org: log.org,
    level: log.level,
    event: log.event,

    actor_type: log.actor?.type || null,
    actor_id: log.actor?.id || null,
    actor_email: log.actor?.email || log.actor?.uname || null,

    target_type: log.target?.type || null,
    target_id: log.target?.id || null,
    target_name: log.target?.name || log.target?.email || null,

    outcome_status: log.outcome?.status || null,
    http_status: log.outcome?.httpStatus || null,

    source: log.trace?.source || null,

    context: JSON.stringify(log.context || {}),
    old_value: JSON.stringify(normalize(log.old_value || {})),
    new_value: JSON.stringify(normalize(log.new_value || {})),
    raw_event: JSON.stringify(log)
  };

  await clickhouse.insert({
    table: "promptprotect_audit.audit_logs_raw",
    values: [row],
    format: "JSONEachRow"
  });
}



module.exports = { sendAnalyticsEvent, insertAuditLog };