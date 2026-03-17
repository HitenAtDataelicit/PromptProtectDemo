require("dotenv").config()

const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const bcrypt = require("bcryptjs");
const User = require("./models/user.model");
const Organization = require("./models/organization.model");
const crypto = require("crypto");
const { auditLog } = require("./logger");
const dashboardRoutes = require("./routes/dashboard.routes");
const { runPiiScan } = require("./services/piiScan.service");
const { sendAnalyticsEvent } = require("./analytics/sendAnalyticsEvent");
const passport = require("passport");
const { initSamlStrategy } = require("./config/saml.config");
const ssoCtrl = require("./controllers/sso.controller");
const mongoose = require("mongoose");
const app = express();
const fs = require("fs");
const multer = require("multer");
const { extractTextFromFile } = require("./utils/fileParser");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }
});

const ruleCatalogRoutes = require("./routes/rules.catalog.routes")
const ruleConfigRoutes = require("./routes/ruleConfigurations.routes")

const session = require("express-session")

if (process.env.NODE_ENV !== 'test') {
  console.log("[Server] Connecting to real DB...");
  connectDB();
} else {
  console.log("[Server] Running in TEST mode. Skipped auto-connectDB. ReadyState:", mongoose.connection.readyState);
}

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    console.log("Incoming CORS request from origin:", origin);
    const allowedOrigins = [
      "https://promptprotect.dataelicit.com",
      "https://api.pp.dataelicit.com",
      "chrome-extension://bbphopilnncjefojefjemggdoldmefnd",
      "safari-web-extension://9c7ca297-e2db-4d58-85eb-b41f7ac47545"
    ];

    const isExtension = origin.startsWith("chrome-extension://") ||
      origin.startsWith("safari-web-extension://") ||
      origin.startsWith("extension://") ||
      origin.startsWith("moz-extension://");

    if (allowedOrigins.indexOf(origin) !== -1 || isExtension) {
      callback(null, true);
    } else {
      console.warn("Origin blocked by CORS:", origin);
      callback(null, false);
    }
  },
  credentials: true
}));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
  })
);

initSamlStrategy();
app.use(passport.initialize());
app.use(passport.session());

app.use("/api/users", require("./routes/user.routes"));
app.use("/api/groups", require("./routes/group.routes"));
app.use("/api/policies", require("./routes/policy.routes"));
app.use("/api/org", require("./routes/organization.route"));
app.use("/api/custom-rules", require("./routes/custom.rules.routes"));
app.use("/api", ruleCatalogRoutes)
app.use("/api", ruleConfigRoutes)
app.use("/api", dashboardRoutes);


const isDemoModeActive = true;

app.get('/api/extension/demo-config', (req, res) => {
  if (!isDemoModeActive) {
    return res.json({ demoModeActive: false });
  }

  // When demo mode is active, return the credentials that the extension will use to log in
  return res.json({
    demoModeActive: true,
    credentials: {
      email: "testuser@testorg.com",
      password: "Test@123!",
      orgKey: "a7cdb8f9593f837abe0799a80dd57c53b19d14e35226dda35b9a224f3044043d",
      workspace: "test_org"
    }
  });
});

app.use("/api/sso", require("./routes/sso.routes"));

app.use("/extensions", express.static("/opt/pp_upload"));

app.get("/extensions/promptprotect_extension.crx", (req, res) => {
  const filePath = "/opt/pp_upload/promptprotect_extension.crx";

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, message: "CRX file not found" });
  }

  res.setHeader("Content-Type", "application/x-chrome-extension");
  res.setHeader(
    "Content-Disposition",
    'attachment; filename="promptprotect_extension.crx"'
  );

  return res.sendFile(filePath);
});

app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

app.get("/saml-test.html", (req, res) => {
  res.sendFile(path.join(__dirname, "saml-test.html"));
});

app.post("/api/auth/saml/callback",
  passport.authenticate("saml", { failureRedirect: "/saml-test.html?error=true", failureFlash: false }),
  ssoCtrl.handleSamlCallback
);

