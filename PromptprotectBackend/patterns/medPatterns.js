const XRegExp = require("xregexp");

module.exports = {
    uuidStyleMRN: {
        type: "UUID-style Medical Record Numbers",
        pattern: XRegExp('\\b(?:mrn|record)[#: -]+[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\\b', 'i'),
        description: "Matches UUID format, e.g., 'MRN# 123e4567-e89b-12d3-a456-426614174000'.",
        tags: ["Medical", "Record"],
        priority: 8
    },
    facilityID: {
        type: "Facility Identification Numbers",
        pattern: XRegExp('\\b(?:facility id|facility number)[#: -]+[1-4]\\d{9}\\b', 'i'),
        description: "Matches 10-digit facility IDs starting with 1-4, labeled as 'facility id'.",
        tags: ["Medical", "Facility"],
        priority: 7
    },
    icdSubcategoryCode: {
        type: "ICD-10 with Subcategory Codes",
        pattern: XRegExp('\\b(?:icd[-\\s]*10)[#: -]+[a-z]\\d{2}\\.\\d{1,2}\\b', 'i'),
        description: "Matches ICD-10 codes with subcategories, e.g., 'A12.34'.",
        tags: ["Medical", "Coding"],
        priority: 7
    },
    generalMRN: {
        type: "General Medical Record Number (MRN)",
        pattern: XRegExp('\\b(?:medical record|record|mrn)[#: -]+\\d{5,10}\\b', 'i'),
        description: "Captures 'MRN' or 'medical record' followed by a 5-10 digit number, ensuring standalone format.",
        tags: ["Medical", "Record"],
        priority: 6
    },
    medicareMedicaidID: {
        type: "Medicare/Medicaid IDs",
        pattern: XRegExp('\\b(?:medicare|medicaid|id)[#: -]+[a-z0-9]{10,12}\\b', 'i'),
        description: "Captures Medicare/Medicaid IDs with alphanumeric formats.",
        tags: ["Medical", "Insurance"],
        priority: 6
    },
    hicn: {
        type: "Health Insurance Claim Numbers (HICNs)",
        pattern: XRegExp('\\b(?:hicn|claim|insurance claim)[#: -]+\\d{9,11}\\b', 'i'),
        description: "Matches HICNs, typically 9-11 digits, labeled as 'claim' or 'HICN'.",
        tags: ["Medical", "Insurance", "Claims"],
        priority: 6
    },
    insurancePolicyNumber: {
        type: "Insurance Policy Numbers",
        pattern: XRegExp('\\b(?:insurance policy|policy|ins)[#: -]+[a-z0-9]{8,12}\\b', 'i'),
        description: "Matches insurance policy numbers with alphanumeric patterns.",
        tags: ["Insurance", "Policy"],
        priority: 6
    },
    medicalBillingCaseID: {
        type: "Medical Billing Case IDs",
        pattern: XRegExp('\\b(?:billing case|case id|billing)[#: -]+\\d{8,10}\\b', 'i'),
        description: "Captures 8-10 digit medical billing case numbers.",
        tags: ["Medical", "Billing"],
        priority: 6
    },
    healthcareClaimNumber: {
        type: "Healthcare Claims Numbers",
        pattern: XRegExp('\\b(?:claim number|claim id|healthcare claim)[#: -]+\\d{9,12}\\b', 'i'),
        description: "Matches 9-12 digit healthcare claim numbers.",
        tags: ["Medical", "Claims"],
        priority: 6
    },
    npi: {
        type: "National Provider Identifier (NPI)",
        pattern: XRegExp('\\b(?:NPI|provider number)[#: -]+\\d{10}\\b', 'i'),
        description: "Captures 10-digit NPI numbers labeled as 'NPI' or 'provider number'.",
        tags: ["Medical", "Provider"],
        priority: 6
    },
    providerFacilityNumber: {
        type: "Provider Facility Numbers",
        pattern: XRegExp('\\b(?:provider facility|facility id|facility number)[#: -]+\\d{8,10}\\b', 'i'),
        description: "Matches 8-10 digit provider facility numbers.",
        tags: ["Medical", "Provider", "Facility"],
        priority: 6
    },
    labTestID: {
        type: "Lab Test Identification Numbers",
        pattern: XRegExp('\\b(?:lab test|test id|test number)[#: -]+\\d{8,12}\\b', 'i'),
        description: "Matches 8-12 digit lab test ID numbers.",
        tags: ["Medical", "Laboratory"],
        priority: 6
    },
    uniquePatientID: {
        type: "Unique Patient Identifiers (UPIs)",
        pattern: XRegExp('\\b(?:upi|patient id)[#: -]+[a-z0-9]{8,12}\\b', 'i'),
        description: "Captures UPIs, allowing alphanumeric with 8-12 characters.",
        tags: ["Medical", "Patient", "Identifier"],
        priority: 6
    },
    clinicalTrialID: {
        type: "Clinical Trial IDs",
        pattern: XRegExp('\\b(?:clinical trial|trial id|trial number)[#: -]+[a-z0-9]{8,12}\\b', 'i'),
        description: "Matches clinical trial IDs, allowing alphanumeric format.",
        tags: ["Medical", "Trial"],
        priority: 6
    },
    authForServiceID: {
        type: "Authorization for Service IDs",
        pattern: XRegExp('\\b(?:authorization|service id|auth id)[#: -]+\\d{8,12}\\b', 'i'),
        description: "Matches authorization for service IDs with 8-12 digits.",
        tags: ["Medical", "Authorization"],
        priority: 6
    },
    mrnWithSpecificPrefixes: {
        type: "MRNs with Specific Prefixes (e.g., 'MR' or 'H')",
        pattern: XRegExp('\\b(?:MR|H)[#: -]*\\d{5,10}(?!\\d)', 'i'),
        description: "Matches 'MR' or 'H' prefixes with a 5-10 digit number, avoiding single-word triggers.",
        tags: ["Medical", "Record"],
        priority: 5
    },
    cptIcdCode: {
        type: "CPT/ICD-10 Codes",
        pattern: XRegExp('\\b(?:cpt|icd[-\\s]*10)[#: -]+[a-z]\\d{2,3}\\b', 'i'),
        description: "Captures CPT or ICD-10 codes (1 letter followed by 2-3 digits).",
        tags: ["Medical", "Coding"],
        priority: 5
    },
    drgCode: {
        type: "Diagnosis-related Group (DRG) Codes",
        pattern: XRegExp('\\b(?:drg|diagnosis-related group)[#: -]+\\d{3}\\b', 'i'),
        description: "Matches 3-digit DRG codes labeled as 'DRG'.",
        tags: ["Medical", "Coding"],
        priority: 5
    },
    specialtyProcedureCode: {
        type: "Specialty Procedure Codes",
        pattern: XRegExp('\\b(?:specialty procedure|procedure code)[#: -]+\\w{3,6}\\b', 'i'),
        description: "Captures alphanumeric specialty procedure codes (3-6 characters).",
        tags: ["Medical", "Procedure"],
        priority: 5
    },
    referenceLabTestID: {
        type: "Reference Lab Test IDs",
        pattern: XRegExp('\\b(?:reference lab|lab id|reference test)[#: -]+\\d{8,10}\\b', 'i'),
        description: "Matches reference lab test IDs with 8-10 digits.",
        tags: ["Medical", "Laboratory"],
        priority: 5
    },
    labRequisitionID: {
        type: "Laboratory Requisition IDs",
        pattern: XRegExp('\\b(?:lab requisition|requisition id)[#: -]+\\d{7,10}\\b', 'i'),
        description: "Matches laboratory requisition IDs, typically 7-10 digits.",
        tags: ["Medical", "Laboratory", "Requisition"],
        priority: 5
    },
    labProcessingID: {
        type: "Laboratory Processing IDs",
        pattern: XRegExp('\\b(?:processing id|lab process)[#: -]+\\d{7,10}\\b', 'i'),
        description: "Matches 7-10 digit lab processing IDs.",
        tags: ["Medical", "Laboratory"],
        priority: 5
    },
    rxNumber: {
        type: "Pharmacy Prescription Numbers",
        pattern: XRegExp('\\b(?:prescription|rx number|rx)[#: -]+\\d{6,10}\\b', 'i'),
        description: "Captures 6-10 digit pharmacy prescription numbers.",
        tags: ["Pharmacy", "Prescription"],
        priority: 5
    },
    pharmacyProcessingCode: {
        type: "Pharmacy Processing Codes",
        pattern: XRegExp('\\b(?:pharmacy process|process code)[#: -]+[a-z0-9]{5,10}\\b', 'i'),
        description: "Matches pharmacy processing codes with alphanumeric format.",
        tags: ["Pharmacy", "Processing"],
        priority: 5
    },
    specialtyDrugID: {
        type: "Specialty Drug IDs",
        pattern: XRegExp('\\b(?:specialty drug|drug id|drug number)[#: -]+\\d{5,10}\\b', 'i'),
        description: "Matches specialty drug IDs, typically 5-10 digits.",
        tags: ["Pharmacy", "Drug"],
        priority: 5
    },
    substanceControlNumber: {
        type: "Substance Control Numbers",
        pattern: XRegExp('\\b(?:substance control|control number)[#: -]+[a-z0-9]{7,10}\\b', 'i'),
        description: "Captures substance control numbers, allowing alphanumeric.",
        tags: ["Pharmacy", "Control"],
        priority: 5
    },
    drugAuthCode: {
        type: "Drug Authorization Codes",
        pattern: XRegExp('\\b(?:authorization code|drug auth|auth code)[#: -]+\\w{6,10}\\b', 'i'),
        description: "Matches drug authorization codes with alphanumeric format.",
        tags: ["Pharmacy", "Authorization"],
        priority: 5
    },
    hospitalAccountNumber: {
        type: "Hospital Account Numbers (HAN)",
        pattern: XRegExp('\\b(?:hospital account|han)[#: -]+\\d{6,10}\\b', 'i'),
        description: "Matches 6-10 digit hospital account numbers (HANs).",
        tags: ["Hospital", "Account"],
        priority: 5
    },
    hospitalVisitNumber: {
        type: "Hospital Visit Numbers",
        pattern: XRegExp('\\b(?:visit number|hospital visit)[#: -]+\\d{6,10}\\b', 'i'),
        description: "Matches hospital visit numbers, typically 6-10 digits.",
        tags: ["Hospital", "Visit"],
        priority: 5
    },
    therapySessionID: {
        type: "Therapy Session IDs",
        pattern: XRegExp('\\b(?:therapy session|session id|therapy id)[#: -]+\\d{6,10}\\b', 'i'),
        description: "Matches therapy session IDs with 6-10 digits.",
        tags: ["Therapy", "Session"],
        priority: 5
    },
    patientReferralID: {
        type: "Patient Referral IDs",
        pattern: XRegExp('\\b(?:referral id|referral number|patient referral)[#: -]+\\w{5,10}\\b', 'i'),
        description: "Captures patient referral IDs with alphanumeric 5-10 characters.",
        tags: ["Medical", "Patient", "Referral"],
        priority: 5
    },
    patientConditionCode: {
        type: "Patient Condition Group Codes",
        pattern: XRegExp('\\b(?:condition group|group code|condition code)[#: -]+\\d{3,5}\\b', 'i'),
        description: "Matches 3-5 digit patient condition group codes.",
        tags: ["Medical", "Condition", "Group"],
        priority: 5
    },
    medicalEligibilityNumber: {
        type: "Medical Eligibility Numbers",
        pattern: XRegExp('\\b(?:eligibility number|medical eligibility|eligibility id)[#: -]+\\d{8,10}\\b', 'i'),
        description: "Captures medical eligibility numbers with 8-10 digits.",
        tags: ["Medical", "Eligibility"],
        priority: 5
    },
    clinicalDocumentationCode: {
        type: "Clinical Documentation Codes",
        pattern: XRegExp('\\b(?:clinical doc|documentation id|doc code)[#: -]+[a-z0-9]{6,10}\\b', 'i'),
        description: "Captures clinical documentation codes with 6-10 alphanumeric.",
        tags: ["Medical", "Documentation"],
        priority: 5
    },
    medicalImagingReportNumber: {
        type: "Medical Imaging Report Numbers",
        pattern: XRegExp('\\b(?:imaging report|report id|imaging id)[#: -]+\\d{7,10}\\b', 'i'),
        description: "Matches 7-10 digit medical imaging report numbers.",
        tags: ["Medical", "Imaging"],
        priority: 5
    },
    therapyOrderNumber: {
        type: "Therapy Order Numbers",
        pattern: XRegExp('\\b(?:therapy order|order id|therapy id)[#: -]+\\d{7,10}\\b', 'i'),
        description: "Captures therapy order numbers with 7-10 digits.",
        tags: ["Therapy", "Order"],
        priority: 5
    },
    geneticTestID: {
        type: "Genetic Testing IDs",
        pattern: XRegExp('\\b(?:genetic test|genetic id|testing id)[#: -]+\\w{6,12}\\b', 'i'),
        description: "Matches genetic testing IDs with 6-12 alphanumeric characters.",
        tags: ["Medical", "Genetic"],
        priority: 5
    },
    geneticServiceID: {
        type: "Genetic Service IDs",
        pattern: XRegExp('\\b(?:genetic service|service id|genetic id)[#: -]+\\d{6,10}\\b', 'i'),
        description: "Captures genetic service IDs with 6-10 digits.",
        tags: ["Medical", "Genetic"],
        priority: 5
    },
    medicalReferenceNumber: {
        type: "Medical Reference Numbers",
        pattern: XRegExp('\\b(?:medical ref|reference id|ref number)[#: -]+\\d{6,10}\\b', 'i'),
        description: "Matches medical reference numbers, typically 6-10 digits.",
        tags: ["Medical", "Reference"],
        priority: 5
    },
    customMedicalID: {
        type: "Custom Medical Identifier",
        pattern: XRegExp('\\b(?:custom id|med id|custom number)[#: -]+\\w{6,12}\\b', 'i'),
        description: "Captures custom medical identifiers with 6-12 alphanumeric characters.",
        tags: ["Medical", "Custom"],
        priority: 4
    }
};