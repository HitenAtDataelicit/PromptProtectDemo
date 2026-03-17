const mongoose = require("mongoose");

const deactivationKeySchema = new mongoose.Schema({
    org: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Organization",
        required: true
    },
    key: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        trim: true
    },
    type: {
        type: String,
        enum: ["ORG_WIDE", "SINGLE_USER"],
        required: true
    },
    userEmail: {
        type: String,
        lowercase: true,
        trim: true,
        required: function () { return this.type === "SINGLE_USER"; }
    },
    isUsed: {
        type: Boolean,
        default: false
    },
    usedAt: {
        type: Number
    },
    expiresAt: {
        type: Date,
        default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), // Keep Date for TTL index
        index: { expires: 0 }
    },
    createdBy: {
        type: String,
        required: true
    }
}, {
    timestamps: {
        currentTime: () => Date.now(),
        createdAt: true,
        updatedAt: true
    }
});

// Ensure timestamps are Numbers
deactivationKeySchema.path("createdAt", Number);
deactivationKeySchema.path("updatedAt", Number);

module.exports = mongoose.model("DeactivationKey", deactivationKeySchema);
