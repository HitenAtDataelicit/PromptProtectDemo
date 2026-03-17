const mongoose = require("mongoose");

const groupSchema = new mongoose.Schema({
    groupName: { type: String, required: true, unique: true },

    externalSsoGroups: {
        type: [String],
        default: []
    },

    groupUsers: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        }
    ],
    policiesAttached: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Policy"
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

module.exports = mongoose.model("Group", groupSchema);
