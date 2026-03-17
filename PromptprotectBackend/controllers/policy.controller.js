const Policy = require("../models/policy.model");
const Organization = require("../models/organization.model");
const User = require("../models/user.model");
const { auditLog } = require("../logger");
const { formatWithTimezone } = require("../utils/time.utils");

function computeDiff(oldObj, newObj) {
  const diff = {};
  const IGNORE = ["updatedAt", "createdAt", "__v"];

  for (const key of Object.keys(newObj)) {
    if (IGNORE.includes(key)) continue;

    if (JSON.stringify(oldObj[key]) !== JSON.stringify(newObj[key])) {
      diff[key] = {
        old: oldObj[key],
        new: newObj[key]
      };
    }
  }
  return diff;
}

async function resolvePolicyRefs(policyObj) {
  const resolved = {
    policyName: policyObj.policyName,
    rulesForPolicy: policyObj.rulesForPolicy,
    action: policyObj.action,
    ruleConfigurations: policyObj.ruleConfigurations || [],
    createdBy: policyObj.createdBy,
    updatedBy: policyObj.updatedBy
  };

  if (Array.isArray(policyObj.customRules) && policyObj.customRules.length > 0) {
    const rules = await Policy.db.model("CustomRule").find(
      { _id: { $in: policyObj.customRules } },
      "ruleName"
    ).lean();

    resolved.customRules = rules.map(r => r.ruleName);
  } else {
    resolved.customRules = [];
  }

  if (Array.isArray(policyObj.ruleConfigurations) && policyObj.ruleConfigurations.length > 0) {
    const configs = await Policy.db.model("RuleConfiguration").find(
      { _id: { $in: policyObj.ruleConfigurations } },
      "configName"
    ).lean();

    resolved.ruleConfigurations = configs.map(c => c.configName);
  } else {
    resolved.ruleConfigurations = [];
  }

  return resolved;
}


async function resolvePolicyCreateValue(policy) {
  let customRuleNames = [];

  if (Array.isArray(policy.customRules) && policy.customRules.length > 0) {
    const rules = await Policy.db.model("CustomRule").find(
      { _id: { $in: policy.customRules } },
      "ruleName"
    ).lean();

    customRuleNames = rules.map(r => r.ruleName);
  }

  return {
    policyName: policy.policyName,
    rulesForPolicy: policy.rulesForPolicy,
    customRules: customRuleNames,
    ruleConfigurations: policy.ruleConfigurations || [],
    action: policy.action,
    createdBy: policy.createdBy
  };
}



async function checkRole(createdByUserId) {
  if (!createdByUserId || createdByUserId === "null") {
    return { roleFlag: true, uname: "system" };
  }

  const user = await User.findById(createdByUserId).lean();
  if (!user || !user.userRole) {
    return { roleFlag: false };
  }

  const roleFlag = user.userRole.some(r =>
    ["ADMIN", "POLICY_MANAGER", "ORG_ADMIN"].includes(r)
  );

  const uname = user.userEmail.split("@")[0];
  return { roleFlag, uname };
}

async function isDup(policyName, orgId, currentPolicy = null) {
  const policy = await Policy.findOne({ policyName, org: orgId }).lean();
  if (!policy) return false;
  if (currentPolicy && policy.policyName === currentPolicy) return false;
  return true;
}
exports.createPolicy = async (req, res) => {
  let org = null;

  try {
    const { policyName, rulesForPolicy, customRules = [], ruleConfigurations = [], action } = req.body;
    const orgId = req.user.orgId;
    const createdByUserId = req.user.userId;

    org = await Organization.findById(orgId).lean();
    if (!org) {
      return res.status(404).json({ error: "ORGANIZATION not found" });
    }

    const { roleFlag, uname } = await checkRole(createdByUserId);
    if (!roleFlag) {
      return res.status(403).json({ error: "Not authorized" });
    }

    if (await isDup(policyName, orgId)) {
      return res.status(409).json({ error: "Policy already exists" });
    }

    const lastPolicy = await Policy
      .findOne({ org: orgId })
      .sort({ priority: -1 })
      .select("priority")
      .lean();

    const nextPriority = lastPolicy ? lastPolicy.priority + 1 : 1;


    const policy = await Policy.create({
      policyName,
      rulesForPolicy,
      customRules,
      ruleConfigurations,
      action: action || "PROMPT_USER",
      org: orgId,
      priority: nextPriority,
      createdBy: uname,
      updatedBy: uname
    });

    const cleanNewValue = await resolvePolicyCreateValue(policy);

    auditLog(org.orgName, {
      level: "INFO",
      event: "policy.create",
      actor: {
        type: "admin",
        id: createdByUserId,
        email: uname
      },
      target: {
        type: "policy",
        id: policy._id.toString(),
        name: policyName
      },
      outcome: { status: "success", httpStatus: 200 },
      new_value: cleanNewValue,
      trace: { source: "dashboard" }
    });

    res.json({ success: true, policy });

  } catch (err) {
    auditLog(org?.orgName || "unknown", {
      level: "ERROR",
      event: "policy.create.error",
      outcome: { status: "error", httpStatus: 500 },
      context: { error: err.message },
      trace: { source: "dashboard" }
    });
    res.status(500).json({ error: err.message });
  }
};



