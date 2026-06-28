# Canonical Design System Contract — Documentation Suite

**Date:** 2026-06-29  
**Status:** Complete & Enforced  
**Owner:** Catalyst Design System Team

---

## What Is This?

A comprehensive, three-part developer specification that explains:
1. **What the canonical contract is** (the rules)
2. **How to enforce it** (gates, checks, validation)
3. **How to migrate from Tailwind** (step-by-step guides)
4. **How to resolve violations** (approval process, escape hatches)

This suite is designed for developers at all levels to understand and follow Catalyst's canonical design system rules.

---

## The Three Documents

### 1. **CANONICAL_DESIGN_SYSTEM_CONTRACT.md** ← Read This First (Full Spec)

**Purpose:** Complete, authoritative specification of the canonical contract.

**Contents:**
- Executive summary (enforcement, current state)
- The canonical contract (3 universal rules)
- Design system hierarchy (Catalyst → ADS → hand-rolled)
- What gets blocked (hard-coded colors, Tailwind, custom spacing, etc.)
- **Complete migration guide** for Tailwind components (6 steps)
- Component reuse checklist
- Full ADS token reference (colors, spacing, typography)
- 6 common migration scenarios with before/after code
- Validation & testing procedures
- Approval & override process (gap report template)

**When to use:**
- **New developers onboarding** → Read sections 1-3 to understand the contract
- **Planning a feature** → Read sections 2-5 to understand component rules
- **Migrating code** → Follow the step-by-step migration guide (section 5)
- **Writing gap report** → Use the template in section 10
- **Unsure about tokens** → Check ADS token reference (section 7)

**Read time:** 30 minutes (full), 10 minutes (sections 1-4)

---

### 2. **CANONICAL_QUICK_REFERENCE.md** ← Keep This Open While Coding

**Purpose:** One-page cheatsheet for rapid lookups during development.

**Contents:**
- The 3 rules (one-line each)
- Before-you-code search checklist
- ADS token quick lookup (most common colors & spacing)
- Component quick lookup (30 most-used components)
- What will block your commit (with fixes)
- Common mistakes & fixes (5 scenarios)
- Validation checklist (9 items)
- Component cheat sheet table
- Quick links to full spec

**When to use:**
- **Daily coding** → Keep open in a browser tab
- **Quick token lookup** → Find color/spacing token quickly
- **"Which component should I use?"** → Look at component table
- **Pre-commit checks** → Run validation checklist

**Read time:** 2 minutes to scan, 30 seconds for quick lookup

---

### 3. **CANONICAL_DECISION_TREE.md** ← When You're Unsure What To Do

**Purpose:** Step-by-step flowcharts for common decisions.

**Contents:**
- Decision flowcharts for:
  - "Should I build a new component?" (5-node tree)
  - "How should I style this?" (3 trees: color, spacing, typography)
  - "Should I use Tailwind?" (1 node: NO)
  - "Should I use hex?" (1 node: NO)
  - "Should I create a custom component?" (4-node tree)
  - "How do I migrate Tailwind code?" (5-step tree)
- Scenario-based decisions (status badge, form, table, modal)
- Pre-commit validation flow
- Quick decision matrix (I need... → Use this)
- When to escalate checklist (9 items)

**When to use:**
- **Stuck on a decision** → Find your scenario in the tree
- **Not sure if canonical fits** → Follow "Should I build a new component?" tree
- **Trying to migrate code** → Follow "How do I migrate Tailwind code?" tree
- **Need to escalate** → Check "When to escalate" checklist

**Read time:** 1-2 minutes to follow a tree

---

## Quick Navigation

### I'm a new developer

1. Read: **CANONICAL_QUICK_REFERENCE.md** (the 3 rules section)
2. Read: **CANONICAL_DESIGN_SYSTEM_CONTRACT.md** (sections 1-4)
3. Bookmark: **CANONICAL_QUICK_REFERENCE.md** for daily use

### I'm building a new feature

1. Read: **CANONICAL_DESIGN_SYSTEM_CONTRACT.md** (sections 1-4)
2. Keep open: **CANONICAL_DECISION_TREE.md**
3. Reference: **CANONICAL_QUICK_REFERENCE.md** (component table)

### I'm migrating Tailwind code

1. Follow: **CANONICAL_DESIGN_SYSTEM_CONTRACT.md** section 5 (Migration Guide)
2. Reference: **CANONICAL_QUICK_REFERENCE.md** (Common mistakes & fixes)
3. Use: **CANONICAL_DECISION_TREE.md** (scenario-based decisions)

### I need a specific component

1. Search: **CANONICAL_QUICK_REFERENCE.md** (component table)
2. Find code: **CANONICAL_DESIGN_SYSTEM_CONTRACT.md** (Common Migration Scenarios)
3. Verify: **CANONICAL_DECISION_TREE.md** (Should I use this?)

### I think canonical doesn't fit

1. Read: **CANONICAL_DESIGN_SYSTEM_CONTRACT.md** section 10 (Approval Process)
2. Create: Gap report using template
3. Submit: To Vikram for written approval

---

## The Canonical Contract (3 Rules)

### Rule 1: No Tailwind Color Utilities

```tsx
❌ BANNED:     className="bg-slate-100 text-red-500 border-gray-300"
✅ ALLOWED:    style={{ backgroundColor: 'var(--ds-background-neutral-subtle)' }}
```

**Why:** Tailwind utilities don't support dark mode, accessibility validation, or theme consistency.

### Rule 2: No Hard-Coded Hex Colors

```tsx
❌ BANNED:     style={{ color: '#E9F2FE', backgroundColor: '#fff' }}
✅ ALLOWED:    style={{ color: 'var(--ds-text)', backgroundColor: 'var(--ds-surface)' }}
```

