const XRegExp = require("xregexp");
const CRYPTO_SIGNATURES = require("../patterns/cryptoPatterns");

module.exports = function scanCryptoSignatures(text, occupiedRanges = []) {
    const findings = [];

    const overlaps = (s, e) =>
        occupiedRanges.some(([x, y]) => s < y && e > x);

    for (const key of Object.keys(CRYPTO_SIGNATURES)) {
        const sig = CRYPTO_SIGNATURES[key];

        XRegExp.forEach(text, sig.pattern, match => {
            const value = match[0];
            const index = match.index;
            const end = index + value.length;

            if (overlaps(index, end)) return;

            findings.push({
                category: "cryptocurrency",
                secret_name: key,
                value,
                index,
                end,
                confidence_score:
                    sig.priority >= 7 ? 0.99 :
                    sig.priority >= 5 ? 0.90 : 0.80
            });

            occupiedRanges.push([index, end]);
        });
    }

    return findings;
};
