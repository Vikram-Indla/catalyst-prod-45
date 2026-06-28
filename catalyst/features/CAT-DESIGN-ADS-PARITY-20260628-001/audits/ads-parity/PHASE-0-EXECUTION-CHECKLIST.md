# Phase 0 Execution Checklist — Baseline Capture

**Feature:** CAT-DESIGN-ADS-PARITY-20260628-001  
**Phase:** 0 (Branch, Baseline, Evidence Capture)  
**Timebox:** 30 minutes  
**Status:** READY FOR EXECUTION

---

## PRE-EXECUTION SETUP (5 min)

### Environment Check
- [ ] Jira accessible: https://digital-transformation.atlassian.net/jira/for-you?tab=assigned
- [ ] Catalyst dev server ready (npm run dev)
- [ ] Chrome DevTools or Playwright ready
- [ ] Directory structure created: `audits/ads-parity/screenshots/baseline/`
- [ ] This checklist printed or open in second window

### Viewport Test
- [ ] Chrome DevTools → Device toolbar enabled
- [ ] Pixel zoom set to 100% (or noted)
- [ ] Responsive design mode ready for 1440x900, 1600x900, 1920x1080 sizes
- [ ] System theme set to Light (for light mode captures)
- [ ] Method for toggling dark mode identified (browser theme toggle or Jira settings)

### Screenshot Tools
- [ ] Playwright installed: `npm ls playwright` (if using automated capture)
- [ ] OR manual screenshot method ready: F12 → DevTools → hamburger → Screenshot
- [ ] Save location verified: `catalyst/features/CAT-DESIGN-ADS-PARITY-20260628-001/audits/ads-parity/screenshots/baseline/`

---

## JIRA LIGHT MODE CAPTURES (5 min)

### Viewport 1440x900
- [ ] Open Jira: https://digital-transformation.atlassian.net/jira/for-you?tab=assigned
- [ ] Verify logged in (if needed)
- [ ] DevTools: Set viewport to exactly 1440x900 (Device toolbar)
- [ ] Verify page fully loaded (no spinners)
- [ ] No popups or overlays blocking view
- [ ] Screenshot saved: `jira/light/LM-1440x900.png`
- [ ] Visual check: Navigation visible, left rail visible, issues list visible

### Viewport 1600x900
- [ ] Resize viewport to 1600x900
- [ ] Verify no content shifts unexpectedly
- [ ] Screenshot saved: `jira/light/LM-1600x900.png`
- [ ] Visual check: Wider layout, sidebar may expand

### Viewport 1920x1080
- [ ] Resize viewport to 1920x1080
- [ ] Screenshot saved: `jira/light/LM-1920x1080.png`
- [ ] Visual check: Full HD, content may be wider

### CSS Extraction (Light Mode)
- [ ] Open Browser Console (F12 → Console)
- [ ] Paste css-extraction-script.js content OR use Playwright equivalent
- [ ] Run: `window.captureComputedStyles()`
- [ ] Copy output to clipboard
- [ ] Save to: `baseline-css-extraction-jira-light.json`
- [ ] Verify JSON is valid: `jq . baseline-css-extraction-jira-light.json`
- [ ] Optional: Run `window.getAllColors()` to document unique colors found

---

## JIRA DARK MODE CAPTURES (5 min)

### Switch to Dark Mode
- [ ] Jira settings → Theme → Dark (or browser theme toggle if Jira respects system)
- [ ] Wait for page re-render (1–2 seconds)
- [ ] Verify dark theme applied to entire page

### Viewport 1440x900
- [ ] Viewport still 1440x900
- [ ] Screenshot saved: `jira/dark/DM-1440x900.png`
- [ ] Visual check: Dark background, text remains readable, surfaces distinguishable

### Viewport 1600x900
- [ ] Resize to 1600x900
- [ ] Screenshot saved: `jira/dark/DM-1600x900.png`

### Viewport 1920x1080
- [ ] Resize to 1920x1080
- [ ] Screenshot saved: `jira/dark/DM-1920x1080.png`

### CSS Extraction (Dark Mode)
- [ ] Run: `window.captureComputedStyles()` again
- [ ] Copy output
- [ ] Save to: `baseline-css-extraction-jira-dark.json`
- [ ] Verify JSON is valid

---

## CATALYST LIGHT MODE CAPTURES (5 min)

### Start Catalyst Dev Server
- [ ] Terminal: `npm run dev` (if not already running)
- [ ] Wait for build: "ready on http://localhost:3000" or configured port
- [ ] Verify app loads without errors

### Prepare Browser
- [ ] Open new tab or clear cache (Ctrl+Shift+Delete)
- [ ] Navigate to: http://localhost:3000 (or configured dev server URL)
- [ ] Switch system theme to Light mode (or toggle in app)
- [ ] Wait for app fully loaded

