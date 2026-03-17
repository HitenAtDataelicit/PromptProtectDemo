const { clickhouse } = require("../config/clickhouse");

/* =========================
   PUBLIC API
========================= */

async function getDashboardData({ org, userEmail, userRole, page, pageSize }) {
  // console.log(" DASHBOARD REQUEST:", { org, userEmail, userRole });

  if (!org) {
    throw new Error("Organization name is required for dashboard data");
  }

  const isAdmin = ["ADMIN", "ORG_ADMIN"].includes(userRole);

  const params = isAdmin
    ? { org }
    : { org, userEmail };

  const userCondition = isAdmin
    ? ""
    : "AND actor_email = {userEmail:String}";

  // Pagination defaults
  const pg = Math.max(1, parseInt(page) || 1);
  const ps = Math.min(100, Math.max(1, parseInt(pageSize) || 25));

  const [
    kpis,
    eventsOverTime,
    categoryDistributionPII,
    categoryDistributionPCI,
    categoryDistributionPHI,
    categoryDistributionINFRA,
    categoryDistributionSECRETS,
    categoryDistributionCRYPTO,
    categoryDistributionCUSTOM,
    eventRiskTimeline,
    highRiskEvents,
    riskDistribution,
    lastDetectionsResult,
    top5RiskyUsers,
    top5SinglePromptDetections
  ] = await Promise.all([
    getKPIs(org, userCondition, params),
    getEventsOverTime(org, userCondition, params),
    getCategoryDistribution(org, "pii", userCondition, params),
    getCategoryDistribution(org, "pci", userCondition, params),
    getCategoryDistribution(org, "phi", userCondition, params),
    getCategoryDistribution(org, "infrastructure", userCondition, params),
    getCategoryDistribution(org, "secrets", userCondition, params),
    getCategoryDistribution(org, "cryptocurrency", userCondition, params),
    getCategoryDistribution(org, "custom", userCondition, params),
    getEventRiskTimeline(org, userCondition, params),
    getHighRiskEvents(org, userCondition, params),
    getRiskDistribution(org, userCondition, params),
    getLastDetections(org, userCondition, params, pg, ps),
    getTop5RiskyUsers(org, params),
    getTop5SinglePromptDetections(org, userCondition, params)
  ]);

  return {
    kpis,
    charts: {
      eventsOverTime,
      categoryDistributionPII,
      categoryDistributionPCI,
      categoryDistributionPHI,
      categoryDistributionINFRA,
      categoryDistributionSECRETS,
      categoryDistributionCRYPTO,
      categoryDistributionCUSTOM,
      riskDistribution
    },
    tables: {
      eventRiskTimeline,
      highRiskEvents,
      lastDetections: lastDetectionsResult.rows,
      top5RiskyUsers,
      top5SinglePromptDetections
    },
    total: lastDetectionsResult.total,
    page: pg,
    pageSize: ps
  };
}

module.exports = { getDashboardData, getAuditLogs };



function getKPIs(org, userCondition, params) {
  return q(`
    SELECT
      count() AS total_events,
      countIf(pii_detected = 1) AS detected_events,
      countIf(arrayExists(x -> x = 'pii', \`findings.group\`)) AS pii_detected_count,
      countIf(arrayExists(x -> x = 'phi', \`findings.group\`)) AS phi_detected_count,
      countIf(arrayExists(x -> x = 'pci', \`findings.group\`)) AS pci_detected_count,
      countIf(arrayExists(x -> x = 'secrets', \`findings.group\`)) AS secrets_detected_count,
      countIf(arrayExists(x -> x = 'infrastructure', \`findings.group\`)) AS infrastructure_detected_count,
      countIf(arrayExists(x -> x = 'custom', \`findings.group\`)) AS custom_detected_count,
      countIf(action_taken = 'REDACT') AS redact_count,
      countIf(action_taken = 'PARTIAL_REDACT') AS partial_redact_count,
      countIf(action_taken = 'BLOCK') AS block_count,
      countIf(action_taken = 'REPORT_ONLY') AS report_only_count,
      countIf(action_taken = 'PROMPT_USER') AS prompt_user_count,
      round(if(count() = 0, 0, countIf(pii_detected = 1) / count() * 100), 2) AS detection_rate_percentage
    FROM promptprotect_audit.pii_analytics_final
    WHERE org = {org:String}
      ${userCondition}
  `, params).then(r => r[0] || {});
}


function getEventsOverTime(org, userCondition, params) {
  return q(`
    SELECT
      toDate(ts) AS date,
      count() AS total_events,
      countIf(pii_detected = 1) AS detected_events,
      round(if(count() = 0, 0, countIf(pii_detected = 1) / count() * 100), 2) AS detection_rate_percentage
    FROM promptprotect_audit.pii_analytics_final
    WHERE org = {org:String}
      ${userCondition}
    GROUP BY date
    ORDER BY date ASC
  `, params);
}

