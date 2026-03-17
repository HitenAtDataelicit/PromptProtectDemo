const mongoose = require("mongoose");

const CustomRuleSchema = new mongoose.Schema(
    {
        org: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Organization",
            required: true,
            index: true
        },

        ruleName: {
            type: String,
            required: true,
            trim: true
        },

        description: {
            type: String,
            default: ""
        },

        ruleType: {
            type: String,
            enum: ["REGEX", "TEXT"],
            default: "REGEX"
        },

        pattern: {
            type: String,
            required: true
        },

        flags: {
            type: String,
            default: "gi"
        },

        category: {
            type: String,
            default: "custom"
        },

        redactionLabel: {
            type: String,
            required: true,
            uppercase: true
        },

        createdBy: {
            type: String,
            required: true
        },

        updatedBy: {
            type: String,
            required: true
        },

        priority: {
            type: Number,
            default: 0,
            index: true
        }
    },
    {
        timestamps: {
            currentTime: () => Date.now(),
            createdAt: true,
            updatedAt: true
        }
    }
);

// Ensure timestamps are Numbers
CustomRuleSchema.path("createdAt", Number);
CustomRuleSchema.path("updatedAt", Number);

CustomRuleSchema.index({ org: 1, ruleName: 1 }, { unique: true });

module.exports = mongoose.model("CustomRule", CustomRuleSchema);