app.post("/pii-scan", async (req, res) => {
  try {

    const apiKey = req.header("x-api-key");
    const userEmail = req.header("x-useremail");
    const user = await User.findOne({ userEmail }).lean();

    const userId = user?._id?.toString() || null;
    const userRole = user?.userRole?.[0] || "DEFAULT";

    const result = await runPiiScan({
      apiKey,
      userEmail,
      ...req.body
    });

    if (result?.orgName) {
      auditLog(result.orgName, {
        level: "INFO",
        event: "pii.scan",
        actor: { type: "user", email: userEmail },
        outcome: {
          status: result.piiDetected ? "pii_detected" : "clean"
        },
        context: {
          action: result.action,
          findingsCount: result.findings?.length || 0
        },
        trace: { source: "extension" }
      });
    }

    const piiAnalyticsData = {
      ts: Date.now(),
      org: result.orgName,
      event: "pii.scan",

      actor_email: userEmail,
      actor_id: userId,
      actor_role: userRole,

      pii_detected: result.piiDetected ? 1 : 0,
      action_taken: result.action,
      user_decision: null,

      "findings.category": result.findings.map(f => f.category),
      "findings.value": result.findings.map(f => f.value),
      "findings.confidence": result.findings.map(f => f.confidence_score || 0),
      "findings.group": result.findings.map(f => f.group),

      original: result.original,
      redacted_conversation: result.redactedConversation,
      detected_rules: result.allowedGroups,

      source: "extension",
      request_id: result.requestId
    }

    const sentToClickHouse = await sendAnalyticsEvent(piiAnalyticsData);
    res.json({ success: true, ...result });


  } catch (err) {
    auditLog("unknown", {
      level: "ERROR",
      event: "pii.scan.error",
      outcome: { status: "error" },
      context: { error: err.message },
      trace: { source: "extension" }
    });


    res.status(401).json({ success: false, message: err.message });
  }
});

app.post("/api/pii-scan-file", upload.single("file"), async (req, res) => {
  console.log("[DEBUG] /api/pii-scan-file triggered");
  try {
    const apiKey = req.header("x-api-key");
    const userEmail = req.header("x-useremail");
    const file = req.file;

    console.log("[DEBUG] File scan request headers:", { apiKey, userEmail });

    if (!file) {
      console.warn("[DEBUG] No file provided in request");
      return res.status(400).json({ success: false, message: "No file provided" });
    }

    console.log("[DEBUG] File received:", {
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size
    });

    const user = await User.findOne({ userEmail }).lean();
    const userId = user?._id?.toString() || null;
    const userRole = user?.userRole?.[0] || "DEFAULT";

    // Subscription check
    const org = await Organization.findOne({ orgKey: apiKey }).lean();
    if (!org) {
      console.warn("[DEBUG] Invalid API key:", apiKey);
      return res.status(404).json({ success: false, message: "Invalid API key" });
    }

    console.log("[DEBUG] Organization found:", org.orgName);
    console.log("[DEBUG] File uploads enabled for org:", org.subscription?.fileUploadsEnabled);

    if (!org.subscription?.fileUploadsEnabled) {
      console.warn("[DEBUG] File uploads NOT enabled for organization:", org.orgName);
      return res.status(403).json({
        success: false,
        message: "File uploads are not enabled for this organization's subscription."
      });
    }

    // Extract text from file buffer
    console.log("[DEBUG] Extracting text from file...");
    const extractedText = await extractTextFromFile(file.buffer, file.mimetype, file.originalname);
    console.log("[DEBUG] Extracted text length:", extractedText.length);

    const result = await runPiiScan({
      apiKey,
      userEmail,
      conversation: extractedText,
      url: req.body.url || "file-upload",
      timestamp: req.body.timestamp || new Date().toISOString(),
      requestId: req.body.requestId || `file_pp_${Date.now()}`,
      chatgptUser: req.body.chatgptUser || "unknown",
      sourceType: "FILE"
    });

    console.log("[DEBUG] PII Scan Result:", {
      success: true,
      piiDetected: result.piiDetected,
      action: result.action,
      findingsCount: result.findings?.length || 0
    });

    if (result?.orgName) {
      auditLog(result.orgName, {
        level: "INFO",
        event: "file.pii.scan",
        actor: { type: "user", email: userEmail },
        outcome: {
          status: result.piiDetected ? "pii_detected" : "clean"
        },
        context: {
          action: result.action,
          findingsCount: result.findings?.length || 0,
          fileName: file.originalname,
          fileSize: file.size
        },
        trace: { source: "extension" }
      });
    }

    const piiAnalyticsData = {
      ts: Date.now(),
      org: result.orgName,
      event: "file.pii.scan",

      actor_email: userEmail,
      actor_id: userId,
      actor_role: userRole,

      pii_detected: result.piiDetected ? 1 : 0,
      action_taken: result.action,
      user_decision: null,

      "findings.category": result.findings.map(f => f.category),
      "findings.value": result.findings.map(f => f.value),
      "findings.confidence": result.findings.map(f => f.confidence_score || 0),
      "findings.group": result.findings.map(f => f.group),

      original: result.original,
      redacted_conversation: result.redactedConversation,
      detected_rules: result.allowedGroups,

      source: "extension",
      request_id: result.requestId
    }

    await sendAnalyticsEvent(piiAnalyticsData);

    // Unlike text, we don't send back redacted files.
    // If it's REDACT or PARTIAL_REDACT or BLOCK -> We block. PROMPT_USER -> We trigger modal.
    // The frontend handles that logic based on `action`.

    // So just return the scan results.
    res.json({ success: true, ...result, fileName: file.originalname });


  } catch (err) {
    auditLog("unknown", {
      level: "ERROR",
      event: "file.pii.scan.error",
      outcome: { status: "error" },
      context: { error: err.message },
      trace: { source: "extension" }
    });

    res.status(500).json({ success: false, message: err.message });
  }
});

