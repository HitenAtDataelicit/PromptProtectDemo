from flask import Flask, render_template, jsonify, request
from pathlib import Path
from datetime import datetime
import json
import sys

# ============================================================
# App
# ============================================================
app = Flask(__name__)

# ============================================================
# Paths
# ============================================================
ROOT = Path(__file__).resolve().parents[2]  # → promptprotect/
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

print(f" [Reviewer] Project root: {ROOT}")
RAW = ROOT / "promptprotect" / "datasets" / "raw" / "findings.jsonl"
LABELED = ROOT / "promptprotect" / "datasets" / "labeled" / "labeled.jsonl"

# Canonical label writer
from promptprotect.datasets.labeling import save_label

# ============================================================
# Helpers
# ============================================================

def load_raw_index():
    """
    Returns { finding_id: full_record }
    """
    index = {}

    if not RAW.exists():
        return index

    with RAW.open("r", encoding="utf-8") as f:
        for line in f:
            try:
                record = json.loads(line)
                fid = record.get("finding", {}).get("finding_id")
                if fid:
                    index[fid] = record
            except Exception:
                continue

    return index


def load_labeled_ids():
    """
    Returns finding_ids already reviewed
    """
    ids = set()

    if LABELED.exists():
        with LABELED.open("r", encoding="utf-8") as f:
            for line in f:
                try:
                    ids.add(json.loads(line)["finding_id"])
                except Exception:
                    pass

    return ids


def iter_raw_records():
    """
    Generator over full raw records
    """
    if not RAW.exists():
        return

    with RAW.open("r", encoding="utf-8") as f:
        for line in f:
            try:
                yield json.loads(line)
            except Exception:
                continue


def load_rows():
    """
    DataTables-compatible rows
    (ONLY summary fields for UI)
    """
    rows = []
    labeled_ids = load_labeled_ids()

    for record in iter_raw_records():

        finding = record.get("finding", {})
        fid = finding.get("finding_id")
        ml = finding.get("ml", {}) or {}


        if not fid or fid in labeled_ids:
            continue

        rows.append({
            "id": fid,
            "value": finding.get("value"),
            "snippet": record.get("review_context", {}).get("snippet", ""),
            "entropy": finding.get("entropy"),
            "length": finding.get("value_length"),
            "category": finding.get("category"),

            "ml_enabled": ml.get("enabled"),
            "ml_candidate": ml.get("candidate"),
            "ml_score": ml.get("score"),
            "ml_decision": ml.get("decision"),
        })

    return rows


def find_record_by_id(finding_id):
    """
    Returns FULL raw record for a finding_id
    """
    for record in iter_raw_records():
        finding = record.get("finding", {})
        if finding.get("finding_id") == finding_id:
            return record
    return None


# ============================================================
# Routes
# ============================================================

@app.route("/")
def index():
    return render_template("datatable.html")


@app.route("/api/data")
def api_data():
    """
    DataTables requires:
    { data: [...] }
    """
    return jsonify({"data": load_rows()})


@app.route("/api/bulk_label", methods=["POST"])
def bulk_label():
    payload = request.json or {}
    ids = payload.get("ids", [])
    action = payload.get("action")

    if not ids or action not in {"KEEP", "SUPPRESS"}:
        return jsonify({"ok": False, "error": "Invalid request"}), 400

    # 🔥 Load RAW ONCE
    raw_index = load_raw_index()

    # 🔥 Open LABELED ONCE
    LABELED.parent.mkdir(parents=True, exist_ok=True)

    count = 0
    now = datetime.utcnow().isoformat()

    with LABELED.open("a", encoding="utf-8") as f:
        for fid in ids:
            record = raw_index.get(fid)
            if not record:
                continue

            # Use same schema as save_label
            output = {
                "finding_id": record["finding"]["finding_id"],
                "category": record["finding"]["category"],
                "features": record["features"],
                "label": action,
                "reviewer": "bulk-ui",
                "reviewed_at": record["logged_at"]
            }

            f.write(json.dumps(output) + "\n")
            count += 1

    return jsonify({"ok": True, "count": count})


# ============================================================
# Entry
# ============================================================

if __name__ == "__main__":
    app.run(debug=True)
