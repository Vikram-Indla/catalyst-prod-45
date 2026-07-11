# CDL — Catalyst Design Language (CHARTER DRAFT v0.1, 2026-07-08)

> Status: DRAFT for Vikram sign-off (Lane B0). Nothing here is law until signed.

## Article 1 — Sovereignty
Catalyst runs the **Atlassian Design System**. ADS is not an influence, a reference, or a starting point — it is the system. Any visual property (color, type, spacing, radius, elevation, motion) not expressible in ADS tokens/components is a defect unless listed in Article 3.

## Article 2 — Source of truth
- **Code is truth for what IS.** `@atlaskit/*` components + genuine `@atlaskit/tokens` values. `src/styles/theme-tokens.css` (hand-authored lookalike values) is scheduled for replacement (Lane B2) — no new code may depend on its non-ADS values.
- **Figma is truth for what SHOULD BE.** Contents: the official ADS Figma kit (consumed, never redrawn) + 8 golden archetype frames + decision records. Figma never mirrors the app's current state.
- **Approvals are pixels.** No design approval on text descriptions. Screenshot or rendered mockup, both themes, or it didn't happen.

## Article 3 — Sanctioned extensions (the ONLY permitted non-ADS visuals)
| # | Extension | Scope | Owner rule |
|---|---|---|---|
| E1 | CatyAI rainbow/magenta (AIIntelligenceButton, CatyRainbowCTA, CatyPulseIcon, Caty FAB) | AI affordances only | never on non-AI controls |
| E2 | Astryx zone | /strategy/*, /ideas/* only | ring-fenced adapter, no :root leakage |
| E3 | Release-ops domain lozenges (risk escalation ladder: red=critical, yellow=high, grey below) | release-hub | wraps ads Lozenge only |
| (add by amendment only — PR touching this table requires Vikram approval) |

## Article 4 — The five forced decisions (answer inline, sign below)
1. **Single bold CTA convention**: global "Create" (shell chrome) stays bold; ALL page-level CTAs demote to default appearance. → ACCEPT / REJECT
2. **32px KPI numerals** (CommandCenter): keep 32 as a sanctioned "metric display" size added to E-table, or drop to 28 (--ds-font-size-800)? → 28 / 32-sanctioned
3. **ProjectPageHeader tabs row**: build tabs capability (its own feature) or accept header-without-tabs as the Catalyst pattern? → BUILD / ACCEPT
4. **Caty pulse FAB at rest**: keep magenta always-on (brand) or neutral-until-active? → KEEP / NEUTRAL
5. **Density**: adopt a compact density mode as a Beat-Jira extension (B7) or single-density? → COMPACT-MODE / SINGLE

## Article 5 — Enforcement (prevention stack, Lane B6)
1. Genuine tokens only (B2 makes counterfeit values impossible)
2. ESLint hard bans: inline `fontSize:`, raw px in padding/margin/gap outside the scale, local color maps, non-ADS font stacks — blocking, not ratcheted
3. ui-vitals CI: per-route probe score, fail on drop
4. Golden screenshot diff per PR touching styled code
5. PR template: before/after image pair mandatory for UI changes

## Article 6 — Beat-Jira layer (post-convergence only)
Speed (perceived <100ms), density-with-readability, ⌘K command palette, AI-in-flow. Each requires its own golden frame + E-table entry before code.

Signed: ______________ (Vikram) Date: __________
