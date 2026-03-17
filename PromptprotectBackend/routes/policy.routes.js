const express = require("express");
const router = express.Router();
const policyCtrl = require("../controllers/policy.controller");
const authenticate = require("../middleware/auth.middleware");

router.post("/", authenticate, policyCtrl.createPolicy);
router.get("/", authenticate, policyCtrl.getPolicies);
router.put("/:id", authenticate, policyCtrl.updatePolicy);
router.delete("/:id", authenticate, policyCtrl.deletePolicy);
router.get("/:id", authenticate, policyCtrl.getPolicyById);
router.patch("/:id/priority", authenticate, policyCtrl.updatePolicyPriority);
// router.get("/org/:orgId", authenticate, policyCtrl.getPolicyByOrg); // Consolidated with base GET /

module.exports = router;
