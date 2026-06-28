# Baseline Evidence Capture Plan — CAT-DESIGN-ADS-PARITY-20260628-001

**Phase 0: Branch, Baseline, Evidence Capture**  
**Timebox:** 30 minutes  
**Status:** PLAN (ready for execution)

---

## OBJECTIVE

Capture visual and computed CSS baseline evidence from:
1. **Jira reference surface** (source of truth)
2. **Catalyst equivalent surface** (current state)

This baseline will serve as the reference point for all subsequent audit phases (1–4) and implementation phases (5–10).

---

## WHAT WE WILL CAPTURE

### 1. SCREENSHOT EVIDENCE

**Per Surface (Jira + Catalyst):**

#### Light Mode Captures
- **LM-1440x900:** Jira for-you page at 1440x900 viewport, light mode
  - Captures: top nav, left rail, page header, issue list, sidebar
  - Focus: color, spacing, typography, component density
  
- **LM-1600x900:** Jira for-you page at 1600x900 viewport, light mode
  - Captures: wider nav behavior, rail overflow, list density
  
- **LM-1920x1080:** Jira for-you page at 1920x1080 viewport, light mode
  - Captures: wide layout behavior, sidebar expansion, content width

#### Dark Mode Captures (if available)
- **DM-1440x900:** Jira for-you page at 1440x900 viewport, dark mode
  - Captures: dark surface separation, icon visibility, contrast
  
- **DM-1600x900:** Jira for-you page at 1600x900 viewport, dark mode
  
- **DM-1920x1080:** Jira for-you page at 1920x1080 viewport, dark mode

#### Same captures for Catalyst equivalent
- Catalyst app running at `localhost:3000` (or configured dev server)
- Same viewport sizes
- Same theme states (light + dark if available)

**Total screenshots:** 12 (6 viewports × 2 themes) × 2 surfaces = 12 images

**Save location:**
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

---

## COMPUTED CSS EXTRACTION

For each screenshot, extract computed CSS values via browser DevTools or Playwright:

### Categories to Extract

#### 1. Page/Body Level
- `background-color` (computed)
- `color` (primary text)
- `font-family`
- `font-size` (body baseline)
- `line-height`

#### 2. Navigation Bar
- Height (pixels)
- `background-color`
- Text color
- Border color (if present)
- Box shadow (if present)
- Padding/margin

#### 3. Left Rail / Sidebar
- Width (pixels)
- `background-color`
- Text color
- Item padding/spacing
- Hover state background
- Active/selected state background
- Border color (if present)

#### 4. Page Content / Main Area
- `background-color`
- Padding/margin
- Content max-width (if constrained)

#### 5. Issue/List Item Row
- Min height
- `background-color` (default)
- Hover state `background-color`
- Selected state `background-color`
- Text color
- Secondary text color
- Border color (if present)
- Padding
- Gap between elements

#### 6. Typography in Context
- Primary heading size/weight/color
- Secondary heading size/weight/color
- Body text size/weight/color
- Label text size/weight/color
- Subtle text color

#### 7. Interactive Elements
- Button `background-color`, `color`, border
- Button hover state
- Button active/pressed state
- Link color (default + visited if visible)
- Input field `background-color`, border color, placeholder color
- Input focus state border color

#### 8. Status/Badge/Lozenge
- `background-color`
- Text color
- Border radius
- Padding
- Font size/weight

#### 9. Icons
- Color (if colorized)
- Size (check if svg `width`/`height` or CSS transform)
- Opacity (if reduced)

#### 10. Spacing & Elevation
- Common margin/padding patterns (e.g., between list items)
- Box shadow values (color, blur, offset)
- Border widths
- Border radius patterns

### Extraction Method

**Playwright-based extraction:**
```typescript
// Extract computed style for a selector
const computedStyle = await page.evaluate((selector) => {
  const el = document.querySelector(selector);
  if (!el) return null;
  const style = window.getComputedStyle(el);
  return {
    backgroundColor: style.backgroundColor,
    color: style.color,
    fontSize: style.fontSize,
    fontWeight: style.fontWeight,
    padding: style.padding,
    margin: style.margin,
    borderColor: style.borderColor,
    borderWidth: style.borderWidth,
    boxShadow: style.boxShadow,
    height: style.height,
    width: style.width,
    lineHeight: style.lineHeight,
    letterSpacing: style.letterSpacing,
  };
}, selector);
```

