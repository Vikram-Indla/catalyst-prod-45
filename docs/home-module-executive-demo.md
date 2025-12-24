# JOB-008: Home ("For You") Module — Executive Demo & Validation Package

**Version:** 1.0  
**Date:** December 24, 2024  
**Classification:** Executive Leadership Review  
**Duration:** 5–7 minutes

---

## Executive Summary

The Home ("For You") module is the enterprise command center for Catalyst. It provides unified, domain-driven visibility across three operational contexts:

| Mode | Audience | Core Value |
|------|----------|------------|
| **Operations** | Ops Leads, Incident Managers | Real-time incident visibility, SLA governance |
| **Delivery** | Tech Leads, Developers | Execution accountability, workload clarity |
| **Planner** | PMO Leads, Work Managers | Planning decisions, governance without friction |

**Strategic Outcome:** Reduce decision latency from hours to seconds through trusted, role-aware data surfaces.

---

## PART 1 — EXECUTIVE DEMO NARRATIVE (5–7 MIN)

### The Story: One Platform, Three Perspectives

**Setting:** Monday morning, 8:30 AM. A critical production incident occurred overnight while a major program increment deadline approaches.

---

### Scene 1: The Ops Lead (Operations Mode) — 2 minutes

**Persona:** Sarah, Operations Lead  
**Challenge:** "What's on fire, and what needs my attention right now?"

Sarah opens Catalyst Home and immediately sees the **Critical Strip**:

```
┌─────────────────────────────────────────────────────────────────┐
│  🔺 Major Incidents: 3   │  ⏱ SLA at Risk: 5  │  🔔 Awaiting me: 2  │
│     2 breached · 1 at risk                                       │
└─────────────────────────────────────────────────────────────────┘
```

**What Sarah experiences:**
1. **Immediate triage** — Red "breached" indicator draws attention to the 2 incidents requiring escalation
2. **One click filters** — Clicking "Major Incidents" filters the grid to only critical items
3. **SLA countdown visibility** — Clock icon with gold "at risk" shows which incidents will breach today
4. **Personal accountability** — "Awaiting me" shows 2 incidents blocked on Sarah's approval

**Trust Signal:** Numbers in the Critical Strip match the filtered grid count exactly. No discrepancy.

**Decision Made:** Sarah identifies INC-4521 (breached, P1) as the priority and clicks to view details.

---

### Scene 2: The Delivery Lead (Delivery Mode) — 2 minutes

**Persona:** James, Delivery Lead  
**Challenge:** "What's my team's execution status? What's blocking us?"

James switches to **Delivery mode** using the mode selector:

```
┌──────────────────────────────────────────────────┐
│  [ Operations ]  [ Delivery ●]  [ Planner ]      │
└──────────────────────────────────────────────────┘
```

The view transforms completely:

**Tabs appear:**
```
┌────────────────────────────────────────┐
│  Worked on (30)  │  Assigned (12)  │  Starred (5)  │
└────────────────────────────────────────┘
```

**What James experiences:**
1. **Activity-based organization** — "Worked on" shows recent touches, grouped by Today/Yesterday/This Week
2. **Personal workload** — "Assigned" shows his 12 open items with priority indicators
3. **Starred items** — Quick access to his pinned priority work
4. **Blocked visibility** — Critical Strip shows "Blocked: 3" — clicking filters to only blocked items

**Trust Signal:** Starring a feature (FEAT-202) and refreshing the page shows it in "Starred" tab.

**Decision Made:** James identifies STORY-445 as blocked by STORY-444 and navigates to resolve the dependency.

---

### Scene 3: The Planner (Planner Mode) — 2 minutes

**Persona:** Maha, PMO Lead  
**Challenge:** "What decisions are pending? What's coming next sprint?"

Maha switches to **Planner mode**:

**Tabs transform:**
```
┌────────────────────────────────────────────────┐
│  Planned (24)  │  Upcoming (18)  │  Pending review (7)  │
└────────────────────────────────────────────────┘
```

