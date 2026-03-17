import joblib
import numpy as np
from pathlib import Path

# MODEL_PATH = Path("models/password_classifier.joblib")

ML_CATEGORIES = {"password", "api_key"}

BASE_DIR = Path(__file__).resolve().parents[1]
MODEL_PATH = BASE_DIR / "models" / "password_classifier.joblib"



# Shadow + soft-enforcement thresholds
KEEP_THRESHOLD = 0.80
SUPPRESS_THRESHOLD = 0.20
SUPPRESS_THRESHOLD_STRICT = 0.10


class MLInference:
    def __init__(self):
        bundle = joblib.load(MODEL_PATH)
        self.model = bundle["model"]
        self.feature_names = bundle["features"]

    # ---------------------------
    # ML scoring (no policy)
    # ---------------------------
    def score(self, features: dict) -> float:
        x = np.array([[int(features[f]) for f in self.feature_names]])
        prob_keep = self.model.predict_proba(x)[0][1]
        return round(float(prob_keep), 3)

    def evaluate(self, finding: dict, features: dict) -> dict:
        category = finding["category"]

        # Not an ML candidate
        if category not in ML_CATEGORIES:
            return {
                "enabled": False,
                "candidate": False
            }

        score = self.score(features)

        if score >= KEEP_THRESHOLD:
            decision = "KEEP"
        elif score <= SUPPRESS_THRESHOLD:
            decision = "SUPPRESS"
        else:
            decision = "UNCERTAIN"

        return {
            "enabled": True,
            "candidate": True,
            "score": score,
            "decision": decision,
            "thresholds": {
                "keep": KEEP_THRESHOLD,
                "suppress": SUPPRESS_THRESHOLD
            }
        }

    # ---------------------------
    # Policy layer (safe override)
    # ---------------------------
    def soft_enforce(self, finding: dict, features: dict, ml_result: dict):
        """
        Returns: (final_decision, reason)
        """

        # Default: rule decides
        final_decision = "DETECT"
        reason = "rule_only"

        # Never override HARD rules
        if finding["rule_strength"] == "HARD":
            return final_decision, reason

        # ML must be active
        if not ml_result.get("enabled"):
            return final_decision, reason

        score = ml_result.get("score")

        # Ultra-safe suppression only
        if (
            score is not None
            and score <= SUPPRESS_THRESHOLD_STRICT
            and not features["is_assignment"]
            and not features["key_hint_present"]
            and not features["in_exception_context"]
        ):
            return "SUPPRESS", "ml_strict_low_confidence"

        return final_decision, reason