// app.post("/api/Verifytoken", async (req, res) => {
//   let org = null;

//   try {
//     const token = req.header("x-api-key");
//     const { userEmail, userPassword } = req.body;


//     if (!userEmail || !userPassword || !token) {
//       return res.status(400).json({
//         success: false,
//         message: "userEmail, userPassword & token are required"
//       });
//     }


//     const user = await User.findOne({ userEmail }).populate("org");
//     if (!user) {
//       auditLog("unknown", {
//         level: "WARN",
//         event: "token.verify.failed",
//         outcome: { status: "user_not_found" },
//         trace: { source: "api" }
//       });
//       return res.status(404).json({ success: false, message: "User not found" });
//     }


//     org = user.org;


//     const isMatch = await bcrypt.compare(userPassword, user.userPassword);
//     if (!isMatch || token !== org.orgKey) {
//       auditLog(org.orgName, {
//         level: "WARN",
//         event: "token.verify.failed",
//         actor: { type: "user", email: userEmail },
//         outcome: { status: "invalid_credentials" },
//         trace: { source: "api" }
//       });
//       return res.status(401).json({ success: false, message: "Invalid credentials" });
//     }


//     auditLog(org.orgName, {
//       level: "INFO",
//       event: "token.verify",
//       actor: { type: "user", email: userEmail },
//       outcome: { status: "success" },
//       trace: { source: "api" }
//     });


//     res.status(200).json({
//       success: true,
//       message: "Token verified successfully",
//       user: {
//         id: user._id,
//         userEmail: user.userEmail,
//         username: user.userName,
//         org
//       }
//     });


//   } catch (err) {
//     auditLog(org?.orgName || "unknown", {
//       level: "ERROR",
//       event: "token.verify.error",
//       outcome: { status: "error" },
//       context: { error: err.message },
//       trace: { source: "api" }
//     });


//     res.status(500).json({ success: false, message: "Server error" });
//   }
// });



// Legacy Verifytoken endpoint removed. Unified login endpoints are now used.



app.post("/api/sendUserAction", async (req, res) => {
  let org = null;


  try {
    const token = req.header("x-api-key");
    const userEmail = req.header("x-useremail");


    org = await Organization.findOne({ orgKey: token }).lean();
    if (!org) {
      auditLog("unknown", {
        level: "WARN",
        event: "user.action.denied",
        outcome: { status: "org_not_found" },
        trace: { source: "extension" }
      });
      return res.status(404).json({ success: false, message: "Organization not found" });
    }


    auditLog(org.orgName, {
      level: "INFO",
      event: "user.action",
      actor: { type: "user", email: userEmail },
      outcome: { status: "success" },
      context: {
        action: req.body.user_action
      },
      trace: { source: "extension" }
    });


    res.status(200).json({ success: true, message: "User action logged" });


  } catch (err) {
    auditLog(org?.orgName || "unknown", {
      level: "ERROR",
      event: "user.action.error",
      outcome: { status: "error" },
      context: { error: err.message },
      trace: { source: "extension" }
    });


    res.status(500).json({ success: false, message: "Server error" });
  }
});

