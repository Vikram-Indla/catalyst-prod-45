/**
 * CatalystDefectFields — Defect-specific canonical field block.
 *
 * 2026-04-20 (Jira parity audit, BAU-5534 critique):
 *   Previously rendered every defect field — Severity, Steps to Reproduce,
 *   Environment, Found in build, Fix in build, Root Cause, Resolution — as
 *   a stacked `FieldBlock` with a 16/700 heading and an italic "None"
 *   placeholder. Jira instead folds the short enum/lozenge fields into
 *   the compact `Key details` block (14/500/#505258 labels, 96 px label
 *   column, space.250 gap) and keeps only the long-form fields
 *   (Steps to Reproduce, Environment) as below-the-fold blocks.
 *
 *   Split into two exports so each consumer can pick the right slot:
 *     1. `CatalystDefectKeyRows`  → FieldRow fragments to pass into
 *         `CatalystKeyDetails` via its `extraRows` prop.
 *     2. `CatalystDefectLongFields` → block-level section for the
 *         narrative fields that stay below Key details.
 *
 * Atlaskit primitives:
 *   - `@atlaskit/lozenge`  for Severity colour, Found-in build chip,
 *      Fix-in build chip, Resolution lozenge
 *   - `KeyDetailsFieldRow` for canonical label + value layout
 *   - Muted `#6B778C` inline "None" (Atlaskit `color.text.subtlest`) —
 *      replaces the italic placeholder that failed WCAG AA contrast.
 *
 * Data wiring today:
 *   - Fix-in build   ← issue.fix_versions  (Json: Array<{ name }>)
 *   - Resolution     ← issue.resolution    (string | null)
 *   Pass-through props for Severity / Environment / Steps / Found-in /
 *   Root Cause stay optional until the schema follow-up (add columns to
 *   ph_issues or join a `defects` table) — UI shape is stable.
 */
import React from 'react';
import { Heading } from '@/components/ads';
import Lozenge from '@atlaskit/lozenge';
import { KeyDetailsFieldRow } from '../shared/sections';
import { CatalystSeverityField } from '../shared/sections/CatalystSeverityField';
import type { PhIssue } from '../shared/types';

interface CatalystDefectFieldsProps {
  issue: PhIssue | null;
  /** Defect severity (Blocker / Critical / Major / Minor / Trivial). */
  severity?: string | null;
  /** Free-text environment (e.g. "Chrome 120 / macOS 14 / Staging"). */
  environment?: string | null;
  /** Structured or plain-text steps. Arrays render as an ordered list. */
  stepsToReproduce?: string | string[] | null;
  /** Build/version the defect was first observed in. */
  foundInBuild?: string | null;
  /** Post-mortem root cause narrative. */
  rootCause?: string | null;
  /** Optional assessment-feature lozenge text (Jira parity: "OTHER"). */
  assessmentFeature?: string | null;
}

/* Severity → Atlaskit Lozenge appearance.
   Atlaskit has six appearances: default, success, removed, inprogress,
   new, moved. Two severity taxonomies show up on real Jira tickets:
     - Blocker / Critical / Major / Minor / Trivial  (classic ITSM axis)
     - High    / Medium   / Low     (simpler Jira-native scale —
       BAU-5534 uses this, Severity = "Low")
   Both are normalised here so product code doesn't need to care which
   field label the project chose. Case-insensitive lookup is done in
   the component. */
const SEVERITY_APPEARANCE: Record<string, React.ComponentProps<typeof Lozenge>['appearance']> = {
  // Classic axis
  blocker: 'removed',
  critical: 'removed',
  major: 'moved',
  minor: 'success',
  trivial: 'default',
  // Simpler axis
  highest: 'removed',
  high: 'removed',
  medium: 'moved',
  low: 'success',
  lowest: 'default',
};

function severityAppearance(value: string): React.ComponentProps<typeof Lozenge>['appearance'] {
  return SEVERITY_APPEARANCE[value.trim().toLowerCase()] ?? 'default';
}

