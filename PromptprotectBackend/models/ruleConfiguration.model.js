const mongoose = require("mongoose")

const ruleConfigurationSchema = new mongoose.Schema(
    {
        org: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Organization",
            required: true,
            index: true
        },

        configName: {
            type: String,
            required: true,
            trim: true
        },

        category: {
            type: String,
            required: true,
            enum: [
                "PII",
                "PCI",
                "PHI",
                "SECRETS",
                "INFRASTRUCTURE",
                "CRYPTOCURRENCY"
            ],
            index: true
        },

        description: {
            type: String,
            default: ""
        },

        rules: [
            {
                name: {
                    type: String,
                    required: true
                },
                enabled: {
                    type: Boolean,
                    default: true
                }
            }
        ],

        createdBy: String,
        updatedBy: String
    },
    {
        timestamps: {
            currentTime: () => Date.now(),
            createdAt: true,
            updatedAt: true
        }
    }
)

// Ensure timestamps the Mongoose way for Number type
ruleConfigurationSchema.path("createdAt", Number);
ruleConfigurationSchema.path("updatedAt", Number);

ruleConfigurationSchema.index(
    { org: 1, configName: 1 },
    { unique: true }
)

module.exports = mongoose.model("RuleConfiguration", ruleConfigurationSchema)
