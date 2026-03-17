from typing import Dict
from scanner.rules_scanner import (
    shannon_entropy,
    assignment_context,
    in_exception_context,
    FILE_REGEX,
    READABLE_REGEX,
    NUMERIC_REGEX,
)

def extract_features(
    finding: Dict,
    full_text: str
) -> Dict:

    value = finding["value"]
    start = finding["start_index"]
    end = finding["end_index"]
    prompt_len = len(full_text)

    # ---------- Value Intrinsic ----------
    entropy = finding["entropy"]
    value_length = finding["value_length"]

    has_lower = any(c.islower() for c in value)
    has_upper = any(c.isupper() for c in value)
    has_digit = any(c.isdigit() for c in value)
    has_symbol = any(not c.isalnum() for c in value)

    char_classes = sum([has_lower, has_upper, has_digit, has_symbol])

    # ---------- Context ----------
    is_assign, key_hint = assignment_context(full_text, start)
    exception_ctx = in_exception_context(full_text, start)

    token_position = "rhs" if is_assign else "standalone"

    # ---------- Structural ----------
    start_index_norm = round(start / max(prompt_len, 1), 3)

    # ---------- Suppression Signals (Not Decisions) ----------
    is_file_like = bool(FILE_REGEX.fullmatch(value))
    is_readable = bool(READABLE_REGEX.fullmatch(value))
    is_numeric = bool(NUMERIC_REGEX.fullmatch(value))

    # ---------- Rule Metadata ----------
    features = {
        "finding_id": finding["finding_id"],
        # core
        "category": finding["category"],
        "source": finding["source"],
        "rule_strength": finding["rule_strength"],

        # value
        "value_length": value_length,
        "entropy": entropy,
        "char_classes": char_classes,
        "has_lower": has_lower,
        "has_upper": has_upper,
        "has_digit": has_digit,
        "has_symbol": has_symbol,

        # context
        "is_assignment": is_assign,
        "key_hint_present": key_hint,
        "token_position": token_position,
        "in_exception_context": exception_ctx,

        # structure
        "start_index_norm": start_index_norm,
        "prompt_length": prompt_len,

        # suppression hints
        "is_file_like": is_file_like,
        "is_readable": is_readable,
        "is_numeric": is_numeric
    }

    return features
