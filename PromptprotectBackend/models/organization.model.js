const mongoose = require("mongoose")

const ldapConfigSchema = new mongoose.Schema(
  {
    enabled: {
      type: Boolean,
      default: false
    },

    url: {
      type: String,
      trim: true
    },

    baseDN: {
      type: String,
      trim: true
    },

    serviceDN: {
      type: String,
      trim: true
    },

    servicePassword: {
      type: String
    },

    caCert: {
      type: String,
      default: null
    }
  },
  { _id: false }
)

const samlConfigSchema = new mongoose.Schema(
  {
    enabled: {
      type: Boolean,
      default: false
    },

    ssoUrl: String,
    entityId: String,
    idpCert: String,
    acsUrl: String,
    logoutUrl: String,
  },
  { _id: false }
)

const splunkConfigSchema = new mongoose.Schema(
  {
    enabled: {
      type: Boolean,
      default: false
    },

    hecUrl: String,
    hecToken: String,
    sourcetype: String,
    index: {
      type: String,
      default: "main"
    },
    allowInsecure: {
      type: Boolean,
      default: false
    }
  },
  { _id: false }
)

const organizationSchema = new mongoose.Schema(
  {
    orgName: {
      type: String,
      required: true,
      trim: true
    },

    orgEmail: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },

    orgPassword: {
      type: String,
      required: true
    },

    orgKey: {
      type: String,
      required: true,
      index: true
    },

    workspace: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
      validate: {
        validator: function (v) {
          return /^[a-zA-Z0-9_]+$/.test(v);
        },
        message: props => `${props.value} is not a valid workspace name! Use only alphanumeric characters and underscores.`
      }
    },

    authProviders: {
      local: {
        type: Boolean,
        default: true
      },
      ldap: {
        type: Boolean,
        default: false
      },
      saml: {
        type: Boolean,
        default: false
      }
    },

    ldap: ldapConfigSchema,
    saml: samlConfigSchema,
    splunk: splunkConfigSchema,

    subscription: {
      fileUploadsEnabled: {
        type: Boolean,
        default: false
      }
    },

    lastLogin: {
      type: Number,
      default: Date.now
    },
    timezone: {
      type: String,
      default: "UTC"
    }
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
organizationSchema.path("createdAt", Number);
organizationSchema.path("updatedAt", Number);

/* Indexes */

organizationSchema.index({ "authProviders.ldap": 1 })
organizationSchema.index({ "authProviders.saml": 1 })

module.exports = mongoose.model("Organization", organizationSchema)
