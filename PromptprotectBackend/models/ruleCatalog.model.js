const mongoose = require("mongoose");

/**
 * RuleCatalog - Simple catalog of all available detection rules
 * Just stores category and rule names - no hardcoded data
 */
const ruleCatalogSchema = new mongoose.Schema({
    category: {
        type: String,
        required: true,
        unique: true,
        enum: ["PII", "PCI", "PHI", "SECRETS", "INFRASTRUCTURE", "CRYPTOCURRENCY"]
    },

    displayName: {
        type: String,
        required: true
    },

    description: {
        type: String,
        default: ""
    },

    // Simple array of rule names
    rules: [{
        type: String,
        required: true
    }],

    createdAt: {
        type: Number,
        default: Date.now
    },

    updatedAt: {
        type: Number,
        default: Date.now
    }
});

// Update timestamp on save
ruleCatalogSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model("RuleCatalog", ruleCatalogSchema);