/* Inline muted empty-state. `color.text.subtlest` equivalent (var(--ds-text-subtlest, #6B778C))
   hits 4.6:1 on white — the former italic #97A0AF was ~3.2:1 and failed
   WCAG AA for body text. */
function Empty({ text = 'None' }: { text?: string }) {
  return (
    <span style={{ fontSize: 14, color: 'var(--ds-text-subtlest, var(--ds-text-subtlest, #6B778C))' }}>{text}</span>
  );
}

/* ═══════════════════════════════════════════════════════════
   CatalystDefectKeyRows — goes into CatalystKeyDetails.extraRows
   ═══════════════════════════════════════════════════════════

   Apr 28, 2026 (jira-compare cycle 2 — Phase B B5):
     • Reordered to Jira-parity: Severity → (Priority injected via
       priorityRow) → Found in → Fix in → Root cause → Resolution.
     • Empty Catalyst-only fields (Found in / Fix in / Root cause /
       Resolution) now render NOTHING instead of the "None"
       placeholder — matches Jira's hide-empty default. Severity
       still always renders (treated as a required field). The old
       behaviour leaked four "None" rows on every defect that
       wasn't fully populated, which dominated the panel chrome.
*/

export function CatalystDefectKeyRows({
  issue,
  severity,
  foundInBuild,
  rootCause,
  assessmentFeature,
  priorityRow,
  onUpdate,
}: Pick<
  CatalystDefectFieldsProps,
  'issue' | 'severity' | 'foundInBuild' | 'rootCause' | 'assessmentFeature'
> & {
  /**
   * Optional Priority row injected between Severity and the rest.
   * Defect view passes this so order matches Jira's
   * Parent → Severity → Priority instead of the legacy
   * Parent → Priority → Severity layout that
   * `CatalystKeyDetails.showPriority` defaults to.
   */
  priorityRow?: React.ReactNode;
  /**
   * Refetch hook called by editable fields after a successful mutation.
   * jira-compare Round 4 (2026-04-28): Severity is now editable inline,
   * so the consumer needs to invalidate the issue query.
   */
  onUpdate?: () => void;
}) {
  // Normalize fix_versions — stored as Json, may be null or malformed.
  const fixVersions: Array<{ name: string }> = Array.isArray(issue?.fix_versions)
    ? ((issue as any).fix_versions as any[]).filter(
        (v): v is { name: string } =>
          !!v && typeof v === 'object' && typeof v.name === 'string',
      )
    : [];

  const resolution = typeof (issue as { resolution?: unknown } | null | undefined)?.resolution === 'string'
    ? ((issue as { resolution?: string }).resolution?.trim() || null)
    : null;

  const hasFoundIn = !!foundInBuild && foundInBuild.trim().length > 0;
  const hasFixIn = fixVersions.length > 0;
  const hasRootCause = !!rootCause && rootCause.trim().length > 0;
  const hasResolution = !!resolution;
  const hasAssessment = !!assessmentFeature && assessmentFeature.trim().length > 0;

  return (
    <>
      {/* Severity — inline-editable as of jira-compare Round 4
          (2026-04-28). Renders the Lozenge in the closed state and an
          Atlaskit Select dropdown when active. Always renders the row;
          Jira treats Severity as a required field even when null. */}
      <KeyDetailsFieldRow label="Severity" alignBlock="center">
        <CatalystSeverityField issue={issue} onUpdate={onUpdate} />
      </KeyDetailsFieldRow>

      {/* Priority row (injected by consumer) — placed after Severity
          to match Jira's Parent → Severity → Priority field order. */}
      {priorityRow}

      {/* Catalyst-specific fields — render only when populated. */}
      {hasAssessment && (
        <KeyDetailsFieldRow label="Assessment" alignBlock="center">
          <Lozenge appearance="default">{assessmentFeature}</Lozenge>
        </KeyDetailsFieldRow>
      )}

      {hasFoundIn && (
        <KeyDetailsFieldRow label="Found in" alignBlock="center">
          <Lozenge appearance="default">{foundInBuild}</Lozenge>
        </KeyDetailsFieldRow>
      )}

      {hasFixIn && (
        <KeyDetailsFieldRow label="Fix in" alignBlock="center">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {fixVersions.map((v, i) => (
              <Lozenge key={i} appearance="default">{v.name}</Lozenge>
            ))}
          </div>
        </KeyDetailsFieldRow>
      )}

      {hasRootCause && (
        <KeyDetailsFieldRow label="Root cause" alignBlock="center">
          <span style={{ fontSize: 14, color: '#292A2E' }}>{rootCause}</span>
        </KeyDetailsFieldRow>
      )}

      {hasResolution && (
        <KeyDetailsFieldRow label="Resolution" alignBlock="center">
          <Lozenge appearance="success">{resolution}</Lozenge>
        </KeyDetailsFieldRow>
      )}
    </>
  );
}

