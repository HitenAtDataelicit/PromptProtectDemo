const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const { auditLog } = require("../logger");
const bcrypt = require("bcryptjs");


const User = require("../models/user.model");
const Organization = require("../models/organization.model");
const emailService = require("../services/email.service");
const crypto = require("crypto");
const { formatWithTimezone } = require("../utils/time.utils");

const JWT_SECRET = process.env.JWT_SECRET;


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


function extractEmailDomain(email) {
  if (!email || !email.includes("@")) return null;
  return email.split("@")[1].toLowerCase();
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
    ["ADMIN", "USER_MANAGER", "ORG_ADMIN"].includes(r)
  );

  const uname = user.userEmail.split("@")[0];
  return { roleFlag, uname };
}

async function validateOrgUserDomain(orgId, newEmail) {
  const newDomain = extractEmailDomain(newEmail);
  if (!newDomain) return { valid: false, error: "Invalid email format" };
  // Domain restriction removed per user request
  return { valid: true };
}

async function doesUserExists(userEmail, currentUserEmail = null) {
  const user = await User.findOne({ userEmail }).lean();
  if (!user) return 0;
  if (currentUserEmail && user.userEmail === currentUserEmail) return 0;
  return 1;
}


exports.createUser = async (req, res) => {
  try {
    let { userName, userRole, userEmail, userPassword } = req.body;
    const orgId = req.user.orgId;
    const createdByUserId = req.user.userId;

    if (!userRole || userRole.length === 0) {
      userRole = ["DEFAULT"];
    }

    const organization = await Organization.findById(orgId).lean();
    if (!organization) {
      auditLog("unknown", {
        level: "WARN",
        event: "user.create.denied",
        actor: { type: "user", id: createdByUserId },
        outcome: { status: "org_not_found", httpStatus: 404 },
        context: { orgId },
        trace: { source: "dashboard" }
      });

      return res.status(404).json({ error: "ORGANIZATION not found" });
    }

    const { roleFlag, uname } = await checkRole(createdByUserId);
    if (!roleFlag) {
      auditLog(organization.orgName, {
        level: "WARN",
        event: "user.create.forbidden",
        actor: { type: "user", id: createdByUserId, uname: uname || "unknown" },
        outcome: { status: "forbidden", httpStatus: 403 },
        context: { attemptedUser: userEmail },
        trace: { source: "dashboard" }
      });

      return res.status(403).json({ error: "You are not authorized to create user" });
    }

    const exists = await doesUserExists(userEmail);
    if (exists) {
      auditLog(organization.orgName, {
        level: "WARN",
        event: "user.create.rejected",
        actor: { type: "admin", email: uname },
        outcome: { status: "duplicate_user", httpStatus: 400 },
        context: { userEmail },
        trace: { source: "dashboard" }
      });

      return res.status(400).json({ error: `USER with email ${userEmail} already exists` });
    }

    const domainCheck = await validateOrgUserDomain(orgId, userEmail);
    if (!domainCheck.valid) {
      auditLog(organization.orgName, {
        level: "WARN",
        event: "user.create.rejected",
        actor: { type: "admin", email: uname },
        outcome: { status: "domain_violation", httpStatus: 400 },
        context: { userEmail, reason: domainCheck.error },
        trace: { source: "dashboard" }
      });

      return res.status(400).json({ error: domainCheck.error });
    }

    const hashedPassword = await bcrypt.hash(userPassword, 10);
    const verificationToken = crypto.randomBytes(32).toString("hex");

    const user = await User.create({
      userName,
      userRole,
      userEmail,
      userPassword: hashedPassword,
      org: orgId,
      createdBy: uname,
      updatedBy: uname,
      status: "PENDING_VERIFICATION",
      emailVerified: false,
      verificationToken,
      verificationTokenExpires: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
    });

    // Send verification email
    const frontendUrl = process.env.FRONTEND_URL || "https://promptprotect.dataelicit.com";
    const verificationUrl = `${frontendUrl}/verify-email?token=${verificationToken}`;
    await emailService.send_email(userEmail, "Verify Your Email", verificationUrl, "HTML", "signup");

    auditLog(organization.orgName, {
      level: "INFO",
      event: "user.create",
      actor: { type: "admin", email: uname },
      target: { type: "user", id: user._id.toString(), email: userEmail },
      outcome: { status: "success", httpStatus: 200 },
      context: { roles: userRole, userEmail: userEmail, userName: userName },
      trace: { source: "dashboard" },
      new_value: { userName, userRole, userEmail }
    });

    res.json({ success: true, user });

  } catch (err) {
    auditLog("unknown", {
      level: "ERROR",
      event: "user.create.error",
      outcome: { status: "error", httpStatus: 500 },
      context: { error: err.message },
      trace: { source: "dashboard" }
    });

    res.status(500).json({ error: err.message });
  }
};