**What Maha experiences:**
1. **Decision queue** — "Pending review" shows 7 items requiring her approval
2. **Pipeline visibility** — "Upcoming" shows next sprint's committed work
3. **Long-range planning** — "Planned" shows the full backlog
4. **Governance without friction** — One-click access to items, inline notes

**Trust Signal:** Clicking "Pending review" shows exactly 7 items. Count and list match.

**Decision Made:** Maha reviews REQ-789, adds a note, and the item moves to "Planned" status.

---

### Demo Conclusion: The Same Person, Three Perspectives

**Key Message:** Sarah, James, and Maha could be the same person at different times of day:
- Morning standup: Operations mode
- Afternoon coding: Delivery mode  
- End of week: Planner mode

**One Home, infinite clarity.**

---

## PART 2 — CLICK SCRIPT (EXACT STEPS)

### Pre-Demo Setup
- URL: `/home`
- Clear browser cache or use incognito
- Ensure test data exists in all three domains

---

| Step | Action | Expected Observation | KPI Change | Proves |
|------|--------|---------------------|------------|--------|
| **1** | Navigate to `/home` | Home loads in <2s. Default mode = Delivery | Page load time | Performance |
| **2** | Click **"Operations"** in mode selector | Mode switches instantly. URL updates to `?mode=operations`. Critical Strip shows Major Incidents, SLA at Risk | Mode = Operations | Mode isolation |
| **3** | Observe Critical Strip | "Major Incidents: X" with breach/at-risk sub-counts visible | Incident counts | Trust |
| **4** | Click **"Major Incidents"** chip | Grid filters to show only major incidents. Count in chip = count in grid | Filter applied | Data consistency |
| **5** | Click any incident row | Detail panel opens with incident summary, priority, SLA status | — | Navigation works |
| **6** | Click back or close detail | Return to filtered grid, filter preserved | — | State persistence |
| **7** | Click **"Delivery"** in mode selector | Mode switches. Tabs appear: Worked on, Assigned, Starred. Grid shows recent work items | Mode = Delivery | Mode isolation |
| **8** | Click **"Assigned"** tab | Grid shows only items assigned to current user. Tab count matches grid count | Assigned count | Trust |
| **9** | Star a feature (click star icon) | Star turns gold. Toast confirms "Starred" | Starred count +1 | Interactivity |
| **10** | Click **"Starred"** tab | Newly starred item appears in list | — | Real-time update |
| **11** | Click **"Planner"** in mode selector | Mode switches. Tabs: Planned, Upcoming, Pending review | Mode = Planner | Mode isolation |
| **12** | Click **"Pending review"** tab | Grid shows items awaiting review. Count matches | Review count | Trust |
| **13** | Click any pending item | Detail opens with review actions | — | Workflow support |
| **14** | **Refresh the browser** (F5) | Mode = Planner, Tab = Pending review preserved via URL | — | State persistence |
| **15** | Verify URL | URL shows `?mode=planner&tab=pending-review` | — | Deep linking |

---

## PART 3 — EXPECTED OUTCOMES

### OPERATIONS MODE

| KPI | Must Be Visible | "Good" Looks Like | 30-Second Action |
|-----|-----------------|-------------------|------------------|
| Major Incidents Open | ✓ Count in Critical Strip | 0-2 (green) / 3+ (gold) | Click to filter |
| Breached Count | ✓ Red sub-count | 0 = excellent | Escalate immediately |
| At Risk Count | ✓ Gold sub-count | <3 per day | Assign owners |
| SLA at Risk | ✓ Separate chip | 0 = on track | Triage by due time |
| Awaiting Me | ✓ Personal queue | <5 = manageable | Clear blockers |

**Trust Validation:**
- Critical Strip count = Grid count after filter
- No phantom items (items in count but not in list)

---

### DELIVERY MODE

| KPI | Must Be Visible | "Good" Looks Like | 30-Second Action |
|-----|-----------------|-------------------|------------------|
| Worked On Count | ✓ Tab count | Shows activity | Review recent |
| Assigned Count | ✓ Tab count | <15 = focused | Prioritize top 3 |
| Starred Count | ✓ Tab count | 3-7 priority items | Check starred first |
| Blocked Items | ✓ Critical Strip | 0 = flow state | Unblock or escalate |

