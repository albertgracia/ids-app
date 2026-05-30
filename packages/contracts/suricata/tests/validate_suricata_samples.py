"""
Validate Suricata EVE JSON sample contract.

Checks that all sample files are valid JSON, contain required fields,
and contain no real/sensitive data.
"""

import json
import os
import sys

SAMPLES_DIR = os.path.join(os.path.dirname(__file__), "..", "samples")
REQUIRED_FIELDS = ["timestamp", "event_type", "src_ip", "dest_ip", "proto"]

PROHIBITED_SUBSTRINGS = [
    "labrazahome",
    "albert",
    "token",
    "password",
    "secret",
    "realcorp",
    "client",
]

REQUIRED_EVENT_TYPES = [
    "alert",
    "flow",
    "dns",
    "http",
    "tls",
    "ssh",
    "rdp",
    "smb",
    "modbus",
]

PUBLIC_REALM_PREFIXES = (
    "192.0.2.", "198.51.100.", "203.0.113.",
    "10.10.", "172.16.100.",
)


def get_sample_files():
    if not os.path.isdir(SAMPLES_DIR):
        print(f"ERROR: samples directory not found: {SAMPLES_DIR}")
        sys.exit(1)
    files = sorted(f for f in os.listdir(SAMPLES_DIR) if f.endswith(".json"))
    return [os.path.join(SAMPLES_DIR, f) for f in files]


def check_prohibited(value, path):
    if isinstance(value, str):
        lower = value.lower()
        for p in PROHIBITED_SUBSTRINGS:
            if p in lower:
                print(f"FAIL: Found prohibited string '{p}' in {path}: {value[:100]}")
                return False
    elif isinstance(value, dict):
        for k, v in value.items():
            if not check_prohibited(v, f"{path}.{k}"):
                return False
    elif isinstance(value, list):
        for i, v in enumerate(value):
            if not check_prohibited(v, f"{path}[{i}]"):
                return False
    return True


def check_ip(ip, path):
    """Verify IP is in a synthetic/documentation range."""
    if not ip.startswith(PUBLIC_REALM_PREFIXES):
        print(f"FAIL: IP may be real in {path}: {ip}")
        return False
    return True


def main():
    files = get_sample_files()
    print(f"Found {len(files)} sample files")

    if len(files) < 9:
        print(f"FAIL: expected at least 9 samples, got {len(files)}")
        sys.exit(1)

    event_types_seen = set()
    all_pass = True

    for filepath in files:
        filename = os.path.basename(filepath)
        print(f"\nChecking: {filename}")

        try:
            with open(filepath, "r") as f:
                data = json.load(f)
        except json.JSONDecodeError as e:
            print(f"  FAIL: invalid JSON: {e}")
            all_pass = False
            continue

        # Required fields
        for field in REQUIRED_FIELDS:
            if field not in data:
                print(f"  FAIL: missing required field '{field}'")
                all_pass = False

        # event_type
        et = data.get("event_type", "")
        if et:
            event_types_seen.add(et)
        if et not in REQUIRED_EVENT_TYPES:
            print(f"  FAIL: unknown event_type '{et}'")
            all_pass = False

        # Prohibited strings
        if not check_prohibited(data, filename):
            all_pass = False

        # IPs
        for ip_field in ["src_ip", "dest_ip"]:
            ip = data.get(ip_field, "")
            if ip and not check_ip(ip, f"{filename}.{ip_field}"):
                all_pass = False

        print(f"  OK")

    # Check coverage
    missing = set(REQUIRED_EVENT_TYPES) - event_types_seen
    if missing:
        print(f"\nFAIL: missing samples for event types: {', '.join(sorted(missing))}")
        all_pass = False

    print(f"\n{'='*40}")
    if all_pass:
        print(f"RESULT: PASS — all {len(files)} samples validated")
        sys.exit(0)
    else:
        print(f"RESULT: FAIL — some checks did not pass")
        sys.exit(1)


if __name__ == "__main__":
    main()
