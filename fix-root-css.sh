#!/usr/bin/env python3
"""
fix-root-css.sh — ADS Token Migration for root CSS files
Targets: src/index.css and src/styles/catalyst-colors.css
Idempotent: skips values already wrapped in var(--ds-*, ...)

Usage:
  python3 fix-root-css.sh [--dry-run] [--file src/index.css]

Output:
  Fixed CSS files written in-place
  catalyst-root-css-migration.csv written to project root
"""

import re
import sys
import csv
import json
import os
from pathlib import Path

# ── Project root (script lives at project root) ──────────────────────────────
ROOT = Path(__file__).parent
TARGET_FILES = [
    ROOT / "src/index.css",
    ROOT / "src/styles/catalyst-colors.css",
]

DRY_RUN = "--dry-run" in sys.argv
SPECIFIC_FILE = None
for i, arg in enumerate(sys.argv):
    if arg == "--file" and i + 1 < len(sys.argv):
        SPECIFIC_FILE = ROOT / sys.argv[i + 1]

if SPECIFIC_FILE:
    TARGET_FILES = [SPECIFIC_FILE]

# ── Token map: (hex_lower → (ds_token, confidence)) ─────────────────────────
# Context-aware map: property → override token (when property name changes meaning)
PROPERTY_OVERRIDES = {
    # When property is color/fill/stroke → text-inverse for white
    "color":  {
        "#ffffff": ("--ds-text-inverse", "#FFFFFF"),
        "#fff":    ("--ds-text-inverse", "#FFFFFF"),
        "#FFF":    ("--ds-text-inverse", "#FFFFFF"),
    },
    "fill": {
        "#ffffff": ("--ds-text-inverse", "#FFFFFF"),
        "#fff":    ("--ds-text-inverse", "#FFFFFF"),
    },
    "stroke": {
        "#ffffff": ("--ds-text-inverse", "#FFFFFF"),
        "#fff":    ("--ds-text-inverse", "#FFFFFF"),
    },
}

