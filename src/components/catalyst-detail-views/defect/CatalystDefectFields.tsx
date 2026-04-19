// @ts-nocheck
/**
 * CatalystDefectFields — Defect-specific canonical field block.
 *
 * Jira-parity: between the priority row and the description, a Defect shows
 * a dedicated rail of Severity, Steps to Reproduce, Environment, Found-in
 * build, Fix-in build, Root Cause and Resolution. Catalyst previously relied
 * on the generic Description + AcceptanceCriteria-relabeled-as-"Expected
 * Behavior" pair, which collapses these distinct fields into prose. This
 * component restores the canonical structure.
 *
 * Wired from ph_issues columns where they exist; the rest are exposed as
 * optional props so a later schema extension (or a join against the
 * parallel `defects` table) becomes a pure data wire without touching this
 * layout.
 *
 *  Rendered from ph_issues today:
 *    - Fix-in build   ← issue.fix_versions  (Json: Array<{ name: string }>)
 *    - Resolution     ← issue.resolution    (string | null)
 *
 *  Pass-through props (populate when the data source exists):
 *    - severity, environment, stepsToReproduce, foundInBuild, rootCause
 *
 * SCHEMA FOLLOW-UP (do NOT do in this G8 pass):
 *   Promote severity / environment / steps_to_reproduce / found_in_build /
 *   root_cause to first-class ph_issues columns, OR extend
 *   useCatalystIssue() to LEFT JOIN `defects` on the external/link key and
 *   pass the joined row through.
 *
 * Read-only in this pass — inline edit is a follow-up, matching the
 * pattern used by CatalystAcceptanceCriteria on initial ship.
 *
 * Guardrails (CLAUDE.md):
 *   - Hex literals only (no HSL).
 *   - No new npm dependencies; re-uses @atlaskit/heading already in deps.
 *   - No status-coloured lozenges (severity is not status — rendered as a
 *     neutral text chip with a semantic severity colour on the symbol only).
 */
import React from 'react';
import Heading from '@atlaskit/heading';
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
}

/* Jira-measured severity token. Colour is applied only to the leading
   glyph — the text stays neutral #292A2E so the block doesn't read as a
   status lozenge. Unknown values fall back to grey. */
const SEVERITY_COLOR: Record<string, string> = {
  Blocker: '#DE350B',
  Critical: '#DE350B',
  Major: '#FF8B00',
  Minor: '#36B37E',
  Trivial: '#6B778C',
};

/* Shared body-text style — matches CatalystAcceptanceCriteria exactly. */
const BODY_STYLE: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 400,
  color: '#292A2E',
  lineHeight: 1.5,
  fontFamily:
    '"Atlassian Sans", ui-sans-serif, -apple-system, "system-ui", sans-serif',
};

/* Empty-state muted copy — matches the placeholder style used across the
   Catalyst sidebar (#97A0AF). */
const EMPTY_STYLE: React.CSSProperties = {
  ...BODY_STYLE,
  color: '#97A0AF',
  fontStyle: 'italic',
};

function FieldBlock({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ marginBottom: 4 }}>
        <Heading size="small">{label}</Heading>
      </div>
      <div style={{ whiteSpace: 'pre-wrap' }}>{children}</div>
    </div>
  );
}

function Empty({ text = 'None' }: { text?: string }) {
  return <span style={EMPTY_STYLE}>{text}</span>;
}

function SeverityChip({ value }: { value: string }) {
  const colour = SEVERITY_COLOR[value] ?? '#6B778C';
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 14,
        fontWeight: 500,
        color: '#292A2E',
        fontFamily: BODY_STYLE.fontFamily,
      }}
    >
      <span
        aria-hidden
        style={{
          display: 'inline-block',
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: colour,
        }}
      />
      {value}
    </span>
  );
}

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

function FixVersionsList({ versions }: { versions: Array<{ name: string }> }) {
  if (!versions.length) return <Empty />;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {versions.map((v, i) => (
        <span
          key={i}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '2px 8px',
            fontSize: 12,
            fontWeight: 500,
            color: '#42526E',
            background: '#F4F5F7',
            border: '1px solid #DFE1E6',
            borderRadius: 3,
            fontFamily: BODY_STYLE.fontFamily,
          }}
        >
          {v.name}
        </span>
      ))}
    </div>
  );
}

export function CatalystDefectFields({
  issue,
  severity,
  environment,
  stepsToReproduce,
  foundInBuild,
  rootCause,
}: CatalystDefectFieldsProps) {
  // Normalize fix_versions — stored as Json, may be null or malformed.
  const fixVersions: Array<{ name: string }> = Array.isArray(issue?.fix_versions)
    ? (issue!.fix_versions as any[]).filter(
        (v): v is { name: string } =>
          !!v && typeof v === 'object' && typeof v.name === 'string',
      )
    : [];

  const resolution = issue?.resolution?.trim() || null;

  return (
    <section
      aria-label="Defect fields"
      style={{ marginBottom: 24 }}
    >
      <FieldBlock label="Severity">
        {severity ? <SeverityChip value={severity} /> : <Empty />}
      </FieldBlock>

      <FieldBlock label="Steps to Reproduce">
        {stepsToReproduce ? (
          <StepsList steps={stepsToReproduce} />
        ) : (
          <Empty text="Not documented" />
        )}
      </FieldBlock>

      <FieldBlock label="Environment">
        {environment ? <span style={BODY_STYLE}>{environment}</span> : <Empty />}
      </FieldBlock>

      <FieldBlock label="Found in build">
        {foundInBuild ? (
          <span style={BODY_STYLE}>{foundInBuild}</span>
        ) : (
          <Empty />
        )}
      </FieldBlock>

      <FieldBlock label="Fix in build">
        <FixVersionsList versions={fixVersions} />
      </FieldBlock>

      <FieldBlock label="Root Cause">
        {rootCause ? <span style={BODY_STYLE}>{rootCause}</span> : <Empty />}
      </FieldBlock>

      <FieldBlock label="Resolution">
        {resolution ? <span style={BODY_STYLE}>{resolution}</span> : <Empty />}
      </FieldBlock>
    </section>
  );
}
