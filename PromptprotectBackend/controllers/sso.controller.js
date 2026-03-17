
const { getAllUsersFromLdap, getAllAdGroups, ldapAuthenticateEmployee } = require("../services/ldap.service")
const Organization = require("../models/organization.model")
const User = require("../models/user.model")

const SSOGroupMapping = require("../models/ssoGroupMapping.model")
const Group = require("../models/group.model")
const passport = require("passport")
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET;

async function mapGroupsToRoles(orgId, provider, externalGroups) {
    if (!externalGroups || externalGroups.length === 0) {
        return { roles: [], groupIds: [] };
    }

    const mappings = await SSOGroupMapping.find({
        org: orgId,
        provider: provider,
        externalGroupId: { $in: externalGroups },
        isActive: true
    });

    const userRoles = new Set();

    mappings.forEach(m => {
        if (m.role) {
            userRoles.add(m.role);
        }
    });

    return {
        roles: Array.from(userRoles)
    };
}


exports.getAllUsersFromAd = async (req, res) => {
    try {
        const orgId = req.user.orgId
        const org = await Organization.findById(orgId).lean()
        if (!org || !org.ldap?.enabled) {
            return res.status(400).json({ success: false, message: "LDAP is not enabled for this organization" })
        }

        const users = await getAllUsersFromLdap(org.ldap)

        res.json({
            success: true,
            count: users.length,
            users
        })
    } catch (err) {
        res.status(500).json({
            success: false,
            message: "Failed to fetch AD users",
            error: err.message
        })
    }
}

exports.getAllGroupsFromAd = async (req, res) => {
    try {
        const orgId = req.user.orgId
        const org = await Organization.findById(orgId).lean()
        if (!org || !org.ldap?.enabled) {
            return res.status(400).json({ success: false, message: "LDAP is not enabled for this organization" })
        }

        const groups = await getAllAdGroups(org.ldap)

        res.json({
            success: true,
            count: groups.length,
            groups
        })
    } catch (err) {
        res.status(500).json({
            success: false,
            message: "Failed to fetch AD groups",
            error: err.message
        })
    }
}

exports.getSSOGroups = async (req, res) => {
    try {
        const orgId = req.user.orgId
        console.log("Fetching SSO groups for Org from session:", orgId)

        const org = await Organization.findById(orgId).lean()
        if (!org) {
            return res.status(404).json({ success: false, message: "Organization not found" })
        }

        let adGroups = []
        let samlGroups = []

        // 1. Fetch Internal Groups and all Mappings for this Org
        const [internalGroups, allMappings] = await Promise.all([
            Group.find({ org: orgId }).select("_id groupName").lean(),
            SSOGroupMapping.find({ org: orgId }).lean()
        ])

        // 2. Determine and fetch external SSO groups
        if (org.authProviders?.ldap && org.ldap?.enabled) {
            console.log("Fetching groups from LDAP")
            try {
                adGroups = await getAllAdGroups(org.ldap)
            } catch (err) {
                console.error("LDAP group fetch failed (likely timeout):", err.message)
                adGroups = []
            }
        } else if (org.authProviders?.saml && org.saml?.enabled) {
            console.log("Loading SAML groups from all existing mappings")
            // Show ALL groups that have ever been mapped for this organization
            samlGroups = allMappings
                .filter(m => m.provider === "SAML")
                .map(m => ({
                    id: m.externalGroupId,
                    groupName: m.externalGroupName || m.externalGroupId,
                    lastSeen: m.updatedAt
                }))
        }

        res.json({
            success: true,
            adGroups,
            samlGroups: samlGroups.map(g => ({
                id: g.id || g.groupName,
                name: g.groupName,
                lastSeen: g.lastSeen
            })),
            mappings: allMappings.filter(m => m.isActive)
        })
    } catch (err) {
        console.error("Error in getSSOGroups:", err)
        res.status(500).json({
            success: false,
            error: err.message
        })
    }
}

