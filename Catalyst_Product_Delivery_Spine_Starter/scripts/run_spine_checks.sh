#!/usr/bin/env bash
set -euo pipefail
python3 scripts/validate_spine.py
python3 scripts/check_context_contamination.py
python3 scripts/list_packets.py
