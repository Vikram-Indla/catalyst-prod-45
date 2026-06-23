---
title: Catalyst Mockup-First Workflow Contract
version: 1.0.0
date: 2026-06-24
author: Vikram × Claude Code Automation
category: process
applies_to: [/start, /design-critique, /jira-compare, /systematic-debugging]
---

# Catalyst Mockup-First Visual Delivery Contract

**This file is the permanent source of truth for mockup-first workflow across all Catalyst Claude Code commands.**

All commands and skills listed above MUST enforce these rules in every conversation. Do not duplicate rule variants across commands — reference this contract instead.

---

## 🎯 Core Mandate

Every Catalyst feature, fix, redesign, critique, Jira comparison, UI audit, or implementation conversation MUST start with a mockup-first workflow.

**Mockup = Interactive React/TSX component inside the dev app at a real route, not a static image or diagram.**

---

## 📋 Before Implementation (Mandatory)

### 1. Create an interactive mockup
- **Route pattern (preferred):** `/mockups/<feature-or-page-slug>` or `/<module>/<feature>/mockup` if more natural
- **Format:** React/TSX component using real Catalyst UI shell, layout, spacing, surfaces, navigation, and canonical components
- **Sample data:** Use realistic transactional UI and test data when production/Jira data is unavailable
- **Interactivity required:** CTAs, hover states, empty states, loading states, modal states, row actions, filters, tabs, menus, drawers, and micro-interactions relevant to the feature
- **No dead buttons:** Every CTA must either work or be explicitly marked as intentionally inactive
- **Status file:** Create/update `.catalyst/mockups/<feature-slug>.json` to track status

### 2. Show the mockup route to the user
- Mention the route clearly: `Mockup route: /mockups/feature-name`
- Provide browser/Chrome MCP evidence that the mockup is rendered
- Do NOT provide SVG arrows, abstract diagrams, or static images as the primary evidence

### 3. Get approval before implementation
- User must approve the mockup state
- Approval statements: "looks good", "approved", "proceed", or similar explicit confirmation
- No approval = no implementation
- Exception: User explicitly says "skip mockup approval and implement" OR task has no UI impact

---

## 🔄 Every Iteration (Mandatory)

### 1. Reflect changes in the mockup FIRST
- Any requested change must update the same mockup route
- Do not jump directly to production code
- Mockup stays the single visual source of truth

### 2. Show the updated mockup
- Re-link the mockup route after every change
- Provide browser/Chrome MCP screenshot or navigation evidence
- Do NOT provide SVG arrows or annotation overlays as evidence

### 3. Approval lock
- Once user approves the mockup, treat it as immutable visual truth
- Implementation must stay extremely close to the approved mockup
- No visual drift is allowed during React implementation unless user approves the change
- If implementation requires visual deviation, STOP and ask for approval

### 4. Reuse approved mockup — DO NOT REGENERATE (CRITICAL)
**Once mockup is approved in conversation, MAINTAIN AND UPDATE the same route until conversation ends.**
- Do NOT create a new mockup route
- Do NOT rebuild the mockup from scratch
- Only MODIFY the approved mockup route to reflect requested changes
- Keep all future changes in the same mockup file until user says "done" or conversation ends
- This applies across arbitrarily long conversations — one mockup route per feature per conversation
- When conversation continues in next session, query the mockup status file (`.catalyst/mockups/<feature-slug>.json`) to restore the approved state and continue with same route

**Why:** Regenerating mockups fragments context, loses approval continuity, and wastes session budget. The approved route IS the source of truth until the user explicitly stops or changes their mind.

### 5. Capture approved state
- Record the approved mockup route and file paths
- Save in handoff if conversation context reaches 80%

---

## 🖼️ Visual Evidence Rules

### Allowed evidence:
- ✅ Real mockup route at `/mockups/<feature-slug>`
- ✅ Real browser-rendered page screenshot from Chrome MCP / Computer Use
- ✅ Real implemented production route
- ✅ Short business-readable summary of visible change

### NOT allowed:
- ❌ SVG arrows, diagram arrows, annotation overlays
- ❌ Abstract UI diagrams
- ❌ Pixel-difference tables as the main evidence
- ❌ "Imagine this changed" explanations without a live mockup
- ❌ Static visual comparison boards

**If user asks for arrows or visual explanation:** Update the mockup instead, show the route, and describe the visible change in business language.

---

## 💻 Mockup Implementation Rules

