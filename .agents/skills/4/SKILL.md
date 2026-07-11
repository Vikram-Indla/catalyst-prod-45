# /4 — Evidence (Visual Proof)

**Screenshot + MCP probe proof of delivered/fixed state. Structured data only, no prose.**

## Usage

```
/4 <url-or-route>              # Capture current state with probes
/4 <url-or-route> --fix        # Apply fix + capture before/after
/4 <url-or-route> --compare    # Side-by-side before/after if fix available
```

## Output Format

**BEFORE screenshot + probe table**
```
| Element        | Measured (getBoundingClientRect) |
|---|---|
| Button         | top 178, bottom 215, right 902 |
| Popup          | top 219, left 651, right 891, width 240 |
| Popup style    | position: fixed, zIndex 9001 |
```

**Live screenshot** (Chrome MCP or computer-use)

---

**AFTER screenshot + probe table** (if --fix applied)

---

**Δ Changes** (if measurements differ)
```
| Element | Before | After | Status |
|---|---|---|---|
| Button top | 178 | 180 | ✅ |
| Popup left | 651 | 649 | ✅ |
```

---

## Integrations

- **Uses `design-critique`** for visual heuristic scoring (optional, on request)
- **Uses `systematic-debugging`** for root-cause analysis (optional, on request)
- **Chrome MCP** for live probe + screenshot
- **Code execution** for optional fix application

## Data Capture

Always includes:
- Screenshot (viewport 1512×1024 default, or user-specified)
- getBoundingClientRect (all interactive elements)
- getComputedStyle (position, zIndex, opacity, display, visibility)
- DOM structure (parent/sibling context if relevant)
- Network/state at time of capture

**Output: JSON blob + screenshot artifact**
