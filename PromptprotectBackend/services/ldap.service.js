const { Client } = require("ldapts")
const { decrypt } = require("../utils/crypto.utils")

const LDAP_URL = process.env.LDAP_URL
const BASE_DN_EMPLOYEE = process.env.BASE_DN_EMPLOYEE

const SERVICE_DN = process.env.SERVICE_DN
const SERVICE_PASSWORD = process.env.SERVICE_PASSWORD

/**
 * Build the LDAP client with TLS options including optional CA cert.
 * When a CA cert is provided, we override checkServerIdentity to skip
 * hostname/IP mismatch (common with internal AD servers connected via IP),
 * while still validating the certificate chain against the trusted CA.
 */

function buildLdapClient(url, caCert, timeout = 10000) {
    const isLdaps = url.toLowerCase().startsWith("ldaps://")
    let tlsOptions = undefined

    if (isLdaps) {
        tlsOptions = {
            rejectUnauthorized: true
        }

        if (caCert) {
            console.log("[LDAP] Using custom CA certificate for TLS")
            tlsOptions.ca = [Buffer.from(caCert)]
            // Override hostname check: the cert is for a domain name (e.g. desad.dataelicit.local)
            // but we are connecting via IP. We still validate the cert against our CA,
            // but we skip the hostname/IP SAN check.
            tlsOptions.checkServerIdentity = () => undefined
            console.log("[LDAP] checkServerIdentity override: skipping hostname/IP SAN check (CA cert still validates chain)")
        } else {
            console.log("[LDAP] No CA certificate provided, using system trust store (rejectUnauthorized: true)")
        }
    }

    console.log("[LDAP] Creating client for URL:", url)
    if (tlsOptions) {
        console.log("[LDAP] TLS Options:", { rejectUnauthorized: true, hasCaCert: !!caCert, skipSanCheck: !!caCert })
    }

    const clientOpts = {
        url,
        timeout,
        connectTimeout: timeout
    }

    if (tlsOptions) {
        clientOpts.tlsOptions = tlsOptions
    }

    return new Client(clientOpts)
}

async function ldapAuthenticateEmployee(email, password, config = {}) {
    const url = config.url || LDAP_URL
    const baseDN = config.baseDN || BASE_DN_EMPLOYEE
    const serviceDN = config.serviceDN || SERVICE_DN
    const servicePassword = config.servicePassword ? decrypt(config.servicePassword) : SERVICE_PASSWORD
    const caCert = config.caCert ? decrypt(config.caCert) : null

    console.log("[LDAP:ldapAuthenticateEmployee] Starting authentication for:", email)
    console.log("[LDAP:ldapAuthenticateEmployee] URL:", url, "| BaseDN:", baseDN, "| ServiceDN:", serviceDN)
    console.log("[LDAP:ldapAuthenticateEmployee] HasCaCert:", !!caCert)

    if (!config) {
        return { success: false, error: "configuration not found" }
    }

    const client = buildLdapClient(url, caCert, 5000)

    try {
        console.log("[LDAP:ldapAuthenticateEmployee] Binding as user:", email)
        await client.bind(email, password)
        console.log("[LDAP:ldapAuthenticateEmployee] User bind successful")
        await client.unbind()

        console.log("[LDAP:ldapAuthenticateEmployee] Rebinding as service:", serviceDN)
        await client.bind(serviceDN, servicePassword)
        console.log("[LDAP:ldapAuthenticateEmployee] Service bind successful")

        console.log("[LDAP:ldapAuthenticateEmployee] Searching for user with filter: (userPrincipalName=" + email + ")")
        const { searchEntries } = await client.search(baseDN, {
            scope: "sub",
            filter: `(userPrincipalName=${email})`,
            attributes: ["dn", "memberOf", "displayName"]
        })
        console.log("[LDAP:ldapAuthenticateEmployee] Search returned", searchEntries.length, "entries")

        if (!searchEntries.length) {
            console.warn("[LDAP:ldapAuthenticateEmployee] User not found in directory")
            return { success: false, error: "User not found in directory" }
        }

        const user = searchEntries[0]
        console.log("[LDAP:ldapAuthenticateEmployee] Found user:", user.dn, "| Groups:", user.memberOf)

        return {
            success: true,
            userDN: user.dn,
            userObj: user
        }

    } catch (err) {
        console.error("[LDAP:ldapAuthenticateEmployee] Error:", err.message)
        return {
            success: false,
            error: "Invalid credentials"
        }
    } finally {
        try { await client.unbind() } catch (_) { }
    }
}

