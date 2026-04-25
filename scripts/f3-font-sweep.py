#!/usr/bin/env python3
"""
F3 Font Sweep — replace literal Sora / Inter / JetBrains Mono with CSS vars.

Substitution map:
  "Sora"           → var(--ds-font-family-heading)
  "Inter"          → var(--ds-font-family-body)
  "JetBrains Mono" → var(--ds-font-family-monospaced)

Exemptions (never touched):
  - src/styles/planhub.css                (ringfenced)
  - src/modules/planner/styles/**         (ringfenced)
  - src/index.css inside any :root block  (bridge fallback chain)
  - any line that is a --hub-font-* var   (F4 scope)
  - @font-face blocks                     (F2 scope)
  - src/styles/catalyst-typography.css    (the bridge itself)
"""

import re
import sys
from pathlib import Path

ROOT = Path("/home/user/catalyst-prod-44/src")

SKIP_PATHS = {
    "styles/planhub.css",
    "styles/catalyst-typography.css",
}
SKIP_DIR_PREFIXES = [
    "modules/planner/styles",
]

FONT_VAR = {
    "JetBrains Mono": "var(--ds-font-family-monospaced)",
    "Sora":           "var(--ds-font-family-heading)",
    "Inter":          "var(--ds-font-family-body)",
}

# ──────────────────────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────────────────────

def should_skip(path: Path) -> bool:
    rel = path.relative_to(ROOT)
    rel_str = str(rel)
    if rel_str in SKIP_PATHS:
        return True
    return any(rel_str.startswith(p) for p in SKIP_DIR_PREFIXES)


def detect_font(value: str) -> str | None:
    """Return the CSS var to use based on which font name is in *value*."""
    for font, var in FONT_VAR.items():
        if font in value:
            return var
    return None


# ──────────────────────────────────────────────────────────────────────────────
# CSS / CSS-module sweep
# ──────────────────────────────────────────────────────────────────────────────

# Matches:  font-family: <anything containing Sora/Inter/JetBrains>;
# Groups:   (1) "  font-family:"  (2) value before ; or end  (3) ";" or ""
_CSS_FF = re.compile(
    r"(font-family\s*:)\s*([^;{}\n]+?)\s*(;|(?=\s*[{}])|$)",
    re.IGNORECASE,
)

def _css_replacer(m: re.Match) -> str:
    prop     = m.group(1)   # "font-family:"
    value    = m.group(2)   # full original value
    tail     = m.group(3)   # ";" or ""

    var = detect_font(value)
    if var is None:
        return m.group(0)

    important = " !important" if "!important" in value else ""
    return f"{prop} {var}{important}{tail}"


def process_css(path: Path) -> int:
    """
    Returns number of changed lines.
    For index.css: skip lines that fall inside a :root { } block.
    Also skip lines that define --hub-font-* or are inside @font-face.
    """
    is_index = (path == ROOT / "index.css")
    text = path.read_text(encoding="utf-8")
    lines = text.splitlines(keepends=True)

    in_root       = False
    in_font_face  = False
    brace_depth   = 0
    root_depth    = -1
    ff_depth      = -1

    changed = 0
    out = []
    for line in lines:
        stripped = line.strip()

        # Track @font-face block
        if re.match(r'@font-face\s*\{?', stripped, re.IGNORECASE):
            in_font_face = True
            ff_depth = brace_depth

        # Track :root block (index.css only)
        if is_index and re.match(r':root\s*\{?', stripped):
            in_root = True
            root_depth = brace_depth

        opens  = line.count('{')
        closes = line.count('}')
        brace_depth += opens - closes

        # Exit :root block
        if in_root and brace_depth <= root_depth:
            in_root = False
            root_depth = -1

        # Exit @font-face block
        if in_font_face and brace_depth <= ff_depth:
            in_font_face = False
            ff_depth = -1

        # Skip exempt lines
        if in_root or in_font_face:
            out.append(line)
            continue

        # Skip hub-scoped font var declarations  e.g.  --hub-font-body: …
        if re.match(r'\s*--hub-font-', line):
            out.append(line)
            continue

        # Only act if one of the three font names is present
        if not any(f in line for f in FONT_VAR):
            out.append(line)
            continue

        new_line = _CSS_FF.sub(_css_replacer, line)
        if new_line != line:
            changed += 1
        out.append(new_line)

    if changed:
        path.write_text("".join(out), encoding="utf-8")
    return changed


