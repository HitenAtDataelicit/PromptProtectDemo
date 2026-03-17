const XRegExp = require("xregexp");
const INFRA_SIGNATURES = require("../patterns/networkPatterns");

module.exports = function scanInfrastructureSignatures(text, occupied = []) {
  const findings = [];

  const overlaps = (s, e) =>
    occupied.some(([x, y]) => s < y && e > x);

  for (const key of Object.keys(INFRA_SIGNATURES)) {
    const sig = INFRA_SIGNATURES[key];

    XRegExp.forEach(text, sig.pattern, (match) => {
      const value = match[0];
      const index = match.index;
      const end = index + value.length;

      if (overlaps(index, end)) return;

      findings.push({
        category: "infrastructure",
        sub_type: sig.type,
        secret_name: key,
        value,
        index,
        end,
        confidence_score: confidenceFromPriority(sig.priority)
      });

      occupied.push([index, end]);
    });
  }

  return findings;
};

function confidenceFromPriority(p) {
  if (p >= 10) return 0.99;
  if (p >= 8) return 0.95;
  if (p >= 6) return 0.90;
  if (p >= 4) return 0.80;
  return 0.65;
}
