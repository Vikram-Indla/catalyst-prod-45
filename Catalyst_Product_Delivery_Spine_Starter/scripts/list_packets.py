#!/usr/bin/env python3
"""List feature packets and their lifecycle state."""

from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
for packet in sorted((ROOT / "docs/product/catalyst/features").rglob("packet.yaml")):
    text = packet.read_text(encoding="utf-8")
    def get(key):
        m = re.search(rf"^{re.escape(key)}:\s*(.+)$", text, re.MULTILINE)
        return m.group(1).strip() if m else "MISSING"
    print(
        f"{get('id'):24} "
        f"feature={get('feature_id'):12} "
        f"status={get('status'):22} "
        f"dispatch={get('dispatch')}"
    )