# Main token map: hex lowercase → (ds_token, canonical_fallback, confidence)
HEX_TOKEN_MAP = {
    # ── PRIMARY TEXT ──────────────────────────────────────────────────────────
    "#172b4d": ("--ds-text", "#172B4D", 100),
    "#44546f": ("--ds-text-subtle", "#44546F", 100),
    "#42526e": ("--ds-text-subtle", "#42526E", 95),
    "#626f86": ("--ds-text-subtlest", "#626F86", 100),
    "#6b778c": ("--ds-text-subtlest", "#6B778C", 100),
    "#6b6e76": ("--ds-text-subtlest", "#6B6E76", 95),
    "#8590a2": ("--ds-text-disabled", "#8590A2", 95),
    "#8993a5": ("--ds-text-disabled", "#8993A5", 75),
    "#b3bac5": ("--ds-text-disabled", "#B3BAC5", 75),
    "#ae2a19": ("--ds-text-danger", "#AE2A19", 100),
    "#974f0c": ("--ds-text-warning", "#974F0C", 95),
    "#216e4e": ("--ds-text-success", "#216E4E", 95),
    "#006644": ("--ds-text-success", "#006644", 75),
    "#0c66e4": ("--ds-link", "#0C66E4", 100),
    "#0052cc": ("--ds-link", "#0052CC", 95),
    "#0747a6": ("--ds-link-pressed", "#0747A6", 95),
    "#253858": ("--ds-text", "#253858", 75),
    # ── SURFACE / BACKGROUND ─────────────────────────────────────────────────
    "#ffffff": ("--ds-surface", "#FFFFFF", 100),
    "#fff":    ("--ds-surface", "#FFFFFF", 100),
    "#f7f8f9": ("--ds-surface-sunken", "#F7F8F9", 100),
    "#f4f5f7": ("--ds-background-neutral-subtle", "#F4F5F7", 95),
    "#f1f2f4": ("--ds-background-neutral", "#F1F2F4", 100),
    "#fafafa": ("--ds-surface-sunken", "#FAFAFA", 95),
    "#f8f8f7": ("--ds-surface-sunken", "#F8F8F7", 75),
    "#fcfcfc": ("--ds-surface", "#FCFCFC", 75),
    "#f0f0f0": ("--ds-background-neutral", "#F0F0F0", 75),
    "#ededed": ("--ds-background-neutral", "#EDEDED", 75),
    "#e8e8e8": ("--ds-border", "#E8E8E8", 75),
    # ── STATUS BACKGROUNDS ───────────────────────────────────────────────────
    "#e9f2ff": ("--ds-background-selected", "#E9F2FF", 100),
    "#e9f2fe": ("--ds-background-selected", "#E9F2FF", 100),
    "#deebff": ("--ds-background-information", "#E9F2FF", 95),
    "#dbeafe": ("--ds-background-information", "#E9F2FF", 95),
    "#eff6ff": ("--ds-background-information", "#E9F2FF", 95),
    "#e0f2fe": ("--ds-background-information", "#E9F2FF", 75),
    "#bfdbfe": ("--ds-background-information", "#E9F2FF", 75),
    "#dffcf0": ("--ds-background-success", "#DFFCF0", 100),
    "#dcfff1": ("--ds-background-success", "#DFFCF0", 95),
    "#e3fcef": ("--ds-background-success", "#DFFCF0", 75),
    "#d1fae5": ("--ds-background-success", "#DFFCF0", 75),
    "#ccfbf1": ("--ds-background-success", "#DCFFF1", 75),
    "#bbf7d0": ("--ds-background-success", "#DFFCF0", 75),
    "#f0fdfa": ("--ds-background-success", "#DFFCF0", 75),
    "#fff7d6": ("--ds-background-warning", "#FFF7D6", 100),
    "#fef3c7": ("--ds-background-warning", "#FFF7D6", 95),
    "#fffbeb": ("--ds-background-warning", "#FFF7D6", 95),
    "#fef9c3": ("--ds-background-warning", "#FFF7D6", 75),
    "#ffeceb": ("--ds-background-danger", "#FFECEB", 100),
    "#fee2e2": ("--ds-background-danger", "#FFECEB", 95),
    "#fef2f2": ("--ds-background-danger", "#FFECEB", 95),
    "#fff1f2": ("--ds-background-danger", "#FFECEB", 75),
    "#f3f0ff": ("--ds-background-discovery", "#F3F0FF", 100),
    "#ede9fe": ("--ds-background-discovery", "#F3F0FF", 95),
    "#e0e7ff": ("--ds-background-discovery", "#F3F0FF", 75),
    "#f5f3ff": ("--ds-background-discovery", "#F3F0FF", 75),
    # ── BOLD BACKGROUNDS ─────────────────────────────────────────────────────
    "#1f845a": ("--ds-background-success-bold", "#1F845A", 100),
    "#1b7f37": ("--ds-background-success-bold", "#1F845A", 95),
    "#16a34a": ("--ds-background-success-bold", "#1F845A", 95),
    "#c9372c": ("--ds-background-danger-bold", "#C9372C", 100),
    "#ca3521": ("--ds-background-danger-bold", "#C9372C", 95),
    "#e2b203": ("--ds-background-warning-bold", "#E2B203", 95),
    "#6e5dc6": ("--ds-background-discovery-bold", "#6E5DC6", 95),
    "#5e4db2": ("--ds-background-discovery-bold", "#6E5DC6", 95),
    "#f15b50": ("--ds-background-danger-bold", "#C9372C", 75),
    # ── BORDER ───────────────────────────────────────────────────────────────
    "#dfe1e6": ("--ds-border", "#DFE1E6", 100),
    "#e2e8f0": ("--ds-border", "#DFE1E6", 95),
    "#e5e5e5": ("--ds-border", "#DFE1E6", 95),
    "#cbd5e1": ("--ds-border", "#DFE1E6", 95),
    "#d1d5db": ("--ds-border", "#DFE1E6", 75),
    "#dcdfe4": ("--ds-border-disabled", "#DCDFE4", 95),
    "#388bff": ("--ds-border-focused", "#388BFF", 100),
    # ── ICON ─────────────────────────────────────────────────────────────────
    "#44546f": ("--ds-icon", "#44546F", 100),
    "#626f86": ("--ds-icon-subtle", "#626F86", 95),
    # ── CATALYST BRAND ───────────────────────────────────────────────────────
    "#0d9488": ("--ds-chart-teal-bold", "#0d9488", 95),
    "#0f766e": ("--ds-chart-teal-bolder", "#0f766e", 75),
    "#14b8a6": ("--ds-background-accent-teal-bolder", "#14b8a6", 75),
    "#2563eb": ("--ds-link", "#2563eb", 95),
    "#1d4ed8": ("--ds-link-pressed", "#1d4ed8", 95),
    "#3b82f6": ("--ds-background-information-bold", "#3b82f6", 75),
    "#1e40af": ("--ds-link-pressed", "#1e40af", 75),
    "#1e3a8a": ("--ds-text-inverse", "#1e3a8a", 75),
    "#6366f1": ("--ds-background-discovery-bold", "#6366f1", 75),
    "#4338ca": ("--ds-background-discovery-bold", "#4338ca", 75),
    "#3730a3": ("--ds-background-discovery-bold", "#3730a3", 75),
    "#a5b4fc": ("--ds-background-discovery", "#F3F0FF", 75),
    "#8b5cf6": ("--ds-background-discovery-bold", "#8b5cf6", 75),
    "#7c3aed": ("--ds-background-discovery-bold", "#7C3AED", 75),
    "#6d28d9": ("--ds-background-discovery-bold", "#6d28d9", 75),
    "#5b21b6": ("--ds-background-discovery-bold", "#5b21b6", 75),
    "#c4b5fd": ("--ds-background-discovery", "#F3F0FF", 75),
    "#ec4899": ("--ds-background-accent-magenta-bolder", "#ec4899", 75),
    "#be185d": ("--ds-background-accent-magenta-bolder", "#be185d", 75),
    "#9d174d": ("--ds-background-accent-magenta-bolder", "#9d174d", 75),
    "#f9a8d4": ("--ds-background-accent-magenta-subtle", "#fce7f3", 75),
    "#fce7f3": ("--ds-background-accent-magenta-subtle", "#fce7f3", 75),
    "#d97706": ("--ds-background-warning-bold", "#d97706", 95),
    "#b45309": ("--ds-background-warning-bold", "#b45309", 75),
    "#f59e0b": ("--ds-background-warning-bold", "#f59e0b", 75),
    "#ef4444": ("--ds-background-danger-bold", "#ef4444", 95),
    "#dc2626": ("--ds-background-danger-bold", "#dc2626", 95),
    "#f87171": ("--ds-background-danger", "#FFECEB", 75),
    "#e11d48": ("--ds-background-danger-bold", "#e11d48", 75),
    "#6a9a23": ("--ds-background-success-bold", "#6A9A23", 95),
    "#059669": ("--ds-background-success-bold", "#059669", 75),
    "#10b981": ("--ds-background-success-bold", "#059669", 75),
    # ── NEUTRAL / GREY SCALE ─────────────────────────────────────────────────
    "#262626": ("--ds-text", "#172B4D", 75),
    "#404040": ("--ds-text-subtle", "#44546F", 75),
    "#525252": ("--ds-text-subtle", "#44546F", 75),
    "#475569": ("--ds-text-subtle", "#44546F", 75),
    "#64748b": ("--ds-text-subtlest", "#626F86", 75),
    "#6b7280": ("--ds-text-subtlest", "#626F86", 75),
    "#737373": ("--ds-text-subtlest", "#626F86", 75),
    "#94a3b8": ("--ds-text-disabled", "#8590A2", 75),
    "#a3a3a3": ("--ds-text-disabled", "#8590A2", 75),
    "#9ca3af": ("--ds-text-disabled", "#8590A2", 75),
    "#d4d4d4": ("--ds-background-neutral-hovered", "#D4D4D4", 75),
    "#334155": ("--ds-text-subtle", "#44546F", 75),
    "#1e293b": ("--ds-text", "#172B4D", 75),
    "#0f172a": ("--ds-text", "#172B4D", 75),
    "#f1f5f9": ("--ds-surface-sunken", "#F7F8F9", 75),
    "#f8fafc": ("--ds-surface-sunken", "#F8FAFC", 75),
    "#f5f5f4": ("--ds-background-neutral-subtle", "#F7F8F9", 75),
    "#f3f4f6": ("--ds-background-neutral-subtle", "#F7F8F9", 75),
    "#f3f3f3": ("--ds-background-neutral-subtle", "#F7F8F9", 75),
    "#f5f5f5": ("--ds-surface-sunken", "#F7F8F9", 75),
    "#115e59": ("--ds-text-success", "#216E4E", 75),
    "#134e4a": ("--ds-text-success", "#216E4E", 75),
    "#5eead4": ("--ds-background-success", "#DCFFF1", 75),
    # ── WORKSTREAM EXTRAS ─────────────────────────────────────────────────────
    "#f97316": ("--ds-background-warning-bold", "#f97316", 75),
    "#ffedd5": ("--ds-background-warning", "#FFF7D6", 75),
    "#fdba74": ("--ds-background-warning", "#FFF7D6", 75),
    "#c2410c": ("--ds-text-danger", "#AE2A19", 75),
    "#9a3412": ("--ds-text-danger", "#AE2A19", 75),
    "#0284c7": ("--ds-link", "#0284c7", 75),
    "#1868db": ("--ds-link", "#1868DB", 95),
    "#ffb020": ("--ds-background-warning-bold", "#E2B203", 75),
    # ── ADDITIONAL GREY / DARK ────────────────────────────────────────────────
    "#1a1a1a": ("--ds-text", "#172B4D", 75),
    "#0f0f0f": ("--ds-text", "#172B4D", 75),
    "#1f1f1f": ("--ds-text", "#172B4D", 75),
    "#333333": ("--ds-text", "#172B4D", 75),
    "#595959": ("--ds-text-subtle", "#44546F", 75),
    "#3f3f46": ("--ds-text-subtle", "#44546F", 75),
    "#52525b": ("--ds-text-subtle", "#44546F", 75),
    "#7d7d7d": ("--ds-text-subtlest", "#626F86", 75),
    "#8c8c8c": ("--ds-text-subtlest", "#626F86", 75),
    "#999999": ("--ds-text-disabled", "#8590A2", 75),
    "#a6a6a6": ("--ds-text-disabled", "#8590A2", 75),
    "#808080": ("--ds-text-subtlest", "#626F86", 75),
    "#d9d9d9": ("--ds-border", "#DFE1E6", 75),
    "#e0e0e0": ("--ds-border", "#DFE1E6", 75),
    "#ebebeb": ("--ds-border", "#DFE1E6", 75),
    "#fafbfc": ("--ds-surface-sunken", "#F7F8F9", 75),
    "#f6f8fa": ("--ds-surface-sunken", "#F7F8F9", 75),
    "#f8f8f8": ("--ds-surface-sunken", "#F7F8F9", 75),
    # ── ADDITIONAL DARK MODE (GitHub dark palette) ────────────────────────────
    "#242528": ("--ds-surface", "#FFFFFF", 75),
    "#21262d": ("--ds-surface-sunken", "#F7F8F9", 75),
    "#1f2328": ("--ds-surface", "#FFFFFF", 75),
    "#24292f": ("--ds-surface", "#FFFFFF", 75),
    "#0d1117": ("--ds-surface-sunken", "#F7F8F9", 75),
    "#e1e4e8": ("--ds-border", "#DFE1E6", 75),
    "#e6edf3": ("--ds-border", "#DFE1E6", 75),
    "#6e7681": ("--ds-text-subtlest", "#626F86", 75),
    "#8b949e": ("--ds-text-disabled", "#8590A2", 75),
    # ── ADDITIONAL BLUES ──────────────────────────────────────────────────────
    "#60a5fa": ("--ds-background-information-bold", "#0C66E4", 75),  # blue-400
    "#7db8fc": ("--ds-background-information-bold", "#0C66E4", 75),  # blue-light
    "#579dff": ("--ds-background-information-bold", "#0C66E4", 75),  # Jira brand focus
    # ── ADDITIONAL AMBERS ─────────────────────────────────────────────────────
    "#fbbf24": ("--ds-background-warning-bold", "#E2B203", 75),      # amber-400
    "#fcd34d": ("--ds-background-warning", "#FFF7D6", 75),           # amber-300
    "#fff7ed": ("--ds-background-warning", "#FFF7D6", 75),           # orange-50
    "#92400e": ("--ds-text-warning", "#974F0C", 75),                  # amber-900
    # ── ADDITIONAL GREENS ─────────────────────────────────────────────────────
    "#f0fdf4": ("--ds-background-success", "#DFFCF0", 75),           # green-50
    "#4ade80": ("--ds-background-success", "#DFFCF0", 75),           # green-400
    "#7ee2b8": ("--ds-background-success", "#DCFFF1", 75),           # teal-300
    "#1c3329": ("--ds-text-success", "#216E4E", 75),                  # dark green text
    # ── ADDITIONAL REDS ───────────────────────────────────────────────────────
    "#991b1b": ("--ds-text-danger", "#AE2A19", 75),                   # red-900
    # ── ADDITIONAL PURPLES ────────────────────────────────────────────────────
    "#b39ddb": ("--ds-background-discovery", "#F3F0FF", 75),          # purple-200
    # ── DARK MODE EXTRA ───────────────────────────────────────────────────────
    "#161b22": ("--ds-surface-sunken", "#F7F8F9", 75),               # GitHub darkest
    "#18181b": ("--ds-text", "#172B4D", 75),                          # zinc-900
    "#18191a": ("--ds-text", "#172B4D", 75),                          # near-black
    "#161a1d": ("--ds-surface", "#FFFFFF", 75),
    "#1c2b41": ("--ds-text", "#172B4D", 75),
    "#2b2c2f": ("--ds-surface", "#FFFFFF", 75),
    # ── MORE GREENS ───────────────────────────────────────────────────────────
    "#064e3b": ("--ds-text-success", "#216E4E", 75),                  # emerald-900
    "#6ee7b7": ("--ds-background-success", "#DFFCF0", 75),            # emerald-300
    "#dcfce7": ("--ds-background-success", "#DFFCF0", 75),            # green-100
    "#ecfdf5": ("--ds-background-success", "#DFFCF0", 75),            # emerald-50
    "#166534": ("--ds-text-success", "#216E4E", 75),                  # green-800
    "#2dd4bf": ("--ds-background-success", "#DCFFF1", 75),            # teal-400
    # ── MORE REDS ─────────────────────────────────────────────────────────────
    "#450a0a": ("--ds-background-danger", "#FFECEB", 75),             # red-950
    "#fca5a5": ("--ds-background-danger", "#FFECEB", 75),             # red-300
    "#451a03": ("--ds-text-warning", "#974F0C", 75),                   # orange-950
    "#de350b": ("--ds-background-danger-bold", "#C9372C", 95),        # Jira danger
    "#ffebe6": ("--ds-background-danger", "#FFECEB", 100),            # Jira danger bg
    "#fb7185": ("--ds-background-danger", "#FFECEB", 75),             # rose-400
    "#f48fb1": ("--ds-background-accent-magenta-subtle", "#fce7f3", 75),  # pink-300
    # ── MORE BLUES ────────────────────────────────────────────────────────────
    "#93c5fd": ("--ds-background-information-bold", "#0C66E4", 75),   # blue-300
    "#4c9aff": ("--ds-background-information-bold", "#0C66E4", 75),   # Jira brand
    "#b3d4ff": ("--ds-background-information", "#E9F2FF", 75),        # info-200
    # ── MORE AMBERS ───────────────────────────────────────────────────────────
    "#fffae6": ("--ds-background-warning", "#FFF7D6", 95),            # Jira warning bg
    "#ff8b00": ("--ds-background-warning-bold", "#E2B203", 75),       # Jira warning
    "#fed7aa": ("--ds-background-warning", "#FFF7D6", 75),            # orange-200
    # ── MORE PURPLES ──────────────────────────────────────────────────────────
    "#eae6ff": ("--ds-background-discovery", "#F3F0FF", 95),          # Jira discovery bg
    "#403294": ("--ds-background-discovery-bold", "#6E5DC6", 95),     # Jira discovery
    "#a78bfa": ("--ds-background-discovery", "#F3F0FF", 75),          # violet-400
    # ── MORE GREYS ────────────────────────────────────────────────────────────
    "#7d818a": ("--ds-text-subtlest", "#626F86", 75),
    "#d1d1d1": ("--ds-border", "#DFE1E6", 75),
    "#c7c7c7": ("--ds-border", "#DFE1E6", 75),
    "#c8ccd0": ("--ds-border", "#DFE1E6", 75),
    "#e5e7eb": ("--ds-border", "#DFE1E6", 75),
    "#4d4d4d": ("--ds-text-subtle", "#44546F", 75),
    "#555555": ("--ds-text-subtle", "#44546F", 75),
    "#9fa2a6": ("--ds-text-disabled", "#8590A2", 75),
    "#6b6b6b": ("--ds-text-subtlest", "#626F86", 75),
    "#616161": ("--ds-text-subtlest", "#626F86", 75),
    "#b8b8b8": ("--ds-text-disabled", "#8590A2", 75),
    "#c9ccd0": ("--ds-border", "#DFE1E6", 75),
    "#ebecf0": ("--ds-border", "#DFE1E6", 95),                        # ADS neutral border
    "#94c748": ("--ds-background-success-bold", "#6A9A23", 95),       # Jira done green
    # ── ROADMAP CUSTOM PALETTE (earth tones — no ADS equivalent) ─────────────
    "#a89778": ("--ds-chart-yellow-bold", "#A89778", 75),
    "#d4cabc": ("--ds-chart-yellow-bolder", "#D4CABC", 75),
    "#a6905e": ("--ds-chart-orange-bold", "#A6905E", 75),
    "#957f51": ("--ds-chart-orange-bolder", "#957F51", 75),
    "#bfb097": ("--ds-chart-yellow-bold", "#BFB097", 75),
    "#ded6ca": ("--ds-chart-yellow-bolder", "#DED6CA", 75),
    "#6bc98f": ("--ds-background-success-bold", "#1F845A", 75),
    "#ccb27a": ("--ds-chart-orange-bold", "#CCB27A", 75),
    "#b5a48a": ("--ds-chart-yellow-bold", "#B5A48A", 75),
    # ── VIBRANT PREVIEW / CHART PALETTE ──────────────────────────────────────
    "#ff6b6b": ("--ds-background-danger-bold", "#C9372C", 75),
    "#ffd93d": ("--ds-background-warning-bold", "#E2B203", 75),
    "#6bcb77": ("--ds-background-success-bold", "#1F845A", 75),
    "#4d96ff": ("--ds-background-information-bold", "#0C66E4", 75),
    "#ff922b": ("--ds-background-warning-bold", "#E2B203", 75),
    "#20c997": ("--ds-background-success-bold", "#1F845A", 75),
    "#ae3ec9": ("--ds-background-discovery-bold", "#6E5DC6", 75),
    "#f06595": ("--ds-background-accent-magenta-bolder", "#BE185D", 75),
    "#339af0": ("--ds-background-information-bold", "#0C66E4", 75),
    "#51cf66": ("--ds-background-success-bold", "#1F845A", 75),
    "#ff6b35": ("--ds-background-warning-bold", "#E2B203", 75),
    "#8338ec": ("--ds-background-discovery-bold", "#6E5DC6", 75),
    "#3a86ff": ("--ds-link", "#0C66E4", 75),
    "#06d6a0": ("--ds-background-success-bold", "#1F845A", 75),
    "#ef233c": ("--ds-background-danger-bold", "#C9372C", 75),
    # ── JIRA ADS CANONICAL COLORS ─────────────────────────────────────────────
    "#ffedeb": ("--ds-background-danger", "#FFECEB", 100),       # exact Jira danger bg
    "#ff8f73": ("--ds-background-danger", "#FFECEB", 75),        # Jira danger-light
    "#f5cd47": ("--ds-background-warning-bold", "#E2B203", 75),  # Jira warning yellow
    "#7f5f01": ("--ds-text-warning", "#974F0C", 95),             # Jira warning text
    "#b38600": ("--ds-text-warning", "#974F0C", 75),             # amber text
    "#4bce97": ("--ds-background-success-bold", "#1F845A", 95),  # Jira success bold
    "#8270db": ("--ds-background-discovery-bold", "#6E5DC6", 95), # Jira purple
    "#1d7afc": ("--ds-background-information-bold", "#1D7AFC", 100), # Jira info bold
    "#758195": ("--ds-text-subtle", "#44546F", 75),              # Jira grey
    "#9fadbc": ("--ds-text-disabled", "#8590A2", 75),            # Jira placeholder
    "#c7d1db": ("--ds-border", "#DFE1E6", 75),                   # Jira border light
    "#b3b9c4": ("--ds-text-disabled", "#8590A2", 75),            # grey text
    "#dddee1": ("--ds-border", "#DFE1E6", 75),                   # very light grey
    "#efffd6": ("--ds-background-success", "#DFFCF0", 75),       # light green
    "#b3df72": ("--ds-background-success-bold", "#6A9A23", 75),  # lime-green
    "#8fb8f6": ("--ds-background-information", "#E9F2FF", 75),   # light blue
    "#0055cc": ("--ds-link", "#0C66E4", 75),                     # link blue
    # ── AI CATY RAINBOW GRADIENT PALETTE ─────────────────────────────────────
    "#ff3cac": ("--ds-background-accent-magenta-bolder", "#BE185D", 75),  # rainbow pink
    "#784ba0": ("--ds-background-discovery-bold", "#6E5DC6", 75),         # rainbow purple
    "#2b86c5": ("--ds-link", "#0C66E4", 75),                              # rainbow blue
    "#00c9ff": ("--ds-background-information-bold", "#0C66E4", 75),       # rainbow cyan
    "#92fe9d": ("--ds-background-success", "#DFFCF0", 75),                # rainbow green
    "#ffd700": ("--ds-background-warning-bold", "#E2B203", 75),           # rainbow gold
    "#c97cf4": ("--ds-background-discovery-bold", "#6E5DC6", 75),         # AI purple
    # ── NEAR-BLACK ────────────────────────────────────────────────────────────
    "#292929": ("--ds-text", "#172B4D", 75),  # dark near-black
    # ── EXTENDED TAILWIND GREYS ───────────────────────────────────────────────
    "#111827": ("--ds-text", "#172B4D", 75),            # gray-900
    "#1f2937": ("--ds-text", "#172B4D", 75),            # gray-800
    "#374151": ("--ds-text-subtle", "#44546F", 75),     # gray-700
    "#4b5563": ("--ds-text-subtlest", "#626F86", 75),   # gray-600
    "#71717a": ("--ds-text-subtlest", "#626F86", 75),   # zinc-500
    "#7a869a": ("--ds-text-subtlest", "#626F86", 75),   # ADS placeholder
    "#a5adba": ("--ds-text-subtlest", "#626F86", 75),   # ADS gray
    "#d4d4d8": ("--ds-border", "#DFE1E6", 75),          # zinc-300
    "#e4e4e7": ("--ds-border", "#DFE1E6", 75),          # zinc-200
    "#f4f4f5": ("--ds-surface-sunken", "#F7F8F9", 75),  # zinc-100
    "#f9fafb": ("--ds-surface-sunken", "#F7F8F9", 75),  # gray-50
    "#020617": ("--ds-text", "#172B4D", 75),            # gray-950
    "#09090b": ("--ds-text", "#172B4D", 75),            # zinc-950
    "#111111": ("--ds-text", "#172B4D", 75),            # near-black
    "#2d2d2d": ("--ds-text", "#172B4D", 75),            # dark-grey
    # ── ADS EXACT VALUES ──────────────────────────────────────────────────────
    "#292a2e": ("--ds-text", "#172B4D", 100),           # ADS dark text (light-mode)
    "#29292e": ("--ds-text", "#172B4D", 95),            # ADS text near-match
    "#505258": ("--ds-text-subtle", "#44546F", 100),    # ADS text-subtle
    "#5e6c84": ("--ds-text-subtle", "#44546F", 75),     # ADS text-subtle variant
    "#8993a4": ("--ds-text-disabled", "#8590A2", 95),   # ADS text-disabled
    "#1e3a5f": ("--ds-text", "#172B4D", 75),            # dark navy
    "#23222b": ("--ds-text", "#172B4D", 75),            # dark purple text
    "#2a1c1e": ("--ds-text", "#172B4D", 75),            # dark maroon text
    # ── ATLASSIAN / JIRA BRAND ───────────────────────────────────────────────
    "#2684ff": ("--ds-link", "#0C66E4", 100),           # Jira brand blue legacy
    "#0065ff": ("--ds-link", "#0065FF", 100),           # Atlassian blue
    "#6554c0": ("--ds-background-discovery-bold", "#6554C0", 100),  # Atlassian purple
    "#ff5630": ("--ds-background-danger-bold", "#C9372C", 100),     # Jira danger red
    "#bf2600": ("--ds-text-danger", "#AE2A19", 95),    # Jira danger dark
    "#1264a3": ("--ds-link", "#0065FF", 75),            # Slack blue
    "#e01e5a": ("--ds-background-danger-bold", "#C9372C", 75),      # Slack red
    "#1d9bd1": ("--ds-link", "#0C66E4", 75),            # light brand blue
    # ── EXTENDED STATUS BACKGROUNDS ──────────────────────────────────────────
    "#fde68a": ("--ds-background-warning", "#FFF7D6", 75),  # amber-200
    "#fecaca": ("--ds-background-danger", "#FFECEB", 75),   # red-200
    "#86efac": ("--ds-background-success", "#DFFCF0", 75),  # green-300
    "#f3e8ff": ("--ds-background-discovery", "#F3F0FF", 75), # purple-100
    "#f4f1ea": ("--ds-surface-sunken", "#F7F8F9", 75),      # warm off-white
    # ── EXTENDED BOLD BACKGROUNDS ────────────────────────────────────────────
    "#ea580c": ("--ds-background-warning-bold", "#E2B203", 75),  # orange-600
    "#fb923c": ("--ds-background-warning-bold", "#E2B203", 75),  # orange-400
    "#b91c1c": ("--ds-text-danger", "#AE2A19", 75),     # red-700
    "#f53f68": ("--ds-background-danger-bold", "#C9372C", 75),  # pink-red
    "#f472b6": ("--ds-background-accent-magenta-subtle", "#FCE7F3", 75),  # pink-400
    "#4f46e5": ("--ds-background-discovery-bold", "#6E5DC6", 75),  # indigo-600
    "#06b6d4": ("--ds-icon-information", "#1D7AFC", 75), # cyan-500
    "#047857": ("--ds-background-success-bold", "#1F845A", 75),  # emerald-700
    "#15803d": ("--ds-background-success-bold", "#1F845A", 75),  # green-700
    "#2bac76": ("--ds-background-success-bold", "#1F845A", 75),  # teal-green
    "#84cc16": ("--ds-background-success-bold", "#1F845A", 75),  # lime-500
    # ── CONTEXT-SPECIFIC ─────────────────────────────────────────────────────
    "#c69c6d": ("--ds-text-subtle", "#C69C6D", 75),    # warm brown (no close ADS)
    "#5c7c5c": ("--ds-text-subtle", "#5C7C5C", 75),    # muted green (no close ADS)
    "#8b7355": ("--ds-text-subtle", "#8B7355", 75),    # warm brown (no close ADS)
    # ── EXTENDED STATUS / BRAND ───────────────────────────────────────────────
    "#ffab00": ("--ds-background-warning-bold", "#E2B203", 95),  # Jira warning amber
    "#00875a": ("--ds-background-success-bold", "#1F845A", 95),  # Jira success legacy
    "#36b37e": ("--ds-background-success-bold", "#1F845A", 95),  # Jira success
    "#22a06b": ("--ds-background-success-bold", "#1F845A", 95),  # Jira success
    "#ecb22e": ("--ds-background-warning-bold", "#E2B203", 75),  # Slack yellow
    "#5b7f24": ("--ds-background-success-bold", "#1F845A", 75),  # dark green
    "#ddd6fe": ("--ds-background-discovery", "#F3F0FF", 75),     # violet-200
    "#e9d5ff": ("--ds-background-discovery", "#F3F0FF", 75),     # purple-200
    "#99f6e4": ("--ds-background-success", "#DFFCF0", 75),       # teal-200
    "#fff1ef": ("--ds-background-danger", "#FFECEB", 75),        # very light pink
    "#fafcff": ("--ds-surface", "#FFFFFF", 75),                   # near-white
    "#fffde7": ("--ds-background-warning", "#FFF7D6", 75),       # yellow-50
    "#fde047": ("--ds-background-warning", "#FFF7D6", 75),       # yellow-300
    "#ffb4ab": ("--ds-background-danger", "#FFECEB", 75),        # red-200 light
    "#ff8a80": ("--ds-background-danger", "#FFECEB", 75),        # red-a200
    "#ffd1ca": ("--ds-background-danger", "#FFECEB", 75),        # red-100 warm
    "#9cc2f7": ("--ds-background-information", "#E9F2FF", 75),   # blue-light
    "#e7eef8": ("--ds-background-information", "#E9F2FF", 75),   # light blue
    "#79e2f2": ("--ds-background-information", "#E9F2FF", 75),   # cyan
    "#67e8f9": ("--ds-background-information", "#E9F2FF", 75),   # cyan-300
    "#22d3ee": ("--ds-icon-information", "#1D7AFC", 75),         # cyan-400
    "#818cf8": ("--ds-background-discovery", "#F3F0FF", 75),     # indigo-400
    "#e5493a": ("--ds-background-danger-bold", "#C9372C", 75),   # red-danger
    "#db2777": ("--ds-background-accent-magenta-bolder", "#BE185D", 75),  # pink-600
    "#6b21a8": ("--ds-background-discovery-bold", "#6E5DC6", 75), # purple-900
    "#0891b2": ("--ds-link", "#0C66E4", 75),                      # cyan-600
    "#1a7dbf": ("--ds-link", "#0C66E4", 75),                      # mid blue
    "#0b4c8c": ("--ds-link-pressed", "#0747A6", 75),              # dark blue
    "#f0f1f2": ("--ds-background-neutral", "#F1F2F4", 75),        # near-white grey
    # ── EXTENDED TEXT COLORS ─────────────────────────────────────────────────
    "#78350f": ("--ds-text-warning", "#974F0C", 75),  # amber-900
    "#854d0e": ("--ds-text-warning", "#974F0C", 75),  # amber-800
    "#a16207": ("--ds-text-warning", "#974F0C", 75),  # amber-700
    "#14532d": ("--ds-text-success", "#216E4E", 75),  # green-900
    "#116622": ("--ds-text-success", "#216E4E", 75),  # dark green
    "#116644": ("--ds-text-success", "#216E4E", 75),  # dark teal
    "#7f1d1d": ("--ds-text-danger", "#AE2A19", 75),  # red-900
    "#b8bcc8": ("--ds-text-disabled", "#8590A2", 75), # ADS grey
    "#9fb4d2": ("--ds-text-subtle", "#44546F", 75),   # blue-grey
    "#9e9b9e": ("--ds-text-disabled", "#8590A2", 75), # mid grey
    "#b0b0b0": ("--ds-text-disabled", "#8590A2", 75), # light grey
    "#dddddd": ("--ds-border", "#DFE1E6", 75),        # light grey border
    "#000000": ("--ds-text", "#172B4D", 75),           # black
    "#616061": ("--ds-text-subtlest", "#626F86", 75),  # Slack text
    "#696969": ("--ds-text-subtlest", "#626F86", 75),  # mid grey
    # ── VERY DARK NAVY / NEAR BLACK ──────────────────────────────────────────
    "#0d1526": ("--ds-text", "#172B4D", 75),  # darkest navy
    "#0d1f36": ("--ds-text", "#172B4D", 75),  # dark navy
    "#0c2340": ("--ds-text", "#172B4D", 75),  # dark navy
    "#0c1a2e": ("--ds-text", "#172B4D", 75),  # capacity navy
    "#10233e": ("--ds-text", "#172B4D", 75),  # capacity navy-2
    "#060b12": ("--ds-text", "#172B4D", 75),  # capacity navy-d
    "#0b1422": ("--ds-text", "#172B4D", 75),  # capacity navy2-d
    "#182820": ("--ds-text", "#172B4D", 75),  # dark green hub
    "#1a2030": ("--ds-text", "#172B4D", 75),  # dark hub
    "#222529": ("--ds-text", "#172B4D", 75),  # chat dark bg
    "#1f2129": ("--ds-text", "#172B4D", 75),  # chat modal
    "#2a2d35": ("--ds-text", "#172B4D", 75),  # chat input
    "#1d1c1d": ("--ds-text", "#172B4D", 75),  # Slack text
    "#3b3d42": ("--ds-text", "#172B4D", 75),  # status-todo dark
    "#221144": ("--ds-text", "#172B4D", 75),  # dark purple text
    "#3a1a1a": ("--ds-text", "#172B4D", 75),  # dark maroon
    "#0b4c8c": ("--ds-link-pressed", "#0747A6", 75),  # dark blue (duplicate)
    # ── CAPACITY PLANNER TOKENS ───────────────────────────────────────────────
    "#9cc2f7": ("--ds-background-information", "#E9F2FF", 75),   # clmp-chip
    "#79e2f2": ("--ds-background-information", "#E9F2FF", 75),   # clmp-cyan
    # ── DARK MODE SURFACE ─────────────────────────────────────────────────────
    "#22272b": ("--ds-surface", "#FFFFFF", 95),
    "#2c333a": ("--ds-background-neutral", "#F1F2F4", 95),
    "#1d2125": ("--ds-surface-sunken", "#F7F8F9", 95),
    "#282e33": ("--ds-surface-overlay", "#FFFFFF", 95),
    "#1e2328": ("--ds-background-neutral-subtle", "#F7F8F9", 75),
    "#30363d": ("--ds-background-neutral", "#F1F2F4", 75),
    "#2e2e2e": ("--ds-background-neutral", "#F1F2F4", 75),
    "#1f1f21": ("--ds-surface", "#FFFFFF", 75),
    "#0a0a0a": ("--ds-text", "#172B4D", 75),
    "#171717": ("--ds-text", "#172B4D", 75),
    "#ededed": ("--ds-background-neutral", "#F1F2F4", 75),
    "#878787": ("--ds-text-subtlest", "#626F86", 75),
    "#a1a1a1": ("--ds-text-subtlest", "#626F86", 75),
    "#454545": ("--ds-text-subtle", "#44546F", 75),
    # ── DARK MODE / GITHUB-INSPIRED PALETTE ──────────────────────────────────
    "#0d1117": ("--ds-surface-sunken", "#F7F8F9", 75),    # dark bg
    "#24292f": ("--ds-text", "#172B4D", 95),               # near-black text
    "#e6edf3": ("--ds-text-inverse", "#FFFFFF", 75),       # dark-mode light text
    "#8b949e": ("--ds-text-subtle", "#44546F", 75),        # muted grey text
    "#6e7681": ("--ds-text-subtlest", "#626F86", 75),      # subtlest grey
    "#21262d": ("--ds-background-neutral", "#F1F2F4", 75), # dark border
    "#f6f8fa": ("--ds-surface-sunken", "#F7F8F9", 90),     # very light surface
    "#fafbfc": ("--ds-surface", "#FFFFFF", 90),            # near-white surface
    "#4ade80": ("--ds-background-success-bold", "#1F845A", 75),  # bright green
    "#4a7c4a": ("--ds-text-success", "#216E4E", 75),       # dark success green
    "#d4874d": ("--ds-background-warning-bold", "#E2B203", 75),  # warm orange
    "#e8f5e9": ("--ds-background-success", "#DFFCF0", 75), # very light green
    "#2b313b": ("--ds-surface", "#FFFFFF", 75),            # dark surface variant
    "#161b22": ("--ds-surface-sunken", "#F7F8F9", 75),     # darkest surface
    "#f0f6fc": ("--ds-surface-sunken", "#F7F8F9", 75),     # near-white with blue
    "#58a6ff": ("--ds-link", "#0C66E4", 75),               # bright blue link
    "#388bfd": ("--ds-link", "#0C66E4", 75),               # blue link
    "#1f6feb": ("--ds-link", "#0C66E4", 75),               # deep blue
    "#238636": ("--ds-text-success", "#216E4E", 75),       # github green
    "#da3633": ("--ds-text-danger", "#AE2A19", 75),        # github red
    "#d29922": ("--ds-text-warning", "#974F0C", 75),       # github yellow
    "#3d444d": ("--ds-background-neutral", "#F1F2F4", 75), # dark muted
    "#656d76": ("--ds-text-subtlest", "#626F86", 75),      # github subtle
    "#f0883e": ("--ds-background-warning-bold", "#E2B203", 75),  # orange warning
    "#79c0ff": ("--ds-background-information-bold", "#1D7AFC", 75), # light blue
    "#56d364": ("--ds-background-success-bold", "#1F845A", 75),   # bright success
    "#ff7b72": ("--ds-background-danger-bold", "#C9372C", 75),    # light red
    "#ffa657": ("--ds-background-warning-bold", "#E2B203", 75),   # light orange
    "#d2a8ff": ("--ds-background-discovery-bold", "#6E5DC6", 75), # light purple
    # ── TAILWIND / EXTENDED PALETTE ───────────────────────────────────────────
    "#0d9488": ("--ds-icon-information", "#1D7AFC", 75),       # teal-600
    "#8b5cf6": ("--ds-background-discovery-bold", "#6E5DC6", 75),  # violet-500
    "#eab308": ("--ds-background-warning-bold", "#E2B203", 95),    # yellow-500
    "#6366f1": ("--ds-background-discovery-bold", "#6E5DC6", 75),  # indigo-500
    "#f0fdf4": ("--ds-background-success", "#DFFCF0", 90),    # green-50
    "#dbeafe": ("--ds-background-information", "#E9F2FF", 90), # blue-100
    "#4bade8": ("--ds-background-information-bold", "#1D7AFC", 90), # ADS info blue
    "#22c55e": ("--ds-background-success-bold", "#1F845A", 75),    # green-500
    "#9ca3af": ("--ds-text-subtlest", "#626F86", 75),          # gray-400
    "#10b981": ("--ds-background-success-bold", "#1F845A", 75),    # emerald-500
    "#ec4899": ("--ds-background-accent-magenta-bolder", "#BE185D", 75),  # pink-500
    "#4c6ef5": ("--ds-background-discovery-bold", "#6E5DC6", 75),  # indigo variant
    "#f97316": ("--ds-background-warning-bold", "#E2B203", 75),    # orange-500
    "#63ba3c": ("--ds-background-success-bold", "#1F845A", 75),    # medium green
    "#065f46": ("--ds-text-success", "#216E4E", 75),           # green-900
    "#93c5fd": ("--ds-background-information", "#E9F2FF", 75), # blue-300
    "#1e40af": ("--ds-link-pressed", "#0747A6", 75),           # blue-800
    "#0284c7": ("--ds-link", "#0C66E4", 75),                   # sky-600
    "#a3a3a3": ("--ds-text-disabled", "#8590A2", 75),          # neutral-400
    "#97a0af": ("--ds-text-disabled", "#8590A2", 75),          # ADS disabled
    "#722ed1": ("--ds-background-discovery-bold", "#6E5DC6", 75),  # purple-600
    "#14b8a6": ("--ds-icon-information", "#1D7AFC", 75),       # teal-500
    "#fff0b3": ("--ds-background-warning", "#FFF7D6", 90),     # light yellow
    "#c1c7d0": ("--ds-border", "#DFE1E6", 90),                 # ADS border-light
    "#626f86": ("--ds-text-subtlest", "#626F86", 100),         # ADS exact subtlest
    "#8590a2": ("--ds-text-disabled", "#8590A2", 100),         # ADS exact disabled
    "#6b7280": ("--ds-text-subtlest", "#626F86", 75),          # gray-500
    "#ca8a04": ("--ds-text-warning", "#974F0C", 75),           # yellow-600
    "#fffbeb": ("--ds-background-warning", "#FFF7D6", 90),     # amber-50
    "#7d7d7d": ("--ds-text-subtlest", "#626F86", 75),          # grey
    "#111111": ("--ds-text", "#172B4D", 75),                   # near-black
    "#737373": ("--ds-text-subtlest", "#626F86", 75),          # neutral-500
    "#ff991f": ("--ds-background-warning-bold", "#E2B203", 75),    # ADS warning
    "#2e2e2e": ("--ds-text", "#172B4D", 75),                   # near-black alt
}

