# ADS Parity Audit — Evidence & Analysis Directory

**Feature:** CAT-DESIGN-ADS-PARITY-20260628-001  
**Status:** Phase 0 (Baseline Capture) — READY FOR EXECUTION  
**Created:** 2026-06-28

---

## WHAT THIS DIRECTORY CONTAINS

This directory holds all evidence, analysis, and planning documents for the comprehensive Catalyst → Atlassian Design System (ADS) parity audit.

### Documents in This Directory

#### **1. baseline-evidence-plan.md**
**Purpose:** Complete capture plan for Phase 0  
**Contents:**
- What we will capture (screenshots, CSS extraction)
- Capture methodology (Playwright or manual)
- Expected deviations by category (light mode, dark mode, typography, spacing)
- Output artifacts specification
- Validation checklist

**When to read:** BEFORE starting Phase 0 execution

**Key sections:**
- "WHAT WE WILL CAPTURE" — overview of 12 screenshots + CSS extraction
- "EXPECTED CSS DIFFERENCES (HYPOTHESIS)" — what deviations to look for
- "OUTPUT ARTIFACTS" — where files go and what they contain

---

#### **2. expected-findings-baseline.md**
**Purpose:** Project what Phase 0 evidence will likely reveal  
**Contents:**
- Expected findings by severity (CRITICAL, HIGH, MEDIUM, LOW)
- Quantified expectations (e.g., "~85 hardcoded color violations expected")
- Dark mode surface flattening hypothesis with measurements
- Expected canonical component gaps (12–18 components)
- Color baseline extraction mapping (light + dark)
- Screenshot manifest template
- Sign-off criteria

**When to read:** AFTER Phase 0 capture, to guide Phase 1–4 interpretation

**Key sections:**
- "SECTION 1: EXPECTED CSS DEVIATIONS BY CATEGORY" — detailed hypothesis per category
- "SECTION 3: EXPECTED DARK MODE SURFACE COLOR MAPPING" — critical finding likely to emerge
- "SECTION 5: EXPECTED FINDINGS BY SEVERITY" — cost/effort estimates for fixes

---

#### **3. css-extraction-script.js**
**Purpose:** Browser JavaScript utilities for extracting computed CSS styles  
**Contents:**
- `captureComputedStyles()` — extracts 20+ computed style properties per element
- `checkContrast()` — WCAG AA/AAA contrast ratio calculator
- `getAllColors()` — inventory of unique colors on page
- `exportExtraction()` — console export helper

**When to use:** During Phase 0 capture, after page loads, to extract CSS

**How to use:**
1. Paste script into browser console (F12)
2. Run: `window.captureComputedStyles()`
3. Copy JSON output
4. Save to: `baseline-css-extraction-<surface>-<theme>.json`

**Example:**
```javascript
// In browser console:
window.captureComputedStyles()
// Output: JSON with computed styles for all selectors
window.exportExtraction()
// Output: Pretty-printed JSON to console
```

---

#### **4. PHASE-0-EXECUTION-CHECKLIST.md**
**Purpose:** Step-by-step execution guide for baseline capture  
**Contents:**
- Pre-execution setup (5 min)
- Jira light mode captures (5 min)
- Jira dark mode captures (5 min)
- Catalyst light mode captures (5 min)
- Catalyst dark mode captures (5 min)
- Post-capture processing (5 min)
- Git commit (2 min)
- Troubleshooting guide
- Sign-off criteria

**When to use:** DURING Phase 0 execution — print or open in split screen

**Each section:**
- ✓ Checkboxes for every step
- Specific file paths and commands
- Visual checks to perform
- Validation commands

**Timebox:** 30 minutes total (5 min per major step)

---

#### **5. baseline-evidence.md** (Generated During Phase 0)
**Purpose:** Captured evidence and preliminary observations  
**Contents (to be filled during execution):**
- Screenshot manifest (all 12 files, viewport sizes, themes)
- Visual observations from each screenshot pair
- CSS extraction summary
- Dark mode specific findings
- Preliminary findings list

**Where:** This file does NOT exist yet; created during Phase 0 execution

