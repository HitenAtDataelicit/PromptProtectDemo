const XRegExp = require("xregexp");
const PCI_SIGNATURES = require("../patterns/fiPatterns");

function confidenceFromPriority(priority) {
    if (priority >= 10) return 0.99;
    if (priority >= 9) return 0.97;
    if (priority >= 7) return 0.95;
    if (priority >= 5) return 0.90;
    if (priority >= 3) return 0.80;
    return 0.65;
}

function luhnCheck(number) {
    const digits = number.replace(/\D/g, "");
    let sum = 0;
    let shouldDouble = false;

    for (let i = digits.length - 1; i >= 0; i--) {
        let d = Number(digits[i]);

        if (shouldDouble) {
            d *= 2;
            if (d > 9) d -= 9;
        }

        sum += d;
        shouldDouble = !shouldDouble;
    }

    return sum % 10 === 0;
}


module.exports = function scanPCISignatures(text, occupiedRanges = []) {
    const findings = [];

    const overlaps = (s, e) =>
        occupiedRanges.some(([x, y]) => s < y && e > x);

    for (const key of Object.keys(PCI_SIGNATURES)) {
        const sig = PCI_SIGNATURES[key];

        XRegExp.forEach(text, sig.pattern, (match) => {
            const value = match[1] || match[0];
            const index = match.index;
            const end = index + value.length;

            if (overlaps(index, end)) return;

            if (sig.luhn && !luhnCheck(value)) return;


            findings.push({
                category: "pci",
                secret_name: key,
                pci_type: sig.type,
                value,
                index,
                end,
                confidence_score: confidenceFromPriority(sig.priority),
                block_always: !!sig.block_always
            });

            occupiedRanges.push([index, end]);
        });
    }

    return findings;
};