# RGBA token map: keyed by (r,g,b) tuple → (ds_token, confidence)
RGBA_TOKEN_MAP = {
    (9, 30, 66):     ("--ds-background-neutral-subtle-hovered", 100),  # 0.06
    (239, 68, 68):   ("--ds-background-danger", 95),
    (217, 119, 6):   ("--ds-background-warning", 95),
    (37, 99, 235):   ("--ds-background-information", 95),
    (13, 148, 136):  ("--ds-background-success", 95),
    (148, 163, 184): ("--ds-background-neutral", 75),
    (203, 213, 225): ("--ds-background-neutral", 75),
    (225, 29, 72):   ("--ds-background-danger", 75),
    (0, 0, 0):       ("--ds-shadow-raised", 75),
    # ── Semantic tinted backgrounds (transparent layered colors) ──────────────
    (220, 252, 231): ("--ds-background-success", 80),          # very light green
    (254, 243, 199): ("--ds-background-warning", 80),          # very light yellow
    (254, 226, 226): ("--ds-background-danger", 80),           # very light red
    (238, 242, 255): ("--ds-background-discovery", 80),        # very light purple
    (219, 234, 254): ("--ds-background-information", 80),      # very light blue
    (204, 251, 241): ("--ds-background-success", 80),          # very light teal
    (237, 233, 254): ("--ds-background-discovery", 80),        # very light purple-2
    (251, 191, 36):  ("--ds-background-warning-bold", 80),     # amber/gold
    (96, 165, 250):  ("--ds-background-information-bold", 80), # light blue
    (45, 212, 191):  ("--ds-background-success-bold", 80),     # teal
    (167, 139, 250): ("--ds-background-discovery-bold", 80),   # light purple
    # ── Common shadow/overlay rgba ────────────────────────────────────────────
    (0, 0, 0):       ("--ds-shadow-raised", 75),
    (30, 30, 30):    ("--ds-shadow-raised", 75),               # near-black overlay
    (17, 24, 39):    ("--ds-shadow-overlay", 75),              # tailwind gray-900
    (15, 23, 42):    ("--ds-shadow-overlay", 75),              # slate-900
    (71, 85, 105):   ("--ds-background-neutral", 75),          # slate-600
    (100, 116, 139): ("--ds-text-subtlest", 75),               # slate-500
    (148, 163, 184): ("--ds-background-neutral", 75),          # slate-400
    (226, 232, 240): ("--ds-border", 75),                      # slate-200
    (241, 245, 249): ("--ds-surface-sunken", 75),              # slate-100
    (248, 250, 252): ("--ds-surface", 75),                     # slate-50
    # ── Strategy theme grays ──────────────────────────────────────────────────
    (255, 255, 255): ("--ds-surface", 90),                     # white
    (249, 250, 251): ("--ds-surface-sunken", 90),              # gray-50
    (243, 244, 246): ("--ds-background-neutral-subtle", 90),   # gray-100
    (229, 231, 235): ("--ds-border", 90),                      # gray-200
    (209, 213, 219): ("--ds-border", 90),                      # gray-300
    # ── Top unmapped tuples from audit ───────────────────────────────────────
    (59, 130, 246):  ("--ds-background-information-bold", 80), # blue-500
    (15, 23, 42):    ("--ds-shadow-overlay", 80),              # near-black overlay
    (220, 38, 38):   ("--ds-background-danger-bold", 85),      # red-600
    (22, 163, 74):   ("--ds-background-success-bold", 85),     # green-600
    (245, 158, 11):  ("--ds-background-warning-bold", 85),     # amber-500
    (124, 58, 237):  ("--ds-background-discovery-bold", 80),   # violet-600
    (41, 42, 46):    ("--ds-text", 90),                        # ADS primary text rgb
    (139, 92, 246):  ("--ds-background-discovery-bold", 80),   # violet-500
    (74, 222, 128):  ("--ds-background-success-bold", 80),     # green-400
    (11, 18, 14):    ("--ds-text", 80),                        # near-black
    (80, 82, 88):    ("--ds-text-subtle", 95),                 # ADS subtle text rgb
    (34, 197, 94):   ("--ds-background-success-bold", 80),     # green-500
    (16, 185, 129):  ("--ds-background-success-bold", 80),     # emerald-500
    (23, 43, 77):    ("--ds-text", 90),                        # ADS text rgb
    (221, 222, 225): ("--ds-background-neutral", 85),          # ADS grey-300
    (24, 104, 219):  ("--ds-link", 90),                        # ADS brand blue rgb
    (5, 21, 36):     ("--ds-shadow-overlay", 80),              # very dark
    (143, 184, 246): ("--ds-background-information", 80),      # light blue
    (30, 31, 33):    ("--ds-text", 80),                        # near-black-2
    (12, 102, 228):  ("--ds-link", 90),                        # blue
    (234, 88, 12):   ("--ds-background-warning-bold", 80),     # orange-600
    (253, 230, 138): ("--ds-background-warning", 85),          # yellow-200
    (156, 163, 175): ("--ds-text-disabled", 80),               # gray-400
    (179, 223, 114): ("--ds-background-success-bold", 80),     # light green
}