**Trust Validation:**
- Starring an item immediately increments Starred count
- Assigned shows only current user's items

---

### PLANNER MODE

| KPI | Must Be Visible | "Good" Looks Like | 30-Second Action |
|-----|-----------------|-------------------|------------------|
| Planned Count | ✓ Tab count | Backlog size | Reprioritize |
| Upcoming Count | ✓ Tab count | Next sprint | Validate capacity |
| Pending Review | ✓ Tab count | <10 = healthy | Review and decide |
| Decision Required | ✓ In item detail | Clear indicator | Make decision |

**Trust Validation:**
- Pending review count = items actually pending
- Reviewing an item removes it from pending

---

## PART 4 — VALIDATION CHECKLIST (PASS/FAIL)

### Core Functionality

| # | Check | How to Verify | Status |
|---|-------|---------------|--------|
| 1 | Mode selector switches modes | Click each mode, observe URL and UI change | ☐ PASS ☐ FAIL |
| 2 | URL reflects current mode | Check `?mode=` parameter | ☐ PASS ☐ FAIL |
| 3 | Tab navigation works (Delivery/Planner) | Click each tab, observe count match | ☐ PASS ☐ FAIL |
| 4 | Critical Strip counts are accurate | Compare chip count vs. grid count | ☐ PASS ☐ FAIL |
| 5 | Filter chips work | Click chip, verify grid filters | ☐ PASS ☐ FAIL |
| 6 | Filter toggle works | Click same chip twice, filter clears | ☐ PASS ☐ FAIL |
| 7 | Search filters results | Type in search, verify filtered list | ☐ PASS ☐ FAIL |
| 8 | Sort options work | Change sort, verify order changes | ☐ PASS ☐ FAIL |

### Data Integrity

| # | Check | How to Verify | Status |
|---|-------|---------------|--------|
| 9 | Operations shows only incidents/releases | No delivery work items visible | ☐ PASS ☐ FAIL |
| 10 | Delivery shows only work items | No incidents visible | ☐ PASS ☐ FAIL |
| 11 | Planner shows only planned items | No execution items visible | ☐ PASS ☐ FAIL |
| 12 | Star persists after refresh | Star item, refresh, check Starred tab | ☐ PASS ☐ FAIL |
| 13 | Counts update in real-time | Create new item, verify count increments | ☐ PASS ☐ FAIL |

### State Persistence

| # | Check | How to Verify | Status |
|---|-------|---------------|--------|
| 14 | Mode preserved on refresh | Refresh page, verify same mode | ☐ PASS ☐ FAIL |
| 15 | Tab preserved on refresh | Refresh page, verify same tab | ☐ PASS ☐ FAIL |
| 16 | Filter preserved on refresh | Refresh page, verify filter active | ☐ PASS ☐ FAIL |
| 17 | Search preserved on refresh | Refresh page, verify search text | ☐ PASS ☐ FAIL |

### Performance

| # | Check | How to Verify | Status |
|---|-------|---------------|--------|
| 18 | Initial load < 2s | Use DevTools Network tab | ☐ PASS ☐ FAIL |
| 19 | Mode switch < 500ms | Use DevTools Performance tab | ☐ PASS ☐ FAIL |
| 20 | No layout shift on load | Observe visually | ☐ PASS ☐ FAIL |
| 21 | Pagination works smoothly | Click "Load more", no jank | ☐ PASS ☐ FAIL |

### Accessibility

| # | Check | How to Verify | Status |
|---|-------|---------------|--------|
| 22 | Keyboard navigation works | Tab through all interactive elements | ☐ PASS ☐ FAIL |
| 23 | Focus indicators visible | Verify focus ring on all buttons | ☐ PASS ☐ FAIL |
| 24 | Dark mode renders correctly | Toggle dark mode, no invisible text | ☐ PASS ☐ FAIL |

---

## PART 5 — TOP 5 RISKS + MITIGATION

### Risk 1: Count Mismatch (Critical)

**Symptom:** Critical Strip shows "Major Incidents: 5" but filtered grid shows 4 items.

