const fs = require("fs");
const axios = require("axios");
const path = require("path");
const https = require("https");

async function sendLogsToSplunk(orgName, orgId, hecToken, heckUrl, splunk_sourcetype) {

  const logFile = path.join(__dirname, "..", "logs", `${orgName}.log`);
  const offsetFile = path.join(__dirname, "..", "logs", `${orgName}.offset`);

  if (!fs.existsSync(logFile)) {
    // console.log(`Log file not found: ${logFile}`);
    return;
  }

  let lastOffset = 0;
  if (fs.existsSync(offsetFile)) {
    lastOffset = parseInt(fs.readFileSync(offsetFile, "utf8")) || 0;
  }

  const stats = fs.statSync(logFile);
  const totalSize = stats.size;

  if (lastOffset >= totalSize) {
    console.log(`No new logs for ${orgName}`);
    return;
  }

  const fileDescriptor = fs.openSync(logFile, "r");
  const buffer = Buffer.alloc(totalSize - lastOffset);

  fs.readSync(fileDescriptor, buffer, 0, buffer.length, lastOffset);
  fs.closeSync(fileDescriptor);

  const newData = buffer.toString();
  const newLines = newData.split("\n").filter((l) => l.trim().length > 0);

  const agent = new https.Agent({
    rejectUnauthorized: false
  });

  // console.log("hec token : ", hecToken)
  // console.log("hec ip : ", heckUrl)

  for (const line of newLines) {
    try {
      await axios.post(
        heckUrl,
        {
          "event": line,
          "sourcetype": splunk_sourcetype,
          "source": `${orgName}:gpt_logs`
        },
        {
          headers: { "Content-Type": "application/json", Authorization: `Splunk ${hecToken}` },
          httpsAgent: agent,
        }
      );
    } catch (error) {
      console.error("Error sending log:", error.message);
      return;
    }
  }

  fs.writeFileSync(offsetFile, totalSize.toString());
  // console.log(`Updated offset for ${orgName} to ${totalSize}`);
  console.log(`Sent ${newLines.length} new logs for ${orgName} to Splunk.`);
}

module.exports = { sendLogsToSplunk };