exports.switchAuthMethod = async (req, res) => {
    try {
        const { method } = req.body // 'none', 'ldap', 'saml'
        const orgId = req.user.orgId

        if (!['none', 'ldap', 'saml'].includes(method)) {
            return res.status(400).json({ success: false, message: "Invalid auth method" })
        }

        const org = await Organization.findById(orgId)
        if (!org) return res.status(404).json({ success: false, message: "Org not found" })

        // 1. Update AuthProviders
        org.authProviders = {
            ...org.authProviders,
            ldap: method === 'ldap',
            saml: method === 'saml'
        }

        // 2. Sync individual config enabled flags (Initialize if they don't exist)
        if (method === 'ldap') {
            if (!org.ldap) org.ldap = { enabled: true }
            else org.ldap.enabled = true

            if (org.saml) org.saml.enabled = false
        } else if (method === 'saml') {
            if (!org.saml) org.saml = { enabled: true }
            else org.saml.enabled = true

            if (org.ldap) org.ldap.enabled = false
        } else if (method === 'none') {
            if (org.ldap) org.ldap.enabled = false
            if (org.saml) org.saml.enabled = false
        }

        await org.save()

        res.json({
            success: true,
            message: `Switched to ${method} successfully`,
            authProviders: org.authProviders
        })
    } catch (err) {
        console.error("Error in switchAuthMethod:", err)
        res.status(500).json({ success: false, error: err.message })
    }
}

exports.mapSSOGroup = async (req, res) => {
    try {
        const {
            provider,
            externalGroupId,
            externalGroupName,
            internalGroup
        } = req.body

        const orgId = req.user.orgId
        const createdBy = req.user.userEmail || "system"

        const mapping = await SSOGroupMapping.findOneAndUpdate(
            {
                org: orgId,
                provider,
                externalGroupId
            },
            {
                org: orgId,
                provider,
                externalGroupId,
                externalGroupName,
                role: internalGroup,
                isActive: true,
                updatedBy: createdBy
            },
            { upsert: true, new: true }
        )

        res.json({ success: true, mapping })
    } catch (err) {
        res.status(400).json({
            success: false,
            error: err.message
        })
    }
}

exports.unmapSSOGroup = async (req, res) => {
    try {
        const { provider, externalGroupId } = req.params
        const orgId = req.user.orgId

        await SSOGroupMapping.findOneAndUpdate(
            { org: orgId, provider, externalGroupId },
            { isActive: false }
        )

        res.json({ success: true })
    } catch (err) {
        res.status(500).json({
            success: false,
            error: err.message
        })
    }
}

exports.initiateSamlLogin = (req, res, next) => {
    const { orgKey } = req.params
    if (!orgKey) {
        return res.status(400).json({ success: false, message: "orgKey is required" })
    }
    passport.authenticate("saml", {
        additionalParams: { RelayState: orgKey }
    })(req, res, next)
}

