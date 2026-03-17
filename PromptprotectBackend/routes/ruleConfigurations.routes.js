const express = require("express")
const router = express.Router()

const RuleConfiguration = require("../models/ruleConfiguration.model")
const RuleCatalog = require("../models/ruleCatalog.model")
const Organization = require("../models/organization.model")
const authenticate = require("../middleware/auth.middleware")


/* ---------------- HELPERS ---------------- */

async function resolveOrg(req) {
    const apiKey = req.headers["x-api-key"]

    // If API key is provided, use it
    if (apiKey) {
        const org = await Organization.findOne({ orgKey: apiKey })
        if (!org) {
            throw new Error("Invalid API key")
        }
        return org
    }

    // Otherwise, check if user is authenticated via session/JWT
    if (req.user && req.user.orgId) {
        const org = await Organization.findById(req.user.orgId)
        if (!org) {
            throw new Error("Organization not found")
        }
        return org
    }

    throw new Error("API key required")
}

/* ---------------- GET ALL CONFIGS ---------------- */

router.get("/rule-configurations", authenticate, async (req, res) => {
    try {
        const org = await resolveOrg(req)

        const configs = await RuleConfiguration.find({ org: org._id })
            .sort({ category: 1, createdAt: -1 })
            .lean()

        res.json({ success: true, data: configs })
    } catch (err) {
        console.error("Get configs error:", err)
        res.status(400).json({ success: false, message: err.message })
    }
})

/* ---------------- CREATE CONFIG ---------------- */

router.post("/rule-configurations", authenticate, async (req, res) => {
    try {
        const org = await resolveOrg(req)

        const {
            configName,
            category,
            description,
            rules,
            createdBy
        } = req.body

        const catalog = await RuleCatalog.findOne({ category })
        if (!catalog) {
            return res.status(404).json({
                success: false,
                message: `Category ${category} not found in catalog`
            })
        }

        const invalidRules = rules.filter(
            r => !catalog.rules.includes(r.name)
        )

        if (invalidRules.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Invalid rules: ${invalidRules
                    .map(r => r.name)
                    .join(", ")}`
            })
        }

        const config = await RuleConfiguration.create({
            org: org._id,
            configName,
            category,
            description,
            rules,
            createdBy,
            updatedBy: createdBy
        })

        res.json({ success: true, data: config })
    } catch (err) {
        console.error("Create config error:", err)
        res.status(400).json({ success: false, message: err.message })
    }
})

/* ---------------- UPDATE CONFIG ---------------- */

router.put("/rule-configurations/:id", authenticate, async (req, res) => {
    try {
        const org = await resolveOrg(req)

        const updated = await RuleConfiguration.findOneAndUpdate(
            { _id: req.params.id, org: org._id },
            req.body,
            { new: true }
        )

        if (!updated) {
            return res.status(404).json({
                success: false,
                message: "Configuration not found"
            })
        }

        res.json({ success: true, data: updated })
    } catch (err) {
        console.error("Update config error:", err)
        res.status(400).json({ success: false, message: err.message })
    }
})

/* ---------------- DELETE CONFIG ---------------- */

router.delete("/rule-configurations/:id", authenticate, async (req, res) => {
    try {
        const org = await resolveOrg(req)

        const deleted = await RuleConfiguration.findOneAndDelete({
            _id: req.params.id,
            org: org._id
        })

        if (!deleted) {
            return res.status(404).json({
                success: false,
                message: "Configuration not found"
            })
        }

        res.json({ success: true })
    } catch (err) {
        console.error("Delete config error:", err)
        res.status(400).json({ success: false, message: err.message })
    }
})

module.exports = router
