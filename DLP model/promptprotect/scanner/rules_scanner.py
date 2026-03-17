import re
import json
import math
from collections import Counter

# ============================================================
# REGEXES — HARD SIGNALS
# ============================================================

EMAIL_REGEX = re.compile(
    r"\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-z]{2,}\b"
)

IP_REGEX = re.compile(
    r"\b(?:\d{1,3}\.){3}\d{1,3}\b"
)

IPV6_REGEX = re.compile(
    r"\b(?:[A-Fa-f0-9]{1,4}:){7}[A-Fa-f0-9]{1,4}\b"
)

MAC_REGEX = re.compile(
    r"\b(?:[0-9A-Fa-f]{2}[:\-]){5}[0-9A-Fa-f]{2}\b"
)

CREDIT_CARD_REGEX = re.compile(
    r"\b(?:\d{4}[ -]?){3}\d{4}\b"
)

CREDIT_CARD_PLAIN_REGEX = re.compile(
    r"\b\d{16}\b"
)

JWT_REGEX = re.compile(
    r"\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b"
)

API_KEY_REGEX = re.compile(
    r"\b[A-Za-z0-9+/=_\-]{32,}\b"
)

PASSWORD_CONTEXT_REGEX = re.compile(
    r"(password|pass|pwd|secret|token|key|auth|cred)\s*(is|=|:)?\s*([^\s,]+)",
    re.IGNORECASE
)

PASSWORD_TOKEN_REGEX = re.compile(
    r"\b[^\s,]{6,}\b"
)

FILE_REGEX = re.compile(
    r".+\.(py|sh|yaml|yml|json|txt|csv|pt|pth|ckpt|log|bin|exe|dll)$",
    re.IGNORECASE
)

READABLE_REGEX = re.compile(
    r"^[a-z]+([_-][a-z]+)+$",
    re.IGNORECASE
)

NUMERIC_REGEX = re.compile(
    r"^[+-]?(\d+(\.\d+)?|\d+e[+-]?\d+)$",
    re.IGNORECASE
)

NOISE_REGEX = re.compile(r"^[-_=|]{4,}$")

SECRET_KEY_HINTS = re.compile(
    r"(pass|pwd|secret|token|key|auth|cred)",
    re.IGNORECASE
)

# ============================================================
# FALSE POSITIVE BLOCKERS (NEW)
# ============================================================

USER_AGENT_REGEX = re.compile(
    r"(mozilla|applewebkit|chrome|safari|firefox|opera|version)/\d",
    re.IGNORECASE
)

VERSION_REGEX = re.compile(
    r"^[A-Za-z]+/\d+(\.\d+){1,3}$"
)

ISO_TIMESTAMP_REGEX = re.compile(
    r"\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z\b"
)

DATE_ONLY_REGEX = re.compile(
    r"\b\d{4}-\d{2}-\d{2}\b"
)

# ============================================================
# HELPERS
# ============================================================

def shannon_entropy(s: str) -> float:
    freq = Counter(s)
    length = len(s)
    return -sum((c / length) * math.log2(c / length) for c in freq.values())

def normalize(val: str) -> str:
    return val.strip("\"'")

def is_long_readable_string(val: str) -> bool:
    if len(val) <= 20:
        return False
    letters = sum(c.isalpha() for c in val)
    return (letters / len(val)) > 0.8

def looks_like_secret(val: str) -> bool:
    if len(val) < 8:
        return False

    # Hard exclusions
    if (
        USER_AGENT_REGEX.search(val)
        or VERSION_REGEX.fullmatch(val)
        or ISO_TIMESTAMP_REGEX.fullmatch(val)
        or DATE_ONLY_REGEX.fullmatch(val)
        or is_long_readable_string(val)
    ):
        return False

    if shannon_entropy(val) < 3.0:
        return False

    classes = sum([
        any(c.islower() for c in val),
        any(c.isupper() for c in val),
        any(c.isdigit() for c in val),
        any(not c.isalnum() for c in val),
    ])

    return classes >= 3

def extract_rhs_if_assignment(val: str, start: int):
    if "=" in val:
        key, rhs = val.split("=", 1)
        return rhs, start + len(key) + 1
    return val, start