exports.handleSamlCallback = async (req, res) => {
    try {
        console.log(" Received SAML Callback. User in req:", !!req.user)
        const user = req.user
        if (!user) {
            console.error(" SAML Authentication Failed: No user profile found")
            return res.status(401).send("SAML Authentication Failed")
        }

        const { email, groups, orgId, orgKey } = user
        console.log(` User authenticated: ${email}, Org: ${orgKey}, Groups: ${groups}`)

        let dbUser = await User.findOne({ userEmail: email });
        const organization = await Organization.findById(orgId);

        const { roles } = await mapGroupsToRoles(orgId, "SAML", groups);

        if (roles.length === 0) {
            console.error(`SAML login denied: No role mapping for user ${email}`);
            return res.status(403).send("Access Denied: No Role Mapping Assigned");
        }

        if (!dbUser) {
            dbUser = await User.create({
                userName: email.split("@")[0],
                userEmail: email,
                userPassword: "SSO_USER_NO_PASSWORD",
                userRole: roles,
                authProvider: "SAML",
                org: orgId,
                createdBy: "system",
                updatedBy: "system",
                status: "ACTIVE",
                emailVerified: true
            });
        } else {
            dbUser.userRole = roles; // Overwrite roles from mapping
            if (dbUser.authProvider !== "LOCAL") {
                dbUser.authProvider = "SAML";
            }
            await dbUser.save();
        }

        const token = jwt.sign(
            {
                userId: dbUser._id,
                userEmail: dbUser.userEmail,
                userRole: dbUser.userRole,
                orgId: organization._id,
                orgKey: organization.orgKey,
                orgName: organization.orgName
            },
            JWT_SECRET,
            { expiresIn: "3h" }
        );

        res.cookie("jwtToken", token, {
            httpOnly: true,
            secure: true,
            sameSite: "none",
            maxAge: 3 * 60 * 60 * 1000,
            path: "/"
        });

        const frontendUrl = process.env.FRONTEND_URL || "https://promptprotect.dataelicit.com";
        const fileEnabled = !!organization.subscription?.fileUploadsEnabled;
        const redirectUrl = `${frontendUrl}/?success=true&token=${token}&email=${email}&orgKey=${orgKey}&orgName=${organization.orgName}&userId=${dbUser._id}&userRole=${dbUser.userRole.join(",")}&fileUploadsEnabled=${fileEnabled}`
        res.redirect(redirectUrl)
    } catch (err) {
        console.error("SAML Callback Error:", err)
        res.status(500).send("Internal Server Error during SAML callback")
    }
}

exports.loginLdap = async (req, res) => {
    try {
        const { orgKey, email, password } = req.body;

        if (!orgKey || !email || !password) {
            return res.status(400).json({ success: false, message: "OrgKey, Email and Password are required" });
        }

        const org = await Organization.findOne({ orgKey }).lean();
        if (!org) {
            return res.status(404).json({ success: false, message: "Organization not found" });
        }

        if (!org.authProviders?.ldap || !org.ldap?.enabled) {
            return res.status(400).json({ success: false, message: "LDAP login is not enabled for this organization" });
        }

        const authResult = await ldapAuthenticateEmployee(email, password, org.ldap);

        if (!authResult.success) {
            return res.status(401).json({ success: false, message: authResult.error || "Invalid credentials" });
        }

        let user = await User.findOne({ userEmail: email });

        // Normalize groups
        let ldapGroups = authResult.userObj.memberOf || [];
        if (!Array.isArray(ldapGroups)) {
            ldapGroups = [ldapGroups];
        }

        const { roles } = await mapGroupsToRoles(org._id, "LDAP", ldapGroups);

        if (roles.length === 0) {
            console.error(`LDAP login denied: No role mapping for user ${email}`);
            return res.status(403).json({ success: false, message: "Access Denied: No Role Mapping Assigned" });
        }

        if (!user) {
            user = await User.create({
                userName: authResult.userObj.displayName || email.split("@")[0],
                userEmail: email,
                userPassword: "SSO_USER_NO_PASSWORD",
                userRole: roles,
                authProvider: "LDAP",
                org: org._id,
                createdBy: "system",
                updatedBy: "system",
                status: "ACTIVE",
                emailVerified: true
            });
        } else {
            user.userRole = roles; // Overwrite roles from mapping
            if (user.authProvider !== "LOCAL") {
                user.authProvider = "LDAP";
            }
            await user.save();
        }

        const token = jwt.sign(
            {
                userId: user._id,
                userEmail: user.userEmail,
                userRole: user.userRole,
                orgId: org._id,
                orgKey: org.orgKey,
                orgName: org.orgName
            },
            JWT_SECRET,
            { expiresIn: "3h" }
        );

        const safeUser = {
            _id: user._id,
            userName: user.userName,
            userEmail: user.userEmail,
            userRole: user.userRole,
            org: org
        };

        res.cookie("jwtToken", token, {
            httpOnly: true,
            secure: true,
            sameSite: "none",
            maxAge: 3 * 60 * 60 * 1000,
            path: "/"
        });

        res.json({
            success: true,
            token,
            user: safeUser
        });

    } catch (err) {
        console.error("LDAP Login Error:", err);
        res.status(500).json({ success: false, message: "Internal Server Error", error: err.message });
    }
}