# ── Regex patterns ────────────────────────────────────────────────────────────
# Matches 3-digit or 6-digit hex NOT already inside var(...)
# Lookbehind: not preceded by ( or ,  — this is the fallback position inside var()
HEX_RE = re.compile(
    r'(?<![a-zA-Z0-9_-])'       # not preceded by word char (avoids #fff in strings)
    r'#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})'
    r'(?![0-9a-fA-F])'          # not followed by more hex digits
)

RGBA_RE = re.compile(
    r'rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(?:,\s*([\d.]+))?\s*\)'
)

# Pattern to detect already-wrapped values (idempotency)
ALREADY_WRAPPED_RE = re.compile(r'var\(\s*--ds-')

# ── Helpers ───────────────────────────────────────────────────────────────────

def is_in_var_fallback(line, match_start):
    """Check if a hex value is inside any var(...) or token(...) call.

    Uses proper paren-depth tracking: walk backwards from match_start to find
    the innermost enclosing function call. If it's var() or token(), skip.
    """
    prefix = line[:match_start]
    depth = 0
    i = len(prefix) - 1
    enclosing_func = None
    while i >= 0:
        ch = prefix[i]
        if ch == ')':
            depth += 1
        elif ch == '(':
            if depth == 0:
                # Found the enclosing open paren — look backward for function name
                j = i - 1
                while j >= 0 and prefix[j] in ' \t':
                    j -= 1
                # collect identifier chars
                k = j
                while k >= 0 and (prefix[k].isalnum() or prefix[k] in '-_'):
                    k -= 1
                func_name = prefix[k+1:j+1]
                enclosing_func = func_name
                break
            else:
                depth -= 1
        i -= 1
    if enclosing_func in ('var', 'token', 'Token'):
        return True
    return False


