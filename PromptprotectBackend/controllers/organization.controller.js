
const Organization = require("../models/organization.model");
const User = require("../models/user.model");
const DeactivationKey = require("../models/deactivationKey.model");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { auditLog } = require("../logger");
const emailService = require("../services/email.service");
const { formatWithTimezone } = require("../utils/time.utils");
const { encrypt, decrypt } = require("../utils/crypto.utils");

const JWT_SECRET = process.env.JWT_SECRET;


const generateOrgKey = (orgName, password) => {
  return crypto
    .createHmac("sha256", process.env.ORG_KEY_SECRET || "supersecretkey")
    .update(orgName + password)
    .digest("hex");
};

const extractDomain = (email) => {
  if (!email || !email.includes("@")) return null;
  return email.split("@")[1].toLowerCase();
};


exports.signup = async (req, res) => {
  try {
    const { userName, userEmail, userPassword, orgName, workspace, timezone } = req.body;

    if (!userName || !userEmail || !userPassword || !orgName || !workspace) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const emailLower = userEmail.toLowerCase().trim();
    const workspaceLower = workspace.toLowerCase().trim();

    if (!/^[a-zA-Z0-9_]+$/.test(workspaceLower)) {
      return res.status(400).json({ message: "Invalid workspace name. Use only alphanumeric characters and underscores." });
    }

    // Check for existing workspace
    const workspaceExists = await Organization.findOne({ workspace: workspaceLower });
    if (workspaceExists) {
      return res.status(409).json({
        success: false,
        message: `An organization with workspace ${workspaceLower} already exists`
      });
    }

    // Check for existing orgEmail
    const orgEmailExists = await Organization.findOne({ orgEmail: emailLower });
    if (orgEmailExists) {
      return res.status(409).json({
        success: false,
        message: "Organization with this email already exists"
      });
    }

    const hashedPassword = await bcrypt.hash(userPassword, 10);
    const orgKey = generateOrgKey(orgName, userPassword);
    const verificationToken = crypto.randomBytes(32).toString("hex");

    const organization = await Organization.create({
      orgName,
      orgEmail: emailLower,
      orgPassword: hashedPassword,
      orgKey,
      workspace: workspaceLower,
      timezone: timezone || "UTC"
    });

    const user = await User.create({
      userName,
      userEmail: emailLower,
      userPassword: hashedPassword,
      userRole: ["ORG_ADMIN"],
      org: organization._id,
      createdBy: userName,
      updatedBy: userName,
      status: "PENDING_VERIFICATION",
      emailVerified: false,
      verificationToken,
      verificationTokenExpires: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
    });

    // Send verification email
    const frontendUrl = process.env.FRONTEND_URL || "https://promptprotect.dataelicit.com";
    const verificationUrl = `${frontendUrl}/verify-email?token=${verificationToken}`;
    await emailService.send_email(emailLower, "Verify Your Email", verificationUrl, "HTML", "signup");

    const token = jwt.sign(
      {
        orgId: organization._id,
        userId: user._id,
        orgName: organization.orgName,
        orgKey: organization.orgKey,
        userEmail: user.userEmail,
        userRole: user.userRole
      },
      JWT_SECRET,
      { expiresIn: "3h" }
    );

    auditLog(orgName, {
      level: "INFO",
      event: "org.signup",
      actor: {
        type: "user",
        email: emailLower
      },
      target: {
        type: "organization",
        name: orgName
      },
      outcome: {
        status: "success",
        httpStatus: 201
      },
      context: {
        adminEmail: emailLower
      },
      trace: {
        source: "api"
      }
    });

    res.cookie("jwtToken", token, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 3 * 60 * 60 * 1000,
      path: "/"
    });

    return res.status(201).json({
      success: true,
      token,
      org: organization,
      user
    });

  } catch (err) {
    // Detailed error logging to understand why the catch block failed
    console.error("Signup Error:", err);

    // Handle MongoDB duplicate key errors (11000)
    if (err.code === 11000 || (err.message && err.message.includes("E11000"))) {
      const field = (err.keyPattern && Object.keys(err.keyPattern)[0]) ||
        (err.message && err.message.includes("orgEmail") ? "orgEmail" :
          (err.message && err.message.includes("workspace") ? "workspace" : "field"));

      const message = field === "orgEmail"
        ? "Organization with this email already exists"
        : field === "workspace"
          ? "Workspace name is already taken"
          : `Duplicate ${field} error`;

      return res.status(409).json({
        success: false,
        message: message
      });
    }

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message
    });
  }
};


