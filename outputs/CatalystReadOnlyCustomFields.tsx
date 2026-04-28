/**
 * CatalystReadOnlyCustomFields — read-only displays for Jira customfields
 * that have no Catalyst typed column yet.
 *
 * jira-compare night session (2026-04-28) — S4 / S7 / S8.
 *
 * Each display reads `raw_json.fields.customfield_XXXXX` directly and
 * renders a Jira-parity row value. Edit affordance is intentionally
 * deferred until Lovable lands a typed column on `ph_issues`; the
 * universal MdtRef / AssessmentFeature pattern (see CatalystMdtRefField,
 * CatalystAssessmentFeatureField) is the migration template.
 *
 * Field IDs were probed via Atlassian MCP `getJiraIssueTypeMetaWithFields`
 * against project BAU on 2026-04-28:
 *   - customfield_10050  Service Now#                 (string,    QA Bug / Production Incident / Task)
 *   - customfield_10489  IR Demo Date                 (date,      Feature)
 *   - customfield_10492  IR Figma Approved            (multi-checkbox option array, Feature)
 *   - customfield_10493  IR Demo Approved             (multi-checkbox option array, Feature)
 *   - customfield_10108  Actual end (Arabic-labeled)  (date,      Epic)
 *   - customfield_10109  Actual start (Arabic-labeled)(date,      Epic)
 *
 * Rendering shape mirrors the read-only branches of CatalystMdtRefField
 * (same colour token #292A2E for filled, #6B6E76 for empty placeholder).
 */
import React from 'react';
import Lozenge from '@atlaskit/lozenge';
import type { PhIssue } from '../types';

interface DisplayProps {
  issue: PhIssue | null;
}

/* ------------------------------------------------------------------ */
/* Shared style helpers — keep parity with CatalystMdtRefField read   */
/* state (#292A2E filled, #6B6E76 empty). The font sizing matches     */
/* FieldRow's value cell measured against Jira on 2026-04-28.         */
/* ------------------------------------------------------------------ */

const VALUE_STYLE: React.CSSProperties = {
  fontSize: 14, lineHeight: '20px', color: '#292A2E',
  fontFamily: 'inherit',
};
const EMPTY_STYLE: React.CSSProperties = {
  fontSize: 14, lineHeight: '20px', color: '#6B6E76',
  fontFamily: 'inherit',
};

/** Format an ISO date string as Jira's "DD MMM YYYY" (eg "23 Sep 2025"). */
function formatJiraDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

/**
 * Multi-checkbox values come back as either an array of `{value,id}`
 * options or null. Defensive against `string` (some legacy payloads
 * stringify single options) and against a single object.
 */
function readMultiCheckboxValues(raw: unknown): string[] {
  if (raw == null) return [];
  if (Array.isArray(raw)) {
    return raw
      .map(o => (typeof o === 'string' ? o : (o as any)?.value))
      .filter((v): v is string => typeof v === 'string' && v.length > 0);
  }
  if (typeof raw === 'object') {
    const v = (raw as any)?.value;
    return typeof v === 'string' && v.length > 0 ? [v] : [];
  }
  if (typeof raw === 'string' && raw.length > 0) return [raw];
  return [];
}

/** Approval-style lozenge appearance map. Mirrors EditableFields' tonal
 *  vocabulary (success / removed / inprogress) — kept inline here since
 *  this component is read-only and the mapping is a 1-pass switch. */
function approvalAppearance(value: string): React.ComponentProps<typeof Lozenge>['appearance'] {
  const v = value.toLowerCase().trim();
  if (v === 'yes') return 'success';
  if (v === 'no') return 'removed';
  if (v === 'conditional') return 'inprogress';
  return 'default';
}

/* ------------------------------------------------------------------ */
/* S4 — Service Now#                                                   */
/* ------------------------------------------------------------------ */

export function CatalystServiceNowDisplay({ issue }: DisplayProps) {
  const value = ((issue as any)?.raw_json?.fields?.customfield_10050 ?? null) as string | null;
  if (!value || value.trim().length === 0) {
    return <span style={EMPTY_STYLE}>None</span>;
  }
  return <span style={VALUE_STYLE}>{value}</span>;
}

/* ------------------------------------------------------------------ */
/* S7 — Feature: IR Demo Date / IR Figma Approved / IR Demo Approved  */
/* ------------------------------------------------------------------ */

export function CatalystIRDemoDateDisplay({ issue }: DisplayProps) {
  const raw = ((issue as any)?.raw_json?.fields?.customfield_10489 ?? null) as string | null;
  const formatted = formatJiraDate(raw);
  if (!formatted) return <span style={EMPTY_STYLE}>None</span>;
  return <span style={VALUE_STYLE}>{formatted}</span>;
}

export function CatalystIRFigmaApprovedDisplay({ issue }: DisplayProps) {
  const raw = (issue as any)?.raw_json?.fields?.customfield_10492 ?? null;
  const values = readMultiCheckboxValues(raw);
  if (values.length === 0) return <span style={EMPTY_STYLE}>None</span>;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
      {values.map(v => (
        <Lozenge key={v} appearance={approvalAppearance(v)}>{v}</Lozenge>
      ))}
    </div>
  );
}

export function CatalystIRDemoApprovedDisplay({ issue }: DisplayProps) {
  const raw = (issue as any)?.raw_json?.fields?.customfield_10493 ?? null;
  const values = readMultiCheckboxValues(raw);
  if (values.length === 0) return <span style={EMPTY_STYLE}>None</span>;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
      {values.map(v => (
        <Lozenge key={v} appearance={approvalAppearance(v)}>{v}</Lozenge>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* S8 — Epic: Actual start / Actual end (Arabic-labeled in Jira)      */
/* ------------------------------------------------------------------ */

export function CatalystActualStartDisplay({ issue }: DisplayProps) {
  const raw = ((issue as any)?.raw_json?.fields?.customfield_10109 ?? null) as string | null;
  const formatted = formatJiraDate(raw);
  if (!formatted) return <span style={EMPTY_STYLE}>None</span>;
  return <span style={VALUE_STYLE}>{formatted}</span>;
}

export function CatalystActualEndDisplay({ issue }: DisplayProps) {
  const raw = ((issue as any)?.raw_json?.fields?.customfield_10108 ?? null) as string | null;
  const formatted = formatJiraDate(raw);
  if (!formatted) return <span style={EMPTY_STYLE}>None</span>;
  return <span style={VALUE_STYLE}>{formatted}</span>;
}
