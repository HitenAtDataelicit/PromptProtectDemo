const express = require("express");
const router = express.Router();
const ssoCtrl = require("../controllers/sso.controller");
const passport = require("passport");
const authenticate = require("../middleware/auth.middleware");

router.get("/users", authenticate, ssoCtrl.getAllUsersFromAd);
router.get("/groups", authenticate, ssoCtrl.getSSOGroups)
router.post("/switch-method", authenticate, ssoCtrl.switchAuthMethod)
router.post("/map", authenticate, ssoCtrl.mapSSOGroup)
router.delete("/map/:provider/:externalGroupId", authenticate, ssoCtrl.unmapSSOGroup)

// SAML Routes
router.get("/login/saml/:orgKey", ssoCtrl.initiateSamlLogin)
router.post("/login/ldap", ssoCtrl.loginLdap)
router.post("/callback/saml",
    passport.authenticate("saml", { failureRedirect: "/saml-test.html?error=true", failureFlash: false }),
    ssoCtrl.handleSamlCallback
)

module.exports = router;

