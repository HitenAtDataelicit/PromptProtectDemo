const passport = require("passport")
const MultiSamlStrategy = require("passport-saml").MultiSamlStrategy
const Organization = require("../models/organization.model")
const { decrypt } = require("../utils/crypto.utils")

exports.initSamlStrategy = () => {
    passport.use(
        "saml",
        new MultiSamlStrategy(
            {
                passReqToCallback: true,
                getSamlOptions: async (req, done) => {
                    try {
                        console.log(" [MultiSamlStrategy] Resolving options for path:", req.path)

                        const orgKey =
                            req.params.orgKey ||
                            req.query.orgKey ||
                            req.body?.RelayState ||
                            req.query?.RelayState

                        console.log(" [MultiSamlStrategy] Resolved orgKey:", orgKey)
                        console.log(" [MultiSamlStrategy] req.body keys:", Object.keys(req.body || {}))

                        if (!orgKey) {
                            return done(new Error("Missing orgKey in SAML flow"))
                        }

                        const org = await Organization.findOne({ orgKey }).lean()

                        if (!org) {
                            console.error(" [MultiSamlStrategy] Organization not found for key:", orgKey)
                            return done(new Error("Organization not found"))
                        }

                        if (!org.saml?.enabled) {
                            console.error(" [MultiSamlStrategy] SAML not enabled for org:", org.orgName)
                            return done(new Error("SAML not enabled for this organization"))
                        }

                        console.log(" [MultiSamlStrategy] Found org config:", org.orgName)

                        const samlOptions = {
                            entryPoint: org.saml.ssoUrl,
                            issuer: org.saml.entityId,
                            callbackUrl: org.saml.acsUrl || "https://api.pp.dataelicit.com/api/auth/saml/callback",
                            cert: org.saml.idpCert ? decrypt(org.saml.idpCert) : null,
                            logoutUrl: org.saml.logoutUrl,
                            additionalParams: { RelayState: orgKey }
                        }

                        return done(null, samlOptions)
                    } catch (err) {
                        console.error(" [MultiSamlStrategy] Error in getSamlOptions:", err)
                        return done(err)
                    }
                }
            },

            async (req, profile, done) => {
                try {
                    console.log(" RAW SAML PROFILE:", JSON.stringify(profile, null, 2))
                    console.log(" Profile Keys:", Object.keys(profile))

                    if (profile.getAssertionXml) {
                        console.log(" RAW SAML ASSERTION XML:", profile.getAssertionXml());
                    }

                    // Determine org from RelayState
                    const orgKey = req.body.RelayState
                    const org = await Organization.findOne({ orgKey }).lean()

                    // Use standard attributes with fallbacks
                    const email = profile.email || profile.mail || profile.nameID || profile["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"]

                    let groups = profile.groups || profile.memberOf || profile["http://schemas.microsoft.com/ws/2008/06/identity/claims/groups"] || []
                    if (typeof groups === "string") {
                        groups = [groups]
                    }

                    console.log(` Extracted Email: ${email}, Groups: ${groups}`)

                    return done(null, {
                        email,
                        groups,
                        orgId: org?._id,
                        orgKey: orgKey,
                        samlProfile: profile
                    })
                } catch (err) {
                    return done(err)
                }
            }
        )
    )

    passport.serializeUser((user, done) => {
        done(null, user)
    })

    passport.deserializeUser((user, done) => {
        done(null, user)
    })
}
