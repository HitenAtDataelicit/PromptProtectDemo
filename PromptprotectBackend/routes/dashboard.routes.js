const express = require("express");
const router = express.Router();
const Org = require("../models/organization.model");
const User = require("../models/user.model");

const { getDashboardData, getAuditLogs } = require("../services/dashboard.service");
const authenticate = require("../middleware/auth.middleware");

router.post("/dashboard", authenticate, async (req, res) => {
  try {
    let { orgId, userEmail, userRole, orgName } = req.user;
    const { page, pageSize } = req.body || {};

    // Defensive check: if orgName or userEmail are missing (from older tokens)
    if (!orgName || !userEmail) {
      const Org = require("../models/organization.model");
      const User = require("../models/user.model");

      if (!orgName) {
        const orgRecord = await Org.findById(orgId).lean();
        orgName = orgRecord?.orgName;
      }

      if (!userEmail) {
        const userRecord = await User.findById(req.user.userId).lean();
        userEmail = userRecord?.userEmail || orgEmail; // fallback to org email if user not found
      }
    }

    if (!orgName) {
      console.warn("Dashboard request missing orgName even after resolution attempt");
    }

    const data = await getDashboardData({
      org: orgName,
      userEmail,
      userRole: Array.isArray(userRole) ? (userRole.includes("ORG_ADMIN") ? "ORG_ADMIN" : (userRole.includes("ADMIN") ? "ADMIN" : "USER")) : userRole,
      page,
      pageSize
    });

    res.json({
      success: true,
      data
    });
  } catch (err) {
    console.error("Dashboard API error:", err);
    res.status(500).json({
      success: false,
      message: "Dashboard fetch failed"
    });
  }
});

router.post("/adminChurns", authenticate, async (req, res) => {
  try {
    const { orgName } = req.user;
    const data = await getAuditLogs({ org: orgName });
    res.json({
      success: true,
      data
    });
  } catch (err) {
    console.error("Audit API error:", err);
    res.status(500).json({
      success: false,
      message: "Audit fetch failed"
    });
  }
});

module.exports = router;

