const jwt = require("jsonwebtoken");
const User = require("../models/user.model");
const JWT_SECRET = process.env.JWT_SECRET;

const authenticate = async (req, res, next) => {
    const token = req.cookies.jwtToken;

    if (!token) {
        return res.status(401).json({ success: false, message: "Authentication required" });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);

        const Organization = require("../models/organization.model");
        const org = await Organization.findById(decoded.orgId).select("timezone").lean();
        if (!org) {
            return res.status(401).json({ success: false, message: "Organization no longer exists" });
        }
        decoded.timezone = org.timezone || "UTC";

        // Fetch user from DB to check latest status (e.g. if suspended)
        if (decoded.userId && decoded.userId.toString() !== decoded.orgId.toString()) {
            const user = await User.findById(decoded.userId).select("status").lean();
            if (!user) {
                return res.status(401).json({ success: false, message: "User no longer exists" });
            }

            if (user.status !== "ACTIVE") {
                let msg = "Your account is not active.";
                if (user.status === "PENDING_VERIFICATION") msg = "Please verify your email to access the platform.";
                if (user.status === "SUSPENDED") msg = "Your account has been suspended. Please contact support.";

                return res.status(403).json({ success: false, message: msg, status: user.status });
            }
        }

        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ success: false, message: "Invalid or expired token" });
    }
};

module.exports = authenticate;