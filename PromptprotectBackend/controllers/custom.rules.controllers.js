const CustomRule = require("../models/custom.model");
const Organization = require("../models/organization.model");
const User = require("../models/user.model");
const { auditLog } = require("../logger");
const { formatWithTimezone } = require("../utils/time.utils");

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

exports.getCustomRules = async (req, res) => {
  try {
    const crules = await CustomRule.find({ org: req.user.orgId })
      .populate("org")
      .sort({ priority: 1 })
      .lean();

    const formattedRules = crules.map(r => ({
      ...r,
      createdAt: formatWithTimezone(r.createdAt, req.user.timezone),
      updatedAt: formatWithTimezone(r.updatedAt, req.user.timezone)
    }));

    res.json(formattedRules);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getCustomRulesByOrg = async (req, res) => {
  try {
    const orgId = req.user.orgId;

    const rules = await CustomRule.find({ org: orgId })
      .select("_id ruleName redactionLabel pattern flags priority")
      .sort({ priority: 1 })
      .lean();

    res.json({ success: true, rules });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createCustomRule = async (req, res) => {
  let org = null;

  try {
    const {
      ruleName,
      pattern,
      description,
      ruleType,
      flags,
      redactionLabel
    } = req.body;

    if (!ruleName || !pattern || !ruleType || !flags || !redactionLabel) {
      return res.status(400).json({
        error: "ruleName, pattern, ruleType, flags, and redactionLabel are required"
      });
    }

    const orgId = req.user.orgId;
    const createdByUserId = req.user.userId;

    org = await Organization.findById(orgId).lean();
    if (!org) {
      auditLog("unknown", {
        level: "WARN",
        event: "customRule.create.denied",
        outcome: { status: "org_not_found", httpStatus: 404 },
        trace: { source: "dashboard" }
      });
      return res.status(404).json({ error: "ORGANIZATION not found" });
    }

    const { roleFlag, uname } = await checkRole(createdByUserId);
    if (!roleFlag) {
      auditLog(org.orgName, {
        level: "WARN",
        event: "customRule.create.forbidden",
        actor: { type: "user", id: createdByUserId, uname: uname || "unknown" },
        outcome: { status: "forbidden", httpStatus: 403 },
        trace: { source: "dashboard" }
      });
      return res.status(403).json({ error: "You are not authorized to create custom rule" });
    }

    const duplicate = await CustomRule.findOne({
      org: orgId,
      ruleName
    }).lean();

    if (duplicate) {
      auditLog(org.orgName, {
        level: "WARN",
        event: "customRule.create.rejected",
        actor: { type: "admin", uname },
        outcome: { status: "duplicate_rule", httpStatus: 409 },
        context: { ruleName },
        trace: { source: "dashboard" }
      });
      return res.status(409).json({ error: "Custom rule with same name already exists" });
    }

    // Get max priority
    const lastRule = await CustomRule.findOne({ org: orgId }).sort({ priority: -1 }).select("priority").lean();
    const nextPriority = lastRule ? (lastRule.priority || 0) + 1 : 0;

    const newRule = await CustomRule.create({
      ruleName,
      pattern,
      description,
      ruleType,
      flags,
      redactionLabel,
      org: orgId,
      createdBy: uname,
      updatedBy: uname,
      priority: nextPriority
    });

    auditLog(org.orgName, {
      level: "INFO",
      event: "customRule.create",
      actor: { type: "admin", id: createdByUserId, uname },
      target: {
        type: "customRule",
        id: newRule._id.toString(),
        name: ruleName
      },
      outcome: { status: "success", httpStatus: 201 },
      trace: { source: "dashboard" }
    });

    res.status(201).json(newRule);

  } catch (err) {
    auditLog(org?.orgName || "unknown", {
      level: "ERROR",
      event: "customRule.create.error",
      outcome: { status: "error", httpStatus: 500 },
      context: { error: err.message },
      trace: { source: "dashboard" }
    });

    res.status(500).json({ error: err.message });
  }
};

exports.updateCustomRule = async (req, res) => {
  let org = null;

  try {
    const { id } = req.params;
    const {
      ruleName,
      description,
      ruleType,
      pattern,
      flags,
      redactionLabel
    } = req.body;

    const updatedByUserId = req.user.userId;

    const rule = await CustomRule.findById(id);
    if (!rule) {
      auditLog("unknown", {
        level: "WARN",
        event: "customRule.update.denied",
        target: { type: "customRule", id },
        outcome: { status: "not_found", httpStatus: 404 },
        trace: { source: "dashboard" }
      });
      return res.status(404).json({ error: "Custom rule not found" });
    }

    org = await Organization.findById(rule.org).lean();
    if (!org) {
      auditLog("unknown", {
        level: "WARN",
        event: "customRule.update.denied",
        outcome: { status: "org_not_found", httpStatus: 404 },
        trace: { source: "dashboard" }
      });
      return res.status(404).json({ error: "ORGANIZATION not found" });
    }

    const { roleFlag, uname } = await checkRole(updatedByUserId);
    if (!roleFlag) {
      auditLog(org.orgName, {
        level: "WARN",
        event: "customRule.update.forbidden",
        actor: { type: "user", id: updatedByUserId, uname: uname || "unknown" },
        target: { type: "customRule", id, name: rule.ruleName },
        outcome: { status: "forbidden", httpStatus: 403 },
        trace: { source: "dashboard" }
      });
      return res.status(403).json({ error: "You are not authorized to update custom rule" });
    }

    if (ruleName && ruleName !== rule.ruleName) {
      const duplicate = await CustomRule.findOne({
        org: rule.org,
        ruleName
      }).lean();

      if (duplicate) {
        auditLog(org.orgName, {
          level: "WARN",
          event: "customRule.update.rejected",
          actor: { type: "admin", uname },
          outcome: { status: "duplicate_rule", httpStatus: 409 },
          context: { ruleName },
          trace: { source: "dashboard" }
        });
        return res.status(409).json({ error: "Custom rule with same name already exists" });
      }
    }

    if (ruleName !== undefined) rule.ruleName = ruleName;
    if (description !== undefined) rule.description = description;
    if (ruleType !== undefined) rule.ruleType = ruleType;
    if (pattern !== undefined) rule.pattern = pattern;
    if (flags !== undefined) rule.flags = flags;
    if (redactionLabel !== undefined)
      rule.redactionLabel = redactionLabel.toUpperCase();

    rule.updatedBy = uname;
    rule.updatedAt = Date.now();

    await rule.save();

    auditLog(org.orgName, {
      level: "INFO",
      event: "customRule.update",
      actor: { type: "admin", id: updatedByUserId, uname },
      target: { type: "customRule", id, name: rule.ruleName },
      outcome: { status: "success", httpStatus: 200 },
      trace: { source: "dashboard" }
    });

    res.json({ success: true, rule });

  } catch (err) {
    auditLog(org?.orgName || "unknown", {
      level: "ERROR",
      event: "customRule.update.error",
      outcome: { status: "error", httpStatus: 500 },
      context: { error: err.message },
      trace: { source: "dashboard" }
    });

    res.status(500).json({ error: err.message });
  }
};

exports.deleteCustomRule = async (req, res) => {
  let org = null;

  try {
    const { id } = req.params;
    const deletedByUserId = req.user.userId;

    const rule = await CustomRule.findById(id).lean();
    if (!rule) {
      auditLog("unknown", {
        level: "WARN",
        event: "customRule.delete.denied",
        target: { type: "customRule", id },
        outcome: { status: "not_found", httpStatus: 404 },
        trace: { source: "dashboard" }
      });
      return res.status(404).json({ error: "Custom rule not found" });
    }

    org = await Organization.findById(rule.org).lean();
    if (!org) {
      auditLog("unknown", {
        level: "WARN",
        event: "customRule.delete.denied",
        outcome: { status: "org_not_found", httpStatus: 404 },
        trace: { source: "dashboard" }
      });
      return res.status(404).json({ error: "ORGANIZATION not found" });
    }

    const { roleFlag, uname } = await checkRole(deletedByUserId);
    if (!roleFlag) {
      auditLog(org.orgName, {
        level: "WARN",
        event: "customRule.delete.forbidden",
        actor: { type: "user", id: deletedByUserId, uname: uname || "unknown" },
        target: { type: "customRule", id, name: rule.ruleName },
        outcome: { status: "forbidden", httpStatus: 403 },
        trace: { source: "dashboard" }
      });
      return res.status(403).json({ error: "You are not authorized to delete custom rule" });
    }

    await CustomRule.findByIdAndDelete(id);

    auditLog(org.orgName, {
      level: "INFO",
      event: "customRule.delete",
      actor: { type: "admin", id: deletedByUserId, uname },
      target: { type: "customRule", id, name: rule.ruleName },
      outcome: { status: "success", httpStatus: 200 },
      trace: { source: "dashboard" }
    });

    res.json({
      success: true,
      message: "Custom rule deleted successfully"
    });

  } catch (err) {
    auditLog(org?.orgName || "unknown", {
      level: "ERROR",
      event: "customRule.delete.error",
      outcome: { status: "error", httpStatus: 500 },
      context: { error: err.message },
      trace: { source: "dashboard" }
    });

    res.status(500).json({ error: err.message });
  }
};

exports.updatePriority = async (req, res) => {
  try {
    const { id } = req.params;
    const { direction } = req.body;
    const orgId = req.user.orgId;

    if (!["UP", "DOWN"].includes(direction)) {
      return res.status(400).json({ error: "Invalid direction. Use UP or DOWN" });
    }

    const rules = await CustomRule.find({ org: orgId }).sort({ priority: 1 });
    const idx = rules.findIndex(r => r._id.toString() === id);

    if (idx === -1) return res.status(404).json({ error: "Rule not found" });

    const targetIdx = direction === "UP" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= rules.length) {
      return res.status(400).json({ error: "Cannot move further in this direction" });
    }

    const currentRule = rules[idx];
    const otherRule = rules[targetIdx];

    const temp = currentRule.priority;
    currentRule.priority = otherRule.priority;
    otherRule.priority = temp;

    await currentRule.save();
    await otherRule.save();

    res.json({ success: true, message: "Moved " + direction + " successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