### Viewport 1440x900
- [ ] DevTools: Set viewport to 1440x900
- [ ] Verify no spinners, page fully rendered
- [ ] Screenshot saved: `catalyst/light/LM-1440x900.png`
- [ ] Visual check: Compare with Jira LM-1440x900 (colors, spacing, typography)

### Viewport 1600x900
- [ ] Resize to 1600x900
- [ ] Screenshot saved: `catalyst/light/LM-1600x900.png`

### Viewport 1920x1080
- [ ] Resize to 1920x1080
- [ ] Screenshot saved: `catalyst/light/LM-1920x1080.png`

### CSS Extraction (Light Mode)
- [ ] Open Console
- [ ] Paste css-extraction-script.js (same as Jira)
- [ ] Run: `window.captureComputedStyles()`
- [ ] Save to: `baseline-css-extraction-catalyst-light.json`

---

## CATALYST DARK MODE CAPTURES (5 min)

### Switch to Dark Mode
- [ ] Toggle dark mode in Catalyst app (usually theme switch in nav/settings)
- [ ] OR use browser dark mode toggle if Catalyst respects system
- [ ] Wait for re-render

### Viewport 1440x900
- [ ] Viewport remains 1440x900
- [ ] Screenshot saved: `catalyst/dark/DM-1440x900.png`
- [ ] **CRITICAL Visual Check:**
  - [ ] Can you clearly see difference between nav and page background?
  - [ ] Can you see difference between card and page background?
  - [ ] Are icons visible?
  - [ ] Can you read secondary text?
  - **If ANY answer is NO → note as dark mode critical issue**

### Viewport 1600x900
- [ ] Resize to 1600x900
- [ ] Screenshot saved: `catalyst/dark/DM-1600x900.png`

### Viewport 1920x1080
- [ ] Resize to 1920x1080
- [ ] Screenshot saved: `catalyst/dark/DM-1920x1080.png`

### CSS Extraction (Dark Mode)
- [ ] Run: `window.captureComputedStyles()`
- [ ] Save to: `baseline-css-extraction-catalyst-dark.json`

---

## POST-CAPTURE PROCESSING (5 min)

### Validate All Files Exist
```bash
ls -la catalyst/features/CAT-DESIGN-ADS-PARITY-20260628-001/audits/ads-parity/screenshots/baseline/
```

- [ ] jira/light/ (3 files: LM-1440x900.png, LM-1600x900.png, LM-1920x1080.png)
- [ ] jira/dark/ (3 files: DM-1440x900.png, DM-1600x900.png, DM-1920x1080.png)
- [ ] catalyst/light/ (3 files)
- [ ] catalyst/dark/ (3 files)
- [ ] baseline-css-extraction-jira-light.json
- [ ] baseline-css-extraction-jira-dark.json
- [ ] baseline-css-extraction-catalyst-light.json
- [ ] baseline-css-extraction-catalyst-dark.json

### Validate JSON Files
```bash
jq . baseline-css-extraction-jira-light.json > /dev/null && echo "✓ Valid"
jq . baseline-css-extraction-jira-dark.json > /dev/null && echo "✓ Valid"
jq . baseline-css-extraction-catalyst-light.json > /dev/null && echo "✓ Valid"
jq . baseline-css-extraction-catalyst-dark.json > /dev/null && echo "✓ Valid"
```

- [ ] All JSON files parse without errors

### Create baseline-evidence.md
- [ ] Copy template from baseline-evidence-plan.md
- [ ] Fill in manifest with actual file paths
- [ ] Add visual observations from each screenshot pair (Jira vs Catalyst)
- [ ] Document any dark mode issues observed
- [ ] Note any color/spacing deviations visible
- [ ] File saved: `baseline-evidence.md`

### Create visual-observations.md (Optional but Recommended)
- [ ] Document detailed observations from each screenshot
- [ ] Include side-by-side comparisons (e.g., "Jira nav is 56px high, Catalyst nav appears same height")
- [ ] Note any deviations in typography, spacing, colors
- [ ] Document dark mode specific findings
- [ ] File saved: `visual-observations.md`

---

## GIT COMMIT (2 min)

### Stage Files
```bash
cd catalyst/features/CAT-DESIGN-ADS-PARITY-20260628-001/
git add audits/ads-parity/screenshots/baseline/
git add audits/ads-parity/baseline-evidence.md
git add audits/ads-parity/visual-observations.md
git add audits/ads-parity/baseline-css-extraction*.json
git status
```

- [ ] All new files staged
- [ ] No unintended files staged

### Commit
```bash
git commit -m "feat(ads-parity): Phase 0 baseline capture — Jira + Catalyst screenshots, CSS extraction, observations"
```

- [ ] Commit message clear and concise
- [ ] Feature ID in commit (CAT-DESIGN-ADS-PARITY-20260628-001)
- [ ] Commit successful (git log shows new commit)

---

## PHASE 0 SIGN-OFF

