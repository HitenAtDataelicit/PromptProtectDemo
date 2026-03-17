const express = require("express");
const router = express.Router();
const { getorgbyid, getOrgMe, getallorg, signup, login, updateHecConfig, switchForwardingMethod, updateLdapConfig, updateSamlConfig, getAuthSettings, getAuthSettingsByKey, getAuthSettingsByWorkspace, checkWorkspaceAvailability, updateOrgKey, verifyManagedKey, generateDeactivationKey, verifyDeactivationKey, listDeactivationKeys, deleteDeactivationKey } = require("../controllers/organization.controller");
const authenticate = require("../middleware/auth.middleware");

router.get("/", getallorg);
router.get("/me", authenticate, getOrgMe);
router.get("/byid/:orgId", authenticate, getorgbyid);
router.post("/signup", signup);
router.post("/login", login);

router.put("/ldap", authenticate, updateLdapConfig)
router.put("/saml", authenticate, updateSamlConfig)
router.put("/splunk", authenticate, updateHecConfig)
router.post("/switch-forwarding-method", authenticate, switchForwardingMethod)
router.put("/update-key", authenticate, updateOrgKey)

router.get("/auth-settings", authenticate, getAuthSettings)
router.get("/bykey/:orgKey/auth-settings", getAuthSettingsByKey)
router.get("/byworkspace/:workspace/auth-settings", getAuthSettingsByWorkspace)
router.get("/check-workspace/:workspace", checkWorkspaceAvailability)
router.get("/verify-managed-key/:orgKey", verifyManagedKey)

// Deactivation Key routes
router.post("/deactivate/generate", authenticate, generateDeactivationKey)
router.get("/deactivate/keys", authenticate, listDeactivationKeys)
router.delete("/deactivate/keys/:keyId", authenticate, deleteDeactivationKey)
router.post("/deactivate/verify", verifyDeactivationKey)

module.exports = router;