**Will contain:**
```markdown
# Screenshot Manifest
| Surface | Theme | Viewport | File | Status |
| Jira    | Light | 1440x900 | jira/light/LM-1440x900.png | Captured |
...

## Jira Reference Observations
### Light Mode
- Top nav: white background, 56px height...

## Catalyst Observations
...

## Preliminary Findings
1. Dark mode surfaces appear same color (CRITICAL)
2. Hover states use #F5F5F5 instead of ADS token (MEDIUM)
...
```

---

#### **6. visual-observations.md** (Generated During Phase 0)
**Purpose:** Detailed visual notes from screenshot comparison  
**Contents (to be filled during execution):**
- Side-by-side Jira vs Catalyst observations
- Specific pixel measurements or color hex values
- Accessibility observations (e.g., contrast issues)
- Theme-specific notes
- Row-by-row component comparison

**Where:** This file does NOT exist yet; created during Phase 0 execution

---

#### **7. baseline-css-extraction.json** (Generated During Phase 0)
**Purpose:** Computed CSS values for key selectors  
**Contents (to be filled during execution):**
```json
{
  "metadata": {
    "surface": "jira",
    "theme": "light",
    "viewport": "1440x900",
    "captureTime": "2026-06-28T..."
  },
  "captures": [
    {
      "selector": "body",
      "displayName": "Page Background",
      "computed": {
        "backgroundColor": "rgb(255, 255, 255)",
        "color": "rgb(23, 43, 77)"
      }
    }
  ]
}
```

**Will generate:**
- `baseline-css-extraction-jira-light.json`
- `baseline-css-extraction-jira-dark.json`
- `baseline-css-extraction-catalyst-light.json`
- `baseline-css-extraction-catalyst-dark.json`

---

#### **8. screenshots/baseline/** (Generated During Phase 0)
**Purpose:** Visual evidence directory  
**Structure:**
```
audits/ads-parity/screenshots/baseline/
  jira/
    light/
      LM-1440x900.png
      LM-1600x900.png
      LM-1920x1080.png
    dark/
      DM-1440x900.png
      DM-1600x900.png
      DM-1920x1080.png
  catalyst/
    light/
      LM-1440x900.png
      LM-1600x900.png
      LM-1920x1080.png
    dark/
      DM-1440x900.png
      DM-1600x900.png
      DM-1920x1080.png
```

**Total:** 12 PNG files (~100–300KB each)

---

## PHASE 0 EXECUTION FLOW

```
START
  ↓
1. Read baseline-evidence-plan.md (understand what to capture)
  ↓
2. Review PHASE-0-EXECUTION-CHECKLIST.md (execution steps)
  ↓
3. Execute Phase 0 (30 min timebox):
   - Capture Jira light + dark (6 viewports, CSS extraction)
   - Capture Catalyst light + dark (6 viewports, CSS extraction)
   - Validate all files saved
  ↓
4. Create baseline-evidence.md (observations + manifest)
  ↓
5. Git commit (feature branch)
  ↓
6. Read expected-findings-baseline.md (understand findings context)
  ↓
7. Phase 1 begins (Canonical Component Discovery)
```

---

## EXPECTED FINDINGS SUMMARY

Phase 0 will likely reveal:

**CRITICAL Issues (blocks dark mode):**
- Dark mode surfaces all same color (no visual hierarchy)
- Dark mode secondary text fails WCAG AA contrast
- Icons nearly invisible in dark mode
- Estimated 15–20 component files affected

