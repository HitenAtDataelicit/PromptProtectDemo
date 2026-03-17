const User = require("../models/user.model")
const Group = require("../models/group.model")
const { searchEmployeeAndGroups } = require("./ldap.service")
const Organization = require("../models/organization.model")
const { fetchUserGroupsByEmail } = require("./okta.service")

async function resolveUserGroups({ orgId, userEmail }) {
    // 1. Fetch Organization and check providers
    const org = await Organization.findById(orgId).lean()
    if (!org) return []

    // 2. Check for Local User
    const localUser = await User.findOne({ userEmail }).lean()
    if (localUser) {
        return await Group.find({
            org: orgId,
            groupUsers: localUser._id
        })
            .populate({
                path: "policiesAttached",
                options: { sort: { priority: 1 } },
                populate: [
                    { path: "customRules" },
                    { path: "ruleConfigurations" }
                ]
            })
            .lean()
    }

    let externalGroupNames = []
    let provider = ""

    // 3. Resolve External Groups (LDAP or SAML)
    if (org.authProviders?.saml && org.saml?.enabled) {
        provider = "SAML"
        try {
            const baseUrl = org.saml.apiUrl || (org.saml.entryPoint ? new URL(org.saml.entryPoint).origin : null)
            const apiToken = org.saml.apiToken
            console.log(`[GroupResolver] SAML groups resolution starting for ${userEmail}`);
            console.log(`[GroupResolver] Params - baseUrl: ${baseUrl}, hasApiToken: ${!!apiToken}`);

            if (baseUrl && apiToken) {
                const oktaGroups = await fetchUserGroupsByEmail(baseUrl, apiToken, userEmail)
                externalGroupNames = oktaGroups.map(g => g.name)
                console.log(`[GroupResolver] Found ${externalGroupNames.length} groups from Okta:`, externalGroupNames);
            } else {
                console.warn("[GroupResolver] SAML enabled but baseUrl or apiToken missing");
            }
        } catch (err) {
            console.error("SAML Group Resolution Error:", err.message)
        }

    } else if (org.authProviders?.ldap && org.ldap?.enabled) {
        provider = "LDAP"
        const ldapUser = await searchEmployeeAndGroups(userEmail, org.ldap)
        if (ldapUser) {
            externalGroupNames = ldapUser.groups || []
        }
    }

    // 4. Resolve Internal Groups via externalSsoGroups mapping
    console.log(`[GroupResolver] Searching for groups mapping for provider groups:`, externalGroupNames);

    return await Group.find({
        org: orgId,
        externalSsoGroups: { $in: externalGroupNames }
    })
        .populate({
            path: "policiesAttached",
            options: { sort: { priority: 1 } },
            populate: [
                { path: "customRules" },
                { path: "ruleConfigurations" }
            ]
        })
        .lean()
}

module.exports = { resolveUserGroups }
