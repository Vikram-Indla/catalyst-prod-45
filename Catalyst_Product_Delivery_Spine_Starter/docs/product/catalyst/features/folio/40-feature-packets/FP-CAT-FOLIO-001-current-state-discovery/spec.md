# Discovery specification

## Goal

Produce a defensible, evidence-grounded understanding of Folio without changing application behavior.

## Required discovery surfaces

- repository structure and history;
- route/navigation entry points;
- UI screens and states;
- rich-text or document model;
- database tables, migrations, storage, and policies;
- services, API calls, and background jobs;
- permissions and role checks;
- feature flags;
- analytics and observability;
- tests;
- external integrations;
- runtime screenshots;
- known defects and dead code.

## Notion comparison rule

Use Notion only as a capability reference. Do not assume Folio should clone Notion.

For every comparison classify the capability as:
- already present;
- partially present;
- missing and useful;
- missing and unsuitable;
- uniquely Catalyst-native opportunity.

## Design research routing

1. Inspect Catalyst canonical components and comparable internal screens.
2. Use Mobbin for external interaction-pattern research only when a genuine design gap remains.
3. Use Figma for editable proposed designs.
4. Validate implemented UI in the browser, not from static mockups alone.