**HIGH Issues (noticeable deviations):**
- Hover states use arbitrary colors (#F5F5F5) instead of ADS tokens
- Light mode surfaces lack depth hierarchy
- Estimated 8–12 component files affected

**MEDIUM Issues (technical debt):**
- Typography off by 1–2px
- Spacing not on 8px grid (15–20% of gaps)
- ~12–18 canonical component gaps (custom UI)
- Estimated 10–15 component files affected

**Total expected:** 85–100 hardcoded color violations (ratchet gate baseline: 709)

See `expected-findings-baseline.md` for detailed hypothesis.

---

## QUICK REFERENCE: CAPTURE METHODOLOGY

### Automated (Playwright)
```bash
# Install Playwright if needed
npm install playwright

# Run capture script (if available)
node scripts/capture-baseline.js
```

### Manual (Browser DevTools)
```bash
# 1. Open URL in Chrome
# 2. DevTools: F12
# 3. Device toolbar: Responsive design mode
# 4. Set viewport: exactly 1440x900 (or other size)
# 5. Screenshot: DevTools hamburger → Screenshot (or Shift+Ctrl+P → screenshot)
# 6. CSS extraction: F12 → Console → paste css-extraction-script.js
```

---

## VALIDATION CHECKLIST (Phase 0 Complete)

Before moving to Phase 1, verify:

- [ ] All 12 screenshots captured (6 viewports × 2 themes × 2 surfaces)
- [ ] Screenshots saved in correct directory structure
- [ ] CSS extraction JSON includes > 20 key selectors per surface/theme
- [ ] baseline-evidence.md created with manifest + observations
- [ ] Dark mode findings documented (surfaces distinguishable? icons visible?)
- [ ] No blurry screenshots (zoom 100%, no DevTools overlay)
- [ ] All files committed to git
- [ ] JSON extraction files valid: `jq . *.json > /dev/null && echo OK`

---

## NEXT PHASES (After Phase 0 Approved)

| Phase | Purpose | Timebox | Parallel? |
|---|---|---|---|
| **1** | Canonical Component Discovery | 30 min | Yes |
| **2** | ADS Compliance Checklist (160 points) | 30 min | Yes |
| **3** | Screenshot Diff & Measurement | 30 min | Yes |
| **4** | Fix Strategy & Plan Lock | 30 min | Sequential |
| **5–10** | Implementation (2-hour slices × 6 lanes) | 12+ hours | Per phase |

---

## KEY LINKS

- **Jira Reference:** https://digital-transformation.atlassian.net/jira/for-you?tab=assigned
- **ADS Reference:** https://atlassian.design/
- **ADS Tokens:** https://atlassian.design/tokens/design-tokens
- **Catalyst Storybook:** http://localhost:8080/storybook
- **Feature Folder:** `catalyst/features/CAT-DESIGN-ADS-PARITY-20260628-001/`
- **Plan Lock:** `03_PLAN_LOCK.md` (approved for discovery phases only)

---

## TROUBLESHOOTING TIPS

**Screenshots blurry?**  
→ Set Chrome zoom to 100% before capture

**CSS extraction returning "NOT_FOUND" for most selectors?**  
→ Page may not be fully loaded; wait 2 seconds; check browser console for errors

**Jira dark mode toggle not working?**  
→ Check browser cookies for theme preference; may need to toggle system-level dark mode

**Viewport size wrong?**  
→ Use Chrome Device Mode (DevTools → ⋯ → More tools → Devices mode) for exact sizing

**JSON extraction invalid?**  
→ Check for unescaped quotes; re-run script; may need manual cleanup of special characters

---

## FILE MANIFEST (This Directory)

```
audits/ads-parity/
├── README.md (this file)
├── baseline-evidence-plan.md (capture plan)
├── expected-findings-baseline.md (findings hypothesis)
├── css-extraction-script.js (browser utilities)
├── PHASE-0-EXECUTION-CHECKLIST.md (step-by-step guide)
├── screenshots/
│   └── baseline/
│       ├── jira/
│       │   ├── light/ (3 PNG files, generated)
│       │   └── dark/ (3 PNG files, generated)
│       └── catalyst/
│           ├── light/ (3 PNG files, generated)
│           └── dark/ (3 PNG files, generated)
├── baseline-evidence.md (generated during Phase 0)
├── visual-observations.md (generated during Phase 0)
├── baseline-css-extraction-jira-light.json (generated)
├── baseline-css-extraction-jira-dark.json (generated)
├── baseline-css-extraction-catalyst-light.json (generated)
├── baseline-css-extraction-catalyst-dark.json (generated)
```

---

## GETTING STARTED

1. **Read:** `baseline-evidence-plan.md` (understand scope)
2. **Review:** `PHASE-0-EXECUTION-CHECKLIST.md` (execution steps)
3. **Execute:** Phase 0 (30 minutes)
4. **Commit:** Git commit of screenshots + evidence
5. **Review:** `expected-findings-baseline.md` (context for findings)
6. **Next:** Phase 1 (Canonical Component Discovery)

---

**Last Updated:** 2026-06-28  
**Status:** PHASE 0 PLANNING COMPLETE — READY FOR EXECUTION  
**Next Milestone:** baseline-evidence.md published, Phase 0 complete
