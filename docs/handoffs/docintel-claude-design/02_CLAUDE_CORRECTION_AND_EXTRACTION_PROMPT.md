# Prompt 2 — Claude Design correction and extraction

Audit your submitted DocIntel design and code as an adversarial Catalyst architect. Do not defend
your first output. Correct it and return a replacement downloadable package.

Reject or correct any part that:

- Was not derived from the six supplied attachments.
- Invents data or treats BAU-6155 as valid Raw Materials context.
- Makes generic chat the whole product.
- Removes a current capability without a working replacement.
- Claims Impact Canvas, Sidecar or Test Quality Reviewer already has a working backend.
- Creates custom Catalyst primitives or adds packages.
- Bypasses CRE for create, parent or work-item linking.
- Applies `canLinkTo` to `ai_document_links`.
- Moves raw Evidence or Health before authorized Admin exists.
- Ignores loading, empty, denied, stale, failure, partial-success or recovery states.
- Fails dark mode, keyboard, responsive, Arabic RTL or mixed-direction citations.

Explicit repository corrections your final package must cover:

1. `PromoteArtifactModal.tsx` needs CRE creation and hierarchy validation.
2. The current CRE lint allowlist does not cover DocIntel promotion.
3. `EvidenceViewer.tsx` is currently unreachable before Admin has been delivered.
4. Admin navigation is owned by `src/components/admin/admin-nav.ts` and its parity test.
5. `ProcessingStatusBoard` still exposes operational mechanics to ordinary users.
6. Current DocIntel shells, spacing and typography are inconsistent.
7. Route-level capability-preservation tests are required.

Return:

A. Corrected screens and source files.

B. A screen traceability table containing route, user job, canonical shell, reused components,
new composition, read hook, mutation, permission, CRE rule, empty/error state and test.

C. A file manifest with exact RETAIN/UPDATE/ADD/MOVE/DELETE/DEFER decisions. For every UPDATE,
state current responsibility, new responsibility and preserved behavior.

D. A CRE matrix for every create, parent and work-item link action.

E. A data-truth matrix separating persisted, verified-derived, missing and prohibited fields.

F. A Codex execution order:

0. CRE and capability-reachability correction.
1. Truthful citation identity.
2. Themes.
3. Backend Admin authority.
4. Admin operations and operational-detail relocation.
5. Approved visual integration.
6. Build-later contextual concepts.
7. Regression and screenshot closure.

G. Ten remaining implementation risks. Any unresolved critical risk means the package is not
implementation-ready.

