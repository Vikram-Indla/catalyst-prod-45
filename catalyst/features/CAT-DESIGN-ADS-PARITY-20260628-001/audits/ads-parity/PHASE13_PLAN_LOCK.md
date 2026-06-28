# PLAN LOCK — Phase 13: Screenshot Validation

**Status:** APPROVED  
**Timebox:** 2 hours  
**Slice:** Phase 13 of 14 (OPTIONAL - Testing)  
**Prerequisite:** Phases 5-12 complete ✅  

---

## OBJECTIVE

Create and validate screenshot diff gates for light and dark mode. Ensure Catalyst visually matches Jira reference surfaces at multiple viewports. Establish automated screenshot validation to prevent visual regression.

**Done looks like:** Screenshot diff gates pass, light/dark mode parity validated, visual regression prevention in place.

---

## TASKS

1. **Capture reference screenshots** (40 min)
   - Jira: light mode at 1440×900, 1920×1080
   - Jira: dark mode at 1440×900, 1920×1080
   - Catalyst: light mode at 1440×900, 1920×1080
   - Catalyst: dark mode at 1440×900, 1920×1080

2. **Create visual regression test** (40 min)
   - Compare light mode screenshots
   - Compare dark mode screenshots
   - Flag any deviations > 2px or color mismatches

3. **Document findings** (20 min)
   - Screenshot diff report
   - Pass/fail criteria
   - Regressions found (if any)

4. **Validate** (20 min)
   - All gates passing
   - No visual regressions
   - Documentation complete

---

## VALIDATION CRITERIA

- ✅ Light mode parity with Jira (spacing ±2px, colors match tokens)
- ✅ Dark mode parity with Jira (hierarchy distinct, contrast passes)
- ✅ No visual regressions in light/dark toggle
- ✅ Multiple viewports validated
- ✅ Screenshot diff report complete

---

## APPROVAL

**Status:** ✅ APPROVED

After Phase 13 passes → Phase 14 (Regression Testing - final optional)
