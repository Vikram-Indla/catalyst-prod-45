# CAT-RELEASE-OPS-DISCOVERY-BLUEPRINT-20260706-001 — Decisions

> All explicit decisions made during this feature. Permanent record.
> Append — never delete.

---

## Decisions

### D-001 (2026-07-06, Vikram) — No drawers
No side drawers anywhere in Release Ops functionality. Remove ChgDrawer, ReleaseDrawer, ReleasePeekPanel, AIInsightsDrawer. Replace with full-page detail + focused ads/Modal preview. Scope: release-hub only.

### D-002 (2026-07-06, Vikram) — Breadcrumbs mirror Project module
Use ProjectPageHeader (hubType="release") exactly as project-hub does; it wraps ads/Breadcrumbs internally. Never call raw @atlaskit/breadcrumbs. L1 list = no trail; L2 detail = single-level trail back to list (`trail={[{text:'Releases'|'Changes', href:list}]}`); global hub → no projectKey. Reference: ReleaseDetailPage.tsx:315, FilterDetailPage.tsx:221.

### D-003 (2026-07-06, Vikram) — Atlaskit components
Use Atlaskit: user-picker (render CatalystAvatar per option, Grid G3), datetime-picker, tabs, modal-dialog, section-message, lozenge/StatusLozenge, pragmatic-drag-and-drop.

### D-004 (2026-07-06, Vikram) — :changeSlug approved
Proceed per recommendation: rh_changes gets slug + generate_slug() trigger; Routes.releaseHub.change(slug) builder + useChangeBySlug; new route /release-hub/changes/:changeSlug; legacy :changeId via UuidToSlugRedirect. Satisfies Grid F slug contract.
