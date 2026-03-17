const express = require("express")
const router = express.Router()
const RuleCatalog = require("../models/ruleCatalog.model")

/**
 * GET /api/rules/catalog
 * Read-only global rule catalog
 */
router.get("/rules/catalog", async (req, res) => {
    try {
        const catalog = await RuleCatalog.find()
            .select("-__v")
            .sort({ category: 1 })

        res.json({
            success: true,
            data: catalog
        })
    } catch (err) {
        console.error("Rule catalog fetch error:", err)
        res.status(500).json({
            success: false,
            message: "Failed to fetch rule catalog"
        })
    }
})

module.exports = router
