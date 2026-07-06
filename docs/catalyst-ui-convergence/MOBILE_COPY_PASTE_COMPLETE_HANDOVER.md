# MOBILE-READY COMPLETE HANDOVER — COPY-PASTE EVERYTHING BELOW

**For use on mobile or any device. Paste the ENTIRE script section into your Claude Code session.**

---

## 📋 CONTEXT SUMMARY

- **Feature ID:** CAT-CONVERGENCE-UI-FIX-20260703-001
- **Scope:** UI convergence across Release Hub, Test Hub, Incident Hub, Defects
- **Total gaps:** 312 (P0=21 critical, P1=118 important, P2=173 polish)
- **Discovery:** Complete (10-agent evidence model, no implementation yet)
- **Status:** Awaiting Vikram approval on 5 blocking decisions
- **Token budget:** ~2-3M for execution phase (Opus + RTK + caveman mode)

---

## ✅ PRE-BUILT FOLDER STRUCTURE

Feature folder already created at: `~/catalyst/features/CAT-CONVERGENCE-UI-FIX-20260703-001/`

Contents:
```
CAT-CONVERGENCE-UI-FIX-20260703-001/
  sessions/           (session logs will be written here)
  evidence/           (screenshot/test evidence will go here)
```

Discovery docs location: `docs/catalyst-ui-convergence/` (10 agent reports + summaries already on disk)

---

## 🚀 COMPLETE COPY-PASTE SCRIPT FOR NEXT SESSION

**Copy everything from `===START===` to `===END===` and paste into your Claude Code mobile session. It will activate everything automatically.**

```
===START===

# CATALYST UI CONVERGENCE FIX — MOBILE SESSION STARTUP
# Copy-paste this entire block into Claude Code

echo "=== STARTUP CHECK ===" && pwd && git branch --show-current && git status --short && echo "OK"

# STEP 1: Activate token-management skills
/caveman full
rtk gain

# STEP 2: Verify discovery docs exist
ls -lh docs/catalyst-ui-convergence/ | head -10 && echo "Discovery docs: OK"

# STEP 3: Verify feature folder exists
ls -lh ~/catalyst/features/CAT-CONVERGENCE-UI-FIX-20260703-001/ && echo "Feature folder: OK"

# STEP 4: Read the decision log (critical — needs Vikram approval)
echo "=== DECISION LOG (needs approval before agents launch) ==="
cat << 'DECISIONS'

BLOCKING DECISIONS (DL-1 through DL-5 must be approved):

DL-1: Incident data model
  Current: incidents table (new incident creation) vs ph_issues table (reads)
  Decision: converge incidents readers → ph_issues (eliminates NewIncidentModal fork)
  Blocking: YES — data consistency

DL-2: Legacy /release/incidents/* stack (10 routed surfaces)
  Current: Full duplicate incident UI (INC-## keys, own sidebar/tabs)
  Decision: DELETE entirely + nav rewire (OperationsSidebar + 2 ItemsDropdowns → /incident-hub)
  Blocking: YES — removes 10 routes, frees nav complexity

DL-4: Test-case detail unification
  Current: CaseDrawer (MyWork/Board fork) vs CatalystDetailRouter (Repository canon)
  Decision: Unify on CatalystDetailRouter, remove CaseDrawer
  Blocking: YES — MyWork/Board detail click is fully dead

DL-5: Wire /testhub/defects/:key detail
  Current: Defect row click is inert (onOpenItem: () => {})
  Decision: Add route + mount CatalystViewDefect at row click
  Blocking: YES — defect detail unreachable

DL-7: Systemic aria-modal=false un-dismissable panel
  Current: CatalystViewBase detail panels have role=dialog aria-modal=false (no Escape close, no scroll-lock)
  Decision: Retrofit with aria-modal=true, Escape handler, scroll-lock
  Blocking: YES — keyboard-trap a11y defect

ONCE APPROVED ON ALL 5, proceed to feature activation below.

DECISIONS

# STEP 5: Show gap summary
echo "=== GAP SUMMARY (by hub) ==="
echo "Release Hub: 118 gaps (D grade) — top file: DefectDetailPage.tsx 130 hits"
echo "Test Hub: 58 gaps (C+ grade) — dead interactions + raw tables"
echo "Incident Hub: 74 gaps (B grade) — create fork + legacy stack + a11y"
echo "Defects: 17 gaps (C live / F dead)"
echo "Project Hub: 28 gaps (bare hex)"
echo "Cross-hub/a11y: 17 gaps (critical)"
echo "TOTAL: 312 gaps (P0=21, P1=118, P2=173)"

# STEP 6: Activate feature
echo "=== ACTIVATING FEATURE ===" 
continue feature CAT-CONVERGENCE-UI-FIX-20260703-001

# STEP 7: Read handover
echo "=== READING HANDOVER ==="
echo "Full execution plan (phased slices, agents, parallel strategy): docs/catalyst-ui-convergence/HANDOVER.md"
cat docs/catalyst-ui-convergence/HANDOVER.md | head -100

# STEP 8: Ready message
echo ""
echo "=========================================="
echo "MOBILE SESSION READY"
echo "=========================================="
echo ""
echo "NEXT STEPS:"
echo "1. Read full HANDOVER.md (execution plan + phased slices)"
echo "2. Get Vikram approval on DL-1/2/4/5/7 above"
echo "3. Approve Feature Work ID activation"
echo "4. Agents will launch automatically:"
echo "   - P0: 6 parallel agents (correctness + a11y, ~12hr)"
echo "   - P1: 8 sequential agents (delete + structure, ~16hr)"
echo "   - P2: 6 parallel agents (tokens, ~12hr)"
echo ""
echo "Total execution time: ~40hr (agent wall-clock, parallelized)"
echo "Total token budget: ~2-3M (RTK + caveman will optimize)"
echo ""
echo "Session log location: ~/catalyst/features/CAT-CONVERGENCE-UI-FIX-20260703-001/sessions/"
echo ""

===END===
```

