import json
import joblib
from pathlib import Path

import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report

ROOT = Path(__file__).resolve().parents[2]

LABELED = ROOT / "promptprotect" / "datasets" / "labeled" / "labeled.jsonl"
MODEL_OUT = ROOT / "promptprotect" / "models" / "password_classifier.joblib"

FEATURE_COLUMNS = [
    "value_length",
    "entropy",
    "char_classes",

    "has_lower",
    "has_upper",
    "has_digit",
    "has_symbol",

    "is_assignment",
    "key_hint_present",
    "in_exception_context",

    "is_file_like",
    "is_readable",
    "is_numeric",
]

LABEL_MAP = {
    "KEEP": 1,
    "SUPPRESS": 0
}

def load_training_data():
    X, y = [], []
    total = skipped = keep = suppress = 0

    print(f"📥 Loading labeled data from:\n   {LABELED}")

    if not LABELED.exists():
        raise FileNotFoundError(f"Labeled file not found: {LABELED}")

    with LABELED.open("r", encoding="utf-8") as f:
        for i, line in enumerate(f, start=1):
            row = json.loads(line)
            total += 1

            if row["category"] not in {"password", "api_key"}:
                skipped += 1
                continue

            label = LABEL_MAP.get(row["label"])
            if label is None:
                skipped += 1
                continue

            if label == 1:
                keep += 1
            else:
                suppress += 1

            features = row["features"]
            X.append([int(features[col]) for col in FEATURE_COLUMNS])
            y.append(label)

            if i % 500 == 0:
                print(f"  processed {i} rows...")

    X = np.array(X)
    y = np.array(y)

    print("\n📊 Dataset summary")
    print(f"  Total rows read   : {total}")
    print(f"  Used for training : {len(y)}")
    print(f"  Skipped           : {skipped}")
    print(f"  KEEP              : {keep} ({keep / max(1, len(y)) * 100:.1f}%)")
    print(f"  SUPPRESS          : {suppress} ({suppress / max(1, len(y)) * 100:.1f}%)")

    return X, y

def train():
    X, y = load_training_data()

    if len(y) < 2:
        print(f"⚠️ Not enough labeled samples to train (got {len(y)}). Need at least 2.")
        return None

    if len(np.unique(y)) < 2:
        print("⚠️ Current dataset only has one class (all KEEP or all SUPPRESS).")
        print("   The model needs examples of BOTH classes to train. Please label more data.")
        return None

    print(f"\n🚀 Training LogisticRegression on {len(y)} samples...")

    model = LogisticRegression(
        max_iter=1000,
        class_weight="balanced",
        solver="liblinear"
    )

    model.fit(X, y)

    print("✅ Training finished")

    preds = model.predict(X)
    print("\n📈 Training Performance (sanity check):")
    print(classification_report(y, preds))

    MODEL_OUT.parent.mkdir(exist_ok=True)
    joblib.dump(
        {
            "model": model,
            "features": FEATURE_COLUMNS,
            "label_map": LABEL_MAP
        },
        MODEL_OUT
    )

    print(f"\n💾 Model saved to:\n   {MODEL_OUT}")

    return model

if __name__ == "__main__":
    model = train()

    if model is not None:
        print("\n🔍 Feature Weights:")
        for name, coef in zip(FEATURE_COLUMNS, model.coef_[0]):
            print(f"{name:25s}: {coef:.3f}")
    else:
        print("\n❌ Training skipped due to insufficient data.")