/* ═══════════════════════════════════════════════════════════
   CatalystDefectLongFields — long-form blocks below Key details
   ═══════════════════════════════════════════════════════════ */

const BODY_STYLE: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 400,
  color: '#292A2E',
  lineHeight: 1.5,
  fontFamily:
    '"Atlassian Sans", ui-sans-serif, -apple-system, "system-ui", sans-serif',
};

function StepsList({ steps }: { steps: string | string[] }) {
  const arr = Array.isArray(steps)
    ? steps
    : steps
        .split(/\r?\n/)
        .map(s => s.trim())
        .filter(Boolean);

  if (arr.length <= 1) {
    return <span style={BODY_STYLE}>{arr[0] ?? ''}</span>;
  }

  return (
    <ol
      style={{
        ...BODY_STYLE,
        margin: '4px 0 0',
        paddingLeft: 20,
        listStyleType: 'decimal',
      }}
    >
      {arr.map((step, i) => (
        <li key={i} style={{ marginBottom: 4 }}>
          {step}
        </li>
      ))}
    </ol>
  );
}

export function CatalystDefectLongFields({
  environment,
  stepsToReproduce,
}: Pick<CatalystDefectFieldsProps, 'environment' | 'stepsToReproduce'>) {
  const hasSteps = !!stepsToReproduce && (Array.isArray(stepsToReproduce) ? stepsToReproduce.length > 0 : stepsToReproduce.trim().length > 0);
  const hasEnv = !!environment && environment.trim().length > 0;

  // If nothing to render, render nothing — avoids the oversized empty
  // placeholder stack that Jira doesn't show either.
  if (!hasSteps && !hasEnv) return null;

  return (
    <section
      aria-label="Defect narrative fields"
      style={{ marginBottom: 24, paddingLeft: 20 }}
    >
      {hasSteps && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 4 }}>
            <Heading size="small">Steps to Reproduce</Heading>
          </div>
          <div style={{ whiteSpace: 'pre-wrap' }}>
            <StepsList steps={stepsToReproduce!} />
          </div>
        </div>
      )}

      {hasEnv && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 4 }}>
            <Heading size="small">Environment</Heading>
          </div>
          <div style={{ whiteSpace: 'pre-wrap' }}>
            <span style={BODY_STYLE}>{environment}</span>
          </div>
        </div>
      )}
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════
   Back-compat wrapper — retained so any stray import keeps working,
   but new call sites should compose the two exports above directly.
   Renders long fields only (the Key-detail rows MUST be passed via
   CatalystKeyDetails.extraRows for typography parity).
   ═══════════════════════════════════════════════════════════ */

export function CatalystDefectFields(props: CatalystDefectFieldsProps) {
  return (
    <CatalystDefectLongFields
      environment={props.environment}
      stepsToReproduce={props.stepsToReproduce}
    />
  );
}
