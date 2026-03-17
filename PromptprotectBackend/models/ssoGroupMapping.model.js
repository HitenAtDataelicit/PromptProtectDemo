const mongoose = require("mongoose")

const SSOGroupMappingSchema = new mongoose.Schema(
  {
    org: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true
    },

    provider: {
      type: String,
      enum: ["LDAP", "SAML"],
      required: true,
      index: true
    },

    externalGroupId: {
      type: String,
      required: true,
      trim: true,
      index: true
    },

    externalGroupName: {
      type: String,
      trim: true
    },

    role: {
      type: String,
      enum: ["ADMIN", "USER_MANAGER", "POLICY_MANAGER", "GROUP_MANAGER", "DEFAULT"],
      required: true,
      index: true
    },

    isActive: {
      type: Boolean,
      default: true
    },

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

SSOGroupMappingSchema.path("createdAt", Number);
SSOGroupMappingSchema.path("updatedAt", Number);

SSOGroupMappingSchema.index(
  { org: 1, provider: 1, externalGroupId: 1, role: 1 },
  { unique: true }
)

SSOGroupMappingSchema.index(
  { org: 1, provider: 1, externalGroupId: 1 }
)

module.exports = mongoose.model("SSOGroupMapping", SSOGroupMappingSchema)