**Why:** Hex values don't adapt to light/dark theme and can't be validated for contrast.

### Rule 3: Use Canonical Components

```tsx
❌ BANNED:     <div className="...">Status: Active</div>
✅ ALLOWED:    <CatalystStatusPill status="active" />
```

**Why:** Canonical components own styling, accessibility, and dark mode support.

---

## Enforcement Mechanisms

| Layer | Check | Command | Consequence |
|-------|-------|---------|-------------|
| **Local (Pre-commit)** | Hard-coded colors | `npm run lint:colors:gate` | Blocks commit |
| **Local (Pre-commit)** | Off-grid spacing/typography | `npm run audit:ads:gate` | Blocks commit |
| **Staging (CI)** | Hard-coded colors | `npm run lint:colors:gate` | Blocks merge |
| **Staging (CI)** | Off-grid spacing/typography | `npm run audit:ads:gate` | Blocks merge |

**Ratchet:** Both gates fail ONLY when baseline increases. Existing debt doesn't block; new violations do.

**Current Baselines:**
- Hard-coded colors: **76** (down from 709 in Phase 5)
- Typography violations: **2,132**
- Spacing violations: **1,082**

---

## Common Questions

### Q: "Can I use this Tailwind utility?"

**A:** No. Pre-commit will block it. Run `npm run lint:colors:gate` to see what's blocked.

### Q: "Can I use this hex color?"

**A:** No. Pre-commit will block it. Use `var(--ds-*)` tokens instead (see CANONICAL_QUICK_REFERENCE.md for token lookup).

### Q: "I found a component that looks similar but not exact — can I copy it?"

**A:** No. Don't fork components. Ask Vikram if you can extend it or if your use case needs a new component.

### Q: "I need a color/token that doesn't exist — what do I do?"

**A:** Ask Vikram. Never hard-code a value as a workaround.

### Q: "What if I really need to hand-roll a component?"

**A:** Create a gap report proving existing components don't fit. See CANONICAL_DESIGN_SYSTEM_CONTRACT.md section 10 for template and process.

### Q: "My component is 'overkill' — can I use something simpler?"

**A:** "Overkill" is not evidence. Prove unsuitability with API gaps and data shape incompatibility. See CANONICAL_DESIGN_SYSTEM_CONTRACT.md section 4 (How to Prove Unsuitability).

### Q: "Can I use an escape hatch to bypass the gate?"

**A:** Only with written Vikram approval. Use format: `/* ads-scanner:ignore-next-line — CAT-ADS-12345 reason */`. Never use to hide real violations.

---

## Approval & Override Process

### If You Think Canonical Doesn't Fit

1. **Create a gap report** (template in CANONICAL_DESIGN_SYSTEM_CONTRACT.md)
   - Component name & API
   - Proof of unsuitability (not "it's overkill")
   - Alternative proposed
   - Screenshot evidence (if visual)

2. **Submit to Vikram** via PR comment or in writing

3. **Receive decision:**
   - "Use this alternative instead"
   - "Extend this canonical with a new prop"
   - "Approved for hand-roll (with issue CAT-ADS-XXXX)"

4. **Proceed only with written approval**

---

## Pre-Commit Validation

Before every commit:

```bash
# Check for hard-coded colors
npm run lint:colors:gate

# Check for off-grid spacing/typography
npm run audit:ads:gate

# View all violations (not just failures)
npm run lint:colors
npm run audit:ads
```

### Validation Checklist

- [ ] `npm run lint:colors:gate` passes
- [ ] `npm run audit:ads:gate` passes
- [ ] Component is from canonical hierarchy
- [ ] No Tailwind utilities in className
- [ ] No hard-coded colors in style
- [ ] Tested in light mode (colors correct, contrast ok)
- [ ] Tested in dark mode (reloaded page, no white-on-black)
- [ ] No inline style={{ color: '#...' }}
- [ ] All colors use `var(--ds-*)`
- [ ] All spacing uses `var(--ds-space-*)`

---

## Document Map

```
docs/
├── README_CANONICAL_CONTRACT.md              ← YOU ARE HERE
├── CANONICAL_DESIGN_SYSTEM_CONTRACT.md       ← Full spec (read first)
├── CANONICAL_QUICK_REFERENCE.md              ← Keep open while coding
├── CANONICAL_DECISION_TREE.md                ← When unsure
└── CANONICAL_RULEBOOK.md                     ← Historical rules doc
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-06-29 | Initial release (3 docs + this README) |

---

## Support

- **General questions:** Ask in #design-system Slack
- **Migration help:** See CANONICAL_DESIGN_SYSTEM_CONTRACT.md sections 5-8
- **Stuck on a decision:** See CANONICAL_DECISION_TREE.md
- **Need approval for custom component:** Create gap report (CANONICAL_DESIGN_SYSTEM_CONTRACT.md section 10)
- **Bug in gates/scanner:** File issue in project

---

## Next Steps

1. **Read:** Start with CANONICAL_QUICK_REFERENCE.md (3 rules section)
2. **Bookmark:** Keep CANONICAL_QUICK_REFERENCE.md open while coding
3. **Familiarize:** Scan CANONICAL_DECISION_TREE.md for your scenarios
4. **Deep dive:** When needed, refer to full CANONICAL_DESIGN_SYSTEM_CONTRACT.md

---

**Status:** ✅ Active & Enforced  
**Effective:** 2026-06-27 (CAT-ADS-COMPLIANCE-20260627-001)  
**Baseline Update Date:** 2026-06-28  
**Next Review:** 2026-09-28  
**Owner:** Catalyst Design System Team

---

**Questions?** Start with CANONICAL_QUICK_REFERENCE.md or CANONICAL_DECISION_TREE.md.

