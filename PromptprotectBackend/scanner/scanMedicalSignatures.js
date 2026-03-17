const XRegExp = require("xregexp");
const MED_SIGNATURES = require("../patterns/medPatterns");
const secret_signatures = require("./secret_signatures");

module.exports = function scanMedicalSignatures(text, occupiedRanges = []) {
  const findings = [];

  const overlaps = (s, e) =>
    occupiedRanges.some(([x, y]) => s < y && e > x);

  for (const key of Object.keys(MED_SIGNATURES)) {
    const sig = MED_SIGNATURES[key];
    const regex = sig.pattern;

    XRegExp.forEach(text, regex, match => {
      const value = match[1] || match[0];
      const index = match.index;
      const end = index + value.length;

      if (overlaps(index, end)) return;

      findings.push({
        category: "medical_identifier",
        secret_name: key,
        sub_type: sig.type,
        value,
        index,
        end,
        confidence_score: confidenceFromPriority(sig.priority)
      });

      occupiedRanges.push([index, end]);
    });
  }

  return findings;
};

function confidenceFromPriority(priority) {
  if (priority >= 8) return 0.95;
  if (priority >= 6) return 0.90;
  if (priority >= 5) return 0.85;
  return 0.75;
}