exports.getUsers = async (req, res) => {
  try {
    const users = await User.find({ org: req.user.orgId })
      .select("userName userEmail authProvider status userRole createdBy createdAt updatedBy updatedAt")
      .populate("org", "orgName _id timezone")
      .lean();

    const formattedUsers = users.map(u => ({
      ...u,
      createdAt: formatWithTimezone(u.createdAt, u.org?.timezone),
      updatedAt: formatWithTimezone(u.updatedAt, u.org?.timezone)
    }));

    res.json({ success: true, data: formattedUsers });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};


exports.updateUser = async (req, res) => {
  try {
    let { userName, userRole, userEmail, userPassword } = req.body;
    const orgId = req.user.orgId;
    const updatedByUserId = req.user.userId;
    const { id } = req.params;

    const existingUser = await User.findOne({ _id: id, org: orgId });

    if (!existingUser) {
      auditLog("unknown", {
        level: "WARN",
        event: "user.update.denied",
        actor: { type: "user", id: updatedByUserId },
        target: { type: "user", id },
        outcome: { status: "user_not_found", httpStatus: 404 },
        trace: { source: "dashboard" }
      });

      return res.status(404).json({ error: "User not found" });
    }
    const oldUser = existingUser.toObject();

    const organization = await Organization.findById(orgId || existingUser.org);
    if (!organization) {
      auditLog("unknown", {
        level: "WARN",
        event: "user.update.denied",
        actor: { type: "user", id: updatedByUserId },
        target: { type: "organization", id: orgId },
        outcome: { status: "org_not_found", httpStatus: 404 },
        trace: { source: "dashboard" }
      });

      return res.status(404).json({ error: "ORGANIZATION not found" });
    }

    const { roleFlag, uname } = await checkRole(updatedByUserId);
    if (!roleFlag) {
      auditLog(organization.orgName, {
        level: "WARN",
        event: "user.update.forbidden",
        actor: { type: "user", id: updatedByUserId, uname: uname || "unknown" },
        target: { type: "user", id },
        outcome: { status: "forbidden", httpStatus: 403 },
        trace: { source: "dashboard" }
      });

      return res.status(403).json({ error: "You are not authorized to update user" });
    }

    if (existingUser.userRole?.includes("ORG_ADMIN")) {
      if (!userRole?.includes("ORG_ADMIN")) {
        auditLog(organization.orgName, {
          level: "WARN",
          event: "user.update.rejected",
          actor: { type: "admin", email: uname },
          target: { type: "user", id },
          outcome: { status: "protected_role", httpStatus: 400 },
          context: { role: "ORG_ADMIN" },
          trace: { source: "dashboard" }
        });

        return res.status(400).json({ error: "ORG_ADMIN role cannot be removed" });
      }
      userRole = ["ORG_ADMIN"];
    }

    const exists = await doesUserExists(userEmail, existingUser.userEmail);
    if (exists) {
      auditLog(organization.orgName, {
        level: "WARN",
        event: "user.update.rejected",
        actor: { type: "admin", email: uname },
        target: { type: "user", id },
        outcome: { status: "duplicate_email", httpStatus: 400 },
        context: { userEmail },
        trace: { source: "dashboard" }
      });

      return res.status(400).json({ error: `USER with email ${userEmail} already exists` });
    }

    const domainCheck = await validateOrgUserDomain(orgId || existingUser.org, userEmail);
    if (!domainCheck.valid) {
      auditLog(organization.orgName, {
        level: "WARN",
        event: "user.update.rejected",
        actor: { type: "admin", email: uname },
        target: { type: "user", id },
        outcome: { status: "domain_violation", httpStatus: 400 },
        context: { reason: domainCheck.error },
        trace: { source: "dashboard" }
      });

      return res.status(400).json({ error: domainCheck.error });
    }

    existingUser.userName = userName ?? existingUser.userName;
    existingUser.userEmail = userEmail ?? existingUser.userEmail;
    existingUser.userPassword = userPassword ?? existingUser.userPassword;
    existingUser.userRole = userRole ?? existingUser.userRole;
    existingUser.org = orgId ?? existingUser.org;
    existingUser.updatedBy = uname;
    existingUser.updatedAt = Date.now();

    await existingUser.save();

    const newUser = existingUser.toObject();
    const diff = computeDiff(oldUser, newUser);

    auditLog(organization.orgName, {
      level: "INFO",
      event: "user.update",
      actor: { type: "admin", email: uname },
      target: { type: "user", id, email: existingUser.userEmail },
      outcome: { status: "success", httpStatus: 200 },
      context: {
        updatedFields: Object.keys(diff),
        diff
      },
      old_value: oldUser,
      new_value: newUser,
      trace: { source: "dashboard" }
    });

    res.json({ success: true, user: existingUser });

  } catch (err) {
    auditLog("unknown", {
      level: "ERROR",
      event: "user.update.error",
      outcome: { status: "error", httpStatus: 500 },
      context: { error: err.message },
      trace: { source: "dashboard" }
    });

    res.status(500).json({ error: err.message });
  }
};
exports.deleteUser = async (req, res) => {
  let organization = null;

  try {
    const id = req.params.id;
    const createdByUserId = req.user.userId;

    // Self-delete attempt
    if (id === createdByUserId) {
      auditLog("unknown", {
        level: "WARN",
        event: "user.delete.rejected",
        actor: { type: "user", id },
        outcome: { status: "self_delete_attempt", httpStatus: 400 },
        trace: { source: "dashboard" }
      });
      return res.status(400).json({ error: "You cannot delete yourself" });
    }

    // Fetch user FIRST (for audit context)
    const user = await User.findById(id);
    if (!user) {
      auditLog("unknown", {
        level: "WARN",
        event: "user.delete.denied",
        actor: { type: "user", id: createdByUserId },
        target: { type: "user", id },
        outcome: { status: "user_not_found", httpStatus: 404 },
        trace: { source: "dashboard" }
      });
      return res.status(404).json({ error: "User not found" });
    }

    // Fetch org early
    organization = await Organization.findById(user.org);
    if (!organization) {
      auditLog("unknown", {
        level: "WARN",
        event: "user.delete.denied",
        actor: { type: "user", id: createdByUserId },
        target: { type: "organization", id: user.org },
        outcome: { status: "org_not_found", httpStatus: 404 },
        trace: { source: "dashboard" }
      });
      return res.status(404).json({ error: "ORGANIZATION not found" });
    }

    const orgName = organization.orgName;

    // Protected role
    if (user.userRole?.includes("ORG_ADMIN")) {
      auditLog(orgName, {
        level: "WARN",
        event: "user.delete.rejected",
        actor: { type: "user", id: createdByUserId },
        target: {
          type: "user",
          id,
          email: user.userEmail,
          name: user.userName
        },
        outcome: { status: "protected_role", httpStatus: 400 },
        context: { role: "ORG_ADMIN" },
        trace: { source: "dashboard" }
      });
      return res.status(400).json({ error: "ORG_ADMIN role cannot be deleted" });
    }

    // Authorization check
    const { roleFlag, uname } = await checkRole(createdByUserId);
    if (!roleFlag) {
      auditLog(orgName, {
        level: "WARN",
        event: "user.delete.forbidden",
        actor: {
          type: "user",
          id: createdByUserId,
          uname: uname || "unknown"
        },
        target: {
          type: "user",
          id,
          email: user.userEmail,
          name: user.userName
        },
        outcome: { status: "forbidden", httpStatus: 403 },
        trace: { source: "dashboard" }
      });
      return res.status(403).json({ error: "You are not authorized to delete user" });
    }

    await User.findByIdAndDelete(id);

    auditLog(orgName, {
      level: "INFO",
      event: "user.delete",
      actor: {
        type: "admin",
        id: createdByUserId,
        uname: uname || "unknown"
      },
      target: {
        type: "user",
        id,
        email: user.userEmail
      },
      outcome: { status: "success", httpStatus: 200 },
      old_value: user.toObject(),
      trace: { source: "dashboard" }
    });

    res.json({ success: true });

  } catch (err) {
    auditLog(organization?.orgName || "unknown", {
      level: "ERROR",
      event: "user.delete.error",
      outcome: { status: "error", httpStatus: 500 },
      context: { error: err.message },
      trace: { source: "dashboard" }
    });

    res.status(500).json({ error: err.message });
  }
};

exports.getUserById = async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.params.id, org: req.user.orgId })
      .populate("org")
      .lean();

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


