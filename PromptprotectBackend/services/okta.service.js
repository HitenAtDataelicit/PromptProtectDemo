const axios = require("axios")

/**
 * Fetches groups from Okta API.
 * @param {string} baseUrl - The base URL of the Okta instance (e.g., https://trial-4677076.okta.com)
 * @param {string} apiToken - The SSWS API token.
 * @returns {Promise<Array>} - List of groups.
 */

async function fetchOktaGroups(baseUrl, apiToken) {
    if (!baseUrl || !apiToken) {
        throw new Error("Okta baseUrl and apiToken are required")
    }

    try {
        const response = await axios.get(`${baseUrl}/api/v1/groups`, {
            headers: {
                "Authorization": `SSWS ${apiToken}`,
                "Accept": "application/json"
            }
        })

        return response.data.map(group => ({
            id: group.id,
            name: group.profile.name,
            description: group.profile.description,
            lastUpdated: group.lastUpdated
        }))
    } catch (err) {
        console.error("Error fetching Okta groups:", err.response?.data || err.message)
        throw new Error(`Failed to fetch Okta groups: ${err.response?.data?.errorSummary || err.message}`)
    }
}

/**
 * Fetches groups for a specific user by their email.
 * @param {string} baseUrl - Okta base URL.
 * @param {string} apiToken - Okta API token.
 * @param {string} email - User email.
 */
async function fetchUserGroupsByEmail(baseUrl, apiToken, email) {
    if (!baseUrl || !apiToken || !email) {
        throw new Error("baseUrl, apiToken, and email are required")
    }

    let normalizedBaseUrl = baseUrl
    try {
        normalizedBaseUrl = new URL(baseUrl).origin
    } catch (e) {
        normalizedBaseUrl = baseUrl.replace(/\/+$/, "")
    }

    try {

        const headers = {
            "Authorization": `SSWS ${apiToken}`,
            "Accept": "application/json"
        }

        console.log(`[OktaService] Fetching user by email: ${email}`);
        console.log(`[OktaService] Request: GET ${normalizedBaseUrl}/api/v1/users?q=...`);

        const userSearchResponse = await axios.get(`${normalizedBaseUrl}/api/v1/users?q=${encodeURIComponent(email)}`, { headers })

        if (!userSearchResponse.data || userSearchResponse.data.length === 0) {
            console.warn(`Okta user not found for email: ${email}`)
            return []
        }

        const user = userSearchResponse.data.find(u => u.profile.email.toLowerCase() === email.toLowerCase() || u.profile.login.toLowerCase() === email.toLowerCase())

        if (!user) {
            console.warn(`No exact Okta user match for email: ${email}`)
            return []
        }

        const userId = user.id
        console.log(`[OktaService] Found user ID: ${userId}. Fetching groups...`);
        console.log(`[OktaService] Request: GET ${normalizedBaseUrl}/api/v1/users/${userId}/groups`);

        const groupsResponse = await axios.get(`${normalizedBaseUrl}/api/v1/users/${userId}/groups`, { headers })

        return groupsResponse.data.map(group => ({
            id: group.id,
            name: group.profile.name,
            description: group.profile.description
        }))
    } catch (err) {
        console.error("Error in fetchUserGroupsByEmail:", err.response?.data || err.message)
        throw new Error(`Failed to fetch Okta user groups: ${err.response?.data?.errorSummary || err.message}`)
    }
}

module.exports = { fetchOktaGroups, fetchUserGroupsByEmail }