---

## 📖 WHAT TO READ AFTER PASTE

**In order (mobile-friendly):**

1. **[docs/catalyst-ui-convergence/README.md](../../docs/catalyst-ui-convergence/README.md)** — 2 min read, folder nav
2. **[docs/catalyst-ui-convergence/HANDOVER.md](../../docs/catalyst-ui-convergence/HANDOVER.md)** — 10 min read, full plan
3. **[docs/catalyst-ui-convergence/00-DISCOVERY-CONSOLIDATED.md](../../docs/catalyst-ui-convergence/00-DISCOVERY-CONSOLIDATED.md)** — 5 min, scorecard + decision log
4. **Agent reports** (if needed): `docs/catalyst-ui-convergence/agents/` (10 files, skim by hub)

---

## 🎯 APPROVAL CHECKLIST (text to Vikram)

Before agents launch, get approval on these 5 decisions:

```
Can you approve these 5 blocking decisions for the UI convergence fix (CAT-CONVERGENCE-UI-FIX-20260703-001)?

DL-1: Converge incident data model — incidents table readers → ph_issues? [YES/NO]

DL-2: Delete legacy /release/incidents/* stack (10 routed surfaces)? [YES/NO]

DL-4: Unify test-case detail — CaseDrawer → CatalystDetailRouter? [YES/NO]

DL-5: Wire /testhub/defects/:key detail (currently inert row click)? [YES/NO]

DL-7: Fix systemic aria-modal=false un-dismissable panel (a11y keyboard trap)? [YES/NO]

Once approved, I'll activate the feature and launch parallel agents to execute the phased fixes.
```

---

## 🔧 EXECUTION PHASES (quick reference)

### Phase P0: Correctness + A11y (6 slices, ~12hr wall-clock)
Fixes critical bugs, a11y defects, broken interactions.

| Slice | What | Why | Risk |
|---|---|---|---|
| P0-S1 | Wire defect detail | currently inert | low |
| P0-S2 | Unify test-case detail | MyWork/Board detail is dead | low |
| P0-S3 | Fix aria-modal=false panels | keyboard trap a11y defect | med |
| P0-S4 | Fix testhub/board crash | stale query | low |
| P0-S5 | Unify incident creation | data-model split (DL-1) | med |
| P0-S6 | Retire legacy incidents | 10 routes + nav rewire (DL-2) | high |

**All 6 can run in PARALLEL** (no file conflicts).

### Phase P1: Dead code + Structural (8 slices, ~16hr wall-clock)
Deletion frees 7 of top-20 ADS files.