### Source format (preferred)
- React/TSX component inside the Catalyst app
- Using existing Catalyst shell, routes, layout, canonical components, and tokens
- File path example: `src/pages/mockups/BranchPolicyMockup.tsx`

### Static HTML (allowed only when)
- Repo structure makes React mockup impractical, OR
- User explicitly asks for HTML, OR
- Task is a very early visual spike
- **Warning:** Clearly state HTML is not final build source
- **Conversion:** Must convert to React/TSX before production implementation
- **Drift prevention:** Do not allow divergence between HTML mockup and React implementation

### Canonical component reuse
When implementing the approved mockup:
1. **Search existing Catalyst canonical components first** — JiraTable, CatalystSidebarDetails, StatusPill, etc.
2. **Search existing Atlassian/Atlaskit-aligned components** already installed or wrapped in Catalyst
3. **Search existing token usage** — colors, spacing, typography, radius, elevation, borders
4. **Replace hand-rolled items** if canonical equivalent exists
5. **Document unavoidable hand-rolled items** with reason and replacement plan

### Hand-rolled UI blocking (MANDATORY)
Before using any hand-rolled UI component (buttons, tables, modals, pills, cards, forms, dropdowns, colors, fonts, shadows, spacing systems), STOP and verify:
- No canonical Catalyst component exists for this, AND
- No Atlassian/Atlaskit component exists, AND
- No existing token covers this

If a canonical option exists, use it. If unavoidable, document in the final audit.

---

## 📊 Mockup Status Tracking

Create/update per-feature status file:

**File:** `.catalyst/mockups/<feature-slug>.json`

**Required fields:**
```json
{
  "feature_slug": "string",
  "mockup_route": "/mockups/...",
  "mockup_files": ["path/to/file.tsx"],
  "production_route": "/module/feature",
  "status": "draft|updated|approved|implemented|handoff_ready",
  "approved_by_user": false,
  "approved_at": "ISO-8601 or null",
  "canonical_components_used": ["CatalystTable", "StatusPill"],
  "canonical_tokens_used": ["--ds-text", "--ds-background-neutral"],
  "hand_rolled_items": [],
  "warnings": [],
  "latest_screenshot_or_browser_evidence": "optional",
  "handoff_file": ".catalyst/handoffs/feature-slug-handoff-YYYY-MM-DD.md",
  "last_updated": "ISO-8601"
}
```

**Update status file:**
- Every time the mockup changes
- When user approves (set `approved_by_user: true`, `approved_at: NOW`, `status: approved`)
- Before handoff (set `status: handoff_ready`, add `handoff_file` path)

**Implementation gate:**
- Do NOT proceed unless `approved_by_user: true` OR user explicitly skips approval OR task has no UI impact

---

## ✅ End-of-Step Canonical Audit

After every mockup update and every implementation section, output ONLY this format (no code, no long logs, no pixel tables unless asked):

### Mockup / Page
- **Route:** /mockups/feature-name (or production route)
- **Status:** Draft / Updated / Approved / Implemented

### What changed
- Bullet 1 in plain English
- Bullet 2
- Bullet 3 (max 6 bullets)

### Canonical components reused
- Component name — where used
- Component name — where used

### Canonical tokens reused
- **Typography:** var(--ds-...), specific weights/sizes
- **Colors:** var(--ds-...) or Atlassian hex
- **Spacing / radius / elevation:** grid values (4/8/16/24/32px)

### Hand-rolled items
- None
  OR
- Item name — reason unavoidable — replacement plan

### Warnings
- None
  OR
- ⚠️ Warning message (e.g., "non-canonical component", "raw color", "hand-rolled table", "browser evidence not available")

**Do not include implementation details unless user asks.**

---

## 🚪 Implementation Rules

Implementation can begin ONLY after one of these is true:
1. User explicitly approves the mockup
2. User explicitly says to skip mockup approval and implement
3. Task is purely backend, data, or configuration with no UI impact

When implementing from approved mockup:
- Reuse existing Catalyst canonical components first
- Prefer Atlassian/Atlaskit-aligned components
- Prefer Atlassian Sans / Catalyst typography tokens
- Prefer existing design tokens for color, spacing, radius, elevation, border, typography
- Do NOT hand-roll tables, pills, buttons, tabs, cards, modals, menus, drawers, forms, empty states if canonical component exists
- Do NOT introduce raw colors, custom fonts, one-off shadows, custom spacing systems, or new UI primitives without justification
- Document why if hand-rolled component is unavoidable

---

## 📤 Handoff Rules