def get_css_property(line):
    """Extract CSS property name from a line like '  background-color: #fff;'"""
    m = re.match(r'\s*([\w-]+)\s*:', line)
    if m:
        return m.group(1).lower()
    return None


def resolve_hex_token(hex_val, css_property=None):
    """Return (ds_token, fallback_hex, confidence) or None."""
    normalized = hex_val.lower()

    # Check property overrides first
    if css_property and css_property in PROPERTY_OVERRIDES:
        override = PROPERTY_OVERRIDES[css_property].get(normalized)
        if override:
            token, fallback = override
            return (token, fallback, 95)

    # Expand 3-char hex
    if len(normalized) == 4:  # '#abc'
        r, g, b = normalized[1], normalized[2], normalized[3]
        normalized = f"#{r}{r}{g}{g}{b}{b}"

    return HEX_TOKEN_MAP.get(normalized)


def resolve_rgba_token(r, g, b, a=None):
    """Return (ds_token, confidence) or None for rgba values."""
    rgb = (int(r), int(g), int(b))

    # Special case: shadow variants of (9,30,66) based on alpha
    if rgb == (9, 30, 66):
        if a is not None:
            alpha = float(a)
            if alpha <= 0.06:
                return ("--ds-background-neutral-subtle-hovered", 100)
            elif alpha <= 0.14:
                return ("--ds-background-neutral-subtle-pressed", 100)
            else:
                return ("--ds-shadow-raised", 75)

    return RGBA_TOKEN_MAP.get(rgb)