# ──────────────────────────────────────────────────────────────────────────────
# TS / TSX sweep — fontFamily: "..." inline style props
# ──────────────────────────────────────────────────────────────────────────────

# Covers:
#   fontFamily: "'Sora', sans-serif"
#   fontFamily: "'Inter', system-ui, sans-serif"
#   fontFamily: "'JetBrains Mono', monospace"
#   fontFamily: "Inter, system-ui, sans-serif"   (no inner quotes)
_TS_FF_DQ = re.compile(
    r"""(fontFamily\s*:\s*)"((?:[^"\\]|\\.)*(?:Sora|Inter|JetBrains Mono)(?:[^"\\]|\\.)*)"""
    r'"',
    re.DOTALL,
)
_TS_FF_SQ = re.compile(
    r"""(fontFamily\s*:\s*)'((?:[^'\\]|\\.)*(?:Sora|Inter|JetBrains Mono)(?:[^'\\]|\\.)*)'""",
    re.DOTALL,
)

# Also covers the font-family: inside a CSS-in-JS template-literal string
_TS_CSS_FF = re.compile(
    r"(font-family\s*:)\s*([^;\"'`\n]+(?:Sora|Inter|JetBrains Mono)[^;\"'`\n]*)\s*(;?)",
)

def _ts_dq_replacer(m: re.Match) -> str:
    prefix = m.group(1)  # "fontFamily: "
    value  = m.group(2)
    var = detect_font(value)
    if var is None:
        return m.group(0)
    return f"{prefix}'{var}'"

def _ts_sq_replacer(m: re.Match) -> str:
    prefix = m.group(1)
    value  = m.group(2)
    var = detect_font(value)
    if var is None:
        return m.group(0)
    return f"{prefix}'{var}'"

def _ts_css_replacer(m: re.Match) -> str:
    prop    = m.group(1)
    value   = m.group(2)
    semi    = m.group(3)
    var = detect_font(value)
    if var is None:
        return m.group(0)
    important = " !important" if "!important" in value else ""
    return f"{prop} {var}{important}{semi}"


def process_ts(path: Path) -> int:
    text = path.read_text(encoding="utf-8")

    new = _TS_FF_DQ.sub(_ts_dq_replacer, text)
    new = _TS_FF_SQ.sub(_ts_sq_replacer, new)
    new = _TS_CSS_FF.sub(_ts_css_replacer, new)

    if new != text:
        path.write_text(new, encoding="utf-8")
        return 1
    return 0


# ──────────────────────────────────────────────────────────────────────────────
# Main
# ──────────────────────────────────────────────────────────────────────────────

def main():
    css_files_changed = []
    ts_files_changed  = []

    for path in sorted(ROOT.rglob("*")):
        if not path.is_file():
            continue
        if should_skip(path):
            continue

        suffix = path.suffix.lower()

        if suffix == ".css":
            n = process_css(path)
            if n:
                css_files_changed.append((path, n))

        elif suffix in {".ts", ".tsx"}:
            n = process_ts(path)
            if n:
                ts_files_changed.append((path, n))

    print(f"\n{'='*60}")
    print(f"CSS files updated  : {len(css_files_changed)}")
    for p, n in css_files_changed:
        print(f"  {p.relative_to(ROOT)}  ({n} lines)")

    print(f"\nTS/TSX files updated: {len(ts_files_changed)}")
    for p, _ in ts_files_changed:
        print(f"  {p.relative_to(ROOT)}")

    print(f"\nTotal files touched: {len(css_files_changed) + len(ts_files_changed)}")


if __name__ == "__main__":
    main()
