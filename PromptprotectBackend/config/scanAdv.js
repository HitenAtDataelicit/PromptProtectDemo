const CATEGORY_GROUPS = {
    pii: ["pii", "email", "phone", "ip_address", "ssn", "passport", "driver_license", "aadhaar", "pan", "date", "location"],
    pci: ["iban", "pci"],
    phi: ["medical_identifier", "drug_name", "diagnosis_name", "dosage"],
    secrets: ["password", "api_secret", "aws_secret", "private_key", "database_connection_string", "jwt_token", "github_token"],
    infrastructure: ["infrastructure", "uuid", "private_ip_range", "url"],
    cryptocurrency: ["cryptocurrency"],
    custom: ["custom"]
};

const CATEGORY_LOOKUP = {};
for (const [g, list] of Object.entries(CATEGORY_GROUPS))
    list.forEach(x => CATEGORY_LOOKUP[x] = g);

const REGEX = {
    email: /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-z]{2,}\b/g,
    phone: /\b\d{3}[-.\s]\d{3}[-.\s]\d{4}\b/g,
    ip_address: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
    private_ip_range: /\b(?:(?:10|127)\.\d{1,3}\.\d{1,3}\.\d{1,3}|(?:172\.(?:1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3})|(?:192\.168\.\d{1,3}\.\d{1,3}))\b/g,
    ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
    passport: /\b[A-Z][0-9]{7}\b/g,
    date: /\b(?:\d{4}[-\/.]\d{1,2}[-\/.]\d{1,2}|\d{1,2}[-\/.]\d{1,2}[-\/.]\d{2,4})\b/g,
    driver_license: /\b[A-Z]{2}\s?[0-9]{2}\s?[0-9]{10,12}\b/g,
    aadhaar: /(?:aadhaar|aadhar|uidai|uid)[^\d]{0,10}(\d{4}\s?\d{4}\s?\d{4})/gi,
    pan: /\b[A-Z]{5}[0-9]{4}[A-Z]\b/g,
    iban: /\b[A-Z]{2}\d{2}[A-Z0-9]{11,30}\b/g,
    aws_secret: /\b[0-9a-zA-Z/+]{40}\b/g,
    private_key: /-----BEGIN (RSA|DSA|EC|OPENSSH) PRIVATE KEY-----[\s\S]+?-----END \1 PRIVATE KEY-----/g,
    uuid: /\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}\b/g,
    database_connection_string: /\b(?:mongodb(?:\+srv)?:\/\/|postgres(?:ql)?:\/\/|mysql:\/\/|mssql:\/\/)[^\s"'<>]+/gi,
    jwt_token: /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g,
    github_token: /\bgh[pousr]_[A-Za-z0-9]{35,36}\b/g,
    url: /\bhttps?:\/\/(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(?::\d{2,5})?(?:\/[^\s"'<>]*)?/gi,
    password: /\b(?=[^\s]{8,})(?=.*[A-Za-z])(?=.*(\d|[^A-Za-z0-9]))[^\s]+\b/g
};

const EXTRA_DATE_REGEXES = [
    /\b\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}(?::\d{2})?(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?\b/g,

    /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{2,4}\b/gi,

    /\b\d{1,2}(?:st|nd|rd|th)?\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*,?\s+\d{2,4}\b/gi,

    /\b(19[5-9]\d|20\d{2}|21\d{2})\b/g
];


const SCAN_ORDER = [
    "email", "credit_card", "ssn", "passport", "driver_license", "uuid", "aadhaar", "pan", "phone",
    "private_ip_range", "ip_address", "iban",
    "aws_secret", "private_key", "database_connection_string",
    "jwt_token", "date", "github_token", "mac_address", "url", "password"
];

function looksLikeCodeIdentifier(v) {
    return (
        /[().=>]/.test(v) ||
        /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(v) ||
        /^[a-zA-Z_$][\w$]*(\.[\w$]+)+$/.test(v)
    );
}

function isInsideString(text, index) {
    const before = text.slice(0, index);
    const quotes = before.match(/["'`]/g);
    return quotes && quotes.length % 2 === 1;
}

const PASSWORD_CONTEXT = /(password|passwd|pwd|secret|token|key|auth)/i;

function hasPasswordContext(text, index, window = 40) {
    const slice = text.slice(
        Math.max(0, index - window),
        index + window
    );
    return PASSWORD_CONTEXT.test(slice);
}

function isInsideDbConnection(text, index) {
    const context = text.slice(Math.max(0, index - 50), index);
    return /(mongodb|postgres|mysql|redis):\/\//i.test(context);
}

function shannonEntropy(str) {
    const freq = {};
    for (const c of str) freq[c] = (freq[c] || 0) + 1;
    return Object.values(freq).reduce((e, f) => {
        const p = f / str.length;
        return e - p * Math.log2(p);
    }, 0);
}

function baseConfidence(category, value) {
    if (category === "password")
        return Math.min(0.95, 0.4 + shannonEntropy(value) / 5);
    if (category === "email" || category === "credit_card")
        return 0.95;
    return 0.85;
}

function isProtectedCategory(cat) {
    return ["pii", "pci", "secrets", "infrastructure"].includes(
        CATEGORY_LOOKUP[cat]
    );
}

async function evaluatePasswordsWithML(prompt) {
    const res = await fetch("http://127.0.0.1:7001/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt })
    });
    return res.json();
}

async function fetchNER(text) {
    const res = await fetch("http://127.0.0.1:7001/ner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text })
    });
    return res.json();
}

async function fetchMedicalNER(text) {
    const res = await fetch("http://127.0.0.1:7001/medical-ner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text })
    });
    return res.json();
}

function applyCustomRules(text, customRules = []) {
    const findings = [];

    // Sort by priority descending. 
    // This way, rules with smaller priority values are processed LATER.
    // In our redaction logic, later findings (at the same index) usually overwrite 
    // or the logic in piiScan handles them.
    // However, looking at redactWithIndices, it uses the label from the finding.
    // If we want SMALLEST number to win, it should be processed LAST if findings are just pushed.
    const sortedRules = [...customRules].sort((a, b) => (b.priority || 0) - (a.priority || 0));

    for (const rule of sortedRules) {
        try {
            const re = new RegExp(rule.pattern, rule.flags);

            if (re.global) {
                for (const m of text.matchAll(re)) {
                    if (m.index === undefined) continue;

                    findings.push({
                        category: rule.redactionLabel,
                        group: "custom",
                        value: m[0],
                        index: m.index,
                        length: m[0].length,
                        source: "custom_regex",
                        ruleId: rule._id
                    });
                }
            }
            else {
                const m = re.exec(text);
                if (m && m.index !== undefined) {
                    findings.push({
                        category: rule.redactionLabel,
                        group: "custom",
                        value: m[0],
                        index: m.index,
                        length: m[0].length,
                        source: "custom_regex",
                        ruleId: rule._id
                    });
                }
            }
        } catch (err) {
            console.error(
                `Invalid custom regex [${rule.ruleName}]`,
                err.message
            );
        }
    }

    return findings;
}


function scanText(text) {
    const rawFindings = [];
    const occupied = [];

    const overlaps = (s, e) => occupied.some(([x, y]) => s < y && e > x);

    for (const type of SCAN_ORDER) {

        if (type === "date") {
            const baseRegex = REGEX.date;

            for (const m of text.matchAll(baseRegex)) {
                const start = m.index;
                const end = start + m[0].length;
                if (overlaps(start, end)) continue;

                rawFindings.push({
                    category: "date",
                    value: m[0],
                    index: start,
                    end,
                    confidence_score: baseConfidence("date", m[0])
                });

                occupied.push([start, end]);
            }

            for (const rx of EXTRA_DATE_REGEXES) {
                for (const m of text.matchAll(rx)) {
                    const start = m.index;
                    const end = start + m[0].length;
                    if (overlaps(start, end)) continue;

                    rawFindings.push({
                        category: "date",
                        value: m[0],
                        index: start,
                        end,
                        confidence_score: baseConfidence("date", m[0])
                    });
                    occupied.push([start, end]);
                }
            }

            continue;
        }

        const regex = REGEX[type];
        if (!regex) continue;

        for (const m of text.matchAll(regex)) {
            const start = m.index;
            const end = start + m[0].length;
            if (overlaps(start, end)) continue;

            if (type === "email" && isInsideDbConnection(text, start)) continue;


            rawFindings.push({
                category: type,
                value: m[0],
                index: start,
                end,
                confidence_score: baseConfidence(type, m[0])
            });

            occupied.push([start, end]);
        }
    }
    return rawFindings;
}



async function scanTextWithML(prompt) {
    const baseFindings = scanText(prompt);
    const scanSecretSignatures = require("../scanner/secret_signatures");
    const scanPCISignatures = require("../scanner/scanPCISignatures");
    const scanMedicalSignatures = require("../scanner/scanMedicalSignatures");
    const scanInfrastructureSignatures = require("../scanner/scanInfrastructureSignatures");
    const scanPIISignatures = require("../scanner/scanPIISignatures");
    const scanCryptoSignatures = require("../scanner/scanCryptoSignatures");

    const mlResult = await evaluatePasswordsWithML(prompt);
    const nerResult = await fetchNER(prompt);
    const medicalNER = await fetchMedicalNER(prompt);

    const filteredBase = baseFindings.filter(f => {
        if (f.category !== "email") return true;

        const ctx = prompt.slice(Math.max(0, f.index - 50), f.index);
        return !/(mongodb|postgres|mysql|redis):\/\//i.test(ctx);
    });

    const decisions = new Map();
    for (const f of mlResult.password_findings)
        decisions.set(f.start_index, f);

    const finalRaw = [];
    const occupied = [];

    for (const f of filteredBase) {
        if (f.category !== "password") {
            finalRaw.push(f);
            occupied.push([f.index, f.end]);
            continue;
        }

        const ml = decisions.get(f.index);
        if (!ml) continue;

        if (ml.final_decision === "DETECT") {
            finalRaw.push({ ...f });
            occupied.push([f.index, f.end]);
        }
    }


    const piiFindings = scanPIISignatures(prompt, occupied);
    for (const f of piiFindings) {
        finalRaw.push(f);
        occupied.push([f.index, f.end]);
    }

    const secretFindings = scanSecretSignatures(prompt, occupied);
    for (const f of secretFindings) {
        finalRaw.push(f);
        occupied.push([f.index, f.end]);
    }

    const pciFindings = scanPCISignatures(prompt, occupied);
    for (const f of pciFindings) {
        finalRaw.push(f);
    }

    const infraFindings = scanInfrastructureSignatures(prompt, occupied);
    for (const f of infraFindings) {
        finalRaw.push(f);
        occupied.push([f.index, f.end]);
    }

    const medicalFindings = scanMedicalSignatures(prompt, occupied);
    for (const f of medicalFindings) {
        finalRaw.push(f);
        occupied.push([f.index, f.end]);
    }

    const cryptoFindings = scanCryptoSignatures(prompt, occupied);
    for (const f of cryptoFindings) {
        finalRaw.push(f);
        occupied.push([f.index, f.end]);
    }


    for (const ent of nerResult.entities || []) {
        finalRaw.push({
            category: "location",
            value: ent.text,
            index: ent.start_index,
            end: ent.end_index,
            confidence_score: ent.confidence_score ?? 0.55
        });
        occupied.push([ent.start_index, ent.end_index]);
    }

    for (const ent of medicalNER.entities || []) {
        const start = ent.start_index;
        const end = start + ent.text.length;

        if (occupied.some(([s, e]) => start < e && end > s)) continue;

        finalRaw.push({
            category: ent.label,
            value: ent.text,
            index: start,
            end: end,
            confidence_score: ent.confidence_score ?? 0.85
        });
    }

    const grouped = {};
    for (const f of finalRaw) {
        const g = CATEGORY_LOOKUP[f.category] || "other";
        if (!grouped[g]) grouped[g] = {};
        if (!grouped[g][f.category]) grouped[g][f.category] = [];
        grouped[g][f.category].push(f.value);
    }

    const categoryWise = Object.entries(grouped).map(([type, findings]) => ({
        type,
        findings
    }));

    const summary = {};
    for (const g of categoryWise)
        summary[g.type] = Object.values(g.findings).reduce((a, b) => a + b.length, 0);

    return {
        rawFindings: finalRaw,
        categoryWise,
        summary
    };
}

module.exports = { scanText, scanTextWithML, applyCustomRules, CATEGORY_LOOKUP };