**Save as JSON:**
```json
{
  "viewport": "1440x900",
  "theme": "light",
  "surface": "jira",
  "captures": [
    {
      "selector": "body",
      "displayName": "Page Background",
      "computed": {
        "backgroundColor": "rgb(255, 255, 255)",
        "color": "rgb(23, 43, 77)"
      }
    },
    {
      "selector": "nav[aria-label='Primary']",
      "displayName": "Top Navigation",
      "computed": {
        "backgroundColor": "rgb(255, 255, 255)",
        "height": "56px",
        "boxShadow": "0 1px 0 rgb(9, 30, 66, 0.13)"
      }
    }
  ]
}
```

---

## EXPECTED CSS DIFFERENCES (HYPOTHESIS)

Based on the audit objectives, we expect to find:

### Light Mode Deviations
1. **Surface Hierarchy:**
   - Jira: `var(--ds-surface)`, `var(--ds-surface-raised)`, `var(--ds-surface-sunken)` clearly distinct
   - Catalyst: May use same background for page + components (muddy surfaces)

2. **Typography:**
   - Jira: Consistent font sizes (12, 14, 16, 20, 24px) with clear weight hierarchy
   - Catalyst: Possible overrides or incorrect size inheritance

3. **Spacing:**
   - Jira: 8px grid (8, 12, 16, 20, 24, 32px padding/margin)
   - Catalyst: May have arbitrary pixel values (e.g., 10px, 15px, 18px)

