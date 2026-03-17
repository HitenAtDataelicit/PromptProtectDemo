import re
import json
import math
from collections import Counter

# ============================================================
# REGEXES
# ============================================================

EMAIL_REGEX = re.compile(
    r"\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-z]{2,}\b"
)

IP_REGEX = re.compile(
    r"\b(?:\d{1,3}\.){3}\d{1,3}\b"
)

CREDIT_CARD_REGEX = re.compile(
    r"\b(?:\d{4}[ -]?){3}\d{4}\b"
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
# HELPERS
# ============================================================

def shannon_entropy(s: str) -> float:
    freq = Counter(s)
    length = len(s)
    return -sum((c / length) * math.log2(c / length) for c in freq.values())

def normalize(val: str) -> str:
    return val.strip("\"'")

def looks_like_secret(val: str) -> bool:
    if len(val) < 8:
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
# CORE SCANNER FUNCTION (CALLABLE)
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

        if NOISE_REGEX.fullmatch(val):
            continue
        if FILE_REGEX.fullmatch(val):
            continue
        if in_exception_context(text, start):
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

        if NOISE_REGEX.fullmatch(val):
            continue
        if FILE_REGEX.fullmatch(val):
            continue
        if READABLE_REGEX.fullmatch(val):   
            continue
        if NUMERIC_REGEX.fullmatch(val):
            continue
        if in_exception_context(text, start):
            continue

        if (
            EMAIL_REGEX.fullmatch(val)
            or IP_REGEX.fullmatch(val)
            or CREDIT_CARD_REGEX.fullmatch(val)
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
# OPTIONAL: BATCH TEST RUNNER
# ============================================================

def scan_testset(prompts: list[str]) -> list[dict]:
    results = []
    for i, prompt in enumerate(prompts):
        results.append({
            "id": i + 1,
            "result": scan_text(prompt)
        })
    return results

# ============================================================
# MANUAL TEST
# ============================================================

if __name__ == "__main__":

    TRICKY_TEST_PROMPTS = [
        # 1️⃣ JSON-like inline secret
        """
db_config = {"user":"admin","password":"Adm!n#2025"}
""",

        # 2️⃣ Password hidden in sentence
        """
login failed because password Winter2025Strong was rejected
""",

        # 3️⃣ Base64 but NOT a secret (should ignore)
        """
echo "SGVsbG8gd29ybGQ=" | base64 --decode
""",

        # 4️⃣ Too-short high-entropy string (ignore)
        """
token: aB9$2f
""",

        # 5️⃣ Long readable string (ignore)
        """
password is thisisaverylongreadablestringwithnospaces
""",

        # 6️⃣ Password inside quotes
        """
set password="Sup3r!Safe@Key#2026"
""",

        # 7️⃣ URL with embedded credentials
        """
postgres://admin:Str0ng!Pass@db.internal:5432/app
""",

        # 8️⃣ Secret split across lines (ignore)
        """
password = Sup3r
!Secret2025
""",

        # 9️⃣ Hash-looking value (ignore)
        """
commit hash: e3b0c44298fc1c149afbf4c8996fb924
""",

        # 🔟 Hex + symbols (detect)
        """
key: a9f3C!dE#91b
"""
    ]

    # ===============================
    # RUN TRICKY TESTS
    # ===============================

    for i, prompt in enumerate(TRICKY_TEST_PROMPTS, start=1):
        print("=" * 60)
        print(f"TRICKY TEST CASE {i}")
        print("- Prompt:")
        print(prompt.strip())

        result = scan_text(prompt)

        print("- Findings:")
        print(json.dumps(result, indent=2))

    print("=" * 60)
    print("✅ Tricky test run completed")
