import uuid
from datetime import datetime
from .rules_scanner import shannon_entropy

SCANNER_VERSION = "v1.0"

SOURCE_MAP = {
    "email": ("EMAIL", "HARD"),
    "ip_address": ("IP", "HARD"),
    "credit_card": ("CREDIT_CARD", "HARD"),
    "api_key": ("API_KEY", "HARD"),
    "password": ("PASSWORD", "CONTEXT"),
}

def normalize_findings(scan_result: dict) -> list[dict]:
    normalized = []

    for f in scan_result.get("findings", []):
        value = f["value"]
        start = f["index"]

        source, strength = SOURCE_MAP.get(
            f["category"], ("UNKNOWN", "HEURISTIC")
        )

        normalized.append({
            "finding_id": str(uuid.uuid4()),
            "scanner_version": SCANNER_VERSION,

            "category": f["category"],
            "value": value,
            "value_length": len(value),

            "start_index": start,
            "end_index": start + len(value),

            "entropy": round(shannon_entropy(value), 2),

            "source": source,
            "rule_strength": strength,

            "timestamp": datetime.utcnow().isoformat() + "Z"
        })

    return normalized