4. **Border Colors:**
   - Jira: `var(--ds-border)` (subtle), `var(--ds-border-bold)` (prominent)
   - Catalyst: May use hardcoded grays (#ccc, #ddd, #999)

5. **Text Colors:**
   - Jira: `var(--ds-text)`, `var(--ds-text-subtle)`, `var(--ds-text-subtlest)`
   - Catalyst: May use hardcoded colors or inconsistent opacity

### Dark Mode Deviations
1. **Surface Flattening:**
   - Jira: Dark surfaces use increased saturation and strategic highlights
   - Catalyst: May lack visual separation between nav/page/cards (all look same dark gray)

2. **Icon Visibility:**
   - Jira: Icons remain high contrast in dark mode
   - Catalyst: Icons may appear muted or nearly invisible (low opacity)

3. **Contrast Issues:**
   - Jira: Meets WCAG AA minimum 4.5:1 for text
   - Catalyst: May have secondary text failing contrast (below 3:1)

4. **Component States:**
   - Jira: Hover/active states clearly visible in dark mode
   - Catalyst: May be too subtle or hard to distinguish

---

## OUTPUT ARTIFACTS

### 1. baseline-evidence.md (this document + manifest)
**Location:** `audits/ads-parity/baseline-evidence.md`

**Contents:**
- Screenshot manifest (all files captured, viewport sizes, themes)
- Visual observations from each screenshot (note deviations visible)
- CSS extraction summary (key values extracted)
- Dark mode specific notes
- Viewport-specific notes (responsive behavior)
- Jira vs Catalyst direct comparisons
- Preliminary findings list

**Example outline:**
```markdown
# Baseline Evidence — CAT-DESIGN-ADS-PARITY-20260628-001

## Screenshot Manifest

| Surface | Theme | Viewport | File | Status |
|---------|-------|----------|------|--------|
| Jira | Light | 1440x900 | jira/light/LM-1440x900.png | Captured |
| Jira | Light | 1600x900 | jira/light/LM-1600x900.png | Captured |
| ... | ... | ... | ... | ... |

## Jira Reference Observations

### Light Mode (1440x900)
- Top nav: white background, 56px height, subtle shadow
- Left rail: white, ~240px width, icons + labels
- Issue rows: 48px height, light gray hover (#F7F8F9)
- Text: primary #172B4D, secondary #626F86, subtle #738496

### Dark Mode (1440x900)
- Top nav: dark gray (#161B22), 56px height
- Left rail: slightly lighter than nav (#1C1E26)
- Issue rows: #22272E hover state
- Text: primary #FFFFFF, secondary #B6C4D0, subtle #738496

## Catalyst Observations

### Light Mode (1440x900)
- Top nav: white, 56px ✓
- Left rail: white, appears ~240px ✓
- Issue rows: lighter gray on hover (#F5F5F5) — deviates from Jira #F7F8F9
- Text: primary looks darker than Jira primary

### Dark Mode (1440x900)
- Top nav: dark but lighter than Jira (#1F1F1F vs Jira #161B22)
- Left rail: same color as nav background (surfaces not separated)
- Issue rows: hard to distinguish hover state
- Icons: appear slightly muted
```

### 2. baseline-css-extraction.json
**Location:** `audits/ads-parity/screenshots/baseline/baseline-css-extraction.json`

**Contents:**
```json
{
  "metadata": {
    "captureDate": "2026-06-28",
    "featureId": "CAT-DESIGN-ADS-PARITY-20260628-001",
    "surfaces": ["jira", "catalyst"],
    "themes": ["light", "dark"],
    "viewports": ["1440x900", "1600x900", "1920x1080"]
  },
  "extractions": [
    {
      "surface": "jira",
      "theme": "light",
      "viewport": "1440x900",
      "captures": [
        {
          "selector": "body",
          "displayName": "Page Background",
          "computed": { /* ... */ }
        }
      ]
    }
  ]
}
```

### 3. visual-observations.md
**Location:** `audits/ads-parity/visual-observations.md`

**Contents:**
- Detailed notes on what each screenshot shows
- Side-by-side comparison notes (Jira vs Catalyst)
- Deviations documented in pixels or color hex
- Accessibility observations (e.g., contrast issues)
- Theme-specific observations (light vs dark)

---

## CAPTURE METHODOLOGY

### Tool: Playwright (Preferred)
**Why:** Automated, repeatable, can extract CSS, no manual pixel-counting

**Script pseudocode:**
```typescript
import { chromium } from 'playwright';

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
});

// Jira light mode
const jiraPage = await context.newPage();
await jiraPage.goto('https://digital-transformation.atlassian.net/jira/for-you?tab=assigned');
await jiraPage.screenshot({ path: 'jira/light/LM-1440x900.png' });
const jiraLightCSS = await jiraPage.evaluate(() => {
  // Extract computed styles for key selectors
});

// Jira dark mode
await jiraPage.addInitScript(() => {
  localStorage.setItem('jira.user.preference.colorMode', 'dark');
});
await jiraPage.reload();
await jiraPage.screenshot({ path: 'jira/dark/DM-1440x900.png' });

// Same for Catalyst
const catalystPage = await context.newPage();
await catalystPage.goto('http://localhost:3000'); // or configured dev URL
// ... repeat capture process
```

### Tool: Manual (Fallback)
If Playwright not available:
1. Open Jira in Chrome at each viewport size (DevTools → responsive design mode)
2. Theme toggle to light/dark
3. Screenshot (F12 to open DevTools → hamburger → more tools → screenshot)
4. Save with naming convention: `<surface>-<theme>-<viewport>.png`
5. Use Chrome DevTools Inspector to manually extract computed styles for key selectors
6. Document in JSON manually

---

## VIEWPORT SIZING RATIONALE

| Viewport | Rationale |
|----------|-----------|
| 1440x900 | Typical laptop size; Catalyst dev server often shown at this |
| 1600x900 | Common 16:9 laptop size; tests sidebar/rail overflow behavior |
| 1920x1080 | Full HD desktop; tests wide layout handling and content wrapping |

All viewports use **900px height** to capture vertical scroll/content area without needing scrolling for typical page layout.

---

## CSS EXTRACTION SELECTORS (Key Elements to Capture)

**Page/Layout Level:**
- `body` — page background, primary text color
- `nav[aria-label*="Primary"]` or `.nav-top` — top navigation
- `.sidebar` or `nav[aria-label*="left"]` — left rail
- `main` or `.content` — main content area

**List/Row Level:**
- `.issue-row` or `[data-test-id*="issue"]` — issue list items
- Hover pseudo-state (requires Playwright to inspect)
- Active/selected state

**Typography:**
- `h1`, `h2`, `.title` — headings
- `p`, `.body-text` — body text
- `.label`, `.secondary` — secondary text
- `.subtle` — hint text

**Status/Badge:**
- `.status-pill` or `[data-component*="status"]`
- `.badge` or `.lozenge`

**Interactive:**
- `button.primary`, `button.secondary`
- `a[href]` — links
- `input[type="text"]` — form inputs

---

## VALIDATION CHECKLIST

Before concluding Phase 0, verify:

- [ ] All 12 screenshots captured (6 viewports × 2 themes × 2 surfaces)
- [ ] Screenshots saved in correct directory structure
- [ ] CSS extraction JSON includes > 20 key selectors per surface/theme
- [ ] baseline-evidence.md created with manifest + observations
- [ ] Dark mode captures clearly show surface separation issues (or lack thereof)
- [ ] No blurry screenshots (if manual captures, zoom 100%, no DevTools overlay)
- [ ] Viewport sizes exact (1440x900, not 1400x900)
- [ ] Screenshots taken at same time of day if possible (UI notifications may vary)
- [ ] All files committed to git

---

## EXPECTED FINDINGS SUMMARY

Based on historical audit patterns and the CLAUDE.md guardrails, we expect:

### Likely Findings

**Token Violations (High confidence):**
1. Dark mode surfaces use same gray (no visual hierarchy)
2. Some text uses hardcoded #172B4D instead of `var(--ds-text)`
3. Hover states use arbitrary colors (e.g., #F5F5F5) instead of ADS tokens
4. Some borders use hardcoded #CCCCCC instead of `var(--ds-border)`

**Light Mode Issues (Medium confidence):**
1. Page background clean (#FFFFFF) but nav/cards may lack depth
2. Typography generally correct but some headings may be 1-2px off from Jira
3. Spacing mostly on 8px grid but some components may use 10px or 12px gaps

**Dark Mode Issues (Very High confidence):**
1. Surfaces flatten into same color (all ~#1F1F1F or #22272E)
2. Icons in dark mode appear muted or reduced opacity
3. Text contrast may fail on secondary text (< 3:1 ratio)
4. Hover/active states barely visible

**Component-Level:**
1. Status pills may not use canonical `CatyStatusPill` or ADS `Badge`
2. Some lists may not use `JiraTable`
3. Tooltips may be custom-built instead of using `@atlaskit/tooltip`

---

## RISK MITIGATIONS

| Risk | Mitigation |
|------|-----------|
| Jira surface changes during capture | Use same time window; document Jira version in manifest |
| Playwright setup fails | Pre-test Playwright on dev machine; have manual fallback |
| Catalyst dark mode not implemented | Document as out-of-scope; focus light mode baseline |
| Screenshot resolution varies | Force DevTools pixel zoom to 100% |
| CSS extraction incomplete | Include visual notes as fallback; tag selectors as "requires-validation" |
| Viewport sizes get confused | Use `page.setViewportSize()` explicitly; verify in screenshot |

---

## NEXT PHASE HANDOFF

Upon completion of Phase 0:
1. **Phase 1 — Canonical Component Discovery** begins parallel with Phase 0 findings
2. **Phase 2 — ADS Compliance Checklist** uses baseline screenshots as reference
3. **Phase 3 — Screenshot Diff** compares detailed measurements from CSS extraction
4. **Phase 4 — Fix Strategy** prioritizes issues found in baseline

**Dependency:** Phase 1, 2, 3 all depend on Phase 0 baseline being complete and accurate.

---

## APPROVAL CHECKLIST

- [ ] This plan reviewed and approved
- [ ] Playwright or manual capture method confirmed
- [ ] Dev environment ready (Catalyst running, Jira accessible)
- [ ] Directory structure created: `audits/ads-parity/screenshots/baseline/`
- [ ] Capture execution begins (30 min timebox starts)

---

**Plan Status:** READY FOR EXECUTION  
**Last Updated:** 2026-06-28  
**Next Milestone:** Phase 0 complete → baseline-evidence.md published