def assignment_context(text: str, start: int):
    before = text[:start].rsplit(None, 1)
    if not before:
        return False, False

    token = before[-1]
    if "=" not in token:
        return False, False

    key = token.split("=", 1)[0]

    if "." in key or len(key) > 25:
        return True, False

    return True, bool(SECRET_KEY_HINTS.search(key))

def in_exception_context(text: str, start: int) -> bool:
    window = text[max(0, start - 120):start]
    return any(x in window for x in ["Traceback", "Exception", "Error"])

# ============================================================
# CORE SCANNER
# ============================================================

def scan_text(text: str) -> dict:
    findings = []
    occupied = []

    def overlaps(start, end):
        return any(s <= start < e or s < end <= e for s, e in occupied)

    def add(category, value, index):
        findings.append({
            "category": category,
            "value": value,
            "index": index
        })
        occupied.append((index, index + len(value)))

    # ---------- HARD SIGNALS ----------

    for m in EMAIL_REGEX.finditer(text):
        add("email", m.group(), m.start())

    for m in IP_REGEX.finditer(text):
        add("ip_address", m.group(), m.start())

    for m in IPV6_REGEX.finditer(text):
        if not overlaps(m.start(), m.end()):
            add("ip_address", m.group(), m.start())

    for m in MAC_REGEX.finditer(text):
        if not overlaps(m.start(), m.end()):
            add("mac_address", m.group(), m.start())

    for m in CREDIT_CARD_PLAIN_REGEX.finditer(text):
        if overlaps(m.start(), m.end()):
            continue
        if shannon_entropy(m.group()) < 3.2:
            continue
        add("credit_card", m.group(), m.start())

    for m in CREDIT_CARD_REGEX.finditer(text):
        add("credit_card", m.group(), m.start())

    for m in JWT_REGEX.finditer(text):
        add("api_key", m.group(), m.start())

    for m in API_KEY_REGEX.finditer(text):
        if not overlaps(m.start(), m.end()):
            add("api_key", m.group(), m.start())

    # ---------- CONTEXTUAL PASSWORDS ----------

    for m in PASSWORD_CONTEXT_REGEX.finditer(text):
        val = normalize(m.group(3))
        start = m.start(3)

        if overlaps(start, start + len(val)):
            continue

        val, start = extract_rhs_if_assignment(val, start)

        if (
            NOISE_REGEX.fullmatch(val)
            or FILE_REGEX.fullmatch(val)
            or USER_AGENT_REGEX.search(val)
            or ISO_TIMESTAMP_REGEX.fullmatch(val)
            or is_long_readable_string(val)
            or in_exception_context(text, start)
        ):
            continue

        if looks_like_secret(val):
            add("password", val, start)

    # ---------- HEURISTIC TOKENS ----------

    for m in PASSWORD_TOKEN_REGEX.finditer(text):
        val = normalize(m.group())
        start = m.start()

        if overlaps(start, start + len(val)):
            continue

        val, start = extract_rhs_if_assignment(val, start)

        if (
            NOISE_REGEX.fullmatch(val)
            or FILE_REGEX.fullmatch(val)
            or READABLE_REGEX.fullmatch(val)
            or NUMERIC_REGEX.fullmatch(val)
            or USER_AGENT_REGEX.search(val)
            or VERSION_REGEX.fullmatch(val)
            or ISO_TIMESTAMP_REGEX.fullmatch(val)
            or DATE_ONLY_REGEX.fullmatch(val)
            or is_long_readable_string(val)
            or in_exception_context(text, start)
        ):
            continue

        if (
            EMAIL_REGEX.fullmatch(val)
            or IP_REGEX.fullmatch(val)
            or IPV6_REGEX.fullmatch(val)
            or MAC_REGEX.fullmatch(val)
            or CREDIT_CARD_REGEX.fullmatch(val)
            or CREDIT_CARD_PLAIN_REGEX.fullmatch(val)
            or JWT_REGEX.fullmatch(val)
            or API_KEY_REGEX.fullmatch(val)
        ):
            continue

        is_assign, is_secret_key = assignment_context(text, start)
        if is_assign and not is_secret_key:
            continue

        if looks_like_secret(val):
            add("password", val, start)

    return {"findings": findings}

# ============================================================
# OPTIONAL: BATCH TEST
# ============================================================

def scan_testset(prompts: list[str]) -> list[dict]:
    return [
        {"id": i + 1, "result": scan_text(prompt)}
        for i, prompt in enumerate(prompts)
    ]
