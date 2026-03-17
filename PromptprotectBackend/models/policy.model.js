const mongoose = require("mongoose");

const policySchema = new mongoose.Schema({
    policyName: { type: String, unique: true, required: true },
    rulesForPolicy: { type: [String], required: true },

    priority: {
        type: Number,
        required: true,
        index: true
    },

    action: {
        type: String,
        enum: ["BLOCK", "REDACT", "PARTIAL_REDACT", "PROMPT_USER", "REPORT_ONLY"],
        required: true,
        default: "PROMPT_USER"
    },

    targetType: {
        type: String,
        enum: ["PROMPT", "FILE", "BOTH"],
        default: "BOTH"
    },

    blockAllFiles: {
        type: Boolean,
        default: false
    },

    customRules: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "CustomRule"
        }
    ],

    ruleConfigurations: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "RuleConfiguration"
        }
    ],

    org: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Organization"
    },

    createdBy: { type: String },
    createdAt: { type: Number, default: Date.now },

    updatedBy: { type: String },
    updatedAt: { type: Number, default: Date.now }
});

module.exports = mongoose.model("Policy", policySchema);