exports.login = async (req, res) => {
  try {
    const { orgEmail, orgPassword } = req.body;

    if (!orgEmail || !orgPassword) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const org = await Organization.findOne({ orgEmail });
    if (!org) {
      auditLog("unknown", {
        level: "WARN",
        event: "org.login.failed",
        actor: { type: "user", email: orgEmail },
        outcome: { status: "failed", httpStatus: 401 },
        context: { reason: "org_not_found" },
        trace: { source: "api" }
      });

      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(orgPassword, org.orgPassword);
    if (!isMatch) {
      auditLog(org.orgName, {
        level: "WARN",
        event: "org.login.failed",
        actor: { type: "user", email: orgEmail },
        outcome: { status: "failed", httpStatus: 401 },
        context: { reason: "invalid_password" },
        trace: { source: "api" }
      });

      return res.status(401).json({ message: "Invalid credentials" });
    }

    org.lastLogin = Date.now();
    await org.save();

    const token = jwt.sign(
      {
        orgId: org._id,
        orgEmail: org.orgEmail,
        orgName: org.orgName,
        orgKey: org.orgKey,
        userId: org._id, // For org-level login, userId is the same as orgId
        userEmail: org.orgEmail,
        userRole: ["ORG_ADMIN"]
      },
      JWT_SECRET,
      { expiresIn: "3h" }
    );

    auditLog(org.orgName, {
      level: "INFO",
      event: "org.login.success",
      actor: { type: "user", email: orgEmail },
      target: { type: "organization", name: org.orgName },
      outcome: { status: "success", httpStatus: 200 },
      trace: { source: "api" }
    });

    res.cookie("jwtToken", token, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 3 * 60 * 60 * 1000,
      path: "/"
    });

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      org
    });

  } catch (err) {
    auditLog("unknown", {
      level: "ERROR",
      event: "org.login.error",
      outcome: { status: "failed", httpStatus: 500 },
      context: { error: err.message },
      trace: { source: "api" }
    });

    return res.status(500).json({ message: "Server error" });
  }
};


