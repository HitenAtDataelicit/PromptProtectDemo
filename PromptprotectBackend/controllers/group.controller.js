const Group = require("../models/group.model");
const Organization = require("../models/organization.model");
const User = require("../models/user.model");
const Policy = require("../models/policy.model");
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

async function checkRole(createdByUserId) {
  if (!createdByUserId || createdByUserId === "null") {
    return { roleFlag: true, uname: "system" };
  }

  const user = await User.findById(createdByUserId).lean();
  if (!user || !user.userRole) {
    return { roleFlag: false };
  }

  const roleFlag = user.userRole.some(r =>
    ["ADMIN", "GROUP_MANAGER", "ORG_ADMIN"].includes(r)
  );

  const uname = user.userEmail.split("@")[0];
  return { roleFlag, uname };
}

async function isDup(groupName, orgId, currentGroup = null) {
  const group = await Group.findOne({ groupName, org: orgId }).lean();
  if (!group) return false;
  if (currentGroup && group.groupName === currentGroup) return false;
  return true;
}

async function resolveGroupCreateValue(group) {
  const users = await User.find(
    { _id: { $in: group.groupUsers || [] } },
    "userEmail"
  ).lean();

  const policies = await Policy.find(
    { _id: { $in: group.policiesAttached || [] } },
    "policyName"
  ).lean();

  return {
    groupName: group.groupName,
    groupUsers: users.map(u => u.userEmail),
    policiesAttached: policies.map(p => p.policyName),
    createdBy: group.createdBy
  };
}


exports.createGroup = async (req, res) => {
  let org = null;

  try {
    const { groupName, groupUsers, policiesAttached, externalSsoGroups } = req.body;
    const orgId = req.user.orgId;
    const createdByUserId = req.user.userId;

    org = await Organization.findById(orgId).lean();
    if (!org) {
      return res.status(404).json({ error: "ORGANIZATION not found" });
    }

    const { uname } = await checkRole(createdByUserId); // Keep uname for audit log

    if (await isDup(groupName, orgId)) {
      return res.status(409).json({ error: "Group already exists" });
    }

    const group = await Group.create({
      groupName,
      groupUsers,
      policiesAttached,
      org: orgId,
      externalSsoGroups: externalSsoGroups || [],
      createdBy: uname,
      updatedBy: uname
    });

    const cleanNewValue = await resolveGroupCreateValue(group);

    auditLog(org.orgName, {
      level: "INFO",
      event: "group.create",
      actor: { type: "admin", id: createdByUserId, email: uname },
      target: { type: "group", id: group._id.toString(), name: groupName },
      outcome: { status: "success", httpStatus: 200 },
      new_value: cleanNewValue,
      trace: { source: "dashboard" }
    });

    const populated = await Group.findById(group._id)
      .populate("groupUsers", "userName userEmail")
      .populate("policiesAttached", "policyName rulesForPolicy")
      .populate("org")
      .lean();

    res.json({ success: true, group: populated });

  } catch (err) {
    auditLog(org?.orgName || "unknown", {
      level: "ERROR",
      event: "group.create.error",
      outcome: { status: "error", httpStatus: 500 },
      context: { error: err.message },
      trace: { source: "dashboard" }
    });
    res.status(500).json({ error: err.message });
  }
};

