const XRegExp = require("xregexp");
const PII_SIGNATURES = require("../patterns/piiPatterns");

function isLikelyHash(value) {
    return /^[a-f0-9]{32,64}$/i.test(value);
}

module.exports = function scanPIISignatures(text, occupiedRanges = []) {
    const findings = [];

    const overlaps = (s, e) =>
        occupiedRanges.some(([x, y]) => s < y && e > x);

    for (const key of Object.keys(PII_SIGNATURES)) {
        const sig = PII_SIGNATURES[key];
        const regex = sig.pattern;

        XRegExp.forEach(text, regex, (match) => {
            const value =
                match[1] && typeof match[1] === "string"
                    ? match[1]
                    : match[0];

            const index = match.index;
            const end = index + value.length;

            if (overlaps(index, end)) return;

            // Avoid hashes being misdetected
            if (sig.priority <= 3 && isLikelyHash(value)) return;

            findings.push({
                category: "pii",
                sub_type: sig.type,
                secret_name: key,
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
    if (priority >= 10) return 0.99;
    if (priority >= 8) return 0.95;
    if (priority >= 6) return 0.90;
    if (priority >= 4) return 0.80;
    return 0.65;
}