function getCategoryDistribution(org, valueGroup, userCondition, params) {
  return q(`
    SELECT
      arrayJoin(\`findings.category\`) AS k,
      count() AS v
    FROM promptprotect_audit.pii_analytics_final
    WHERE org = {org:String}
      AND arrayExists(x -> x = {valueGroup:String}, \`findings.group\`)
      AND pii_detected = 1
      ${userCondition}
    GROUP BY k
    ORDER BY v DESC
  `, { org: params.org, valueGroup, userEmail: params.userEmail });
}



/* =========================
   EVENT RISK TIMELINE
========================= */

function getEventRiskTimeline(org, userCondition, params) {
  return q(`
    SELECT
      ts,
      request_id,
      length(\`findings.category\`) AS risk_findings_count
    FROM promptprotect_audit.pii_analytics_final
    WHERE org = {org:String}
      AND pii_detected = 1
      ${userCondition}
    ORDER BY ts DESC
  `, params);
}



/* =========================
   HIGH RISK EVENTS (>=2)
========================= */

function getHighRiskEvents(org, userCondition, params) {
  return q(`
    SELECT
      ts,
      org,
      request_id,
      actor_email,
      risk_findings_count,
      pii_detected,
      \`findings.category\`,
      \`findings.group\`,
      source
    FROM promptprotect_audit.event_risk_org_view
    WHERE org = {org:String}
      AND risk_findings_count >= 10
      ${userCondition}
    ORDER BY risk_findings_count DESC
  `, params);
}



/* =========================
   RISK DISTRIBUTION
========================= */

function getRiskDistribution(org, userCondition, params) {
  return q(`
    SELECT
      length(\`findings.category\`) AS risk_level,
      count() AS events
    FROM promptprotect_audit.pii_analytics_final
    WHERE org = {org:String}
      ${userCondition}
    GROUP BY risk_level
    ORDER BY risk_level
  `, params);
}



/* =========================
   LAST DETECTIONS (paginated)
========================= */

async function getLastDetections(org, userCondition, params, page = 1, pageSize = 25) {
  const offset = (page - 1) * pageSize;
  const paginatedParams = { ...params, limit: pageSize, offset };

  const [rows, countResult] = await Promise.all([
    q(`
      SELECT
        ts,
        org,
        request_id,
        actor_email,
        source,
        \`findings.category\`,
        \`findings.value\`,
        \`findings.confidence\`,
        \`findings.group\`,
        original,
        redacted_conversation
      FROM promptprotect_audit.pii_analytics_final
      WHERE org = {org:String}
        AND pii_detected = 1
        ${userCondition}
      ORDER BY ts DESC
      LIMIT {limit:UInt32}
      OFFSET {offset:UInt32}
    `, paginatedParams),
    q(`
      SELECT count() AS cnt
      FROM promptprotect_audit.pii_analytics_final
      WHERE org = {org:String}
        AND pii_detected = 1
        ${userCondition}
    `, params)
  ]);

  return {
    rows,
    total: (countResult[0] && countResult[0].cnt) || rows.length
  };
}



function getTop5RiskyUsers(org) {
  return q(`
    SELECT
      actor_email,
      detection_count,
      total_events,
      detection_rate_percentage
    FROM
    (
      SELECT
        actor_email,
        countIf(pii_detected = 1) AS detection_count,
        count() AS total_events,
        round(
          if(count() = 0, 0,
             countIf(pii_detected = 1) / count() * 100),
          2
        ) AS detection_rate_percentage
      FROM promptprotect_audit.pii_analytics_final
      WHERE org = {org:String}
      GROUP BY actor_email
    )
    ORDER BY detection_count DESC
    LIMIT 5
  `, org);
}


function getTop5SinglePromptDetections(org, userCondition, params) {
  return q(`
    SELECT
      ts,
      org,
      request_id,
      actor_email,
      source,
      length(\`findings.category\`) AS findings_count,
      \`findings.category\`,
      \`findings.value\`,
      \`findings.confidence\`,
      \`findings.group\`,
      original,
      redacted_conversation
    FROM promptprotect_audit.pii_analytics_final
    WHERE org = {org:String}
      AND pii_detected = 1
      ${userCondition}
    ORDER BY findings_count DESC, ts DESC
    LIMIT 5
  `, params);
}

async function getAuditLogs({ org, limit = 50, offset = 0 }) {
  const query = `
    SELECT
      ts,
      level,
      event,
      actor_email,
      target_type,
      target_name,
      outcome_status,
      http_status,
      context,
      old_value,
      new_value
    FROM promptprotect_audit.vw_audit_logs_dashboard
    WHERE org = {org:String}
    ORDER BY ts DESC
    LIMIT {limit:UInt32}
    OFFSET {offset:UInt32}
  `;
  return await q(query, { org, limit, offset });
}



async function q(query, orgOrParams) {
  const query_params =
    typeof orgOrParams === "string"
      ? { org: orgOrParams }
      : orgOrParams;

  const res = await clickhouse.query({
    query,
    query_params
  });

  const json = await res.json();
  return json.data || [];
}
