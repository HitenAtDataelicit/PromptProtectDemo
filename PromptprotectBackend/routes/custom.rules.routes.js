const express = require("express");
const router = express.Router();

const customRuleController = require("../controllers/custom.rules.controllers");
const authenticate = require("../middleware/auth.middleware");

router.get("/", authenticate, customRuleController.getCustomRules);
router.post("/", authenticate, customRuleController.createCustomRule);
// router.get("/org/:orgId", authenticate, customRuleController.getCustomRulesByOrg); // Consolidated with base GET /
router.put("/:id", authenticate, customRuleController.updateCustomRule);
router.patch("/:id/priority", authenticate, customRuleController.updatePriority);
router.delete("/:id", authenticate, customRuleController.deleteCustomRule);

module.exports = router; 
