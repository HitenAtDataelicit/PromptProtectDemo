const express = require("express");
const router = express.Router();
const groupCtrl = require("../controllers/group.controller");
const authenticate = require("../middleware/auth.middleware");

router.post("/", authenticate, groupCtrl.createGroup);
router.get("/", authenticate, groupCtrl.getGroups);
router.put("/:id", authenticate, groupCtrl.updateGroup);
router.delete("/:id", authenticate, groupCtrl.deleteGroup);
router.get("/:id", authenticate, groupCtrl.getGroupById);
// router.get("/org/:orgId", authenticate, groupCtrl.getGroupByOrg); // Consolidated with base GET /

module.exports = router;