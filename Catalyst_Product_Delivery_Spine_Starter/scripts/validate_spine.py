#!/usr/bin/env python3
"""Validate the Catalyst product-delivery spine using Python standard library only."""

from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]

REQUIRED = [
    "AGENTS.md",
    "docs/product/_system/project-registry.yaml",
    "docs/product/catalyst/manifest.yaml",
    "docs/product/catalyst/features/folio/manifest.yaml",
    "docs/product/catalyst/features/folio/10-exploration/EXP-CAT-FOLIO-001.md",
    "docs/product/catalyst/features/folio/40-feature-packets/FP-CAT-FOLIO-001-current-state-discovery/packet.yaml",
]

errors = []

for rel in REQUIRED:
    if not (ROOT / rel).exists():
        errors.append(f"Missing required file: {rel}")

registry = ROOT / "docs/product/_system/project-registry.yaml"
if registry.exists():
    text = registry.read_text(encoding="utf-8")
    if "default_project_id: catalyst" not in text:
        errors.append("Project registry must default to catalyst.")
    if "never_search_other_projects_implicitly: true" not in text:
        errors.append("Cross-project isolation policy is missing.")

packet_root = ROOT / "docs/product/catalyst/features"
if packet_root.exists():
    for packet in packet_root.rglob("packet.yaml"):
        text = packet.read_text(encoding="utf-8")
        for field in ("id:", "project_id:", "feature_id:", "status:", "dispatch:"):
            if field not in text:
                errors.append(f"{packet.relative_to(ROOT)} missing {field}")
        if "project_id: catalyst" not in text:
            errors.append(f"{packet.relative_to(ROOT)} is outside Catalyst scope.")
        status_match = re.search(r"^status:\s*(.+)$", text, re.MULTILINE)
        dispatch_match = re.search(r"^dispatch:\s*(.+)$", text, re.MULTILINE)
        status = status_match.group(1).strip() if status_match else ""
        dispatch = dispatch_match.group(1).strip() if dispatch_match else ""
        if dispatch == "ready" and status != "implementation-ready":
            errors.append(
                f"{packet.relative_to(ROOT)} has dispatch=ready without status=implementation-ready."
            )

if errors:
    print("PRODUCT SPINE VALIDATION: FAILED")
    for error in errors:
        print(f"- {error}")
    sys.exit(1)

print("PRODUCT SPINE VALIDATION: PASSED")
print("- Catalyst context boundary present")
print("- Folio discovery packet present")
print("- No invalid implementation dispatch detected")
