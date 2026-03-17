const XRegExp = require("xregexp");
const SECRET_SIGNATURES = require("../patterns/apiPatterns");


function isLikelyHash(value) {
    return /^[a-f0-9]{32,64}$/i.test(value);
}

module.exports = function scanSecretSignatures(text, occupiedRanges = []) {
    const findings = [];

    const overlaps = (s, e) =>
        occupiedRanges.some(([x, y]) => s < y && e > x);

    for (const key of Object.keys(SECRET_SIGNATURES)) {
        const sig = SECRET_SIGNATURES[key];
        const regex = sig.pattern;

        XRegExp.forEach(text, regex, (match) => {
            const value = match[1] || match[0];
            const index = match.index;
            const end = index + value.length;

            if (overlaps(index, end)) return;

            if (sig.priority <= 2 && isLikelyHash(value)) return;

            findings.push({
                category: "api_secret",
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
    if (priority >= 9) return 0.97;
    if (priority >= 7) return 0.95;
    if (priority >= 5) return 0.90;
    if (priority >= 3) return 0.80;
    return 0.65;
}
