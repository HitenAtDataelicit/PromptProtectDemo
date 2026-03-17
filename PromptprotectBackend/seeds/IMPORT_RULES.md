# Quick Import Script for Rule Catalog

Use this to quickly populate the rule catalog via API.

## Import Data

### 1. SECRETS (API Patterns)
```bash
curl -X POST http://localhost:5005/api/rules/catalog/bulk-import \
  -H "Content-Type: application/json" \
  -d '{
    "category": "SECRETS",
    "displayName": "Secrets & API Keys",
    "description": "Detects API keys, tokens, and other secrets",
    "rules": "googleAPIKey,awsAccessID,githubPersonalAccessToken,githubFineGrainedToken,githubOAuthToken,githubUserToServerToken,githubServerToServerToken,githubRefreshToken,gitlabAPIKey,googleOAuthAccessToken,googleOAuthAuthCode,googleOAuthRefreshToken,openAIUserAPIKey,stripeAPIKey,slackAPIToken,telegramBotToken,twilioAPIKey,twilioSID,sendgridAPIKey,shopifyAccessToken,woocommerceAPIKey,datadogAPIKey,paypalAccessToken,twitterBearerToken,whatsappAccessToken"
  }'
```

### 2. CRYPTOCURRENCY
```bash
curl -X POST http://localhost:5005/api/rules/catalog/bulk-import \
  -H "Content-Type: application/json" \
  -d '{
    "category": "CRYPTOCURRENCY",
    "displayName": "Cryptocurrency",
    "description": "Detects cryptocurrency wallet addresses and private keys",
    "rules": "ethereumPrivateKey,solanaPrivateKey,bitcoinPrivateKey,stellarSecretKey,rippleSecretKey,ethereum,bitcoin,litecoin,cardano,stellar,xrp,dogecoin,avalanche,polkadot,solana"
  }'
```

### 3. PCI (Financial Patterns)
```bash
curl -X POST http://localhost:5005/api/rules/catalog/bulk-import \
  -H "Content-Type: application/json" \
  -d '{
    "category": "PCI",
    "displayName": "Payment Card Industry",
    "description": "Detects payment card and financial information",
    "rules": "track1Data,track2Data,pinCode,cvvCode,visaCardNumber,mastercardNumber,amexNumber,discoverCardNumber,jcbCardNumber,dinersClubCardNumber,unionPayCardNumber,maestroCardNumber,expirationDate,routingNumber,bankAccountNumber,loanAccountNumber,investmentAccountNumber,itin,tin,ein,ptin,alienRegistrationNumber,dunsNumber,businessLicenseNumber,cpaLicenseNumber,eaNumber,taxPreparerCertificationNumber,registeredAgentInfo,caf"
  }'
```

### 4. PHI (Medical Patterns)
```bash
curl -X POST http://localhost:5005/api/rules/catalog/bulk-import \
  -H "Content-Type: application/json" \
  -d '{
    "category": "PHI",
    "displayName": "Protected Health Information",
    "description": "Detects medical and health-related information",
    "rules": "uuidStyleMRN,facilityID,icdSubcategoryCode,generalMRN,medicareMedicaidID,hicn,insurancePolicyNumber,medicalBillingCaseID,healthcareClaimNumber,npi,providerFacilityNumber,labTestID,uniquePatientID,clinicalTrialID,authForServiceID,mrnWithSpecificPrefixes,cptIcdCode,drgCode,specialtyProcedureCode,referenceLabTestID,labRequisitionID,labProcessingID,rxNumber,pharmacyProcessingCode,specialtyDrugID,substanceControlNumber,drugAuthCode,hospitalAccountNumber,hospitalVisitNumber,therapySessionID,patientReferralID,patientConditionCode,medicalEligibilityNumber,clinicalDocumentationCode,medicalImagingReportNumber,therapyOrderNumber,geneticTestID,geneticServiceID,medicalReferenceNumber,customMedicalID"
  }'
```

### 5. INFRASTRUCTURE (Network Patterns)
```bash
curl -X POST http://localhost:5005/api/rules/catalog/bulk-import \
  -H "Content-Type: application/json" \
  -d '{
    "category": "INFRASTRUCTURE",
    "displayName": "Infrastructure Information",
    "description": "Detects infrastructure and network information",
    "rules": "certsAndKeys,sshRSAKey,sshDSSKey,sshECDSAKey,sshED25519Key,accessControlLists,ipv6Address,macAddress,localFilePath,subnetInfo,deviceSerials,assetTags,deviceHostnames,internalIP,externalIP,packetCaptures,networkMetadata,networkLogs,firewallRules"
  }'
```

### 6. PII (Personal Information)
```bash
curl -X POST http://localhost:5005/api/rules/catalog/bulk-import \
  -H "Content-Type: application/json" \
  -d '{
    "category": "PII",
    "displayName": "Personally Identifiable Information",
    "description": "Detects personal data that can identify individuals",
    "rules": "credentials,ukNationalInsuranceNumber,canadianSocialInsuranceNumber,australianTaxFileNumber,taxID,driversLicense,passportNumber,labeledDateOfBirth,physicalAddress,phoneNumber,email"
  }'
```

