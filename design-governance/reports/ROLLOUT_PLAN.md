# Catalyst Design System Rollout Plan

**Date:** 2026-05-18 | **Version:** 1.0.0

## Overview

Catalyst is migrating to **Atlassian Design System v4** as the single source of truth for all design system decisions. This plan outlines the rollout phases, timeline, and developer training.

## Phase 1: Foundation (✅ COMPLETE)
- Design governance policy established
- ADS token mappings created
- Font CDN integration configured

## Phase 2: Enforcement (✅ COMPLETE)
- GitHub Actions CI audit gate active
- Pre-commit hooks deployed
- Design system audit validators integrated

## Phase 3: Tooling (✅ COMPLETE)
- CLI tool for developers
- Local audit commands available
- Design system info accessible

## Phase 4: Rollout (🚀 ACTIVE)

### Week 1 (2026-05-18 to 2026-05-24)
- **Communication:** Email all developers with policy summary + resources
- **Training:** Async video: "ADS Migration Overview" (15 min)
- **Action:** Developers read GOVERNANCE_POLICY.md
- **Support:** Design system Slack channel opens for Q&A

### Week 2 (2026-05-25 to 2026-05-31)
- **Migration:** Audit src/ for existing violations (report generated)
- **Training:** Hands-on session: "Using design-system CLI" (45 min, recorded)
- **Action:** Developers practice audit commands locally
- **Fixes:** Begin remediation of P0 violations (hardcoded colors, banned components)

### Week 3+ (2026-06-01+)
- **Enforcement:** All PRs gated by design-system-audit.yml
- **Review:** Design reviews include ADS compliance check
- **Metrics:** Weekly violation trends dashboard

## Developer Checklist

- [ ] Read GOVERNANCE_POLICY.md
- [ ] Install CLI: `npm install -g design-system`
- [ ] Run local audit: `npm run design-system:audit`
- [ ] Fix any violations in your current work
- [ ] Use @atlaskit/* components in new code
- [ ] Use ADS tokens for all colors, spacing
- [ ] Test with design-system CLI before commit

## Banned Patterns (Quick Reference)

```javascript
// ❌ WRONG
<div style={{ color: '#292A2E', padding: '5px' }}>
<StoriesPoint value={5} />
<SelectCustom options={opts} />

// ✅ CORRECT
<div style={{ color: 'var(--ds-text)', padding: 'var(--ds-space-100)' }}>
<Select options={opts} />
```

## Resources

- Policy: `./design-governance/GOVERNANCE_POLICY.md`
- Config: `./design-governance/core/ads-config.json`
- ADS: https://atlassian.design/
- Font CDN: https://fonts.atlassian.com

## Success Metrics

- 100% of new code uses ADS tokens
- 0 hardcoded colors in new PRs
- 0 banned components in main
- <30 total design system violations in src/
- All developers trained on CLI tool

## Questions?

- **Design System Channel:** #design-system (Slack)
- **Policy:** Vikram Indla (vikram@catalyst.dev)
- **Implementation:** Engineering Lead

---

**Approved by:** Vikram Indla | **Date:** 2026-05-18