exports.getallorg = async (req, res) => {
  try {
    const orgs = await Organization.find().lean();
    return res.status(200).json(orgs);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

exports.getorgbyid = async (req, res) => {
  try {
    const org = await Organization.findById(req.params.orgId).lean();
    if (!org) {
      return res.status(404).json({ message: "Organization not found" });
    }
    return res.status(200).json(org);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

exports.getOrgMe = async (req, res) => {
  try {
    const org = await Organization.findById(req.user.orgId).lean();
    if (!org) {
      return res.status(404).json({ message: "Organization not found" });
    }

    // Return a combined object for compatibility with legacy frontend pages
    return res.status(200).json({
      ...org,
      hecToken: org.splunk?.hecToken,
      hecUrl: org.splunk?.hecUrl,
      sourcetype: org.splunk?.sourcetype,
      success: true
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

exports.updateHecConfig = async (req, res) => {
  try {
    const { hecToken, hecUrl, sourcetype, index, allowInsecure } = req.body
    const orgId = req.user.orgId

    if (!orgId || !hecUrl) {
      return res.status(400).json({
        message: "orgId and hecUrl are required"
      })
    }

    const org = await Organization.findById(orgId)
    if (!org) {
      return res.status(404).json({ message: "Organization not found" })
    }

    // Only require hecToken if it's not already set and not provided in the update
    if (!org.splunk?.hecToken && !hecToken) {
      return res.status(400).json({ message: "HEC Token is required for first-time setup" })
    }

    org.splunk = {
      enabled: true,
      hecToken: hecToken || org.splunk.hecToken,
      hecUrl,
      sourcetype: sourcetype || org.orgName,
      index: index || "main",
      allowInsecure: !!allowInsecure,
      updatedAt: Date.now()
    }

    await org.save()

    auditLog(org.orgName, {
      level: "INFO",
      event: "org.splunk.updated",
      actor: { type: "admin" },
      target: { type: "organization", name: org.orgName },
      outcome: { status: "success" },
      trace: { source: "dashboard" }
    })

    return res.json({
      success: true,
      message: "Splunk configuration updated successfully"
    })
  } catch (err) {
    return res.status(500).json({
      message: "Server error",
      error: err.message
    })
  }
}

exports.switchForwardingMethod = async (req, res) => {
  try {
    const { method } = req.body; // 'none', 'splunk'
    const orgId = req.user.orgId;

    if (!orgId || !method) {
      return res.status(400).json({ success: false, message: "Method is required" });
    }

    const org = await Organization.findById(orgId);
    if (!org) {
      return res.status(404).json({ success: false, message: "Organization not found" });
    }

    // Initialize forwarding objects if they don't exist
    if (!org.splunk) {
      org.splunk = { enabled: false, hecUrl: "", hecToken: "", sourcetype: org.orgName, index: "main", allowInsecure: false };
    }

    if (method === "none") {
      org.splunk.enabled = false;
    } else if (method === "splunk") {
      org.splunk.enabled = true;
    } else {
      return res.status(400).json({ success: false, message: "Invalid forwarding method" });
    }

    await org.save();

    return res.json({
      success: true,
      message: `Successfully switched forwarding method to ${method}`
    });

  } catch (err) {
    return res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};

exports.updateLdapConfig = async (req, res) => {
  try {
    const {
      enabled,
      url,
      baseDN,
      serviceDN,
      servicePassword,
      caCert
    } = req.body
    const orgId = req.user.orgId

    if (!orgId) {
      return res.status(400).json({ message: "orgId is required" })
    }

    if (!url || !baseDN || !serviceDN) {
      return res.status(400).json({
        message: "url, baseDN, and serviceDN are required for LDAP configuration"
      })
    }

    const org = await Organization.findById(orgId)
    if (!org) {
      return res.status(404).json({ message: "Organization not found" })
    }

    // Service Password is mandatory for first-time setup
    if (!servicePassword && !org.ldap?.servicePassword) {
      return res.status(400).json({ message: "servicePassword is required for first-time setup" })
    }

    if (url.toLowerCase().startsWith("ldaps://") && !caCert && !org.ldap?.caCert) {
      return res.status(400).json({ message: "caCert is required for LDAPS configuration" })
    }

    org.ldap = {
      enabled: !!enabled,
      url,
      baseDN,
      serviceDN,
      servicePassword: servicePassword ? encrypt(servicePassword) : org.ldap?.servicePassword,
      caCert: caCert ? encrypt(caCert) : org.ldap?.caCert
    }

    org.authProviders.ldap = !!enabled
    if (enabled) {
      org.authProviders.saml = false
      if (org.saml) org.saml.enabled = false
    }
    await org.save()

    auditLog(org.orgName, {
      level: "INFO",
      event: "org.ldap.updated",
      actor: { type: "admin" },
      target: { type: "organization", name: org.orgName },
      outcome: { status: "success" },
      trace: { source: "dashboard" }
    })

    return res.json({
      success: true,
      message: "LDAP configuration updated successfully"
    })
  } catch (err) {
    return res.status(500).json({
      message: "Failed to update LDAP config",
      error: err.message
    })
  }
}

exports.updateSamlConfig = async (req, res) => {
  try {
    const {
      enabled,
      ssoUrl,
      entityId,
      idpCert,
      acsUrl,
      logoutUrl,
      attributeMapping
    } = req.body
    const orgId = req.user.orgId

    console.log(req.body)


    if (!orgId) {
      return res.status(400).json({ message: "orgId is required" })
    }

    if (!ssoUrl || !entityId || !acsUrl) {
      return res.status(400).json({
        message: "ssoUrl, entityId, and acsUrl are required for SAML configuration"
      })
    }

    const org = await Organization.findById(orgId)
    if (!org) {
      return res.status(404).json({ message: "Organization not found" })
    }

    org.saml = {
      enabled: !!enabled,
      ssoUrl,
      entityId,
      idpCert: idpCert ? encrypt(idpCert) : org.saml?.idpCert,
      acsUrl,
      logoutUrl,
      attributeMapping: {
        email: attributeMapping?.email || "email",
        groups: attributeMapping?.groups || "groups"
      }
    }

    org.authProviders.saml = !!enabled
    if (enabled) {
      org.authProviders.ldap = false
      if (org.ldap) org.ldap.enabled = false
    }
    await org.save()

    auditLog(org.orgName, {
      level: "INFO",
      event: "org.saml.updated",
      actor: { type: "admin" },
      target: { type: "organization", name: org.orgName },
      outcome: { status: "success" },
      trace: { source: "dashboard" }
    })

    return res.json({
      success: true,
      message: "SAML configuration updated successfully"
    })
  } catch (err) {
    return res.status(500).json({
      message: "Failed to update SAML config",
      error: err.message
    })
  }
}

exports.getAuthSettings = async (req, res) => {
  try {
    const orgId = req.user.orgId

    const org = await Organization.findById(orgId).select(
      "authProviders ldap saml splunk"
    )

    if (!org) {
      return res.status(404).json({ message: "Organization not found" })
    }

    // Mask sensitive fields
    const safeOrg = org.toObject()

    if (safeOrg.ldap) {
      if (safeOrg.ldap.servicePassword) {
        safeOrg.ldap.servicePassword = "********"
      }
      if (safeOrg.ldap.caCert) {
        safeOrg.ldap.caCert = "********"
      }
    }

    if (safeOrg.saml && safeOrg.saml.idpCert) {
      safeOrg.saml.idpCert = "********"
    }

    if (safeOrg.splunk && safeOrg.splunk.hecToken) {
      safeOrg.splunk.hecToken = "********"
    }

    return res.json({
      success: true,
      data: safeOrg
    })
  } catch (err) {
    return res.status(500).json({
      message: "Failed to fetch auth settings",
      error: err.message
    })
  }
}
exports.getAuthSettingsByKey = async (req, res) => {
  try {
    const { orgKey } = req.params

    const org = await Organization.findOne({ orgKey }).select(
      "authProviders ldap saml splunk"
    )

    if (!org) {
      return res.status(404).json({ message: "Organization not found" })
    }

    return res.json({
      success: true,
      data: org
    })
  } catch (err) {
    return res.status(500).json({
      message: "Failed to fetch auth settings",
      error: err.message
    })
  }
}

exports.getAuthSettingsByWorkspace = async (req, res) => {
  try {
    const { workspace } = req.params;
    const orgKeyHeader = req.header("x-org-key");

    const org = await Organization.findOne({ workspace }).select(
      "authProviders ldap saml splunk orgKey workspace orgName"
    );

    if (!org) {
      return res.status(404).json({ message: "Organization not found" });
    }

    // Optional but recommended: Validate orgKey if provided
    if (orgKeyHeader && org.orgKey !== orgKeyHeader) {
      return res.status(401).json({ success: false, message: "Invalid Organization Key for this workspace" });
    }

    return res.json({
      success: true,
      data: org
    });
  } catch (err) {
    return res.status(500).json({
      message: "Failed to fetch auth settings",
      error: err.message
    });
  }
};

exports.generateDeactivationKey = async (req, res) => {
  try {
    const { type, userEmail } = req.body;
    const orgId = req.user.orgId;

    if (!type || !["ORG_WIDE", "SINGLE_USER"].includes(type)) {
      return res.status(400).json({ success: false, message: "Valid key type (ORG_WIDE or SINGLE_USER) is required" });
    }

    if (type === "SINGLE_USER" && !userEmail) {
      return res.status(400).json({ success: false, message: "userEmail is required for SINGLE_USER keys" });
    }

    const key = crypto.randomBytes(6).toString("hex").toUpperCase(); // 12 char hex key

    const deactivationKey = await DeactivationKey.create({
      org: orgId,
      userEmail: type === "SINGLE_USER" ? userEmail.toLowerCase().trim() : undefined,
      key,
      type,
      expiresAt: type === "ORG_WIDE" ? new Date(Date.now() + 24 * 60 * 60 * 1000) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      createdBy: req.user.userEmail
    });

    auditLog(req.user.orgName || "unknown", {
      level: "INFO",
      event: "deactivation.key.generated",
      actor: { type: "admin", email: req.user.userEmail },
      context: { type, userEmail: deactivationKey.userEmail, key },
      trace: { source: "api" }
    });

    res.json({
      success: true,
      key: deactivationKey.key,
      expiresAt: formatWithTimezone(deactivationKey.expiresAt, req.user.timezone)
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.verifyDeactivationKey = async (req, res) => {
  try {
    const { workspace, orgKey, userEmail, key } = req.body;

    if (!workspace || !orgKey || !userEmail || !key) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    const org = await Organization.findOne({ workspace, orgKey });
    if (!org) {
      return res.status(404).json({ success: false, message: "Organization or Key invalid" });
    }

    const dKey = await DeactivationKey.findOne({
      org: org._id,
      key: key.trim().toUpperCase()
    });

    if (!dKey) {
      return res.status(401).json({ success: false, message: "Invalid deactivation key" });
    }

    if (dKey.type === "SINGLE_USER") {
      if (dKey.userEmail !== userEmail.toLowerCase().trim()) {
        return res.status(401).json({ success: false, message: "Key not valid for this user" });
      }
      if (dKey.isUsed) {
        return res.status(401).json({ success: false, message: "Key already used" });
      }

      dKey.isUsed = true;
      dKey.usedAt = Date.now();
      // Keep in DB for 24h for audit, then TTL index handles auto-deletion
      await dKey.save();
    } else {
      // ORG_WIDE check
      if (Date.now() > dKey.expiresAt) {
        return res.status(401).json({ success: false, message: "Organization deactivation key has expired" });
      }
    }

    auditLog(org.orgName, {
      level: "WARN",
      event: "extension.deactivated",
      actor: { type: "user", email: userEmail },
      context: { key, type: dKey.type },
      trace: { source: "extension" }
    });

    res.json({ success: true, message: "Deactivation verified." });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.listDeactivationKeys = async (req, res) => {
  try {
    const orgId = req.user.orgId;
    const keys = await DeactivationKey.find({ org: orgId }).sort({ createdAt: -1 }).lean();

    const formattedKeys = keys.map(k => ({
      ...k,
      createdAt: formatWithTimezone(k.createdAt, req.user.timezone),
      expiresAt: formatWithTimezone(k.expiresAt, req.user.timezone),
      usedAt: k.usedAt ? formatWithTimezone(k.usedAt, req.user.timezone) : undefined
    }));

    res.json({ success: true, keys: formattedKeys });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.deleteDeactivationKey = async (req, res) => {
  try {
    const { keyId } = req.params;
    const orgId = req.user.orgId;

    const result = await DeactivationKey.deleteOne({ _id: keyId, org: orgId });

    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, message: "Key not found or not authorized" });
    }

    res.json({ success: true, message: "Key deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.verifyManagedKey = async (req, res) => {
  try {
    const { orgKey } = req.params;

    const org = await Organization.findOne({ orgKey }).select(
      "authProviders ldap saml splunk orgKey workspace orgName"
    );

    if (!org) {
      return res.status(404).json({
        success: false,
        message: "Organization not found for this key"
      });
    }

    return res.json({
      success: true,
      data: {
        orgKey: org.orgKey,
        workspace: org.workspace,
        orgName: org.orgName,
        authProviders: org.authProviders,
        ldap: { enabled: org.ldap?.enabled },
        saml: { enabled: org.saml?.enabled }
      }
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Failed to verify organization key",
      error: err.message
    });
  }
};

exports.updateOrgKey = async (req, res) => {
  try {
    const { newOrgKey } = req.body
    const orgId = req.user.orgId
    const createdByUserId = req.user.userId

    if (!orgId || !newOrgKey) {
      return res.status(400).json({ message: "orgId and newOrgKey are required" })
    }

    // Authorization check
    const user = await User.findById(createdByUserId).lean()
    const isAuthorized = user?.userRole?.some(r => ["ADMIN", "ORG_ADMIN"].includes(r))

    if (!isAuthorized) {
      return res.status(403).json({ message: "Not authorized to update organization key" })
    }

    const org = await Organization.findById(orgId)
    if (!org) {
      return res.status(404).json({ message: "Organization not found" })
    }

    const oldKey = org.orgKey
    org.orgKey = newOrgKey
    await org.save()

    auditLog(org.orgName, {
      level: "INFO",
      event: "org.key.updated",
      actor: { type: "admin", id: createdByUserId, email: user.userEmail },
      target: { type: "organization", name: org.orgName },
      outcome: { status: "success" },
      context: { oldKey, newKey: newOrgKey },
      trace: { source: "dashboard" }
    })

    return res.json({
      success: true,
      message: "Organization key updated successfully"
    })
  } catch (err) {
    return res.status(500).json({
      message: "Failed to update organization key",
      error: err.message
    })
  }
}

exports.checkWorkspaceAvailability = async (req, res) => {
  try {
    const { workspace } = req.params;
    if (!workspace) {
      return res.status(400).json({ success: false, message: "Workspace name is required" });
    }

    const workspaceLower = workspace.toLowerCase().trim();
    if (!/^[a-zA-Z0-9_]+$/.test(workspaceLower)) {
      return res.status(400).json({ success: false, message: "Invalid workspace name format" });
    }

    const exists = await Organization.findOne({ workspace: workspaceLower });

    if (exists) {
      return res.status(409).json({ success: false, message: "Workspace already exists, use another workspace" });
    }

    return res.json({ success: true, message: "Workspace is available" });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Server error during workspace check", error: err.message });
  }
};
