const Organization = require("../models/organization.model");
const Group = require("../models/group.model");
const { scanTextWithML, applyCustomRules, CATEGORY_LOOKUP } = require("../config/scanAdv");
const { resolveUserGroups } = require("./groupResolver.service")



function normalizeCategory(v) {
  if (!v) return "";
  return String(v).trim().toLowerCase();
}

function redactWithIndices(text, findings) {
  const chars = text.split("");
  for (const f of findings) {
    const start = f.start_index ?? f.index;
    const end = start + f.value.length;
    // const label = f.secret_name
    //   ? `[${f.secret_name.toUpperCase()}]`
    //   : `[${f.category.toUpperCase()}]`;
    const label = "[REDACTED]";

    for (let i = start; i < end; i++) chars[i] = "";
    chars[start] = label;
  }
  return chars.join("");
}

function partialRedact(text, findings, visibleRatio = 0.15) {
  let output = text;

  [...findings]
    .sort((a, b) => b.index - a.index)
    .forEach(f => {
      const value = String(f.value);
      const len = value.length;

      let masked;

      // Fully redact very small values
      if (len <= 4) {
        masked = "*".repeat(len);
      } else {
        // visible characters based on ratio
        let visibleCount = Math.max(
          2,
          Math.round(len * visibleRatio)
        );

        // split visible chars between start & end
        const startVisible = Math.ceil(visibleCount / 2);
        const endVisible = Math.floor(visibleCount / 2);

        const maskedLength = len - (startVisible + endVisible);

        masked =
          value.slice(0, startVisible) +
          "*".repeat(maskedLength) +
          value.slice(len - endVisible);
      }

      output =
        output.slice(0, f.index) +
        masked +
        output.slice(f.index + len);
    });

  return output;
}


async function runPiiScan({
  apiKey,
  userEmail,
  conversation,
  url,
  requestId,
  timestamp,
  chatgptUser,
  sourceType = "PROMPT"
}) {

  const org = await Organization.findOne({ orgKey: apiKey }).lean();
  if (!org) throw new Error("Invalid API key");

  // Local or SSO groups resolved here
  const userGroups = await resolveUserGroups({
    orgId: org._id,
    userEmail
  })

  console.log(`[PiiScan] Resolved ${userGroups.length} groups for user ${userEmail}`);
  
  // 1. Gather all applicable policies sorted by priority (ascending: 1 is highest)
  const applicablePolicies = [];
  for (const group of userGroups) {
    for (const policy of group.policiesAttached || []) {
      if (policy.targetType === "BOTH" || !policy.targetType || policy.targetType === sourceType) {
        applicablePolicies.push(policy);
      }
    }
  }

  applicablePolicies.sort((a, b) => a.priority - b.priority);
  console.log(`[PiiScan] Sorted applicable policies count: ${applicablePolicies.length}`);

  // 2. Scan Text once
  const scanResult = await scanTextWithML(conversation);
  const rawFindings = scanResult.rawFindings || [];
  console.log(`[PiiScan] ML scan complete. Raw findings count: ${rawFindings.length}`);

  // 3. Evaluate each finding against the sorted policies
  const finalFindings = [];
  let globalAction = "REPORT_ONLY";
  let matchedPolicyDetails = null;

  const ACTION_PRIORITY = {
    "BLOCK": 100,
    "REDACT": 80,
    "PARTIAL_REDACT": 60,
    "PROMPT_USER": 40,
    "REPORT_ONLY": 0
  };

  for (const f of rawFindings) {
    const groupName = CATEGORY_LOOKUP[f.category];
    if (!groupName) continue;

    const ruleName = f.secret_name || f.category;
    let winningPolicy = null;
    let winningAction = "REPORT_ONLY";

    // First matching policy wins for this specific finding
    for (const policy of applicablePolicies) {
      const allowedCategories = new Set((policy.rulesForPolicy || []).map(normalizeCategory));
      
      // Check if policy covers this category
      if (allowedCategories.has(normalizeCategory(groupName))) {
        // Check if specific rule is disabled in this policy
        let isDisabled = false;
        policy.ruleConfigurations?.forEach(cfg => {
          if (normalizeCategory(cfg.category) === normalizeCategory(groupName)) {
            cfg.rules?.forEach(r => { if (r.name === ruleName && r.enabled === false) isDisabled = true; });
          }
        });

        if (!isDisabled) {
          winningPolicy = policy;
          winningAction = policy.action;
          break; // HIGHEST PRIORITY matches first
        }
      }
    }

    if (winningPolicy) {
      finalFindings.push({
        ...f,
        category: ruleName,
        group: groupName,
        winningPolicy: winningPolicy.policyName,
        action: winningAction
      });

      // Update Global Action if this action is stricter
      if (ACTION_PRIORITY[winningAction] > ACTION_PRIORITY[globalAction]) {
        globalAction = winningAction;
        matchedPolicyDetails = {
          policyName: winningPolicy.policyName,
          priority: winningPolicy.priority,
          action: winningAction
        };
      }
    }
  }

  // 4. Handle Global BLOCK
  if (globalAction === "BLOCK") {
    console.log(`[PiiScan] BLOCK triggered by policy: ${matchedPolicyDetails.policyName}`);
    return {
      orgName: org.orgName,
      piiDetected: true,
      action: "BLOCK",
      findings: finalFindings,
      matchedPolicy: matchedPolicyDetails,
      original: conversation,
      redactedConversation: null,
      timestamp, url, requestId, chatgptUser
    };
  }

  // 5. Combine Redactions
  let finalText = conversation;
  const redactionFindings = finalFindings.filter(f => f.action === "REDACT" || f.action === "PARTIAL_REDACT")
    .sort((a, b) => b.index - a.index); // Sort descending index to redact from end

  if (redactionFindings.length > 0) {
    redactionFindings.forEach(f => {
      if (f.action === "REDACT") {
        finalText = redactWithIndices(finalText, [f]);
      } else {
        finalText = partialRedact(finalText, [f]);
      }
    });
  }

  return {
    orgName: org.orgName,
    piiDetected: finalFindings.length > 0,
    action: globalAction,
    requiresUserDecision: globalAction === "PROMPT_USER",
    findings: finalFindings,
    matchedPolicy: matchedPolicyDetails || { action: "REPORT_ONLY" },
    original: conversation,
    redactedConversation: finalText,
    timestamp, url, requestId, chatgptUser
  };
}

module.exports = { runPiiScan };