| Slice | What | Files | P1 impact |
|---|---|---|---|
| P1-S1 | Delete src/pages/releases/* | 12 files | -47 ADS hits |
| P1-S2 | Delete releases defects | 8 files | -63 ADS hits |
| P1-S3 | Raw tables → JiraTable | Cycles, Sets | +3 canonicals |
| P1-S4 | Pills → StatusLozenge | 6 pill types | +1 canonical |
| P1-S5 | Avatars → CatalystAvatar | ~20 files | +1 canonical |
| P1-S6 | Modals → @atlaskit/modal | unlabeled controls | +a11y |
| P1-S7 | ReleaseDetailPage consolidation | 2 detail pages | +canonical |
| P1-S8 | Dashboard canonicalization | CommandCenterPage | +canonical |

**P1-S1/S2 block each other (both touch src/pages/releases/). S3-S8 run after.**

### Phase P2: Token cleanup (6 slices, ~12hr wall-clock)
Dark-mode reactive, final polish.

| Slice | What | Impact |
|---|---|---|
| P2-S1 | Borders #E0E0E0 → --ds-border | 6 surfaces dark-reactive |
| P2-S2 | Subtle text #6B6E76 → --ds-text-subtle | Release Hub header |
| P2-S3 | Tailwind colors Release → --ds-* | 732 utils |
| P2-S4 | Tailwind colors Test → --ds-* | 34 utils |
| P2-S5 | Tailwind colors Incident → --ds-* | 76 utils |
| P2-S6 | Bare hex bases → --ds-* | Project Hub baseline |

**All 6 can run in PARALLEL** (token-only edits).

---

## 🛠️ RTK + CAVEMAN SETUP (for token efficiency)

Already activated by the copy-paste script above, but here's what they do:

**RTK (Rust Token Killer):**
```bash
rtk gain              # Show token savings analytics
rtk gain --history    # Command usage + savings
rtk proxy <cmd>       # Raw command (debugging)
```
Reduces CLI token spend 60-90% by compressing verbose Bash output.

**Caveman mode (full):**
- Drops articles (the/a/an), filler (just/really/basically), pleasantries
- Fragments OK (terse output)
- Keeps code/commits/security in normal English
- Reduces narrative overhead ~30-40% on token spend

Combined: expect 2-3M tokens for full execution (vs 4-5M without optimization).

---

## 📱 MOBILE-SPECIFIC TIPS

1. **Copy-paste large blocks:** paste the `===START=== ... ===END===` section as-is into your mobile Claude Code (it's one continuous script)
2. **Read on mobile:** all handover docs are markdown; use mobile browser or Claude's read feature
3. **No browser probing:** discovery already did all DOM/CSS/interaction probes live; execution is code-only (Read/Edit/Bash/Grep)
4. **Session logs:** written to `~/catalyst/features/CAT-CONVERGENCE-UI-FIX-20260703-001/sessions/` automatically; check them via Bash `ls -lh sessions/`
5. **Commitment cadence:** each agent commits independently; you can push anytime via `/deploy` or manually `git push`

---

## 🎓 QUICK VOCAB

| Term | Meaning |
|---|---|
| **P0** | Critical (blocks a11y, breaks UX, data-inconsistent) |
| **P1** | Important (gaps vs canonical, technical debt) |
| **P2** | Polish (token cleanup, dark-mode, consistency) |
| **Canonical** | Project Hub source-of-truth component (JiraTable, CatalystDetailRouter, StatusLozenge) |
| **Fork** | Destination hub hand-rolled alternative (NewIncidentModal vs CreateStoryModal) |
| **Dead** | Code/routes/interactions that are unreachable or no-op (defect row-click inert) |
| **ADS** | Atlassian Design System tokens + components (--ds-* colors, @atlaskit/* packages) |

---

## ❌ GOTCHAS TO AVOID

1. **Don't merge the delete slices** — P1-S1 (Delete src/pages/releases/*) and P1-S2 (Delete releases defects) modify overlapping dirs; run them sequentially, commit separately
2. **Don't forget ADS ratchet** — after P1-S1/S2, run `npm run lint:colors:gate --update` + `npm run audit:ads:gate --update` to downrace baselines
3. **Screenshot limitation** — all discovery evidence is Chrome MCP ID-only (host-FS unreachable); if PR needs images, re-capture live on localhost:8080
4. **Approval first** — don't spin agents until Vikram approves DL-1/2/4/5/7; blocking decisions unblock agent scope
5. **Feature folder** — all commits go to CAT-CONVERGENCE-UI-FIX-20260703-001, not a separate branch; work on main + feature folder

---

## 📞 SUPPORT

- **Full discovery:** `docs/catalyst-ui-convergence/agents/` (10 reports)
- **Decision log:** `docs/catalyst-ui-convergence/HANDOVER.md` (DL-1…DL-9)
- **Phased plan:** same HANDOVER.md (P0-S1…P2-S6 slices)
- **Discovery gate statement:** `docs/catalyst-ui-convergence/00-DISCOVERY-CONSOLIDATED.md` (closing block)
- **Repo rules:** `/Users/vikramindla/Documents/GitHub/catalyst-prod-45/CLAUDE.md` (baseline CLAUDE.md)

---

## 🎬 YOU'RE READY

Paste the `===START=== ... ===END===` block into your mobile Claude Code session. Approval on DL-1/2/4/5/7, then agents spin up automatically. ~40hr wall-clock (parallelized), ~2-3M tokens (RTK+caveman optimized), ~312 gaps fixed.

**Go.**