def wrap_hex(hex_val, token, fallback, match):
    """Build var(--ds-TOKEN, #FALLBACK) string."""
    return f"var({token}, {fallback})"


def wrap_rgba(original, token):
    """Build var(--ds-TOKEN, rgba(...)) string."""
    return f"var({token}, {original})"


def fix_line(line, file_path):
    """Apply all token replacements to a single CSS line. Returns (fixed_line, [changes])."""
    changes = []
    result = line

    # Skip comment lines
    stripped = line.strip()
    if stripped.startswith("/*") or stripped.startswith("//") or stripped.startswith("*"):
        return line, []

    # Skip lines that are entirely within @import or url()
    if "@import" in line or "url(" in line.lower():
        return line, []

    css_property = get_css_property(line)

    # ── Process RGBA first (before hex, to avoid double-processing) ───────────
    def replace_rgba(m):
        original = m.group(0)
        # Skip if already inside var(--ds-...)
        if is_in_var_fallback(result, m.start()):
            return original
        r, g, b = m.group(1), m.group(2), m.group(3)
        a = m.group(4)
        resolved = resolve_rgba_token(r, g, b, a)
        if resolved:
            token, confidence = resolved
            new_val = wrap_rgba(original, token)
            changes.append({
                "original": original,
                "replacement": new_val,
                "token": token,
                "confidence": confidence,
                "kind": "rgba",
            })
            return new_val
        return original

    result = RGBA_RE.sub(replace_rgba, result)

    # ── Process hex values ────────────────────────────────────────────────────
    # Re-scan the mutated line for remaining hex values
    def replace_hex(m):
        original = m.group(0)
        # Skip if inside var(--ds-...) fallback position
        if is_in_var_fallback(result, m.start()):
            return original
        # Skip if the whole line already has var(--ds- with this exact hex
        # (idempotency check)
        hex_in_var = re.search(
            r'var\(\s*--ds-[^)]+,\s*' + re.escape(original) + r'\s*\)',
            result
        )
        if hex_in_var:
            return original

        resolved = resolve_hex_token(original, css_property)
        if resolved:
            token, fallback, confidence = resolved
            new_val = f"var({token}, {fallback})"
            changes.append({
                "original": original,
                "replacement": new_val,
                "token": token,
                "confidence": confidence,
                "kind": "hex",
            })
            return new_val
        # Unmapped hex — log but leave unchanged
        changes.append({
            "original": original,
            "replacement": original,
            "token": "UNMAPPED",
            "confidence": 0,
            "kind": "hex-unmapped",
        })
        return original

    result = HEX_RE.sub(replace_hex, result)

    return result, changes