app.get("/search", async (req, res) => {
  const q = String(req.query.q || "").trim();
  const client = req.query.client;


  const apiKey = req.header("x-api-key") || process.env.SEARCH_FALLBACK_API_KEY;
  const userEmail = req.header("x-useremail") || process.env.SEARCH_FALLBACK_USER_EMAIL;

  if (!q) {
    return res.redirect(302, "https://www.google.com");
  }

  if (!apiKey || !userEmail) {
    return res.status(401).json({ success: false, message: "Missing x-api-key or x-useremail header" });
  }

  try {
    const scanResult = await runPiiScan({
      apiKey: apiKey,
      userEmail: userEmail,
      conversation: q,
      url: "chrome-omnibox",
      timestamp: Date.now(),
      requestId: crypto.randomUUID(),
      chatgptUser: "chrome-user"
    });

    auditLog(scanResult.orgName || "unknown", {
      level: "INFO",
      event: "pii.scan",
      actor: { type: "user", email: userEmail },
      outcome: {
        status: scanResult.piiDetected ? "pii_detected" : "clean"
      },
      context: {
        action: scanResult.action,
        findingsCount: scanResult.findings?.length || 0
      },
      trace: { source: "chrome_search" }
    });

    const piiAnalyticsData = {
      ts: Date.now(),
      org: scanResult.orgName,
      event: "pii.scan",

      actor_email: userEmail,
      actor_id: null,
      actor_role: "DEFAULT",

      pii_detected: scanResult.piiDetected ? 1 : 0,
      action_taken: scanResult.action,
      user_decision: null,

      "findings.category": scanResult.findings.map(f => f.category),
      "findings.value": scanResult.findings.map(f => f.value),
      "findings.confidence": scanResult.findings.map(f => f.confidence_score || 0),
      "findings.group": scanResult.findings.map(f => f.group),

      original: scanResult.original,
      redacted_conversation: scanResult.redactedConversation,
      detected_rules: scanResult.allowedGroups,

      source: "chrome_search",
      request_id: scanResult.requestId
    };

    await sendAnalyticsEvent(piiAnalyticsData);

    if (!scanResult.piiDetected) {
      return res.redirect(
        302,
        "https://www.google.com/search?q=" + encodeURIComponent(q)
      );
    }

    return res.send(renderDecisionPage(scanResult));

  } catch (err) {
    console.error("Search scan error:", err.message);

    return res.redirect(
      302,
      "https://www.google.com/search?q=" + encodeURIComponent(q)
    );
  }
});

function renderDecisionPage(result) {
  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>PromptProtect</title>
</head>
<body>

<script>
const RESULT = ${JSON.stringify(result)};

${MODAL_SCRIPT}

(async () => {
  const decision = await showPIIDecisionModal(RESULT);

  if (decision === "block") {
    document.body.innerHTML =
      "<h2 style='font-family:sans-serif;padding:40px'>Search Blocked</h2>";
    return;
  }

  location.href =
    "https://www.google.com/search?q=" +
    encodeURIComponent(RESULT.redactedConversation);
})();
</script>

</body>
</html>`;
}

const MODAL_SCRIPT = `
function showPIIDecisionModal(result) {
  return new Promise(resolve => {
    const overlay = document.createElement("div");
    overlay.style.cssText =
      "position:fixed;inset:0;background:rgba(135, 43, 43, 0.65);backdrop-filter:blur(8px);" +
      "z-index:99999999;display:flex;align-items:center;justify-content:center;" +
      "font-family:system-ui";

    const card = document.createElement("div");
    card.style.cssText =
      "width:460px;max-height:80vh;display:flex;flex-direction:column;" +
      "background:#020617;border-radius:18px;padding:20px;color:#e5e7eb;" +
      "box-shadow:0 30px 80px rgba(0,0,0,.7)";

    const findings = result.findings.map(f =>
      "<div style='margin-bottom:6px;font-size:13px'>" +
      "<b>" + f.category.toUpperCase() + "</b>: " + f.value +
      "</div>"
    ).join("");

    card.innerHTML =
      "<h3>Sensitive Data Detected</h3>" +
      findings +
      "<p><b>Redacted Preview</b></p>" +
      "<div style='font-size:13px'>" + result.redactedConversation + "</div>" +
      "<div style='display:flex;gap:12px;margin-top:16px'>" +
        "<button id='block'>Block</button>" +
        "<button id='send'>Send Redacted</button>" +
      "</div>";

    overlay.appendChild(card);
    document.body.appendChild(overlay);

    card.querySelector("#block").onclick = () => {
      overlay.remove();
      resolve("block");
    };

    card.querySelector("#send").onclick = () => {
      overlay.remove();
      resolve("send_redacted");
    };
  });
}
`;

// require("./schedular/splunkCronSchedular");

const PORT = process.env.PORT || 5005;
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = app;