## Verify Import

```bash
# Get all categories
curl http://localhost:5005/api/rules/catalog

# Get specific category
curl http://localhost:5005/api/rules/catalog/PII
```

## PowerShell Version (Windows)

```powershell
# SECRETS
Invoke-RestMethod -Uri "http://localhost:5005/api/rules/catalog/bulk-import" -Method POST -ContentType "application/json" -Body '{"category":"SECRETS","displayName":"Secrets & API Keys","description":"Detects API keys, tokens, and other secrets","rules":"googleAPIKey,awsAccessID,githubPersonalAccessToken,githubFineGrainedToken,githubOAuthToken,githubUserToServerToken,githubServerToServerToken,githubRefreshToken,gitlabAPIKey,googleOAuthAccessToken,googleOAuthAuthCode,googleOAuthRefreshToken,openAIUserAPIKey,stripeAPIKey,slackAPIToken,telegramBotToken,twilioAPIKey,twilioSID,sendgridAPIKey,shopifyAccessToken,woocommerceAPIKey,datadogAPIKey,paypalAccessToken,twitterBearerToken,whatsappAccessToken"}'

# CRYPTOCURRENCY
Invoke-RestMethod -Uri "http://localhost:5005/api/rules/catalog/bulk-import" -Method POST -ContentType "application/json" -Body '{"category":"CRYPTOCURRENCY","displayName":"Cryptocurrency","description":"Detects cryptocurrency wallet addresses and private keys","rules":"ethereumPrivateKey,solanaPrivateKey,bitcoinPrivateKey,stellarSecretKey,rippleSecretKey,ethereum,bitcoin,litecoin,cardano,stellar,xrp,dogecoin,avalanche,polkadot,solana"}'

# PCI
Invoke-RestMethod -Uri "http://localhost:5005/api/rules/catalog/bulk-import" -Method POST -ContentType "application/json" -Body '{"category":"PCI","displayName":"Payment Card Industry","description":"Detects payment card and financial information","rules":"track1Data,track2Data,pinCode,cvvCode,visaCardNumber,mastercardNumber,amexNumber,discoverCardNumber,jcbCardNumber,dinersClubCardNumber,unionPayCardNumber,maestroCardNumber,expirationDate,routingNumber,bankAccountNumber,loanAccountNumber,investmentAccountNumber,itin,tin,ein,ptin,alienRegistrationNumber,dunsNumber,businessLicenseNumber,cpaLicenseNumber,eaNumber,taxPreparerCertificationNumber,registeredAgentInfo,caf"}'

# PHI
Invoke-RestMethod -Uri "http://localhost:5005/api/rules/catalog/bulk-import" -Method POST -ContentType "application/json" -Body '{"category":"PHI","displayName":"Protected Health Information","description":"Detects medical and health-related information","rules":"uuidStyleMRN,facilityID,icdSubcategoryCode,generalMRN,medicareMedicaidID,hicn,insurancePolicyNumber,medicalBillingCaseID,healthcareClaimNumber,npi,providerFacilityNumber,labTestID,uniquePatientID,clinicalTrialID,authForServiceID,mrnWithSpecificPrefixes,cptIcdCode,drgCode,specialtyProcedureCode,referenceLabTestID,labRequisitionID,labProcessingID,rxNumber,pharmacyProcessingCode,specialtyDrugID,substanceControlNumber,drugAuthCode,hospitalAccountNumber,hospitalVisitNumber,therapySessionID,patientReferralID,patientConditionCode,medicalEligibilityNumber,clinicalDocumentationCode,medicalImagingReportNumber,therapyOrderNumber,geneticTestID,geneticServiceID,medicalReferenceNumber,customMedicalID"}'

# INFRASTRUCTURE
Invoke-RestMethod -Uri "http://localhost:5005/api/rules/catalog/bulk-import" -Method POST -ContentType "application/json" -Body '{"category":"INFRASTRUCTURE","displayName":"Infrastructure Information","description":"Detects infrastructure and network information","rules":"certsAndKeys,sshRSAKey,sshDSSKey,sshECDSAKey,sshED25519Key,accessControlLists,ipv6Address,macAddress,localFilePath,subnetInfo,deviceSerials,assetTags,deviceHostnames,internalIP,externalIP,packetCaptures,networkMetadata,networkLogs,firewallRules"}'

# PII
Invoke-RestMethod -Uri "http://localhost:5005/api/rules/catalog/bulk-import" -Method POST -ContentType "application/json" -Body '{"category":"PII","displayName":"Personally Identifiable Information","description":"Detects personal data that can identify individuals","rules":"credentials,ukNationalInsuranceNumber,canadianSocialInsuranceNumber,australianTaxFileNumber,taxID,driversLicense,passportNumber,labeledDateOfBirth,physicalAddress,phoneNumber,email"}'
```