async function searchEmployeeAndGroups(email, config = {}) {
    const url = config.url || LDAP_URL
    const baseDN = config.baseDN || BASE_DN_EMPLOYEE
    const serviceDN = config.serviceDN || SERVICE_DN
    const servicePassword = config.servicePassword ? decrypt(config.servicePassword) : SERVICE_PASSWORD
    const caCert = config.caCert ? decrypt(config.caCert) : null

    console.log("[LDAP:searchEmployeeAndGroups] Starting search for:", email)
    console.log("[LDAP:searchEmployeeAndGroups] URL:", url, "| BaseDN:", baseDN, "| ServiceDN:", serviceDN)
    console.log("[LDAP:searchEmployeeAndGroups] HasCaCert:", !!caCert)

    const client = buildLdapClient(url, caCert, 5000)

    try {
        console.log("[LDAP:searchEmployeeAndGroups] Binding as service:", serviceDN)
        await client.bind(serviceDN, servicePassword)
        console.log("[LDAP:searchEmployeeAndGroups] Service bind successful")

        console.log("[LDAP:searchEmployeeAndGroups] Searching for user with filter: (userPrincipalName=" + email + ")")
        const { searchEntries } = await client.search(baseDN, {
            scope: "sub",
            filter: `(userPrincipalName=${email})`,
            attributes: ["dn", "cn", "displayName", "mail", "company", "memberOf"]
        })

        console.log("[LDAP:searchEmployeeAndGroups] Search returned", searchEntries.length, "entries")

        if (!searchEntries.length) {
            console.warn("[LDAP:searchEmployeeAndGroups] User not found")
            return null
        }

        const user = searchEntries[0]
        console.log("[LDAP:searchEmployeeAndGroups] Found user:", user.dn, "| Groups:", user.memberOf)

        return {
            dn: user.dn,
            username: user.cn,
            displayName: user.displayName,
            email: user.mail,
            company: user.company,
            groups: Array.isArray(user.memberOf)
                ? user.memberOf
                : user.memberOf
                    ? [user.memberOf]
                    : []
        }
    } finally {
        try { await client.unbind() } catch (_) { }
    }
}

async function getAllUsersFromLdap(config = {}) {
    const url = config.url || LDAP_URL
    const baseDN = config.baseDN || BASE_DN_EMPLOYEE
    const serviceDN = config.serviceDN || SERVICE_DN
    const servicePassword = config.servicePassword ? decrypt(config.servicePassword) : SERVICE_PASSWORD
    const caCert = config.caCert ? decrypt(config.caCert) : null

    console.log("[LDAP:getAllUsersFromLdap] Starting user fetch")
    console.log("[LDAP:getAllUsersFromLdap] URL:", url, "| BaseDN:", baseDN, "| ServiceDN:", serviceDN)
    console.log("[LDAP:getAllUsersFromLdap] HasCaCert:", !!caCert)

    const client = buildLdapClient(url, caCert, 10000)

    try {
        console.log("[LDAP:getAllUsersFromLdap] Binding as service:", serviceDN)
        await client.bind(serviceDN, servicePassword)
        console.log("[LDAP:getAllUsersFromLdap] Service bind successful, searching users...")

        const { searchEntries } = await client.search(baseDN, {
            scope: "sub",
            filter: "(&(objectClass=user))",
            attributes: ["dn", "cn", "displayName", "mail", "userPrincipalName", "memberOf", "company"]
        })

        console.log("[LDAP:getAllUsersFromLdap] Found", searchEntries.length, "users")

        return searchEntries.map(u => ({
            dn: u.dn,
            username: u.cn,
            displayName: u.displayName,
            email: u.mail,
            upn: u.userPrincipalName,
            company: u.company,
            groups: Array.isArray(u.memberOf)
                ? u.memberOf
                : u.memberOf
                    ? [u.memberOf]
                    : []
        }))
    } catch (err) {
        console.error("[LDAP:getAllUsersFromLdap] Error:", err.message)
        throw err
    } finally {
        try { await client.unbind() } catch (_) { }
    }
}

async function getAllAdGroups(config = {}) {
    const url = config.url || LDAP_URL
    const baseDN = config.baseDN || BASE_DN_EMPLOYEE
    const serviceDN = config.serviceDN || SERVICE_DN
    const servicePassword = config.servicePassword ? decrypt(config.servicePassword) : SERVICE_PASSWORD
    const caCert = config.caCert ? decrypt(config.caCert) : null

    console.log("[LDAP:getAllAdGroups] Starting group fetch")
    console.log("[LDAP:getAllAdGroups] URL:", url, "| BaseDN:", baseDN, "| ServiceDN:", serviceDN)
    console.log("[LDAP:getAllAdGroups] HasCaCert:", !!caCert)

    const client = buildLdapClient(url, caCert, 10000)

    try {
        console.log("[LDAP:getAllAdGroups] Binding as service:", serviceDN)
        await client.bind(serviceDN, servicePassword)
        console.log("[LDAP:getAllAdGroups] Service bind successful, searching groups...")

        const { searchEntries } = await client.search(baseDN, {
            scope: "sub",
            filter: "(objectClass=group)",
            attributes: ["dn", "cn", "description", "member"]
        })

        console.log("[LDAP:getAllAdGroups] Found", searchEntries.length, "groups")

        const groups = searchEntries.map(g => ({
            dn: g.dn,
            name: g.cn,
            description: g.description,
            members: Array.isArray(g.member)
                ? g.member
                : g.member
                    ? [g.member]
                    : []
        }))

        console.log("[LDAP:getAllAdGroups] Group names:", groups.map(g => g.name))
        return groups

    } catch (err) {
        console.error("[LDAP:getAllAdGroups] Error fetching groups:", err.message)
        console.error("[LDAP:getAllAdGroups] Full error:", err)
        throw err
    } finally {
        try { await client.unbind() } catch (_) { }
    }
}

module.exports = { ldapAuthenticateEmployee, searchEmployeeAndGroups, getAllUsersFromLdap, getAllAdGroups }