exports.getUserByOrg = async (req, res) => {
  try {
    const users = await User.find({ org: req.user.orgId })
      .populate("org")
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, data: users });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};


exports.getUserForLogin = async (req, res) => {
  let organization = null;

  try {
    const { userEmail, userPassword } = req.body;

    if (!userEmail || !userPassword) {
      return res.status(400).json({ error: "{Email, password} are required" });
    }

    const user = await User.findOne({ userEmail }).populate("org");
    if (!user) {
      auditLog("unknown", {
        level: "WARN",
        event: "user.login.failed",
        actor: { type: "user", email: userEmail },
        outcome: { status: "invalid_credentials", httpStatus: 400 },
        trace: { source: "dashboard" }
      });

      return res.status(400).json({ error: "Invalid credentials" });
    }

    /* -------------------------------------------------------------------------- */
    /* Check password first. If it matches, we allow local login regardless of provider. */
    /* -------------------------------------------------------------------------- */
    const isMatch = await bcrypt.compare(userPassword, user.userPassword);

    // If it's not a match, and have SSO, suggest SSO.
    if (!isMatch) {
      if (user.authProvider && user.authProvider !== "LOCAL") {
        return res.status(403).json({ error: `Invalid credentials. Please log in using ${user.authProvider} (SSO) if you don't have a local password.` });
      }

      auditLog(user.org.orgName || "unknown", {
        level: "WARN",
        event: "user.login.failed",
        actor: { type: "user", email: userEmail },
        target: { type: "user", id: user._id.toString() },
        outcome: { status: "invalid_credentials", httpStatus: 400 },
        trace: { source: "dashboard" }
      });

      return res.status(400).json({ error: "Invalid credentials" });
    }

    // Check user status before issuing token
    if (user.status !== "ACTIVE") {
      auditLog(user.org?.orgName || "unknown", {
        level: "WARN",
        event: "user.login.denied",
        actor: { type: "user", email: userEmail },
        outcome: { status: user.status, httpStatus: 403 },
        trace: { source: "dashboard" }
      });

      return res.status(403).json({
        success: false,
        status: user.status,
        message: user.status === "PENDING_VERIFICATION"
          ? "Please verify your email to access the platform."
          : "Your account is suspended."
      });
    }

    organization = user.org;
    if (!organization) {
      auditLog("unknown", {
        level: "ERROR",
        event: "user.login.failed",
        actor: { type: "user", email: userEmail },
        outcome: { status: "org_missing", httpStatus: 400 },
        trace: { source: "dashboard" }
      });

      return res.status(400).json({ error: "Organization not found" });
    }

    const orgName = organization.orgName;


    const token = jwt.sign(
      {
        userId: user._id,
        userEmail: user.userEmail,
        userRole: user.userRole,
        orgId: organization._id,
        orgKey: organization.orgKey,
        orgName: organization.orgName
      },
      JWT_SECRET,
      { expiresIn: "3h" }
    );

    const safeUser = {
      _id: user._id,
      userName: user.userName,
      userEmail: user.userEmail,
      userRole: user.userRole,
      org: organization
    };

    auditLog(orgName, {
      level: "INFO",
      event: "user.login",
      actor: {
        type: "user",
        id: user._id.toString(),
        email: user.userEmail
      },
      outcome: { status: "success", httpStatus: 200 },
      trace: { source: "dashboard" }
    });

    res.cookie("jwtToken", token, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 3 * 60 * 60 * 1000,
      path: "/"
    });

    res.json({ success: true, token, user: safeUser });

  } catch (err) {
    auditLog(organization?.orgName || "unknown", {
      level: "ERROR",
      event: "user.login.error",
      outcome: { status: "error", httpStatus: 500 },
      context: { error: err.message },
      trace: { source: "dashboard" }
    });

    res.status(500).json({ error: err.message });
  }
};

exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).populate("org").lean();
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.logout = async (req, res) => {
  res.clearCookie("jwtToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict"
  });
  res.json({ success: true, message: "Logged out successfully" });
};

exports.changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const userId = req.user.userId;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: "Old and new passwords are required" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const isMatch = await bcrypt.compare(oldPassword, user.userPassword);
    if (!isMatch) {
      return res.status(400).json({ error: "Incorrect old password" });
    }

    user.userPassword = await bcrypt.hash(newPassword, 10);
    await user.save();

    auditLog(user.org?.orgName || "unknown", {
      level: "INFO",
      event: "user.password_change",
      actor: { type: "user", id: userId, email: user.userEmail },
      outcome: { status: "success", httpStatus: 200 },
      trace: { source: "dashboard" }
    });

    res.json({ success: true, message: "Password updated successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { userEmail } = req.body;
    if (!userEmail) {
      return res.status(400).json({ error: "Email is required" });
    }

    const user = await User.findOne({ userEmail }).populate("org");
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    const token = crypto.randomBytes(32).toString("hex");
    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 15 * 60 * 1000;
    await user.save();

    const frontendUrl = process.env.FRONTEND_URL;
    const resetUrl = `${frontendUrl}/reset-password?token=${token}`;

    const emailSent = await emailService.send_email(userEmail, "Password Reset Request", resetUrl, "HTML", "reset");

    if (!emailSent) {
      return res.status(500).json({ error: "Failed to send reset email" });
    }

    auditLog(user.org?.orgName || "unknown", {
      level: "INFO",
      event: "user.forgot_password",
      actor: { type: "user", id: user._id.toString(), email: userEmail },
      outcome: { status: "success", httpStatus: 200 },
      trace: { source: "dashboard" }
    });

    res.json({ success: true, message: "Reset link sent to email" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ error: "Token and new password are required" });
    }

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    }).populate("org");

    if (!user) {
      return res.status(400).json({ error: "Invalid or expired reset token" });
    }

    user.userPassword = await bcrypt.hash(newPassword, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    auditLog(user.org?.orgName || "unknown", {
      level: "INFO",
      event: "user.reset_password_completed",
      actor: { type: "user", id: user._id.toString(), email: user.userEmail },
      outcome: { status: "success", httpStatus: 200 },
      trace: { source: "dashboard" }
    });

    res.json({ success: true, message: "Password has been reset successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) {
      return res.status(400).json({ success: false, message: "Token is required" });
    }

    const user = await User.findOne({
      verificationToken: token,
      verificationTokenExpires: { $gt: Date.now() }
    }).populate("org");

    if (!user) {
      const alreadyVerified = await User.findOne({ verificationToken: token });
      if (!alreadyVerified) {
        return res.status(400).json({ success: false, message: "Invalid or expired verification token" });
      }

      if (alreadyVerified.emailVerified) {
        return res.status(200).json({ success: true, message: "Email already verified" });
      }

      return res.status(400).json({ success: false, message: "Verification token expired" });
    }

    user.status = "ACTIVE";
    user.emailVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpires = undefined;
    await user.save();

    auditLog(user.org?.orgName || "unknown", {
      level: "INFO",
      event: "user.email_verified",
      actor: { type: "user", id: user._id.toString(), email: user.userEmail },
      outcome: { status: "success", httpStatus: 200 },
      trace: { source: "api" }
    });

    res.json({ success: true, message: "Email verified successfully" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.resendVerification = async (req, res) => {
  try {
    const { userEmail } = req.body;
    const orgId = req.user.orgId;
    const adminId = req.user.userId;

    const { roleFlag, uname } = await checkRole(adminId);
    if (!roleFlag) {
      return res.status(403).json({ success: false, message: "Only administrators can resend verification emails" });
    }

    const user = await User.findOne({ userEmail, org: orgId });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (user.emailVerified) {
      return res.status(400).json({ success: false, message: "User is already verified" });
    }

    const verificationToken = crypto.randomBytes(32).toString("hex");
    user.verificationToken = verificationToken;
    user.verificationTokenExpires = Date.now() + 24 * 60 * 60 * 1000;
    await user.save();

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const verificationUrl = `${frontendUrl}/verify-email?token=${verificationToken}`;
    await emailService.send_email(userEmail, "Verify Your Email", verificationUrl, "HTML", "signup");

    auditLog(user.org?.orgName || "unknown", {
      level: "INFO",
      event: "user.verification_resent",
      actor: { type: "admin", id: adminId, email: uname },
      target: { type: "user", id: user._id.toString(), email: userEmail },
      outcome: { status: "success", httpStatus: 200 },
      trace: { source: "dashboard" }
    });

    res.json({ success: true, message: "Verification email resent successfully" });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.suspendUser = async (req, res) => {
  try {
    const { id } = req.params;
    const orgId = req.user.orgId;
    const adminId = req.user.userId;

    const { roleFlag, uname } = await checkRole(adminId);
    if (!roleFlag) {
      return res.status(403).json({ success: false, message: "Not authorized to suspend users" });
    }

    const user = await User.findOne({ _id: id, org: orgId });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (user.userRole?.includes("ORG_ADMIN")) {
      return res.status(400).json({ success: false, message: "Cannot suspend ORG_ADMIN" });
    }

    user.status = "SUSPENDED";
    await user.save();

    auditLog(user.org?.orgName || "unknown", {
      level: "WARN",
      event: "user.suspended",
      actor: { type: "admin", id: adminId, email: uname },
      target: { type: "user", id: user._id.toString(), email: user.userEmail },
      outcome: { status: "success", httpStatus: 200 },
      trace: { source: "dashboard" }
    });

    res.json({ success: true, message: "User suspended successfully" });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.unsuspendUser = async (req, res) => {
  try {
    const { id } = req.params;
    const orgId = req.user.orgId;
    const adminId = req.user.userId;

    const { roleFlag, uname } = await checkRole(adminId);
    if (!roleFlag) {
      return res.status(403).json({ success: false, message: "Not authorized to activate users" });
    }

    const user = await User.findOne({ _id: id, org: orgId });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    user.status = "ACTIVE";
    await user.save();

    auditLog(user.org?.orgName || "unknown", {
      level: "INFO",
      event: "user.unsuspended",
      actor: { type: "admin", id: adminId, email: uname },
      target: { type: "user", id: user._id.toString(), email: user.userEmail },
      outcome: { status: "success", httpStatus: 200 },
      trace: { source: "dashboard" }
    });

    res.json({ success: true, message: "User activated successfully" });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