exports.getGroups = async (req, res) => {
  try {
    const groups = await Group.find({ org: req.user.orgId })
      .populate("groupUsers", "userName userEmail")
      .populate("policiesAttached", "policyName rulesForPolicy")
      .populate("org")
      .lean();

    const formattedGroups = groups.map(g => ({
      ...g,
      createdAt: formatWithTimezone(g.createdAt, req.user.timezone),
      updatedAt: formatWithTimezone(g.updatedAt, req.user.timezone)
    }));

    res.json({ success: true, groups: formattedGroups });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.updateGroup = async (req, res) => {
  let org = null;

  try {
    const id = req.params.id;
    const updatedByUserId = req.user.userId;
    const { groupName, groupUsers, policiesAttached, externalSsoGroups } = req.body;
    const orgId = req.user.orgId;

    const group = await Group.findById(id);
    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }

    const oldGroupRaw = group.toObject();

    org = await Organization.findById(orgId || group.org).lean();
    if (!org) {
      return res.status(404).json({ error: "ORGANIZATION not found" });
    }

    const { uname } = await checkRole(updatedByUserId); // Keep uname for audit log

    if (groupName && await isDup(groupName, org._id, group.groupName)) {
      return res.status(409).json({ error: "Duplicate group name" });
    }

    group.groupName = groupName ?? group.groupName;
    group.groupUsers = groupUsers ?? group.groupUsers;
    group.policiesAttached = policiesAttached ?? group.policiesAttached;
    group.externalSsoGroups = externalSsoGroups; // Set directly, not merge
    group.org = orgId ?? group.org;
    group.updatedBy = uname;
    group.updatedAt = Date.now();

    await group.save();

    const newGroupRaw = group.toObject();

    const oldResolved = await resolveGroupCreateValue(oldGroupRaw);
    const newResolved = await resolveGroupCreateValue(newGroupRaw);

    const diff = computeDiff(oldResolved, newResolved);

    auditLog(org.orgName, {
      level: "INFO",
      event: "group.update",
      actor: {
        type: "admin",
        id: updatedByUserId,
        email: uname
      },
      target: {
        type: "group",
        id,
        name: group.groupName
      },
      outcome: {
        status: "success",
        httpStatus: 200
      },
      context: {
        updatedFields: Object.keys(diff),
        diff
      },
      old_value: oldResolved,
      new_value: newResolved,
      trace: { source: "dashboard" }
    });

    /* ------------------ RESPONSE ------------------ */
    const populated = await Group.findById(group._id)
      .populate("groupUsers", "userName userEmail")
      .populate("policiesAttached", "policyName rulesForPolicy")
      .populate("org")
      .lean();

    res.json({ success: true, group: populated });

  } catch (err) {
    auditLog(org?.orgName || "unknown", {
      level: "ERROR",
      event: "group.update.error",
      outcome: { status: "error", httpStatus: 500 },
      context: { error: err.message },
      trace: { source: "dashboard" }
    });

    res.status(500).json({ error: err.message });
  }
};


exports.deleteGroup = async (req, res) => {
  let org = null;

  try {
    const createdByUserId = req.user.userId;
    const orgId = req.user.orgId;
    const groupId = req.params.id;

    org = await Organization.findById(orgId).lean();
    if (!org) return res.status(404).json({ error: "ORGANIZATION not found" });

    const { roleFlag, uname } = await checkRole(createdByUserId);
    if (!roleFlag) return res.status(403).json({ error: "Not authorized" });

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ error: "Group not found" });

    const oldGroup = group.toObject();

    await Group.findByIdAndDelete(groupId);

    auditLog(org.orgName, {
      level: "INFO",
      event: "group.delete",
      actor: { type: "admin", id: createdByUserId, email: uname },
      target: { type: "group", id: groupId, name: oldGroup.groupName },
      outcome: { status: "success", httpStatus: 200 },
      old_value: oldGroup,
      trace: { source: "dashboard" }
    });

    res.json({ success: true, message: "Deleted successfully" });

  } catch (err) {
    auditLog(org?.orgName || "unknown", {
      level: "ERROR",
      event: "group.delete.error",
      outcome: { status: "error", httpStatus: 500 },
      context: { error: err.message },
      trace: { source: "dashboard" }
    });
    res.status(500).json({ error: err.message });
  }
};

exports.getGroupById = async (req, res) => {
  try {
    const group = await Group.findOne({ _id: req.params.id, org: req.user.orgId })
      .populate("groupUsers", "userName userEmail")
      .populate("policiesAttached", "policyName rulesForPolicy")
      .populate("org")
      .lean();

    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }

    const formattedGroup = {
      ...group,
      createdAt: formatWithTimezone(group.createdAt, req.user.timezone),
      updatedAt: formatWithTimezone(group.updatedAt, req.user.timezone)
    };

    res.json({ success: true, group: formattedGroup });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getGroupByOrg = async (req, res) => {
  try {
    const groups = await Group.find({ org: req.user.orgId })
      .populate("groupUsers", "userName userEmail")
      .populate("policiesAttached", "policyName rulesForPolicy")
      .populate("org")
      .lean();

    res.json({ success: true, groups });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