exports.getPolicies = async (req, res) => {
  try {
    const policies = await Policy.find({ org: req.user.orgId })
      .sort({ priority: 1 })
      .populate("org")
      .populate("ruleConfigurations")
      .lean();

    const formattedPolicies = policies.map(p => ({
      ...p,
      createdAt: formatWithTimezone(p.createdAt, req.user.timezone),
      updatedAt: formatWithTimezone(p.updatedAt, req.user.timezone)
    }));

    res.json({ success: true, policies: formattedPolicies });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updatePolicy = async (req, res) => {
  let org = null;

  try {
    const id = req.params.id;
    const updatedByUserId = req.user.userId;
    const { policyName, rulesForPolicy, customRules, ruleConfigurations, action } = req.body;
    const orgId = req.user.orgId;

    const policy = await Policy.findById(id);
    if (!policy) return res.status(404).json({ error: "Policy not found" });

    org = await Organization.findById(orgId || policy.org).lean();
    if (!org) return res.status(404).json({ error: "ORGANIZATION not found" });

    const { roleFlag, uname } = await checkRole(updatedByUserId);
    if (!roleFlag) return res.status(403).json({ error: "Not authorized" });

    // --- OLD (resolved) ---
    const oldResolved = await resolvePolicyRefs(policy.toObject());

    // Apply updates
    if (policyName !== undefined) policy.policyName = policyName;
    if (rulesForPolicy !== undefined) policy.rulesForPolicy = rulesForPolicy;
    if (customRules !== undefined) policy.customRules = customRules;
    if (ruleConfigurations !== undefined) policy.ruleConfigurations = ruleConfigurations;
    if (orgId !== undefined) policy.org = orgId;
    if (action !== undefined) policy.action = action;

    policy.updatedBy = uname;
    policy.updatedAt = Date.now();

    await policy.save();

    const newResolved = await resolvePolicyRefs(policy.toObject());

    const diff = computeDiff(oldResolved, newResolved);

    auditLog(org.orgName, {
      level: "INFO",
      event: "policy.update",
      actor: { type: "admin", id: updatedByUserId, email: uname },
      target: { type: "policy", id, name: policy.policyName },
      outcome: { status: "success", httpStatus: 200 },
      context: {
        updatedFields: Object.keys(diff),
        diff
      },
      old_value: oldResolved,
      new_value: newResolved,
      trace: { source: "dashboard" }
    });

    res.json({ success: true, policy: policy.toObject() });

  } catch (err) {
    auditLog(org?.orgName || "unknown", {
      level: "ERROR",
      event: "policy.update.error",
      outcome: { status: "error", httpStatus: 500 },
      context: { error: err.message },
      trace: { source: "dashboard" }
    });
    res.status(500).json({ error: err.message });
  }
};

exports.updatePolicyPriority = async (req, res) => {
  let org = null;

  try {
    const policyId = req.params.id;
    const { direction } = req.body;
    const createdByUserId = req.user.userId;

    if (!["UP", "DOWN"].includes(direction)) {
      return res.status(400).json({ error: "Invalid direction" });
    }

    const policy = await Policy.findById(policyId);
    if (!policy) {
      return res.status(404).json({ error: "Policy not found" });
    }

    org = await Organization.findById(policy.org).lean();
    if (!org) {
      return res.status(404).json({ error: "ORGANIZATION not found" });
    }

    const { roleFlag, uname } = await checkRole(createdByUserId);
    if (!roleFlag) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const neighborQuery = {
      org: policy.org,
      priority:
        direction === "UP"
          ? { $lt: policy.priority }
          : { $gt: policy.priority }
    };

    const neighborSort = {
      priority: direction === "UP" ? -1 : 1
    };

    const neighbor = await Policy.findOne(neighborQuery).sort(neighborSort);
    if (!neighbor) {
      return res.json({ success: true, message: "Already at boundary" });
    }

    const oldPriority = policy.priority;

    policy.priority = neighbor.priority;
    neighbor.priority = oldPriority;

    policy.updatedBy = uname;
    neighbor.updatedBy = uname;

    await policy.save();
    await neighbor.save();

    auditLog(org.orgName, {
      level: "INFO",
      event: "policy.priority.update",
      actor: { type: "admin", id: createdByUserId, email: uname },
      target: { type: "policy", id: policyId, name: policy.policyName },
      outcome: { status: "success", httpStatus: 200 },
      context: {
        direction,
        oldPriority,
        newPriority: policy.priority
      },
      trace: { source: "dashboard" }
    });

    res.json({ success: true });

  } catch (err) {
    auditLog(org?.orgName || "unknown", {
      level: "ERROR",
      event: "policy.priority.update.error",
      outcome: { status: "error", httpStatus: 500 },
      context: { error: err.message },
      trace: { source: "dashboard" }
    });

    res.status(500).json({ error: err.message });
  }
};


exports.deletePolicy = async (req, res) => {
  let org = null;

  try {
    const createdByUserId = req.user.userId;
    const orgId = req.user.orgId;
    const policyId = req.params.id;

    org = await Organization.findById(orgId).lean();
    if (!org) return res.status(404).json({ error: "ORGANIZATION not found" });

    const { roleFlag, uname } = await checkRole(createdByUserId);
    if (!roleFlag) return res.status(403).json({ error: "Not authorized" });

    const policy = await Policy.findById(policyId);
    if (!policy) return res.status(404).json({ error: "Policy not found" });

    const oldPolicy = policy.toObject();

    await Policy.findByIdAndDelete(policyId);

    auditLog(org.orgName, {
      level: "INFO",
      event: "policy.delete",
      actor: { type: "admin", id: createdByUserId, email: uname },
      target: { type: "policy", id: policyId, name: oldPolicy.policyName },
      outcome: { status: "success", httpStatus: 200 },
      old_value: oldPolicy,
      trace: { source: "dashboard" }
    });

    res.json({ success: true, message: "Deleted successfully" });

  } catch (err) {
    auditLog(org?.orgName || "unknown", {
      level: "ERROR",
      event: "policy.delete.error",
      outcome: { status: "error", httpStatus: 500 },
      context: { error: err.message },
      trace: { source: "dashboard" }
    });
    res.status(500).json({ error: err.message });
  }
};

exports.getPolicyById = async (req, res) => {
  try {
    const policy = await Policy.findOne({ _id: req.params.id, org: req.user.orgId })
      .populate("org")
      .populate("ruleConfigurations")
      .lean();

    if (!policy) {
      return res.status(404).json({ error: "Policy not found" });
    }

    const formattedPolicy = {
      ...policy,
      createdAt: formatWithTimezone(policy.createdAt, req.user.timezone),
      updatedAt: formatWithTimezone(policy.updatedAt, req.user.timezone)
    };

    res.json({ success: true, policy: formattedPolicy });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getPolicyByOrg = async (req, res) => {
  try {
    const policies = await Policy.find({ org: req.user.orgId })
      .sort({ priority: 1 })
      .populate("org")
      .populate({
        path: "customRules",
        select: "_id ruleName redactionLabel"
      })
      .populate("ruleConfigurations")
      .lean();

    const formattedPolicies = policies.map(p => ({
      ...p,
      createdAt: formatWithTimezone(p.createdAt, req.user.timezone),
      updatedAt: formatWithTimezone(p.updatedAt, req.user.timezone)
    }));

    res.json({ success: true, policies: formattedPolicies });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