**Root Cause:** Summary query and detail query use different filters or permissions.

**Mitigation:**
- Both queries must use identical WHERE clauses
- Add integration test: `assert(summaryCount === gridItems.length)`
- Add monitoring alert for mismatch > 0

**Detection:** Visual inspection + automated test

---

### Risk 2: Permission Leakage (Critical)

**Symptom:** User sees incidents from another department.

**Root Cause:** RLS policy not enforced on query path.

**Mitigation:**
- All queries go through `supabase.from()` with authenticated client
- RLS policies enforce `user_id = auth.uid()` or department match
- Security audit before release

**Detection:** Test with two users from different departments

---

### Risk 3: Performance Degradation Under Load (High)

**Symptom:** Home takes >5s to load during peak hours.

**Root Cause:** Missing indexes, N+1 queries, or large dataset.

**Mitigation:**
- Ensure all indexes from JOB-006 are deployed
- Use `home_user_summary` aggregation table
- Add caching layer for repeated queries
- Monitor p95 response time

**Detection:** Load test with 100 concurrent users

---

### Risk 4: Empty State Confusion (Medium)

**Symptom:** User sees blank screen with no explanation.

**Root Cause:** No items match current filter, but no empty state message shown.

**Mitigation:**
- `ModeAwareEmptyState` component renders contextual message
- Each mode/tab combination has specific empty text
- Include CTA: "Clear filters" or "Switch to X mode"

**Detection:** Test with new user who has no data

---

### Risk 5: Mode Context Leakage (Medium)

**Symptom:** Switching from Operations to Delivery briefly shows incident data.

**Root Cause:** React Query cache returning stale data during mode switch.

**Mitigation:**
- Reset visible count on mode change
- Use mode-specific query keys: `['home', 'operations', ...]`
- Show loading skeleton during transition

**Detection:** Rapid mode switching test

---

## PART 6 — RELEASE RECOMMENDATION

### Decision: **CONDITIONAL READY**

The Home module architecture is sound and feature-complete. Release is recommended with the following conditions:

---

### Conditions for Release

| # | Condition | Owner | Target Date |
|---|-----------|-------|-------------|
| 1 | All 24 validation checks PASS | QA Lead | Before release |
| 2 | Performance test confirms <2s p95 load time | Platform Team | Before release |
| 3 | Security audit confirms no permission leakage | Security Team | Before release |
| 4 | Feature flag `home_v2_enabled` defaults to `false` for initial rollout | DevOps | At release |

---

### Rollout Plan

1. **Week 1: Internal Only**
   - Enable for internal staff (home_v2_enabled = true for internal users)
   - Monitor error rates and performance
   - Collect feedback via feedback widget

2. **Week 2: Limited Rollout**
   - Enable for Ops leads and Power users (50 users)
   - Shadow mode for remaining users (queries run but not displayed)
   - Compare V1 vs V2 metrics

3. **Week 3: Full Rollout**
   - Enable for all users
   - Feature flag locked to `true`
   - V1 code path deprecated

---

### Next Actions (3 bullets)

1. **QA Lead:** Execute validation checklist against staging environment by EOD today
2. **DevOps:** Prepare feature flag configuration for phased rollout
3. **Product Owner:** Schedule 15-minute executive demo for Friday using this script

---

## Appendix: URL Reference

| Mode | Tab | URL |
|------|-----|-----|
| Operations | All | `/home?mode=operations` |
| Operations | Major filtered | `/home?mode=operations&filter=major-incidents` |
| Delivery | Worked on | `/home?mode=delivery` or `/home?mode=delivery&tab=worked-on` |
| Delivery | Assigned | `/home?mode=delivery&tab=assigned` |
| Delivery | Starred | `/home?mode=delivery&tab=starred` |
| Planner | Planned | `/home?mode=planner` or `/home?mode=planner&tab=planned` |
| Planner | Upcoming | `/home?mode=planner&tab=upcoming` |
| Planner | Pending review | `/home?mode=planner&tab=pending-review` |

---

**Document End**

*Prepared for Catalyst Platform — Ministry of Industry & Mineral Resources (MIM)*