# ── Main processing ───────────────────────────────────────────────────────────

def process_file(file_path):
    """Read, fix, and write a CSS file. Returns list of change records."""
    if not file_path.exists():
        print(f"  SKIP: {file_path} not found")
        return []

    print(f"\n Processing: {file_path.relative_to(ROOT)}")

    with open(file_path, "r", encoding="utf-8") as f:
        lines = f.readlines()

    all_changes = []
    fixed_lines = []
    applied = 0
    unmapped = 0

    for lineno, line in enumerate(lines, 1):
        fixed_line, changes = fix_line(line, file_path)
        fixed_lines.append(fixed_line)

        for ch in changes:
            ch["file"] = str(file_path.relative_to(ROOT))
            ch["line"] = lineno
            all_changes.append(ch)
            if ch["kind"] == "hex-unmapped":
                unmapped += 1
            else:
                applied += 1

    print(f"  Applied: {applied} replacements, Unmapped: {unmapped} values")

    if not DRY_RUN:
        with open(file_path, "w", encoding="utf-8") as f:
            f.writelines(fixed_lines)
        print(f"  Written: {file_path.relative_to(ROOT)}")
    else:
        print(f"  DRY RUN — no file written")

    return all_changes


def write_csv(all_changes):
    """Write migration CSV."""
    csv_path = ROOT / "catalyst-root-css-migration.csv"
    fieldnames = ["file", "line", "kind", "original", "token", "replacement", "confidence"]

    with open(csv_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for ch in all_changes:
            writer.writerow({k: ch.get(k, "") for k in fieldnames})

    print(f"\n CSV: {csv_path.relative_to(ROOT)} ({len(all_changes)} rows)")


def verify_idempotency(file_path):
    """Run fix_line on already-fixed file — expect 0 new replacements."""
    print(f"\n Idempotency check: {file_path.relative_to(ROOT)}")
    with open(file_path, "r", encoding="utf-8") as f:
        lines = f.readlines()
    total = 0
    for lineno, line in enumerate(lines, 1):
        _, changes = fix_line(line, file_path)
        actual = [c for c in changes if c["kind"] != "hex-unmapped"]
        total += len(actual)
    if total == 0:
        print(f"  PASS — 0 new replacements on second pass (idempotent)")
    else:
        print(f"  WARN — {total} replacements would apply on second pass (check idempotency)")
    return total


# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("=== ADS Token Migration — Root CSS Files ===")
    if DRY_RUN:
        print("DRY RUN MODE — files will NOT be modified\n")

    all_changes = []
    for target in TARGET_FILES:
        changes = process_file(target)
        all_changes.extend(changes)

    write_csv(all_changes)

    # Summary
    applied_count = sum(1 for c in all_changes if c["kind"] != "hex-unmapped")
    unmapped_count = sum(1 for c in all_changes if c["kind"] == "hex-unmapped")
    high_conf = sum(1 for c in all_changes if c.get("confidence", 0) >= 95)

    print(f"\n=== Summary ===")
    print(f"  Replaced:  {applied_count}")
    print(f"  Unmapped:  {unmapped_count} (left unchanged)")
    print(f"  High conf: {high_conf} (≥95%)")
    print(f"  Needs review: {unmapped_count + sum(1 for c in all_changes if 0 < c.get('confidence',0) < 75)}")

    # Idempotency verification (only if files were actually written)
    if not DRY_RUN:
        print("\n=== Idempotency Verification ===")
        total_second_pass = 0
        for target in TARGET_FILES:
            if target.exists():
                total_second_pass += verify_idempotency(target)
        if total_second_pass > 0:
            print("\n  ACTION NEEDED: Run again until second-pass count is 0")
        else:
            print("\n  All files idempotent.")
