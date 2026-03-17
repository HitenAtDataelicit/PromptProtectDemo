from scanner.rules_scanner import scan_text
from scanner.normalize import normalize_findings, SCANNER_VERSION
from features.extractor import extract_features
from datasets.logger import log_finding
from models.infer import MLInference
from unmasked_text_list import unmasked_texts


ml = MLInference()

raw_count=1

# for prompt in unmasked_texts:
#     if(raw_count%100 == 0):
#         print("raw processed : ", raw_count)
#     raw_count +=1

prompts = [
"""
Hello Support,I am unable to log into the VPN. The credentials provided are: username: corp_user91 password: VpN@91!TempRegards
"""
]

for prompt in prompts:
    scan = scan_text(prompt)
    raw_findings = normalize_findings(scan)

    for finding in raw_findings:
        features = extract_features(finding, prompt)
        
        ml_result = ml.evaluate(finding, features)

        rule_decision = "DETECT"

        final_decision, decision_reason = ml.soft_enforce(
            finding,
            features,
            ml_result
        )

        log_finding(
            prompt=prompt,
            scanner_version=SCANNER_VERSION,
            finding={
                **finding,
                "ml": ml_result,
                "rule_decision": rule_decision,
                "final_decision": final_decision,
                "decision_reason": decision_reason
            },
            features=features
        )
