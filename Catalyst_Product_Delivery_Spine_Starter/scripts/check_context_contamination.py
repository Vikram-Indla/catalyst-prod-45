#!/usr/bin/env python3
"""Detect prohibited implicit project terms in Catalyst product artifacts."""

from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / "docs/product/catalyst"
PROHIBITED = ("TurnQy", "MIM", "Inspection")
ALLOW_MARKER = "approved_cross_project_sources"

hits = []
for path in TARGET.rglob("*"):
    if path.suffix.lower() not in {".md", ".yaml", ".yml", ".json", ".txt"}:
        continue
    text = path.read_text(encoding="utf-8", errors="ignore")
    if ALLOW_MARKER in text:
        continue
    for term in PROHIBITED:
        if term.lower() in text.lower():
            hits.append(f"{path.relative_to(ROOT)}: prohibited implicit term '{term}'")

if hits:
    print("CONTEXT CONTAMINATION CHECK: FAILED")
    for hit in hits:
        print(f"- {hit}")
    sys.exit(1)

print("CONTEXT CONTAMINATION CHECK: PASSED")
