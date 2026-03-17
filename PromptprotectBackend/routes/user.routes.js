const express = require("express");
const router = express.Router();
const userCtrl = require("../controllers/user.controller");
const authenticate = require("../middleware/auth.middleware");

router.post("/", authenticate, userCtrl.createUser);
router.get("/", authenticate, userCtrl.getUsers);
router.put("/:id", authenticate, userCtrl.updateUser);
router.delete("/:id", authenticate, userCtrl.deleteUser);
router.get("/auth/me", authenticate, userCtrl.getMe);
router.post("/auth/logout", authenticate, userCtrl.logout);
router.get("/:id", authenticate, userCtrl.getUserById);
// router.get("/org/:organizationId", authenticate, userCtrl.getUserByOrg); // Consolildated with base GET /
router.post("/auth/login", userCtrl.getUserForLogin);
router.get("/auth/verify-email", userCtrl.verifyEmail);
router.post("/auth/resend-verification", authenticate, userCtrl.resendVerification);
router.put("/auth/suspend/:id", authenticate, userCtrl.suspendUser);
router.put("/auth/activate/:id", authenticate, userCtrl.unsuspendUser);
router.post("/forgot-password", userCtrl.forgotPassword);
router.post("/reset-password", userCtrl.resetPassword);
router.post("/change-password", authenticate, userCtrl.changePassword);

module.exports = router;
