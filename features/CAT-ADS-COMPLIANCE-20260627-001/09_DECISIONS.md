# CAT-ADS-COMPLIANCE-20260627-001 — Decisions

> All explicit decisions made during this feature. Permanent record.
> Append — never delete.

---

## Decisions

## [DEC-001] Slice ordering — enforcement before remediation
2026-06-27. ADS tooling is already mature; the gap is enforcement + a blocked long-tail. Chose CI/pre-commit enforcement (Slice 1) then audit ratchet (Slice 2) over risky bulk hex remediation (blocked on 265 unmapped mappings). Both shipped to PR #289.

## [DEC-002] Ratchet pattern = fail-on-increase vs committed baseline
2026-06-27. Gates never block existing debt; only NEW violations. Baselines (`color-baseline.json` 709; `audit-baseline.json` tokens 28913/typo 2201/spacing 1118/fonts 0) only ratchet down. Noise in the audit `tokens` category is inert under increase-only.

## [DEC-003] CI build 404 — root cause (DIAGNOSIS ONLY, no fix yet)
2026-06-27. CI `build` fails at `npm install`: `@atlassian/assets-workspace-host` 404s on public npm. Pinpointed via isolated registry-metadata probe (no node_modules touched): **`@atlaskit/link-datasource` depends on `@atlassian/assets-workspace-host`** (^0.7.0 latest / ^0.5.0 in the version your editor stack pins). That `@atlassian/*` package is Atlassian-internal, unpublished publicly. Pulled in transitively via the editor stack (`@atlaskit/editor-core`/`editor-plugins`/`editor-plugin-card`). Pre-existing — fails on `main` too. Unrelated to ADS compliance. Fix options pending JK decision (see handover). NOT a regression from this feature.
