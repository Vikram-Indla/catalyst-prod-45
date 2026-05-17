# Design Governance

Central hub for Catalyst's design system compliance, audit rules, and enforcement mechanisms.

## Directory Structure

- **core/** — Design system config, ADS token mappings, canonical rules
- **rules/** — Audit rule definitions (validator rules, jira-compare patterns)
- **reports/** — Audit output reports, violation logs, remediation tracking

## Key Files

- `GOVERNANCE_POLICY.md` — Master policy; immutable rules
- `ads-config.json` — ADS token mappings and banned patterns
- `core/font-cdn.json` — Atlassian Sans CDN configuration

## Usage

Run the design system validator before every commit:

```bash
npm run design-system:audit
```

Run the full GitHub Actions audit locally:

```bash
npm run design-system:audit:ci
```

## Related

- Skill: `/design-critique` — Heuristic UX/UX scoring
- Skill: `/jira-compare` — Parity audits
- CLAUDE.md — Development guardrails
