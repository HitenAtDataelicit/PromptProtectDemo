const XRegExp = require("xregexp");

module.exports = {
    credentials: {
        type: "Username and Password",
        pattern: XRegExp('\\b(?:username|user)[:\\s]+([A-Za-z0-9._%+-]+)\\s*(?:password|pass)[:\\s]+([A-Za-z0-9!@#$%^&*()_+-=]{6,})\\b', 'i'),
        description: "Matches adjacent username and password fields.",
        tags: ["PII", "Credentials"],
        priority: 10
    },
    ukNationalInsuranceNumber: {
        type: "UK National Insurance Number",
        pattern: XRegExp('\\b[A-CEGHJ-PR-TW-Z]{2}\\s?\\d{2}\\s?\\d{2}\\s?\\d{2}\\s?[A-D]\\b', 'i'),
        description: "Matches UK National Insurance (NI) numbers.",
        tags: ["PII", "ID", "UK"],
        priority: 8
    },
    canadianSocialInsuranceNumber: {
        type: "Canadian Social Insurance Number (SIN)",
        pattern: XRegExp('\\b(?:SIN|Social Insurance Number)[:\\s]*\\d{3}[-\\s]?\\d{3}[-\\s]?\\d{3}\\b', 'i'),
        description: "Matches labeled Canadian Social Insurance Numbers.",
        tags: ["PII", "ID", "Canada"],
        priority: 8
    },
    australianTaxFileNumber: {
        type: "Australian Tax File Number (TFN)",
        pattern: XRegExp('\\b(?:TFN|Tax File Number)[:\\s]*\\d{3}\\s?\\d{3}\\s?\\d{3}\\b', 'i'),
        description: "Matches labeled Australian Tax File Numbers.",
        tags: ["PII", "ID", "Australia"],
        priority: 8
    },
    taxID: {
        type: "Tax ID Number",
        pattern: XRegExp('\\b(?:(?:TIN|Tax ID|Taxpayer Identification Number)[:#\\s]*)?(?!Slot[:#\\s]*)(?!00)\\d{2}-\\d{7}\\b(?!\\s*(password|user|tax))', 'i'),
        description: "Matches Tax ID Numbers in dd-ddddddd format.",
        tags: ["PII", "Tax ID", "US"],
        priority: 8
    },
    driversLicense: {
        type: "Driver's License Number",
        pattern: XRegExp('\\b(?:Driver(?:\'s License|DL)?\\s?(Number)?)?[:#\\s]*[A-Z]{1,2}\\d{6,8}\\b(?!\\s*(password|user|licensee|license))', 'i'),
        description: "Matches common formats for driver's licenses.",
        tags: ["PII", "Driver's License"],
        priority: 7
    },
    passportNumber: {
        type: "Passport Number",
        pattern: XRegExp('\\b(?:Passport(?:\\sNumber)?)?[:#\\s]*[A-Z]{1}\\d{7,8}\\b(?!\\s*(password|pass|user))', 'i'),
        description: "Matches common formats for passport numbers.",
        tags: ["PII", "Passport"],
        priority: 7
    },
    labeledDateOfBirth: {
        type: "Labeled Date of Birth (DOB)",
        pattern: XRegExp('\\b(?:DOB|Date of Birth|Born)[:\\s]+(0[1-9]|1[0-2])[-/.](0[1-9]|[12]\\d|3[01])[-/.](19|20)\\d{2}\\b', 'i'),
        description: "Matches dates of birth that are explicitly labeled.",
        tags: ["PII", "DOB"],
        priority: 6
    },
    physicalAddress: {
        type: "Physical Address",
        pattern: XRegExp('\\b\\d{1,5}\\s(?:[A-Za-z0-9\\s.-]+?)\\s(?:Street|St|Avenue|Ave|Road|Rd|Lane|Ln|Drive|Dr|Boulevard|Blvd|Court|Ct|Circle|Cir)\\b', 'i'),
        description: "Matches basic street address formats.",
        tags: ["PII", "Location", "Address"],
        priority: 3
    },
    phoneNumber: {
        type: "Phone Number",
        pattern: XRegExp('\\b(?:\\+?\\d{1,3})?[-.\\s]?\\(?\\d{3}\\)?[-.\\s]?\\d{3}[-.\\s]?\\d{4}\\b(?!\\s*(password|user|extension|pin))', 'i'),
        description: "Matches common phone number formats.",
        tags: ["PII", "Contact", "Phone"],
        priority: 1
    },
	credentials: {
        type: "Username/Password Credentials",
        pattern: XRegExp('\\b(?:username|user|login|id)\\s*[:=]\\s*(\\S+)\\s+(?:password|pass|pwd)\\s*[:=]\\s*(\\S+)\\b', 'i'),
        description: "Matches adjacent username and password keywords and their values.",
        tags: ["PII", "Credentials", "Authentication"],
        priority: 10
    }
};