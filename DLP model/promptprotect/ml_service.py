from flask import Flask, request, jsonify
import spacy
from transformers import AutoTokenizer, AutoModelForTokenClassification, pipeline

from scanner.rules_scanner import scan_text
from scanner.normalize import normalize_findings, SCANNER_VERSION
from features.extractor import extract_features
from models.infer import MLInference
from datasets.logger import log_finding

app = Flask(__name__)
ml = MLInference()

nlp = spacy.load("en_core_web_sm")

MEDICAL_MODEL_ID = "Helios9/BioMed_NER"

tokenizer = AutoTokenizer.from_pretrained(MEDICAL_MODEL_ID)
model = AutoModelForTokenClassification.from_pretrained(MEDICAL_MODEL_ID)

medical_ner_pipeline = pipeline(
    "ner",
    model=model,
    tokenizer=tokenizer,
    aggregation_strategy="simple"
)

MERGE_LABEL_MAP = {
    "Disease_disorder": "diagnosis_name",
    "Medication": "drug_name",
    "Diagnostic_procedure": "medical_procedure",    
    "Therapeutic_procedure": "medical_procedure",
    "Dosage": "dosage",
    "Biological_structure": "anatomy"
}

DROP_LABELS = {
    "Date",
    "Age",
    "Sign_symptom",
    "Clinical_event"
}

def optimize_medical_entities(text, raw_entities):
    optimized = []
    buffer = None

    for ent in raw_entities:
        label = ent["entity_group"]

        if label in DROP_LABELS:
            continue
        if label not in MERGE_LABEL_MAP:
            continue

        start = ent["start_index"]
        end = ent["end_index"]

        if buffer:
            same_label = buffer["entity_group"] == label
            adjacent = start <= buffer["end_index"] + 1

            if same_label and adjacent:
                buffer["end_index"] = end
                buffer["text"] = text[buffer["start_index"]:end]
                buffer["confidence_score"] = max(
                    buffer["confidence_score"], ent["confidence_score"]
                )
                continue
            else:
                optimized.append(buffer)

        buffer = {
            "text": text[start:end],
            "entity_group": label,
            "label": MERGE_LABEL_MAP[label],    
            "start_index": start,
            "end_index": end,
            "confidence_score": ent["confidence_score"]
        }

    if buffer:
        optimized.append(buffer)

    return optimized

@app.route("/evaluate", methods=["POST"])
def evaluate():
    data = request.get_json(force=True)
    prompt = data.get("prompt")

    if not prompt:
        return jsonify({"error": "missing prompt"}), 400

    scan = scan_text(prompt)
    findings = normalize_findings(scan)

    results = []

    for finding in findings:
        if finding["category"] != "password":
            continue

        value = finding["value"]

        if any(x in value for x in [".", "(", ")", "=>"]):
            continue

        features = extract_features(finding, prompt)
        ml_result = ml.evaluate(finding, features)

        # Connect to the Flywheel Logger
        log_finding(
            prompt=prompt,
            scanner_version=SCANNER_VERSION,
            finding=finding,
            features=features
        )

        final_decision, decision_reason = ml.soft_enforce(
            finding,
            features,
            ml_result
        )

        results.append({
            "finding_id": finding["finding_id"],
            "value": finding["value"],
            "start_index": finding["start_index"],
            "end_index": finding["end_index"],
            "final_decision": final_decision,
            "decision_reason": decision_reason,
            "ml": ml_result
        })

    return jsonify({
        "scanner_version": SCANNER_VERSION,
        "password_findings": results
    })

@app.route("/ner", methods=["POST"])
def ner():
    data = request.get_json(force=True)
    text = data.get("text")

    if not text:
        return jsonify({ "entities": [] })

    doc = nlp(text)
    entities = []

    for ent in doc.ents:
        if ent.label_ in {"GPE", "LOC"}:
            entities.append({
                "text": ent.text,
                "label": ent.label_,
                "start_index": ent.start_char,
                "end_index": ent.end_char,
                "confidence_score": 0.55
            })

    return jsonify({ "entities": entities })

@app.route("/medical-ner-raw", methods=["POST"])
def medical_ner_raw():
    data = request.get_json(force=True)
    text = data.get("text")

    if not text:
        return jsonify({ "entities": [] })

    ner_results = medical_ner_pipeline(text)
    entities = []

    for ent in ner_results:
        start = ent.get("start")
        end = ent.get("end")

        if start is None or end is None:
            continue

        entities.append({
            "text": text[start:end],
            "entity_group": ent.get("entity_group"),
            "start_index": start,
            "end_index": end,
            "confidence_score": float(ent.get("score", 0.0))
        })

    return jsonify({ "entities": entities })

@app.route("/medical-ner", methods=["POST"])
def medical_ner():
    data = request.get_json(force=True)
    text = data.get("text")

    if not text:
        return jsonify({ "entities": [] })

    raw_entities = []
    ner_results = medical_ner_pipeline(text)

    for ent in ner_results:
        start = ent.get("start")
        end = ent.get("end")

        if start is None or end is None:
            continue

        raw_entities.append({
            "text": text[start:end],
            "entity_group": ent.get("entity_group"),
            "start_index": start,
            "end_index": end,
            "confidence_score": float(ent.get("score", 0.0))
        })

    optimized = optimize_medical_entities(text, raw_entities)

    return jsonify({ "entities": optimized })

if __name__ == "__main__":
    app.run(port=7001)
