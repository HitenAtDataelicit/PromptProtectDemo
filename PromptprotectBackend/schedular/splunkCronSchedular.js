const cron = require("node-cron");
const fs = require("fs");
const path = require("path");
const { sendLogsToSplunk } = require("../services/splunkSender");
const Organization = require("../models/organization.model");

cron.schedule("*/5 * * * *", async () => {
    console.log("Cron: Checking logs...");
    try {
        const organizations = await Organization.find().lean();

        const configs = organizations.map(org => ({
            orgName: org.orgName,
            heckUrl: org.splunk?.hecUrl,
            hecToken: org.splunk?.hecToken,
            orgKey: org.orgKey,
            splunk_sourcetype: org.splunk?.sourcetype || org.orgName
        }));

        for (const cfg of configs) {
            if (!cfg.heckUrl || !cfg.hecToken || !cfg.splunk_sourcetype) continue;

            const logFilePath = path.join(__dirname, "..", "logs", `${cfg.orgName}.log`);

            if (fs.existsSync(logFilePath)) {
                await sendLogsToSplunk(cfg.orgName, cfg.orgKey, cfg.hecToken, cfg.heckUrl, cfg.splunk_sourcetype);
            }
        }
    } catch (error) {
        console.error("Cron Error fetching orgs for Splunk:", error.message);
    }
});