Create handoff file whenever:
- User asks for handoff
- Conversation about to switch to another Claude Code chat
- Context health reaches or estimated to reach 80%
- Implementation partially complete
- Mockup approved but implementation incomplete
- Session is getting long enough that design drift is likely

**Handoff file location:** `.catalyst/handoffs/<feature-slug>-handoff-YYYY-MM-DD-HHMM.md`

**Handoff file MUST include:**
- Current goal
- Approved mockup route
- Mockup files (file paths)
- Mockup status file (`.catalyst/mockups/<feature-slug>.json`)
- Production route (if implemented)
- Approved visual decisions (one-liner)
- Canonical components used
- Canonical tokens used
- Hand-rolled items and warnings
- Browser/screenshot evidence status
- Pending work
- Exact next Claude Code instruction block (copy-paste ready)
- What not to change / what's locked
- Context health note

**In chat response, show only:**
```
Handoff ready:
* File: .catalyst/handoffs/...md
* Mockup route: /mockups/...
* Mockup status: {approved|implemented}
* Production route: /module/feature (if any)
* Next action: [one line]
```

Then provide short copy-paste block for next conversation.

---

## ⚠️ Context Health Gate

Continuously monitor context health.

When context health reaches **80%** (or session is clearly becoming long/risky):
- Stop expanding the implementation
- Generate/update the handoff file
- Preserve current mockup route
- Preserve mockup status file
- Preserve latest approved/working state
- Tell user immediately in short business language
- Provide ONLY: handoff file path, mockup route, production route, next prompt block

**Do NOT continue heavy implementation past 80% context threshold without handoff.**

---

## 🎭 Command-Specific Patch Rules

### `/start`
1. Discover existing Catalyst patterns, routes, components, tokens, prior implementation
2. Read this contract file
3. Create React/TSX mockup route FIRST (wherever possible)
4. Create/update `.catalyst/mockups/<feature-slug>.json`
5. Open mockup route in browser/Chrome MCP (if available)
6. Show mockup route before implementation
7. Keep all future changes reflected in same mockup
8. Ask for approval before production implementation (unless user explicitly skips)
9. End with canonical component audit

### `/design-critique`
1. Use actual page or screenshot as input
2. Read this contract file
3. Produce Catalyst mockup route showing corrected target state
4. Use React/TSX mockup (where possible)
5. Update `.catalyst/mockups/<feature-slug>.json`
6. Open mockup route in browser/Chrome MCP (if available)
7. Avoid abstract tables and SVG arrows as main evidence
8. Explain critique in business language
9. End with canonical reuse, hand-rolled items, warnings

### `/jira-compare`
1. Collect real UI evidence through browser/MCP or supplied screenshots FIRST
2. Read this contract file
3. Create Catalyst mockup route showing corrected Jira-aligned version
4. Use React/TSX mockup (where possible)
5. Update `.catalyst/mockups/<feature-slug>.json`
6. Open mockup route in browser/Chrome MCP (if available)
7. Map each visible correction to Catalyst canonical components
8. Highlight deviation from Atlassian/Atlaskit/Catalyst canonical behavior
9. Do NOT produce SVG arrow evidence
10. End with canonical component audit

### `/systematic-debugging`
1. Stabilize the failure report
2. Reproduce the bug
3. Read this contract file (especially hand-rolled UI blocking)
4. If bug is UI-related: create a mockup of the CORRECT state
5. Isolate root cause
6. Fix the code
7. Verify fix in browser/Chrome MCP
8. For UI fixes: show mockup of corrected state + screenshots proving the fix
9. Add regression protection
10. Save lesson to CLAUDE.md if durable

---

## 🚫 Enforcement Summary

Every Catalyst Claude Code command MUST enforce:
1. ✅ Mockup-first visual contract
2. ✅ React/TSX mockup preferred as build source
3. ✅ Mockup status tracking in `.catalyst/mockups/<feature-slug>.json`
4. ✅ Same mockup maintained throughout conversation
5. ✅ Approval lock before implementation
6. ✅ Browser/screenshot evidence from mockup route
7. ✅ Canonical component-first implementation
8. ✅ Hand-rolled UI blocking rule
9. ✅ Business-readable output only (one-liners + widget at end of steps)
10. ✅ End-of-step canonical component audit
11. ✅ Automatic handoff at 80% context health
12. ✅ No SVG arrow evidence
13. ✅ No visual drift from approved mockup
14. ✅ Handoff includes mockup route, mockup status file, handoff file path

**Severity:** P0 — non-negotiable. No exceptions.