### Evidence Quality Check
- [ ] All 12 screenshots captured and saved
- [ ] Screenshots show full page layout (not cropped or scrolled)
- [ ] CSS extraction includes > 15 key selectors per surface
- [ ] Dark mode screenshots clearly show whether surfaces are distinguishable
- [ ] No artifacts, overlays, or Dev Tools UI in screenshots

### Findings Documentation
- [ ] baseline-evidence.md lists all captured files
- [ ] Visual observations include Jira vs Catalyst comparisons
- [ ] Any dark mode issues documented explicitly
- [ ] Color deviations (hex values) noted if visible
- [ ] Spacing deviations (pixel differences) noted if observable

### Data Integrity
- [ ] JSON extraction files valid and complete
- [ ] No truncated or corrupted data
- [ ] File sizes reasonable (PNG ~100–300KB each, JSON ~20–50KB each)

### Git State
- [ ] Branch is clean after commit
- [ ] No untracked files remaining
- [ ] Commit appears in log
- [ ] All artifacts committed

### Phase 0 Ready for Next Phase
- [ ] baseline-evidence.md references CSS extraction for detailed metrics
- [ ] expected-findings-baseline.md reviewed (for context on what Phase 1 will find)
- [ ] Session log updated: `sessions/002_phase-0-execution.md` with timestamp and findings summary

---

## CRITICAL FINDINGS TO DOCUMENT

**If observed during capture, explicitly note in baseline-evidence.md:**

- [ ] Dark mode surfaces are all same color (flattening issue) — **CRITICAL**
- [ ] Icons hard to see in dark mode — **HIGH**
- [ ] Text contrast issues visible in dark mode — **HIGH**
- [ ] Hover states barely visible — **MEDIUM**
- [ ] Spacing noticeably different from Jira (visually off-grid) — **MEDIUM**
- [ ] Typography appears smaller/larger than Jira — **MEDIUM**
- [ ] Colors clearly different (saturation, brightness) — **LOW** (expected if not token-mapped)

---

## TIMELINE

| Task | Time | Status |
|------|------|--------|
| Pre-execution setup | 5 min | |
| Jira light mode (3 viewports + CSS) | 5 min | |
| Jira dark mode (3 viewports + CSS) | 5 min | |
| Catalyst light mode (3 viewports + CSS) | 5 min | |
| Catalyst dark mode (3 viewports + CSS) | 5 min | |
| Post-capture validation + markdown | 5 min | |
| Git commit | 2 min | |
| **TOTAL** | **32 min** | (includes 2 min buffer) |

---

## TROUBLESHOOTING

### Screenshots Blurry
**Problem:** DevTools screenshot tool is capturing at wrong zoom level  
**Solution:** Set pixel zoom to 100% (DevTools → ⋯ → zoom → 100%)

### CSS Extraction Script Errors
**Problem:** Selectors not finding elements (many "NOT_FOUND" results)  
**Solution:** Check page is fully loaded; wait 2 seconds before running script; adjust selectors for Catalyst-specific class names

### Dark Mode Toggle Not Working
**Problem:** Jira dark mode toggle not responding  
**Solution:** Check browser devtools → Application → Cookies → look for theme preference cookie; manually set if needed

### Viewport Size Wrong
**Problem:** Chrome resizing not working exactly  
**Solution:** Manual DevTools → ⋯ → More tools → Device mode → set exact dimensions

### JSON Parse Errors
**Problem:** Extracted JSON invalid  
**Solution:** Check for special characters; re-run script if partial data captured; may need manual cleanup

---

## WHAT NOT TO DO

- [ ] Do NOT include DevTools UI in screenshots (close inspector before capture)
- [ ] Do NOT capture while logged out (need authenticated view)
- [ ] Do NOT skip CSS extraction (required for Phase 3 and later)
- [ ] Do NOT use different viewport sizes than specified
- [ ] Do NOT capture at different times (theme settings may change)
- [ ] Do NOT skip dark mode (critical for identifying surface issues)
- [ ] Do NOT assume screenshots are self-documenting (write observations)

---

## NEXT PHASE PREP

After Phase 0 complete and committed:

1. **Phase 1** begins: Canonical Component Discovery (parallel or sequential)
2. Review `expected-findings-baseline.md` to understand what Phase 1 will uncover
3. Prepare for Phase 2: ADS Compliance Checklist (uses baseline as reference)
4. Schedule Phases 3–4: Screenshot diff analysis and fix strategy

---

## APPROVAL SIGN-OFF

Phase 0 execution approved and ready to begin: ✓ YES / ☐ NO

**Executed by:** ___________________  
**Date:** ___________________  
**Comments:** ___________________

**Phase 0 COMPLETE:** baseline-evidence.md published, CSS extraction saved, git committed ✓

---

**Last Updated:** 2026-06-28  
**Timebox:** 30 minutes  
**Status:** EXECUTION READY
