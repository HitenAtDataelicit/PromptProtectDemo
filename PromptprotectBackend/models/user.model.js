const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  userName: {
    type: String,
    required: true,
    trim: true
  },

  userEmail: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },

  authProvider: {
    type: String,
    enum: ["LOCAL", "LDAP", "SAML"],
    default: "LOCAL"
  },

  userPassword: {
    type: String,
    required: true
  },

  userRole: {
    type: [String],
    default: ["DEFAULT"],
    index: true
  },

  org: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Organization",
    required: true
  },

  createdBy: {
    type: String
  },

  createdAt: {
    type: Number,
    default: Date.now
  },

  updatedBy: {
    type: String
  },

  updatedAt: {
    type: Number,
    default: Date.now
  },

  resetPasswordExpires: {
    type: Number
  },

  status: {
    type: String,
    enum: ["PENDING_VERIFICATION", "ACTIVE", "SUSPENDED"],
    default: "PENDING_VERIFICATION"
  },

  emailVerified: {
    type: Boolean,
    default: false
  },

  verificationToken: {
    type: String
  },

  verificationTokenExpires: {
    type: Number
  }
});

userSchema.pre("save", function () {
  this.updatedAt = Date.now();
});

module.exports = mongoose.model("User", userSchema);
