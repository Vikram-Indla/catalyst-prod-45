# Route rebaseline and goal resume

**Feature Work ID:** CAT-DOCINTEL-V2-20260709-001  
**Date:** 2026-07-11  
**Status:** APPROVED — user explicitly required the blocked goal to resume

## Why the goal was blocked

Slice 1 originally placed new static pages at the same one-segment URL depth as frozen document
slugs. A future document named “Library,” “Themes,” “Review,” or “Deliverables” could become
unreachable. Three destinations also preceded their dedicated implementation slices.

The knowledge-first visual baseline was then intentionally held for user agreement. The buyer-facing
staging mockup has now been approved, so visual agreement is no longer a dependency.

## Resolution

- Home remains `/doc-intelligence`.
- User views use a collision-safe namespace:
  - `/doc-intelligence/views/library`
  - `/doc-intelligence/views/themes`
  - `/doc-intelligence/views/deliverables`
- Review tasks use `/doc-intelligence/actions/review`.
- Canonical source URLs become `/doc-intelligence/source/:slug`.
- The existing `/:slug` route remains as compatibility for every current external/deep link.
- Review, Themes and Deliverables initially render truthful route-specific pending states; they do
  not redirect, impersonate another page, or fall through to a source slug.

This is additive, needs no migration, and permanently removes collisions for newly generated links.

## Execution authority

The user's instruction “the goal has to be unblocked” resumes the approved v2.1 implementation.
Slice 1 proceeds under its existing file allowlist and validation/screenshot gates.
