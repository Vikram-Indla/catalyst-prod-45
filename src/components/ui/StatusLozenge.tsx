/**
 * StatusLozenge — legacy import path, now a thin shim over the ADS
 * (@atlaskit/lozenge) primitive.
 *
 * Phase 5 / Atlaskit Dark Mode Enforcement (2026-04-30):
 *   Previous implementation rendered a hand-rolled <span> with raw
 *   `var(--status-*)` background/foreground tokens. That bypassed
 *   @atlaskit/lozenge entirely, violating the ADS-only mandate
 *   (CLAUDE.md §5, jira-compare 2026-04-28 lesson) on every consumer
 *   surface — including the `/` route (ForYouPage).
 *
 *   This shim now delegates to `StatusLozenge` from `@/components/ads`,
 *   which wraps `@atlaskit/lozenge` and emits `data-cp-lozenge-jira-parity`
 *   for the sentence-case CSS override.
 *
 *   Behaviour preserved:
 *     - Same component name, same import path, same `{ status: string }` API.
 *     - Same display label (snake_case → "In Progress" mapping kept).
 *     - Same 3-bucket categorisation (todo / inprogress / done) via
 *       `toStatusCategory`, which is the canonical ADS edge adapter.
 *
 *   Result: zero behavioural drift, but every render now flows through
 *   `@atlaskit/lozenge` with `--ds-*` ADS tokens (dark-mode safe).
 */

import React from "react";
import {
  StatusLozenge as AdsStatusLozenge,
  toStatusCategory,
} from "@/components/ads";

/**
 * Legacy display-name normaliser. The ADS `StatusLozenge` takes the label
 * as `children`, so we keep this mapping local to preserve the exact text
 * users have been seeing on /, /allwork, etc.
 */
function getDisplayName(status: string): string {
  const snakeToJira: Record<string, string> = {
    pending_approval: "Pending approval",
    in_progress: "In Progress",
    in_requirements: "In Requirements",
    in_design: "In Design",
    ready_for_development: "Ready for Development",
    in_development: "In Development",
    in_qa: "In QA",
    in_uat: "In UAT",
    in_entity_integration: "In Entity Integration",
    technical_validation: "Technical Validation",
    in_beta: "In Beta",
    end_to_end_testing: "End to end testing",
    production_ready: "Production Ready",
    beta_ready: "Beta Ready",
    in_production: "In Production",
    ready_for_qa: "Ready for QA",
    on_hold: "On Hold",
  };
  if (snakeToJira[status]) return snakeToJira[status];
  return status;
}

export function StatusLozenge({ status }: { status: string }) {
  const category = toStatusCategory(status);
  const label = getDisplayName(status);
  return <AdsStatusLozenge status={category}>{label}</AdsStatusLozenge>;
}

export default StatusLozenge;
