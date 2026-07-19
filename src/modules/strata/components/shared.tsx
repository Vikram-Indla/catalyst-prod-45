/**
 * STRATA shared surface components — ADS tokens only, canonical primitives only.
 *
 * Visual language (D-012 executive lift, 2026-07-05) is lifted from the flagship
 * ReleaseHub Command Center (src/pages/releases + releasehub): joined KPI strip,
 * raised panel chrome with bordered headers, display-font tabular numerals,
 * icon-anchored sections, colored microcopy. Charts/micro-viz color with
 * SEMANTIC tokens (text-success/-danger/-warning/-information/-brand) — the
 * governed threshold band supplies the appearance; the UI never invents color.
 *
 * Data-state labels (live/draft/pending/locked) are SYSTEM states (DB CHECKs);
 * band labels/appearances come from governed threshold-scheme config at runtime.
 */
import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Button, DropdownMenu, Heading, Lozenge, ProgressBar, Select,
  Modal, ModalBody, ModalFooter, ModalHeader, ModalTitle, SectionMessage, Spinner, Textfield, Tooltip,
} from '@/components/ads';
import TextArea from '@atlaskit/textarea';
import { Routes } from '@/lib/routes';
import { ProjectPageHeader } from '@/components/layout/ProjectPageHeader';
import VisuallyHidden from '@atlaskit/visually-hidden';
import { ChevronDown, ChevronRight, Plus } from '@/lib/atlaskit-icons';
import { JiraTable } from '@/components/shared/JiraTable';
import type { Column } from '@/components/shared/JiraTable';
import { kpiApi } from '../domain';
import { useBandResolver, useInvalidateStrata, useKrReportability, useOkrOfficialProgress, useProfileNames, useReviews, useStrataContext, useStrategyElements } from '../hooks/useStrata';
import { StrataNotificationBell } from './StrataNotificationBell';
import { StrataNotificationBand } from './StrataSystemStates';
import { fmtDate, fmtPct, fmtRatioPct, fmtSarCompact, fmtScore, fmtUnit, labelize } from './format';
import type { DataState, StrataDependency, StrataKeyResult, StrataOkr, StrataProjectCard, ThresholdBand } from '../types';

const STALE = 30_000;

export const T = {
  text: 'var(--ds-text)',
  subtle: 'var(--ds-text-subtle)',
  subtlest: 'var(--ds-text-subtlest)',
  border: 'var(--ds-border)',
  surface: 'var(--ds-surface)',
  raised: 'var(--ds-surface-raised)',
  sunken: 'var(--ds-surface-sunken)',
  neutral: 'var(--ds-background-neutral)',
  selected: 'var(--ds-background-selected)',
  brandText: 'var(--ds-text-brand)',
  fontDisplay: 'var(--ds-font-family-heading)',
  fontBody: 'var(--ds-font-family-body)',
};

// ── Data-state lozenge (system states) ───────────────────────────────────────
const DATA_STATE_LOZENGE: Record<DataState, { label: string; appearance: React.ComponentProps<typeof Lozenge>['appearance']; bold?: boolean }> = {
  live: { label: 'Live', appearance: 'inprogress' },
  draft: { label: 'Draft', appearance: 'default' },
  pending_validation: { label: 'Pending validation', appearance: 'moved' },
  locked: { label: 'Locked', appearance: 'new', bold: true },
};

export function StrataDataStateLozenge({ state }: { state: DataState | string | null | undefined }) {
  if (!state) return null;
  const cfg = DATA_STATE_LOZENGE[state as DataState];
  if (!cfg) return <Lozenge appearance="default">{String(state).replace(/_/g, ' ')}</Lozenge>;
  return <Lozenge appearance={cfg.appearance} isBold={cfg.bold}>{cfg.label}</Lozenge>;
}

// ── Project Card execution health lozenge (Execution Health & Forecast Calc) ─
// `calculated_health` is a FIXED server-calculated enum, NOT a governed
// threshold-scheme band — it never resolves through useBandResolver(). See D-022.
export type ExecutionHealthKey = 'on_hold' | 'not_available' | 'not_started' | 'major_delay' | 'minor_delay' | 'on_track';
export const EXECUTION_HEALTH_LABEL: Record<ExecutionHealthKey, string> = {
  on_track: 'On Track', minor_delay: 'Minor Delay', major_delay: 'Major Delay',
  not_started: 'Not Started', not_available: 'Not Available', on_hold: 'On Hold',
};
const EXECUTION_HEALTH_APPEARANCE: Record<ExecutionHealthKey, React.ComponentProps<typeof Lozenge>['appearance']> = {
  on_track: 'success', minor_delay: 'moved', major_delay: 'removed',
  not_started: 'default', not_available: 'default', on_hold: 'default',
};
/** Same data-viz tone StrataExecutionHealthLozenge renders with, for dense
 * table cells (e.g. an already-labeled column header) where a full Lozenge
 * pill would be redundant — one canonical source instead of a duplicated map. */
export function executionHealthTone(key: ExecutionHealthKey): string {
  return appearanceTone(EXECUTION_HEALTH_APPEARANCE[key]);
}
// Meanings mirror the server rules in strata_calc_execution_progress
// (20260706231000) verbatim — if the RPC thresholds change, change these too.
const EXECUTION_HEALTH_MEANING: Record<ExecutionHealthKey, string> = {
  on_track: 'Schedule variance is under 10% and forecast is within 30 days of baseline end.',
  minor_delay: 'Schedule variance is in the 10–20% minor-delay band.',
  major_delay: 'Schedule variance is at or above 20%, or forecast end is more than 30 days beyond baseline end.',
  not_started: 'Baseline window has not started and no progress recorded yet.',
  not_available: 'Insufficient milestone baseline or progress data to calculate health.',
  on_hold: 'Project is on hold — excluded from execution rollups.',
};
export function StrataExecutionHealthLozenge({ health }: { health: ExecutionHealthKey | string | null | undefined }) {
  const key = (health ?? 'not_available') as ExecutionHealthKey;
  const label = EXECUTION_HEALTH_LABEL[key] ?? String(health);
  const lozenge = <Lozenge appearance={EXECUTION_HEALTH_APPEARANCE[key] ?? 'default'}>{label}</Lozenge>;
  const meaning = EXECUTION_HEALTH_MEANING[key];
  if (!meaning) return lozenge;
  return <Tooltip content={`${label} — ${meaning}`}><span style={{ display: 'inline-flex' }}>{lozenge}</span></Tooltip>;
}

// ── Band lozenge + band tone (governed config; zero-assumption when unknown) ─
export function StrataBandLozenge({ bandKey, band }: { bandKey?: string | null; band?: ThresholdBand | null }) {
  const resolve = useBandResolver();
  const resolved = band ?? resolve(bandKey ?? null);
  if (!resolved) return bandKey ? <Lozenge appearance="default">{bandKey}</Lozenge> : null;
  return (
    <Tooltip content={`${resolved.label} — governed threshold band, score ≥ ${resolved.min_score}.`}>
      <span style={{ display: 'inline-flex' }}>
        <Lozenge appearance={(resolved.appearance as React.ComponentProps<typeof Lozenge>['appearance']) ?? 'default'}>
          {resolved.label}
        </Lozenge>
      </span>
    </Tooltip>
  );
}

/** Semantic data-viz color per governed band appearance. Unknown → neutral. */
const APPEARANCE_TONE: Record<string, string> = {
  success: 'var(--ds-text-success)',
  inprogress: 'var(--ds-text-information)',
  moved: 'var(--ds-text-warning)',
  removed: 'var(--ds-text-danger)',
  new: 'var(--ds-background-discovery-bold)',
  default: 'var(--ds-text-subtlest)',
};
export function appearanceTone(appearance?: string | null): string {
  return APPEARANCE_TONE[appearance ?? 'default'] ?? APPEARANCE_TONE.default;
}
/** Resolve a governed band key straight to its data-viz tone. */
export function useBandTone(): (bandKey?: string | null) => string {
  const resolve = useBandResolver();
  return (bandKey) => appearanceTone(resolve(bandKey ?? null)?.appearance ?? null);
}

// ── Score ring (micro-gauge; no canonical gauge exists — token-pure SVG) ─────
export function StrataScoreRing({
  score, bandKey, size = 64, strokeWidth = 6, testId,
}: { score: number | null | undefined; bandKey?: string | null; size?: number; strokeWidth?: number; testId?: string }) {
  const tone = useBandTone()(bandKey);
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const clamped = score == null ? 0 : Math.max(0, Math.min(100, score));
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }} data-testid={testId} aria-hidden>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={T.neutral} strokeWidth={strokeWidth} />
        {score != null ? (
          <circle
            cx={size / 2} cy={size / 2} r={r} fill="none" stroke={tone} strokeWidth={strokeWidth}
            strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - clamped / 100)}
          />
        ) : null}
      </svg>
      <span style={{
        position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: T.fontDisplay, fontSize: size >= 64 ? 16 : 13, fontWeight: 700, color: T.text,
        fontVariantNumeric: 'tabular-nums',
      }}>
        {fmtScore(score)}
      </span>
    </div>
  );
}

// ── Segmented value bar (Command Room SRC-M5) ────────────────────────────────
// Planned→Forecast→Realized→Validated as ONE visual; leakage = the visible gap.
// No canonical magnitude-overlay bar exists: WorkItemsProgressBar's contract is
// count buckets partitioning a total, while value kinds are NESTED magnitudes
// (validated ⊆ realized; forecast vs planned reference) — proof in sessions/011.
// Token-pure like StrataScoreRing; zero-assumption (renders nothing w/o scale).
export function StrataValueBar({
  planned, forecast, realized, validated, periodName, testId, variant = 'default', scaleOverride,
}: {
  planned: number | null; forecast: number | null; realized: number | null; validated: number | null;
  periodName?: string | null; testId?: string;
  // 'default' = single overlaid bar + legend (existing). 'hero' = labelled stacked rows
  // (anchor 08/21). 'multiple' = compact 3-bar stack for small multiples (anchor 22).
  variant?: 'default' | 'hero' | 'multiple';
  // Denominator override so several bars share one scale (anchor-22 small multiples,
  // planned = 100% of the largest portfolio). Default = this bar's own max (unchanged).
  scaleOverride?: number | null;
}) {
  const selfScale = Math.max(planned ?? 0, forecast ?? 0, realized ?? 0);
  const scale = scaleOverride != null && scaleOverride > 0 ? scaleOverride : selfScale;
  if (!(scale > 0)) return null;
  const pct = (v: number | null) => (v == null ? null : Math.max(0, Math.min(100, (v / scale) * 100)));
  const p = pct(planned); const f = pct(forecast); const r = pct(realized); const va = pct(validated);
  const leakage = planned != null && forecast != null && forecast < planned ? planned - forecast : null;
  const summary = [
    planned != null ? `Planned ${fmtSarCompact(planned)}` : null,
    forecast != null ? `Forecast ${fmtSarCompact(forecast)}` : null,
    realized != null ? `Realized ${fmtSarCompact(realized)}` : null,
    validated != null ? `Validated ${fmtSarCompact(validated)}` : null,
    leakage != null ? `Leakage ${fmtSarCompact(leakage)}` : null,
  ].filter(Boolean).join(' · ');

  // Hero: labelled stacked rows (Planned/Forecast/Realized/Validated), amounts on the
  // right, leakage drawn on the Forecast row (anchor 08 waterfall + anchor 21 stages).
  if (variant === 'hero') {
    const rows: { label: string; v: number | null; w: number | null; color: string; gap: boolean }[] = [
      { label: 'Planned', v: planned, w: p, color: 'var(--ds-border-bold)', gap: false },
      { label: 'Forecast', v: forecast, w: f, color: 'var(--ds-background-information)', gap: true },
      { label: 'Realized', v: realized, w: r, color: 'var(--ds-background-success)', gap: false },
      { label: 'Validated', v: validated, w: va, color: 'var(--ds-background-success-bold)', gap: false },
    ];
    return (
      <div data-testid={testId} role="img" aria-label={summary} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-100)' }}>
        {rows.map((row) => (
          <div key={row.label} style={{ display: 'grid', gridTemplateColumns: '90px minmax(0, 1fr) 110px', gap: 12, alignItems: 'center' }}>
            <span style={{ fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: T.subtle }}>{row.label}</span>
            <div style={{ position: 'relative', height: 16, borderRadius: 4, background: 'var(--ds-background-neutral)', overflow: 'hidden' }}>
              {row.w != null ? <div style={{ position: 'absolute', left: 0, width: `${row.w}%`, top: 0, bottom: 0, background: row.color, borderRadius: 4 }} /> : null}
              {row.gap && leakage != null && f != null && p != null ? <div style={{ position: 'absolute', left: `${f}%`, width: `${p - f}%`, top: 0, bottom: 0, background: 'var(--ds-background-danger)' }} /> : null}
            </div>
            <strong style={{ fontSize: 'var(--ds-font-size-200)', fontWeight: 700, color: T.text, fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>{row.v != null ? fmtSarCompact(row.v) : '—'}</strong>
          </div>
        ))}
      </div>
    );
  }

  // Multiple: compact 3-bar stack (planned · forecast+leakage · validated) on a shared
  // scale, no labels — for the portfolio small-multiples grid (anchor 22).
  if (variant === 'multiple') {
    const miniBar = (w: number | null, color: string, withGap: boolean) => (
      <div style={{ position: 'relative', height: 10, borderRadius: 3, background: 'var(--ds-background-neutral)', overflow: 'hidden' }}>
        {w != null ? <div style={{ position: 'absolute', left: 0, width: `${w}%`, top: 0, bottom: 0, background: color, borderRadius: 3 }} /> : null}
        {withGap && leakage != null && f != null && p != null ? <div style={{ position: 'absolute', left: `${f}%`, width: `${p - f}%`, top: 0, bottom: 0, background: 'var(--ds-background-danger)' }} /> : null}
      </div>
    );
    return (
      <Tooltip content={`${periodName ? `${periodName} — ` : ''}${summary}`}>
        <div data-testid={testId} role="img" aria-label={summary} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {miniBar(p, 'var(--ds-border-bold)', false)}
          {miniBar(f, 'var(--ds-background-information)', true)}
          {miniBar(va, 'var(--ds-background-success-bold)', false)}
        </div>
      </Tooltip>
    );
  }

  return (
    <div data-testid={testId} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <Tooltip content={`${periodName ? `${periodName} — ` : ''}${summary}`}>
        <div role="img" aria-label={summary} style={{
          position: 'relative', height: 10, borderRadius: 5, overflow: 'hidden',
          background: 'var(--ds-background-neutral)',
        }}>
          {leakage != null && f != null && p != null ? (
            <div style={{ position: 'absolute', left: `${f}%`, width: `${p - f}%`, top: 0, bottom: 0, background: 'var(--ds-background-danger)' }} />
          ) : null}
          {r != null ? (
            <div style={{ position: 'absolute', left: 0, width: `${r}%`, top: 0, bottom: 0, background: 'var(--ds-background-success)' }} />
          ) : null}
          {va != null ? (
            <div style={{ position: 'absolute', left: 0, width: `${va}%`, top: 0, bottom: 0, background: 'var(--ds-background-success-bold)' }} />
          ) : null}
          {f != null ? (
            <div style={{ position: 'absolute', left: `calc(${f}% - 1px)`, width: 2, top: 0, bottom: 0, background: 'var(--ds-border-bold)' }} />
          ) : null}
        </div>
      </Tooltip>
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 'var(--ds-font-size-100)', color: T.subtle }}>
        <ValueBarKey swatch="var(--ds-background-neutral)" label="Planned" text={planned != null ? fmtSarCompact(planned) : '—'} />
        <ValueBarKey swatch="var(--ds-border-bold)" label="Forecast" text={forecast != null ? fmtSarCompact(forecast) : '—'} />
        <ValueBarKey swatch="var(--ds-background-success)" label="Realized" text={realized != null ? fmtSarCompact(realized) : '—'} />
        <ValueBarKey swatch="var(--ds-background-success-bold)" label="Validated" text={validated != null ? fmtSarCompact(validated) : '—'} />
        {leakage != null ? (
          <ValueBarKey swatch="var(--ds-background-danger)" label="Leakage" text={fmtSarCompact(leakage)} />
        ) : null}
      </div>
    </div>
  );
}

function ValueBarKey({ swatch, label, text }: { swatch: string; label: string; text: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
      <span aria-hidden style={{ width: 10, height: 10, borderRadius: 2, background: swatch, flexShrink: 0, border: `1px solid ${T.border}` }} />
      {label} <strong style={{ color: T.text, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{text}</strong>
    </span>
  );
}

// ── Band bar (weighted score bar colored by governed band) ──────────────────
export function StrataBandBar({
  value, bandKey, height = 6,
}: { value: number | null | undefined; bandKey?: string | null; height?: number }) {
  const tone = useBandTone()(bandKey);
  const clamped = value == null ? 0 : Math.max(0, Math.min(100, value));
  return (
    <div style={{ height, borderRadius: height / 2, background: T.neutral, overflow: 'hidden' }} aria-hidden>
      <div style={{ height: '100%', borderRadius: height / 2, background: tone, width: `${clamped}%` }} />
    </div>
  );
}

// ── Trend sparkline (token-pure SVG; success/danger by direction) ───────────
export function StrataTrendSpark({
  points, width = 88, height = 24, higherIsBetter = true,
}: { points: Array<number | null | undefined>; width?: number; height?: number; higherIsBetter?: boolean }) {
  const vals = points.filter((p): p is number => p != null && Number.isFinite(p));
  if (vals.length < 2) return null;
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const span = max - min || 1;
  const step = width / (vals.length - 1);
  const pts = vals.map((v, i) => `${(i * step).toFixed(1)},${(height - 3 - ((v - min) / span) * (height - 6)).toFixed(1)}`);
  const rising = vals[vals.length - 1] >= vals[0];
  const good = higherIsBetter ? rising : !rising;
  const stroke = vals[vals.length - 1] === vals[0]
    ? 'var(--ds-text-subtlest)'
    : good ? 'var(--ds-text-success)' : 'var(--ds-text-danger)';
  const [lx, ly] = pts[pts.length - 1].split(',');
  return (
    <svg width={width} height={height} aria-hidden style={{ flexShrink: 0 }}>
      <polyline points={pts.join(' ')} fill="none" stroke={stroke} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={lx} cy={ly} r={2.5} fill={stroke} />
    </svg>
  );
}

// ── Chip menu ────────────────────────────────────────────────────────────────
// Canonical ads DropdownMenu wrapper: its custom-trigger path now attaches
// Atlaskit's triggerRef to the anchor span (fixed 2026-07-05), so the chip
// anchors correctly and Atlaskit owns the overlay, keyboard nav, and the
// selected-item checkmark. Same trigger idiom as WorkstreamsManagerPage.
export interface StrataMenuOption {
  key: string;
  label: React.ReactNode;
  isSelected?: boolean;
  onClick?: () => void;
}

export function StrataChipMenu({
  label, value, active, options, testId, 'aria-label': ariaLabel,
}: {
  label?: string;
  value: React.ReactNode;
  active?: boolean;
  options: StrataMenuOption[];
  testId?: string;
  'aria-label'?: string;
}) {
  return (
    <DropdownMenu
      aria-label={ariaLabel}
      testId={testId}
      minWidth={180}
      trigger={({ isSelected }) => {
        const highlighted = active || isSelected;
        return (
          <button
            type="button"
            aria-label={ariaLabel}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8, height: 28, padding: '0 12px',
              borderRadius: 6, cursor: 'pointer', whiteSpace: 'nowrap', font: 'inherit',
              border: `1px solid ${highlighted ? 'var(--ds-border-focused)' : T.border}`,
              background: highlighted ? T.selected : T.raised,
              fontSize: 'var(--ds-font-size-100)', color: T.subtle,
            }}
          >
            {label}
            <strong style={{ color: T.text, fontWeight: 600 }}>{value}</strong>
            <ChevronDown size={12} />
          </button>
        );
      }}
      groups={[{
        key: 'options',
        items: options.map((o) => ({
          key: o.key,
          label: o.label,
          isSelected: o.isSelected,
          onClick: o.onClick,
        })),
      }]}
    />
  );
}

// ── Page chrome: icon + title + actions, then governed context toolbar ──────

function StrataContextToolbar({
  modelLabel, extra, state, scope, freshness,
}: { modelLabel?: string | null; extra?: React.ReactNode; state?: DataState | string | null; scope?: React.ReactNode; freshness?: React.ReactNode }) {
  const { cycles, periods, activeCycle, activePeriod, setActiveCycleId, setActivePeriodId } = useStrataContext();
  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
        paddingBottom: 12, borderBottom: `1px solid ${T.border}`,
      }}
      data-testid="strata-config-context"
    >
      <StrataChipMenu
        label="Cycle"
        value={activeCycle?.name ?? '—'}
        aria-label="Select strategy cycle"
        options={cycles.map((c) => ({
          key: c.id, label: c.name, isSelected: c.id === activeCycle?.id, onClick: () => setActiveCycleId(c.id),
        }))}
      />
      <StrataChipMenu
        label="Period"
        value={activePeriod?.name ?? '—'}
        aria-label="Select period"
        options={periods.map((p) => ({
          key: p.id,
          label: `${p.name}${p.close_status === 'closed' ? ' · closed' : ''}`,
          isSelected: p.id === activePeriod?.id,
          onClick: () => setActivePeriodId(p.id),
        }))}
      />
      {scope}
      {modelLabel ? (
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 8, height: 28, padding: '0 12px',
          borderRadius: 6, border: `1px solid ${T.border}`, background: T.raised,
          fontSize: 'var(--ds-font-size-100)', color: T.subtle, whiteSpace: 'nowrap',
        }}>
          Model <strong style={{ color: T.text, fontWeight: 600 }}>{modelLabel}</strong>
        </span>
      ) : null}
      {extra}
      <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        {freshness}
        <StrataDataStateLozenge state={state ?? null} />
      </span>
    </div>
  );
}

export function StrataPageChrome({
  icon, title, description, actions, modelLabel, state, extra, testId,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  modelLabel?: string | null;
  extra?: React.ReactNode;
  state?: DataState | string | null;
  testId?: string;
}) {
  return (
    <div data-testid={testId} style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, minWidth: 0 }}>
        {icon ? (
          <span aria-hidden style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 36, height: 36, borderRadius: 8, background: T.selected, color: T.brandText, flexShrink: 0,
          }}>
            {icon}
          </span>
        ) : null}
        <div style={{ minWidth: 0, flex: '1 1 auto' }}>
          <Heading as="h1" size="large">{title}</Heading>
          {description ? (
            <p style={{ margin: '4px 0 0', fontSize: 'var(--ds-font-size-100)', color: T.subtlest }}>{description}</p>
          ) : null}
        </div>
        {actions ? <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>{actions}</div> : null}
      </div>
      <StrataContextToolbar modelLabel={modelLabel} extra={extra} state={state} />
    </div>
  );
}

/**
 * StrataPageShell — canonical page chrome (2026-06-14 breadcrumb directive).
 * ProjectPageHeader (hubType strata) pulled to the HubSurface panel edge with
 * the flagship negative-margin pattern, then the governed context toolbar.
 * Pages render inside the full panel width — no PageContainer, no max-width.
 */
export function StrataPageShell({
  trail, title, hideTitle, headerActions, modelLabel, state, extra, scope, freshness, toolbarActions, docTitle, children, testId,
}: {
  /** Detail-page crumb trail after "Home / STRATA"; index pages omit it. */
  trail?: { text: string; href?: string; onClick?: () => void }[];
  /** Override the auto-derived H2 (entity name on detail pages). */
  title?: React.ReactNode;
  hideTitle?: boolean;
  headerActions?: React.ReactNode;
  modelLabel?: string | null;
  state?: DataState | string | null;
  extra?: React.ReactNode;
  /** Governed scope slot on the context spine (e.g. sector / role chip). */
  scope?: React.ReactNode;
  /** "As of" freshness slot rendered next to the data-state lozenge. */
  freshness?: React.ReactNode;
  toolbarActions?: React.ReactNode;
  /** Browser-tab title (entity name — fixes slug-cased document titles). */
  docTitle?: string;
  children: React.ReactNode;
  testId?: string;
}) {
  React.useEffect(() => {
    if (docTitle) document.title = `${docTitle} · Catalyst`;
  }, [docTitle]);
  return (
    <div data-testid={testId} className="strata-page-shell" style={{ minWidth: 0 }}>
      {/* Scoped to STRATA only: JiraTable's grid wrapper is overflow-x hidden and
        * hard-clips trailing columns (Validator / Realized) when rows outgrow the
        * panel; inside STRATA it must scroll instead. */}
      <style>{'.strata-page-shell .jira-table-grid{overflow-x:auto;}'}</style>
      {/* No negative-margin pull: the HubSurface content wrapper is overflow:clip,
        * so overhanging it clips the header's left edge (the "TRATA" bug —
        * CAT-STRATA-ADS-UPLIFT-20260706-001). Align to the content grid instead. */}
      <div style={{ margin: '-12px 0 0' }}>
        <ProjectPageHeader
          hubType="strata"
          paddingX={0}
          trail={trail}
          title={title}
          hideTitle={hideTitle}
          actions={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><StrataNotificationBell />{headerActions}</span>}
        />
      </div>
      <div style={{ margin: '8px 0 16px' }}>
        <StrataContextToolbar modelLabel={modelLabel} scope={scope} freshness={freshness} extra={
          <>
            {extra}
            {toolbarActions ? <span style={{ display: 'inline-flex', gap: 8, marginLeft: 8 }}>{toolbarActions}</span> : null}
          </>
        } state={state} />
      </div>
      {/* "Why am I here" band for notification deep-links (anchor 28 state 3).
        * Mounted once here so every STRATA object page gets it; renders nothing
        * unless the URL carries ?n=<notificationId>. */}
      <StrataNotificationBand />
      {children}
    </div>
  );
}

/**
 * StrataSnapshotBand — locked-mode chrome band (proposal §18; anchor 01 locked).
 * Discovery-toned band that persists across drills when a governed snapshot is the
 * basis of the view. State taxonomy: live/locked = chrome-level band; the word
 * "LOCKED SNAPSHOT" carries the meaning (color never alone). Tokens only.
 */
export function StrataSnapshotBand({
  snapshotKey, frozenAt, basis, actions, testId,
}: {
  /** Human snapshot key, e.g. "SNAP-2026Q2-03". */
  snapshotKey: string;
  /** Pre-formatted freeze timestamp, e.g. "30 Jun 2026, 18:02". */
  frozenAt?: string | null;
  /** Why this snapshot is the basis (e.g. "basis of the Q2 Enterprise Review"). */
  basis?: React.ReactNode;
  /** Right-aligned canonical actions (e.g. Return to live / Compare with live). */
  actions?: React.ReactNode;
  testId?: string;
}) {
  return (
    <div
      data-testid={testId}
      role="status"
      style={{
        display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
        padding: '8px 12px', borderRadius: 8,
        border: '1px solid var(--ds-background-discovery-bold)',
        background: 'var(--ds-background-discovery)',
      }}
    >
      <Lozenge appearance="new" isBold>Locked snapshot</Lozenge>
      <span style={{ fontSize: 'var(--ds-font-size-100)', color: T.text, minWidth: 0 }}>
        <strong style={{ fontWeight: 600 }}>{snapshotKey}</strong>
        {frozenAt ? <> · frozen {frozenAt}</> : null}
        {basis ? <> · {basis}</> : null}
      </span>
      {actions ? (
        <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          {actions}
        </span>
      ) : null}
    </div>
  );
}

// ── Chain strip (relationship lineage — "what sits above and below") ──────────
// Canonical "IN THE CHAIN" strip (anchors 06/14/02). Compact, token-pure, param'd
// by segments; zero-assumption — an empty segment shows emptyText, never invented
// links. (Extracted per D-7; distinct from the richer EvidencePage lineage panel.)
export interface StrataChainLink {
  name: string;
  /** Present → renders a keyboard link; absent → plain text (unresolved/unlinked). */
  onNav?: () => void;
  /** Trailing meta after the name (owner, weight, "1 blocked", SAR planned). */
  meta?: React.ReactNode;
  /** 'danger' emphasises a broken/blocked link (color + weight; never color alone). */
  tone?: 'default' | 'danger';
}
export interface StrataChainSegment {
  /** Leading glyph/icon (↑ ◎ ▦ ◇ ⚖) — decorative. */
  icon?: React.ReactNode;
  label: string;
  items: StrataChainLink[];
  /** Shown when items is empty (zero-assumption). */
  emptyText?: string;
}
export function StrataChainStrip({
  segments, heading = 'IN THE CHAIN', testId,
}: { segments: StrataChainSegment[]; heading?: string; testId?: string }) {
  return (
    <div
      data-testid={testId}
      style={{
        border: `1px solid ${T.border}`, borderRadius: 8, background: T.sunken,
        padding: 'var(--ds-space-150) var(--ds-space-200)', minWidth: 0,
      }}
    >
      <div style={{
        fontSize: 'var(--ds-font-size-050)', fontWeight: 700, letterSpacing: '0.06em',
        color: T.subtlest, marginBottom: 'var(--ds-space-075)',
      }}>
        {heading}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-050)' }}>
        {segments.map((seg, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: 8, minWidth: 0, flexWrap: 'wrap', fontSize: 'var(--ds-font-size-100)' }}>
            {seg.icon != null ? <span aria-hidden style={{ color: T.subtle }}>{seg.icon}</span> : null}
            <span style={{ color: T.subtlest, whiteSpace: 'nowrap' }}>{seg.label}</span>
            <span aria-hidden style={{ color: T.subtlest }}>·</span>
            {seg.items.length === 0 ? (
              <span style={{ color: T.subtlest }}>{seg.emptyText ?? '—'}</span>
            ) : (
              seg.items.map((it, j) => (
                <React.Fragment key={j}>
                  {j > 0 ? <span aria-hidden style={{ color: T.subtlest }}>,</span> : null}
                  {it.onNav ? (
                    <button
                      type="button"
                      onClick={it.onNav}
                      style={{
                        background: 'none', border: 'none', padding: 0, margin: 0, font: 'inherit',
                        color: it.tone === 'danger' ? 'var(--ds-text-danger)' : 'var(--ds-link)',
                        cursor: 'pointer', textDecoration: 'underline',
                        fontWeight: it.tone === 'danger' ? 600 : 400,
                      }}
                    >
                      {it.name}
                    </button>
                  ) : (
                    <span style={{ color: it.tone === 'danger' ? 'var(--ds-text-danger)' : T.text, fontWeight: it.tone === 'danger' ? 600 : 400 }}>
                      {it.name}
                    </span>
                  )}
                  {it.meta != null ? <span style={{ color: T.subtlest, whiteSpace: 'nowrap' }}>{it.meta}</span> : null}
                </React.Fragment>
              ))
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Decision modal (governance verdicts — SoD errors surface HERE, never silent) ──
export interface StrataDecisionOption {
  value: string;
  label: string;
  appearance?: 'primary' | 'danger' | 'default';
}

export function StrataDecisionModal({
  open, onClose, title, description, options, confirmLabel = 'Confirm', requireNote = false, onConfirm, testId,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: React.ReactNode;
  options: StrataDecisionOption[];
  confirmLabel?: string;
  requireNote?: boolean;
  /** Throws on RPC/SoD failure — error text renders in the modal. */
  onConfirm: (verdict: string, note: string) => Promise<void>;
  testId?: string;
}) {
  const [verdict, setVerdict] = useState<string>(options[0]?.value ?? '');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  React.useEffect(() => {
    if (open) { setVerdict(options[0]?.value ?? ''); setNote(''); setError(null); setBusy(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  if (!open) return null;
  const confirm = async () => {
    setBusy(true); setError(null);
    try {
      await onConfirm(verdict, note.trim());
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal isOpen onClose={busy ? () => {} : onClose} width="small" testId={testId}>
      <ModalHeader><ModalTitle>{title}</ModalTitle></ModalHeader>
      <ModalBody>
        {description ? <p style={{ margin: '0 0 12px', fontSize: 'var(--ds-font-size-200)', color: T.subtle }}>{description}</p> : null}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => setVerdict(o.value)}
              style={{
                height: 32, padding: '0 12px', borderRadius: 6, cursor: 'pointer', font: 'inherit',
                fontSize: 'var(--ds-font-size-200)', fontWeight: 600,
                border: `1px solid ${verdict === o.value ? 'var(--ds-border-focused)' : T.border}`,
                background: verdict === o.value ? T.selected : T.raised,
                color: o.appearance === 'danger' ? 'var(--ds-text-danger)' : T.text,
              }}
            >
              {o.label}
            </button>
          ))}
        </div>
        <Textfield
          placeholder={requireNote ? 'Reason (required)' : 'Note (optional)'}
          value={note}
          onChange={(e) => setNote((e.target as HTMLInputElement).value)}
          aria-label="Decision note"
        />
        {error ? (
          <div style={{ marginTop: 12 }}>
            <SectionMessage appearance="error" title="Action rejected">
              <p>{error}</p>
            </SectionMessage>
          </div>
        ) : null}
      </ModalBody>
      <ModalFooter>
        <Button appearance="subtle" onClick={onClose} isDisabled={busy}>Cancel</Button>
        <Button
          appearance="primary"
          onClick={confirm}
          isDisabled={busy || !verdict || (requireNote && note.trim().length === 0)}
        >
          {busy ? 'Working…' : confirmLabel}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

/** Back-compat: bare context toolbar for pages not yet on StrataPageChrome. */
export function StrataConfigContextBar({
  modelLabel, extra, state,
}: { modelLabel?: string | null; extra?: React.ReactNode; state?: DataState | string | null }) {
  return <div style={{ marginBottom: 16 }}><StrataContextToolbar modelLabel={modelLabel} extra={extra} state={state} /></div>;
}

// ── Executive stat strip (flagship joined-card pattern) ──────────────────────
export type StatTone = 'success' | 'danger' | 'warning' | 'neutral';
const TONE_COLOR: Record<StatTone, string> = {
  success: 'var(--ds-text-success)',
  danger: 'var(--ds-text-danger)',
  warning: 'var(--ds-text-warning)',
  neutral: 'var(--ds-text-subtlest)',
};

export interface StrataStat {
  key: string;
  label: string;
  value: React.ReactNode;
  /** Accessible in-context methodology (population, weighting, rounding, exclusions)
   * surfaced as a Tooltip on the label so governed metrics are reproducible (V6-OPEN-036). */
  helpText?: string;
  caption?: React.ReactNode;
  captionTone?: StatTone;
  bandKey?: string | null;
  ring?: { score: number | null | undefined; bandKey?: string | null };
  spark?: Array<number | null | undefined>;
  onClick?: () => void;
  testId?: string;
}

export function StrataStatStrip({ items, testId }: { items: StrataStat[]; testId?: string }) {
  const [hover, setHover] = useState<string | null>(null);
  return (
    <div
      data-testid={testId}
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))`,
        background: T.raised, border: `1px solid ${T.border}`, borderRadius: 8,
        overflow: 'hidden', marginBottom: 16,
      }}
    >
      {items.map((m, i) => {
        const clickable = !!m.onClick;
        const hasHelp = !!m.helpText;
        // V6-OPEN-036: a non-clickable roll-up that carries a methodology (helpText)
        // must stay reachable by keyboard and assistive tech. A `disabled` button is
        // removed from the tab order and cannot host an accessible name/description, so
        // the hover-only Tooltip was invisible to AT. Keep such a tile a live, focusable
        // button (disabled only when it has neither a click action nor help) so the
        // @atlaskit Tooltip also fires on focus, give it an accessible name, and expose
        // the full methodology through aria-describedby → a VisuallyHidden node.
        const describeId = hasHelp ? `strata-stat-help-${m.key}` : undefined;
        const ariaLabel = hasHelp && typeof m.value === 'string' ? `${m.label}: ${m.value}` : undefined;
        return (
          <button
            key={m.key}
            type="button"
            onClick={m.onClick}
            disabled={!clickable && !hasHelp}
            aria-label={ariaLabel}
            aria-describedby={describeId}
            onMouseEnter={() => setHover(m.key)}
            onMouseLeave={() => setHover(null)}
            data-testid={m.testId}
            style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '16px 16px', textAlign: 'left',
              background: clickable && hover === m.key ? T.sunken : 'transparent',
              border: 'none', borderRight: i < items.length - 1 ? `1px solid ${T.border}` : 'none',
              cursor: clickable ? 'pointer' : 'default', minWidth: 0, font: 'inherit',
            }}
          >
            {hasHelp ? <VisuallyHidden id={describeId}>{m.helpText}</VisuallyHidden> : null}
            {m.ring ? <StrataScoreRing score={m.ring.score} bandKey={m.ring.bandKey} size={56} strokeWidth={5} /> : null}
            <span style={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
              {m.helpText ? (
                <Tooltip content={m.helpText}>
                  <span style={{
                    fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: T.subtlest,
                    letterSpacing: '0.04em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    borderBottom: `1px dotted ${T.border}`, cursor: 'help',
                  }}>
                    {m.label}
                  </span>
                </Tooltip>
              ) : (
                <span style={{
                  fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: T.subtlest,
                  letterSpacing: '0.04em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {m.label}
                </span>
              )}
              <span style={{ display: 'flex', alignItems: 'baseline', gap: 8, margin: '8px 0 4px' }}>
                <span style={{
                  fontFamily: T.fontDisplay, fontSize: m.ring ? 24 : 28, fontWeight: 700, color: T.text,
                  lineHeight: 1, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap',
                }}>
                  {m.value}
                </span>
                {m.bandKey ? <StrataBandLozenge bandKey={m.bandKey} /> : null}
                {m.spark ? <StrataTrendSpark points={m.spark} width={64} height={20} /> : null}
              </span>
              {m.caption ? (
                <span style={{
                  fontSize: 'var(--ds-font-size-100)', fontWeight: 500,
                  color: TONE_COLOR[m.captionTone ?? 'neutral'],
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {m.caption}
                </span>
              ) : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ── Metric stat tile (standalone card variant) ───────────────────────────────
export function StrataMetricStat({
  label, value, caption, bandKey, onClick, testId, icon, spark,
}: {
  label: string;
  value: React.ReactNode;
  caption?: React.ReactNode;
  bandKey?: string | null;
  onClick?: () => void;
  testId?: string;
  icon?: React.ReactNode;
  spark?: Array<number | null | undefined>;
}) {
  const clickable = !!onClick;
  const [hover, setHover] = useState(false);
  return (
    <div
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={onClick}
      onKeyDown={clickable ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick?.(); } } : undefined}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      data-testid={testId}
      style={{
        background: clickable && hover ? T.sunken : T.raised,
        border: `1px solid ${T.border}`,
        borderRadius: 8, padding: '16px 16px', minWidth: 0,
        cursor: clickable ? 'pointer' : 'default',
        display: 'flex', flexDirection: 'column', gap: 6,
        boxShadow: 'var(--ds-shadow-raised)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: T.subtlest, letterSpacing: '0.04em',
        }}>
          {icon}{label}
        </span>
        <StrataBandLozenge bandKey={bandKey} />
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span style={{
          fontFamily: T.fontDisplay, fontSize: 28, fontWeight: 700, color: T.text,
          lineHeight: 1.1, fontVariantNumeric: 'tabular-nums',
        }}>
          {value}
        </span>
        {spark ? <StrataTrendSpark points={spark} /> : null}
      </div>
      {caption ? <div style={{ fontSize: 'var(--ds-font-size-100)', color: T.subtlest }}>{caption}</div> : null}
    </div>
  );
}

// ── Lifecycle stepper (governed multi-stage journey; proposal §18) ──────────
// Canonical stepper for STRATA governed journeys. 'full' = numbered circles + label
// + optional per-step note (anchors 09 run detail / 20 upload wizard: Contract→…→
// Calculated). 'dots' = compact filled circles for in-table review-lifecycle (anchors
// 23 registry / 10 cockpit strip). Token-pure; state carries via glyph (✓ / number / !)
// + a per-step aria-label, never color alone.
export type StrataStepState = 'done' | 'current' | 'todo' | 'failed';
export interface StrataLifecycleStep {
  id: string;
  label: string;
  state: StrataStepState;
  /** Per-step commitment/reversibility note — 'full' variant only. */
  note?: React.ReactNode;
}
const STEP_STATE_WORD: Record<StrataStepState, string> = {
  done: 'complete', current: 'in progress', todo: 'not started', failed: 'failed',
};
const STEP_DOT_FILL: Record<StrataStepState, string> = {
  done: 'var(--ds-background-success-bold)',
  current: 'var(--ds-background-warning-bold)',
  failed: 'var(--ds-background-danger-bold)',
  todo: 'var(--ds-background-neutral)',
};
/**
 * Freshness staleness glyph — ● fresh (≤2d) / ◐ aging (3–5d) / ○ stale (>5d) + relative
 * age; absolute date on hover. Glyph shape + word carry state (colour never alone).
 * Timestamp-based so it serves any freshness surface (KPI actuals, data-source last run).
 * Thresholds/glyphs/tokens match StrataKpiLibraryPage's KpiFreshnessCell (§P4-D8).
 */
export function StrataFreshnessGlyph({ latest, testId }: { latest: string | null; testId?: string }) {
  if (!latest) return <span style={{ color: T.subtlest }}>—</span>;
  const days = Math.max(0, Math.floor((Date.now() - new Date(latest).getTime()) / 86_400_000));
  const stale = days > 5;
  const aging = days > 2 && days <= 5;
  const glyph = stale ? '○' : aging ? '◐' : '●';
  const color = stale ? 'var(--ds-text-danger)' : aging ? 'var(--ds-text-warning)' : 'var(--ds-text-success)';
  const rel = days === 0 ? 'today' : `${days}d`;
  return (
    <Tooltip content={fmtDate(latest)}>
      <span data-testid={testId} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color, fontSize: 'var(--ds-font-size-100)', whiteSpace: 'nowrap' }}>
        <span aria-hidden>{glyph}</span>
        <span>{stale ? `stale ${rel}` : rel}</span>
      </span>
    </Tooltip>
  );
}

export function StrataLifecycleStepper({
  steps, variant = 'full', ariaLabel, testId,
}: {
  steps: StrataLifecycleStep[];
  variant?: 'full' | 'dots';
  ariaLabel: string;
  testId?: string;
}) {
  // Compact dots (review lifecycle in a JiraTable cell): color + a11y title carry state.
  if (variant === 'dots') {
    return (
      <span data-testid={testId} role="img" aria-label={ariaLabel} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        {steps.map((s) => (
          <span
            key={s.id}
            title={`${s.label}: ${STEP_STATE_WORD[s.state]}`}
            style={{
              width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
              background: STEP_DOT_FILL[s.state],
              border: s.state === 'todo' ? `1px solid ${T.border}` : 'none',
            }}
          />
        ))}
      </span>
    );
  }
  return (
    <div data-testid={testId} role="list" aria-label={ariaLabel} style={{ display: 'flex', alignItems: 'flex-start', overflowX: 'auto', paddingBottom: 4 }}>
      {steps.map((s, i) => {
        const done = s.state === 'done'; const current = s.state === 'current'; const failed = s.state === 'failed';
        const circle: React.CSSProperties = failed
          ? { background: 'var(--ds-background-danger)', color: 'var(--ds-text-danger)', border: '2px solid var(--ds-background-danger-bold)' }
          : done
          ? { background: 'var(--ds-background-success-bold)', color: 'var(--ds-text-inverse)', border: '2px solid var(--ds-background-success-bold)' }
          : current
          ? { background: 'var(--ds-background-warning)', color: 'var(--ds-text-warning)', border: '2px solid var(--ds-background-warning-bold)' }
          : { background: T.raised, color: T.subtlest, border: `2px solid ${T.border}` };
        const labelTone = failed ? 'var(--ds-text-danger)' : current ? T.text : done ? T.subtle : T.subtlest;
        return (
          <React.Fragment key={s.id}>
            {i > 0 ? (
              <span aria-hidden style={{
                flex: '1 1 24px', height: 2, marginTop: 12, minWidth: 12,
                background: steps[i - 1].state === 'done' ? 'var(--ds-background-success-bold)' : T.border,
              }} />
            ) : null}
            <span role="listitem" aria-label={`${s.label}: ${STEP_STATE_WORD[s.state]}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 96, flexShrink: 0 }}>
              <span aria-hidden style={{
                width: 26, height: 26, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 'var(--ds-font-size-050)', fontWeight: 700, fontVariantNumeric: 'tabular-nums', ...circle,
              }}>
                {done ? '✓' : failed ? '!' : i + 1}
              </span>
              <span style={{ fontSize: 'var(--ds-font-size-100)', fontWeight: current ? 700 : 500, color: labelTone, whiteSpace: 'nowrap' }}>{s.label}</span>
              {s.note != null ? <span style={{ fontSize: 'var(--ds-font-size-050)', color: T.subtlest, whiteSpace: 'nowrap' }}>{s.note}</span> : null}
            </span>
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ── Section panel (flagship chrome: bordered header, icon anchor, count) ────
export function StrataPanel({
  title, icon, count, actions, children, testId, noPadding,
}: {
  title: React.ReactNode;
  icon?: React.ReactNode;
  count?: number | null;
  actions?: React.ReactNode;
  children: React.ReactNode;
  testId?: string;
  noPadding?: boolean;
}) {
  return (
    <section
      data-testid={testId}
      style={{
        background: T.raised, border: `1px solid ${T.border}`,
        borderRadius: 8, minWidth: 0, boxShadow: 'var(--ds-shadow-raised)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}
    >
      {/* RD-DEF-010: header WRAPS at narrow viewports (1024×768). Without flexWrap the section's
        * overflow:hidden silently amputated header actions (e.g. Generate board pack) with no
        * recovery — actions must drop to their own line instead of being clipped. */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
        padding: '12px 16px', borderBottom: `1px solid ${T.border}`, flexShrink: 0,
      }}>
        {icon ? <span aria-hidden style={{ display: 'inline-flex', color: T.subtle }}>{icon}</span> : null}
        <span style={{ fontSize: 'var(--ds-font-size-200)', fontWeight: 600, color: T.text }}>{title}</span>
        {count != null ? (
          <span style={{
            fontSize: 'var(--ds-font-size-050)', fontWeight: 600, color: T.subtle,
            background: T.neutral, borderRadius: 10, padding: '0 8px', fontVariantNumeric: 'tabular-nums',
          }}>
            {count}
          </span>
        ) : null}
        <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', minWidth: 0 }}>{actions}</span>
      </div>
      {/* Table panels (noPadding) scroll horizontally instead of hard-clipping
        * the last columns at the viewport edge (KPI Achievement / Validator bug). */}
      <div style={{ padding: noPadding ? 0 : 16, minWidth: 0, ...(noPadding ? { overflowX: 'auto' as const } : null) }}>
        {children}
      </div>
    </section>
  );
}

// ── Evidence (lineage on every executive number — blueprint §19) ────────────
// The evidence drawer became a full page: pages/StrataEvidencePage.tsx
// (routes kpis/:slug/evidence · scorecards/:slug/evidence · portfolio/:slug/evidence).
// Its rendering primitives live in components/evidence.tsx.

// ── OKR / key-result accordion (canonical — shared by KPI Library's OKR panel ──
//    and Theme/Objective detail's OKR Performance panel, CAT-STRATA-THEME-DETAIL
//    -20260710-001 Slice 2. One definition, two call sites.) ──
const OkrDash = () => <span style={{ color: T.subtlest }}>—</span>;

export const OKR_STATUS_LOZENGE: Record<StrataOkr['status'], { label: string; appearance: React.ComponentProps<typeof Lozenge>['appearance'] }> = {
  draft: { label: 'Draft', appearance: 'default' },
  submitted: { label: 'Pending approval', appearance: 'inprogress' },
  active: { label: 'Active', appearance: 'inprogress' },
  closing_review: { label: 'Closing review', appearance: 'moved' },
  closed: { label: 'Closed', appearance: 'success' },
  withdrawn: { label: 'Withdrawn', appearance: 'default' },
  rejected: { label: 'Rejected', appearance: 'removed' },
  cancelled: { label: 'Cancelled', appearance: 'removed' },
};

/** Display-only progress of current within baseline→target (mandated by S-116).
 *  Full precision — internal/evidence use only. Never render this directly (KO-DEF-004);
 *  render krProgressPercent for any visible or accessibility text. */
export const krProgressFraction = (kr: StrataKeyResult): number | null => {
  if (kr.target == null || kr.current_value == null) return null;
  const base = kr.baseline ?? 0;
  const span = kr.target - base;
  if (span === 0) return null;
  return Math.max(0, Math.min(1, (kr.current_value - base) / span));
};

/** KO-DEF-004 — authoritative rounded whole-percent for display + accessibility text.
 *  The full-precision fraction stays internal (krProgressFraction) and in the server calc
 *  (strata_kr_progress.progress_pct); no raw float is ever exposed to a user or a screen reader. */
export const krProgressPercent = (kr: StrataKeyResult): number | null => {
  const frac = krProgressFraction(kr);
  return frac == null ? null : Math.round(frac * 100);
};

/** Lazy key-result fetch — mounts only when the OKR row is expanded (S-115/S-116). */
/** KO-DEF-003 — server-resolved reportability badge for a Key Result. Shows linked KPI name,
 *  lifecycle state, effective version and the Non-reportable / Standalone / Reportable label.
 *  The client never recomputes eligibility — it renders strata_kr_reportability verbatim. */
export function KrReportabilityBadge({ krId }: { krId: string }) {
  const q = useKrReportability(krId);
  const r = q.data;
  if (q.isLoading || !r) return <span style={{ color: T.subtlest, fontSize: 'var(--ds-font-size-050)' }}>—</span>;
  const appearance: React.ComponentProps<typeof Lozenge>['appearance'] =
    !r.reportable ? 'removed' : r.qualified ? 'moved' : r.kind === 'standalone' ? 'default' : 'success';
  return (
    <span style={{ display: 'inline-flex', flexDirection: 'column', gap: 2 }} data-testid={`strata-kr-reportability-${krId}`}>
      <Lozenge appearance={appearance}>{r.label}</Lozenge>
      {r.kind === 'kpi_backed' ? (
        <span style={{ fontSize: 'var(--ds-font-size-050)', color: T.subtlest }}>
          {r.kpi_name ? `${r.kpi_name} · ` : ''}{r.kpi_state ? labelize(r.kpi_state) : ''}
          {r.resolved_kpi_id ? ' · effective version resolved' : ''}
          {r.reason ? ` — ${r.reason}` : ''}
        </span>
      ) : null}
    </span>
  );
}

/** Official OKR progress. Theme-owned OKRs use the observation-based v2 roll-up (reportable-only,
 *  coverage/critical disclosed, CAT-STRATA-THEMEOKR-20260719-001); legacy OKRs keep the KPI-actual
 *  roll-up (KO-DEF-003). Excludes non-reportable KRs and says why. */
export function OkrOfficialProgress({ okrId, themeOwned = false }: { okrId: string; themeOwned?: boolean }) {
  const legacyQ = useOkrOfficialProgress(okrId, !themeOwned);
  const v2Q = useQuery({
    queryKey: ['strata', 'okr-official-progress-v2', okrId],
    queryFn: () => kpiApi.okrOfficialProgressV2(okrId),
    enabled: themeOwned,
    staleTime: 0,
  });
  if (themeOwned) {
    const p = v2Q.data as {
      official_progress?: number | null; reportable_krs?: number; excluded_krs?: number;
      krs_with_eligible_observation?: number; critical_failures?: number;
    } | undefined;
    if (!p) return null;
    const reportable = p.reportable_krs ?? 0;
    const awaiting = reportable - (p.krs_with_eligible_observation ?? 0);
    return (
      <div data-testid={`strata-okr-official-progress-${okrId}`}
        style={{ margin: '4px 0 8px', fontSize: 'var(--ds-font-size-050)', color: T.subtle }}>
        Official progress:{' '}
        <strong style={{ color: T.text }}>{p.official_progress != null ? `${Math.round(p.official_progress * 100)}%` : '—'}</strong>{' '}
        over {reportable} reportable KR{reportable === 1 ? '' : 's'}
        {awaiting > 0 ? ` · ${awaiting} awaiting an eligible observation` : ''}
        {(p.critical_failures ?? 0) > 0 ? ` · ${p.critical_failures} critical KR failing` : ''}
        {p.excluded_krs ? ` · ${p.excluded_krs} non-reportable excluded` : ''}
      </div>
    );
  }
  const p = legacyQ.data;
  if (!p) return null;
  return (
    <div data-testid={`strata-okr-official-progress-${okrId}`}
      style={{ margin: '4px 0 8px', fontSize: 'var(--ds-font-size-050)', color: T.subtle }}>
      Official progress:{' '}
      <strong style={{ color: T.text }}>
        {p.official_progress != null ? `${Math.round(p.official_progress * 100)}%` : '—'}
      </strong>{' '}
      over {p.reportable_krs} reportable KR{p.reportable_krs === 1 ? '' : 's'}
      {p.excluded_krs > 0
        ? ` · ${p.excluded_krs} non-reportable KR${p.excluded_krs === 1 ? '' : 's'} excluded (Draft/Pending KPI or no eligible actual)`
        : ''}
    </div>
  );
}

/** Observation-driven KR cells (CAT-STRATA-THEMEOKR-20260719-001). Both cells share one
 *  strata_kr_progress query per KR (React Query dedupes by key), so the grid shows the latest
 *  eligible observation's actual + rounded progress + performance status; falls back to the legacy
 *  flat current_value while loading/erroring or when no observation exists. KO-DEF-004 preserved
 *  (progress_pct is a whole integer — never a raw float in visible or a11y text). */
const KR_PERF_LOZENGE: Record<string, { label: string; appearance: React.ComponentProps<typeof Lozenge>['appearance'] }> = {
  on_track: { label: 'On track', appearance: 'success' },
  at_risk: { label: 'At risk', appearance: 'moved' },
  off_track: { label: 'Off track', appearance: 'removed' },
};
function useKrProgressCell(krId: string) {
  return useQuery({ queryKey: ['strata', 'kr-progress', krId], queryFn: () => kpiApi.krProgress(krId), staleTime: 0 });
}
function KrCurrentCell({ kr }: { kr: StrataKeyResult }) {
  const q = useKrProgressCell(kr.id);
  const d = q.data as { actual?: number | string | null } | undefined;
  const val = d?.actual != null ? Number(d.actual) : kr.current_value;
  return <span style={{ fontWeight: 600, color: T.text, fontVariantNumeric: 'tabular-nums' }}>{fmtUnit(val, kr.unit)}</span>;
}
function KrProgressCell({ kr }: { kr: StrataKeyResult }) {
  const q = useKrProgressCell(kr.id);
  const d = q.data as { progress_pct?: number | null; performance_status?: string } | undefined;
  const pct = d?.progress_pct != null ? Number(d.progress_pct) : krProgressPercent(kr);
  if (pct == null) return <OkrDash />;
  const lz = d?.performance_status && d.performance_status !== 'not_assessed' ? KR_PERF_LOZENGE[d.performance_status] : null;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <ProgressBar value={pct / 100} aria-label={`Progress ${pct}%`} />
      <span style={{ color: T.subtle, fontVariantNumeric: 'tabular-nums' }}>{pct}%</span>
      {lz ? <Lozenge appearance={lz.appearance}>{lz.label}</Lozenge> : null}
    </span>
  );
}

export function KeyResultsList({ okrId, canUpdate = false, canValidate = false }: {
  okrId: string;
  /** Reporter/owner may submit observations (manual channel). */
  canUpdate?: boolean;
  /** Data steward/approver may validate/reject observations (maker-checker; server enforces SoD). */
  canValidate?: boolean;
}) {
  const [obsKr, setObsKr] = useState<{ id: string; name: string } | null>(null);
  const q = useQuery({
    queryKey: ['strata', 'key-results', okrId],
    queryFn: () => kpiApi.keyResults(okrId),
    staleTime: STALE,
  });

  const columns = useMemo<Column<StrataKeyResult>[]>(() => [
    {
      id: 'name',
      label: 'Key result',
      flex: true,
      cell: ({ row }) => row.slug ? (
        <a href={Routes.strata.kr(row.slug)}
          style={{ fontWeight: 600, color: 'var(--ds-text-brand)', fontSize: 'var(--ds-font-size-400)', lineHeight: 'var(--ds-line-height-body)', textDecoration: 'none' }}>
          {row.name}
        </a>
      ) : (
        <span style={{ fontWeight: 600, color: T.text, fontSize: 'var(--ds-font-size-400)', lineHeight: 'var(--ds-line-height-body)' }}>
          {row.name}
        </span>
      ),
    },
    {
      id: 'range',
      label: 'Baseline → target',
      width: 18,
      cell: ({ row }) => (
        <span style={{ color: T.subtle, fontVariantNumeric: 'tabular-nums' }}>
          {fmtUnit(row.baseline, row.unit)} → {fmtUnit(row.target, row.unit)}
        </span>
      ),
    },
    {
      id: 'current_value',
      label: 'Current',
      width: 12,
      cell: ({ row }) => <KrCurrentCell kr={row} />,
    },
    {
      id: 'progress',
      label: 'Progress',
      width: 16,
      cell: ({ row }) => <KrProgressCell kr={row} />,
    },
    {
      id: 'reportability',
      label: 'Reportability',
      width: 22,
      cell: ({ row }) => <KrReportabilityBadge krId={row.id} />,
    },
    ...(canUpdate ? [{
      id: 'actions',
      label: '',
      width: 12,
      cell: ({ row }: { row: StrataKeyResult }) => (
        <Button appearance="subtle" spacing="compact" testId={`strata-kr-update-${row.id}`}
          onClick={() => setObsKr({ id: row.id, name: row.name })}>
          Update
        </Button>
      ),
    }] : []),
  ], [canUpdate]);

  if (q.isLoading) return <div style={{ padding: '8px 0' }}><Spinner size="small" aria-label="Loading key results" /></div>;
  if (q.isError) {
    return <p style={{ fontSize: 'var(--ds-font-size-100)', color: 'var(--ds-text-danger)', margin: '8px 0' }}>Failed to load key results.</p>;
  }
  const krs = (q.data ?? []) as StrataKeyResult[];
  if (krs.length === 0) {
    return <p style={{ fontSize: 'var(--ds-font-size-100)', color: T.subtle, margin: '8px 0' }}>No key results recorded.</p>;
  }
  return (
    <div style={{ marginTop: 8 }}>
      <JiraTable<StrataKeyResult>
        columns={columns}
        data={krs}
        getRowId={(row) => row.id}
        density="compact"
        showRowCount={false}
        rowsPerPage={100}
        ariaLabel="Key results"
      />
      {obsKr ? (
        <KrObservations krId={obsKr.id} krName={obsKr.name} canValidate={canValidate} onClose={() => setObsKr(null)} />
      ) : null}
    </div>
  );
}

/** Manual observation entry + maker-checker validation for a Key Result
 *  (CAT-STRATA-THEMEOKR-20260719-001). Append-only: submit creates a pending observation;
 *  a different user validates/rejects (server enforces SoD). History resolves to observations. */
const OBS_STATUS_LOZENGE: Record<string, { label: string; appearance: React.ComponentProps<typeof Lozenge>['appearance'] }> = {
  staged: { label: 'Staged', appearance: 'default' },
  pending: { label: 'Pending', appearance: 'inprogress' },
  validated: { label: 'Validated', appearance: 'success' },
  accepted_with_exception: { label: 'Accepted w/ exception', appearance: 'moved' },
  rejected: { label: 'Rejected', appearance: 'removed' },
  quarantined: { label: 'Quarantined', appearance: 'removed' },
  reversed: { label: 'Reversed', appearance: 'default' },
  superseded: { label: 'Superseded', appearance: 'default' },
};
export function KrObservations({ krId, krName, canValidate, onClose, embedded = false }: {
  krId: string; krName: string; canValidate: boolean; onClose: () => void;
  /** True when rendered inline on a detail page (no toggle) — hides the redundant heading + Close. */
  embedded?: boolean;
}) {
  const invalidate = useInvalidateStrata();
  const { periods } = useStrataContext();
  const profiles = useProfileNames();
  const obsQ = useQuery({ queryKey: ['strata', 'kr-observations', krId], queryFn: () => kpiApi.krObservations(krId), staleTime: 0 });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [asOf, setAsOf] = useState('');
  const [value, setValue] = useState('');
  const [period, setPeriod] = useState<string | null>(null);
  const [commentary, setCommentary] = useState('');
  const [forecast, setForecast] = useState('');
  const [confidence, setConfidence] = useState<'high' | 'medium' | 'low' | 'not_set'>('not_set');

  const nameOf = (id: string) => (profiles.data?.get(id) as { name?: string } | undefined)?.name ?? '—';
  const periodOpts = (periods ?? []).map((p) => ({ value: p.id, label: p.name }));
  const confOpts = [
    { value: 'high', label: 'High' }, { value: 'medium', label: 'Medium' },
    { value: 'low', label: 'Low' }, { value: 'not_set', label: 'Not set' },
  ];
  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true); setError(null);
    try { await fn(); await obsQ.refetch(); invalidate(); }
    catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  };

  return (
    <div style={embedded ? {} : { marginTop: 8, border: `1px solid ${T.border}`, borderRadius: 4, padding: 12 }} data-testid={`strata-kr-observations-${krId}`}>
      {!embedded ? (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <strong style={{ color: T.text }}>Observations · {krName}</strong>
          <Button appearance="subtle" spacing="compact" onClick={onClose}>Close</Button>
        </div>
      ) : null}
      <div style={{ display: 'grid', gap: 6, maxWidth: 540, marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <Textfield type="date" value={asOf} onChange={(e) => setAsOf((e.target as HTMLInputElement).value)} aria-label="As-of date" />
          <Textfield type="number" value={value} onChange={(e) => setValue((e.target as HTMLInputElement).value)} aria-label="Actual value" placeholder="Value" />
        </div>
        <Select options={periodOpts} value={periodOpts.find((o) => o.value === period) ?? null}
          onChange={(o) => setPeriod(o?.value ?? null)} placeholder="Reporting period…" isClearable usePortal aria-label="Reporting period" />
        <div style={{ display: 'flex', gap: 8 }}>
          <Textfield type="number" value={forecast} onChange={(e) => setForecast((e.target as HTMLInputElement).value)} aria-label="Year-end forecast" placeholder="Forecast (optional)" />
          <Select options={confOpts} value={confOpts.find((o) => o.value === confidence) ?? null}
            onChange={(o) => setConfidence((o?.value as 'high' | 'medium' | 'low' | 'not_set') ?? 'not_set')} usePortal aria-label="Confidence" />
        </div>
        <TextArea value={commentary} minimumRows={2} onChange={(e) => setCommentary((e.target as HTMLTextAreaElement).value)}
          placeholder="Commentary (optional)" aria-label="Commentary" />
        <div>
          <Button appearance="primary" spacing="compact" isDisabled={busy || value.trim() === ''} testId={`strata-kr-obs-submit-${krId}`}
            onClick={() => run(async () => {
              await kpiApi.submitKrObservation({
                krId, asOf: asOf || undefined, value: Number(value), periodId: period ?? undefined,
                commentary: commentary || undefined, forecast: forecast ? Number(forecast) : undefined, confidence,
              });
              setValue(''); setCommentary(''); setForecast('');
            })}>
            Submit observation
          </Button>
        </div>
      </div>
      {obsQ.isLoading ? <Spinner size="small" aria-label="Loading observations" />
        : (obsQ.data ?? []).length === 0
          ? <p style={{ color: T.subtle, fontSize: 'var(--ds-font-size-100)', margin: 0 }}>No observations yet.</p>
          : (
            <div style={{ display: 'grid', gap: 6 }}>
              {(obsQ.data ?? []).map((o) => {
                const st = OBS_STATUS_LOZENGE[String(o.validation_status)] ?? { label: String(o.validation_status), appearance: 'default' as const };
                const isPending = o.validation_status === 'pending' || o.validation_status === 'quarantined';
                return (
                  <div key={String(o.id)} style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }} data-testid={`strata-kr-obs-${o.id}`}>
                    <span style={{ fontVariantNumeric: 'tabular-nums', minWidth: 90 }}>{String(o.as_of_date)}</span>
                    <strong style={{ minWidth: 60, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{o.actual_value != null ? String(o.actual_value) : '—'}</strong>
                    <Lozenge appearance={st.appearance}>{st.label}</Lozenge>
                    <span style={{ color: T.subtle, fontSize: 'var(--ds-font-size-050)' }}>
                      by {nameOf(String(o.submitted_by))}{o.validated_by ? ` · validated by ${nameOf(String(o.validated_by))}` : ''}
                    </span>
                    {canValidate && isPending ? (
                      <span style={{ display: 'inline-flex', gap: 6, marginLeft: 'auto' }}>
                        <Button appearance="primary" spacing="compact" isDisabled={busy} testId={`strata-kr-obs-validate-${o.id}`}
                          onClick={() => run(() => kpiApi.validateObservation(String(o.id), 'validated'))}>Validate</Button>
                        <Button appearance="warning" spacing="compact" isDisabled={busy} testId={`strata-kr-obs-reject-${o.id}`}
                          onClick={() => run(() => kpiApi.validateObservation(String(o.id), 'rejected', 'rejected on review'))}>Reject</Button>
                      </span>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
      {error ? <SectionMessage appearance="error" title="Rejected"><p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{error}</p></SectionMessage> : null}
    </div>
  );
}

/** Accordion row — canonical chrome: chevron icon, hover bg, structured header (S-117). */
export function OkrRow({ okr, objectiveName, isOpen, onToggle, onAddKeyResult, onLifecycle, canUpdateKr = false, canValidateObs = false }: {
  okr: StrataOkr;
  objectiveName: string | null;
  isOpen: boolean;
  onToggle: () => void;
  onAddKeyResult?: () => void;
  /** When set (strategy-office), renders governed lifecycle actions (activate/close). */
  onLifecycle?: boolean;
  /** Reporter/owner may submit KR observations (manual channel). */
  canUpdateKr?: boolean;
  /** Data steward/approver may validate KR observations (maker-checker). */
  canValidateObs?: boolean;
}) {
  const [hover, setHover] = useState(false);
  const status = OKR_STATUS_LOZENGE[okr.status];
  const confidenceText = okr.confidence != null
    ? `Confidence ${okr.confidence <= 1 ? fmtRatioPct(okr.confidence) : fmtPct(okr.confidence)}`
    : null;
  return (
    <div style={{ borderBottom: `1px solid ${T.border}` }}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8, width: '100%',
          background: hover ? T.sunken : 'none', border: 'none', padding: '12px 8px', cursor: 'pointer',
          font: 'inherit', textAlign: 'left', color: T.text, borderRadius: 4,
        }}
      >
        <span aria-hidden style={{ display: 'inline-flex', color: 'var(--ds-icon-subtle)', flexShrink: 0 }}>
          {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </span>
        <span style={{ fontWeight: 600, fontSize: 'var(--ds-font-size-400)', lineHeight: 'var(--ds-line-height-body)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {okr.name}
        </span>
        {objectiveName ? (
          <span style={{ fontSize: 'var(--ds-font-size-100)', color: T.subtle, whiteSpace: 'nowrap' }}>
            Objective · {objectiveName}
          </span>
        ) : null}
        {confidenceText ? (
          <span style={{ fontSize: 'var(--ds-font-size-100)', color: T.subtle, minWidth: 110, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
            {confidenceText}
          </span>
        ) : null}
        {status
          ? <Lozenge appearance={status.appearance}>{status.label}</Lozenge>
          : <Lozenge appearance="default">{labelize(okr.status)}</Lozenge>}
      </button>
      {isOpen ? (
        <div style={{ padding: '0 8px 12px 32px' }}>
          {okr.slug ? (
            <div style={{ marginBottom: 4 }}>
              <a href={Routes.strata.okr(okr.slug)} style={{ color: 'var(--ds-text-brand)', fontSize: 'var(--ds-font-size-050)', textDecoration: 'none' }}>
                Open OKR page ↗
              </a>
            </div>
          ) : null}
          <OkrOfficialProgress okrId={okr.id} themeOwned={okr.theme_id != null} />
          <KeyResultsList okrId={okr.id} canUpdate={canUpdateKr} canValidate={canValidateObs} />
          {onLifecycle ? <OkrLifecycleActions okr={okr} /> : null}
          {onAddKeyResult && okr.status !== 'closed' ? (
            <div style={{ marginTop: 8 }}>
              <Button
                appearance="default"
                spacing="compact"
                iconBefore={<Plus size={14} />}
                onClick={onAddKeyResult}
                testId={`strata-add-kr-${okr.id}`}
              >
                Add key result
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/** KO-DEF-003 lifecycle actions — server-governed. Buttons reflect the state; the RPC is the
 *  authority and its rejection text is surfaced verbatim. Closed shows the frozen final status. */
export function OkrLifecycleActions({ okr }: { okr: StrataOkr }) {
  const invalidate = useInvalidateStrata();
  const { periods } = useStrataContext();
  const elementsQ = useStrategyElements();
  const profiles = useProfileNames();
  const reviewsQ = useReviews();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [closeOpen, setCloseOpen] = useState(false);
  const [finalStatus, setFinalStatus] = useState('achieved');
  const [closeReason, setCloseReason] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [owner, setOwner] = useState<string | null>((okr as { owner_id?: string | null }).owner_id ?? null);
  const [objective, setObjective] = useState<string | null>(okr.objective_element_id ?? null);
  const [startP, setStartP] = useState<string | null>((okr as { start_period_id?: string | null }).start_period_id ?? null);
  const [endP, setEndP] = useState<string | null>((okr as { end_period_id?: string | null }).end_period_id ?? null);
  const [reviewId, setReviewId] = useState<string | null>((okr as { review_id?: string | null }).review_id ?? null);
  // Theme-owned governed lifecycle (CAT-STRATA-THEMEOKR-20260719-001).
  const [checkinOpen, setCheckinOpen] = useState(false);
  const [assessment, setAssessment] = useState('');
  const [mgmtStatus, setMgmtStatus] = useState('on_track');

  const periodOpts = (periods ?? []).map((p) => ({ value: p.id, label: p.name }));
  const objectiveOpts = (elementsQ.data ?? []).filter((e) => e.element_type === 'objective').map((e) => ({ value: e.id, label: e.name }));
  const ownerOpts = Array.from((profiles.data ?? new Map()).entries()).map(([id, p]) => ({ value: id, label: (p as { name?: string }).name ?? id }));
  const reviewOpts = (reviewsQ.data ?? []).map((r) => ({ value: r.id, label: (r as { title?: string; review_key?: string }).title ?? (r as { review_key?: string }).review_key ?? r.id }));
  const startIso = periods?.find((p) => p.id === startP)?.starts_on;
  const endIso = periods?.find((p) => p.id === endP)?.ends_on;
  const rangeInvalid = !!startIso && !!endIso && endIso < startIso;
  const linkedReview = (reviewsQ.data ?? []).find((r) => r.id === (okr as { review_id?: string | null }).review_id);

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true); setError(null);
    try { await fn(); invalidate(); } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  };

  if (okr.status === 'closed') {
    return (
      <div style={{ marginTop: 8 }} data-testid={`strata-okr-closed-${okr.id}`}>
        <SectionMessage appearance="information" title={`Closed — ${labelize(okr.final_status ?? 'closed')}`}>
          <p style={{ margin: 0 }}>
            {okr.closure_reason ?? 'This OKR is closed.'} Its final status, key results and history are frozen.
          </p>
        </SectionMessage>
        {linkedReview ? (
          <div style={{ marginTop: 'var(--ds-space-075)', fontSize: 'var(--ds-font-size-050)', color: T.subtle }} data-testid={`strata-okr-linked-review-${okr.id}`}>
            Linked review: <strong style={{ color: T.text }}>{(linkedReview as { title?: string; review_key?: string }).title ?? (linkedReview as { review_key?: string }).review_key ?? linkedReview.id}</strong>
            {' '}— retained as closed-history evidence (read-only).
          </div>
        ) : null}
      </div>
    );
  }

  // ── Theme-owned governed lifecycle (D-1 approval gate) ──
  if (okr.theme_id != null) {
    const s = okr.status;
    const lv = okr.lock_version ?? undefined;
    return (
      <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }} data-testid={`strata-okr-lifecycle-${okr.id}`}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {(s === 'draft' || s === 'rejected') ? (
            <Button spacing="compact" appearance="primary" isDisabled={busy} testId={`strata-okr-submit-${okr.id}`}
              onClick={() => run(() => kpiApi.submitOkr(okr.id, lv))}>Submit for approval</Button>
          ) : null}
          {s === 'submitted' ? (
            <>
              <Button spacing="compact" appearance="primary" isDisabled={busy} testId={`strata-okr-approve-${okr.id}`}
                onClick={() => run(() => kpiApi.approveOkr(okr.id, lv))}>Approve</Button>
              <Button spacing="compact" appearance="warning" isDisabled={busy} testId={`strata-okr-reject-${okr.id}`}
                onClick={() => run(() => kpiApi.rejectOkr(okr.id, 'sent back for revision'))}>Reject</Button>
            </>
          ) : null}
          {(s === 'active' || s === 'closing_review') ? (
            <Button spacing="compact" isDisabled={busy} testId={`strata-okr-checkin-${okr.id}`}
              onClick={() => setCheckinOpen((v) => !v)}>Check-in</Button>
          ) : null}
          {s === 'active' ? (
            <Button spacing="compact" isDisabled={busy} testId={`strata-okr-begin-review-${okr.id}`}
              onClick={() => run(() => kpiApi.beginOkrClosingReview(okr.id))}>Begin closing review</Button>
          ) : null}
          {(s === 'active' || s === 'closing_review') ? (
            <Button spacing="compact" appearance="primary" isDisabled={busy} testId={`strata-okr-close-${okr.id}`}
              onClick={() => setCloseOpen(true)}>Close &amp; snapshot</Button>
          ) : null}
        </div>
        {s === 'submitted' ? (
          <span style={{ fontSize: 'var(--ds-font-size-050)', color: T.subtle }}>
            Pending approval — an approver other than the submitter must approve (maker-checker).
          </span>
        ) : null}
        {s === 'rejected' ? (
          <span style={{ fontSize: 'var(--ds-font-size-050)', color: 'var(--ds-text-danger)' }}>
            Rejected{(okr as { rejection_reason?: string }).rejection_reason ? ` — ${(okr as { rejection_reason?: string }).rejection_reason}` : ''}. Revise and resubmit.
          </span>
        ) : null}
        {checkinOpen ? (
          <div style={{ display: 'grid', gap: 6, maxWidth: 460 }} data-testid={`strata-okr-checkin-form-${okr.id}`}>
            <Select options={[{ value: 'on_track', label: 'On track' }, { value: 'at_risk', label: 'At risk' }, { value: 'off_track', label: 'Off track' }, { value: 'not_assessed', label: 'Not assessed' }]}
              value={{ value: mgmtStatus, label: labelize(mgmtStatus) }} onChange={(o) => setMgmtStatus(o?.value ?? 'on_track')} usePortal aria-label="Management status" />
            <TextArea value={assessment} minimumRows={2} onChange={(e) => setAssessment((e.target as HTMLTextAreaElement).value)}
              placeholder="Assessment, decisions, corrective actions" aria-label="Check-in assessment" />
            <div style={{ display: 'flex', gap: 8 }}>
              <Button spacing="compact" appearance="subtle" isDisabled={busy} onClick={() => setCheckinOpen(false)}>Cancel</Button>
              <Button spacing="compact" appearance="primary" isDisabled={busy} testId={`strata-okr-checkin-save-${okr.id}`}
                onClick={() => run(async () => { await kpiApi.createOkrCheckin({ okrId: okr.id, managementStatus: mgmtStatus, assessment: assessment || undefined }); setCheckinOpen(false); setAssessment(''); })}>
                Record check-in</Button>
            </div>
          </div>
        ) : null}
        {closeOpen ? (
          <div style={{ display: 'grid', gap: 6, maxWidth: 420 }}>
            <Select options={[{ value: 'achieved', label: 'Achieved' }, { value: 'partially_achieved', label: 'Partially achieved' }, { value: 'missed', label: 'Missed' }]}
              value={{ value: finalStatus, label: labelize(finalStatus) }} onChange={(o) => setFinalStatus(o?.value ?? 'achieved')} usePortal aria-label="Final status" />
            <TextArea value={closeReason} minimumRows={2} onChange={(e) => setCloseReason((e.target as HTMLTextAreaElement).value)}
              placeholder="Closure reason and final evidence" aria-label="Closure reason" data-testid={`strata-okr-close-reason-${okr.id}`} />
            <div style={{ display: 'flex', gap: 8 }}>
              <Button spacing="compact" appearance="subtle" isDisabled={busy} onClick={() => setCloseOpen(false)}>Cancel</Button>
              <Button spacing="compact" appearance="primary" isDisabled={busy || closeReason.trim() === ''} testId={`strata-okr-close-confirm-${okr.id}`}
                onClick={() => run(async () => { await kpiApi.closeAndSnapshotOkr(okr.id, finalStatus, closeReason.trim()); setCloseOpen(false); })}>
                Close &amp; snapshot</Button>
            </div>
          </div>
        ) : null}
        {error ? <SectionMessage appearance="error" title="Action rejected"><p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{error}</p></SectionMessage> : null}
      </div>
    );
  }

  return (
    <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {okr.status === 'draft' ? (
          <Button spacing="compact" isDisabled={busy} testId={`strata-okr-edit-${okr.id}`}
            onClick={() => setEditOpen((v) => !v)}>
            Edit OKR
          </Button>
        ) : null}
        {okr.status === 'draft' ? (
          <Button spacing="compact" isDisabled={busy} testId={`strata-okr-activate-${okr.id}`}
            onClick={() => run(() => kpiApi.activateOkr(okr.id))}>
            Activate
          </Button>
        ) : null}
        {okr.status === 'active' ? (
          <Button spacing="compact" isDisabled={busy} testId={`strata-okr-review-${okr.id}`}
            onClick={() => setReviewOpen((v) => !v)}>
            Review OKR
          </Button>
        ) : null}
        {okr.status === 'active' ? (
          <Button spacing="compact" appearance="primary" isDisabled={busy} testId={`strata-okr-close-${okr.id}`}
            onClick={() => setCloseOpen(true)}>
            Close OKR
          </Button>
        ) : null}
      </div>

      {editOpen && okr.status === 'draft' ? (
        <div style={{ display: 'grid', gap: 6, maxWidth: 460 }} data-testid={`strata-okr-edit-form-${okr.id}`}>
          <Select options={ownerOpts} value={ownerOpts.find((o) => o.value === owner) ?? null}
            onChange={(o) => setOwner(o?.value ?? null)} placeholder="Accountable owner…" isClearable usePortal aria-label="Accountable owner" />
          <Select options={objectiveOpts} value={objectiveOpts.find((o) => o.value === objective) ?? null}
            onChange={(o) => setObjective(o?.value ?? null)} placeholder="Strategy objective…" isClearable usePortal aria-label="Strategy objective" />
          <Select options={periodOpts} value={periodOpts.find((o) => o.value === startP) ?? null}
            onChange={(o) => setStartP(o?.value ?? null)} placeholder="Start period…" isClearable usePortal aria-label="Start period" />
          <Select options={periodOpts} value={periodOpts.find((o) => o.value === endP) ?? null}
            onChange={(o) => setEndP(o?.value ?? null)} placeholder="End period…" isClearable usePortal aria-label="End period" />
          {rangeInvalid ? (
            <span style={{ color: 'var(--ds-text-danger)', fontSize: 'var(--ds-font-size-050)' }}>End period cannot precede start period.</span>
          ) : null}
          <div style={{ display: 'flex', gap: 8 }}>
            <Button spacing="compact" appearance="subtle" isDisabled={busy} onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button spacing="compact" appearance="primary" isDisabled={busy || rangeInvalid}
              testId={`strata-okr-edit-save-${okr.id}`}
              onClick={() => run(async () => {
                await kpiApi.updateOkr(okr.id, {
                  ownerId: owner ?? undefined, objectiveElementId: objective ?? undefined,
                  startPeriodId: startP ?? undefined, endPeriodId: endP ?? undefined,
                });
                setEditOpen(false);
              })}>
              Save
            </Button>
          </div>
        </div>
      ) : null}

      {reviewOpen && okr.status === 'active' ? (
        <div style={{ display: 'grid', gap: 6, maxWidth: 460 }} data-testid={`strata-okr-review-form-${okr.id}`}>
          <Select options={reviewOpts} value={reviewOpts.find((o) => o.value === reviewId) ?? null}
            onChange={(o) => setReviewId(o?.value ?? null)} placeholder="Select a persisted review…" usePortal aria-label="Persisted review" />
          <div style={{ display: 'flex', gap: 8 }}>
            <Button spacing="compact" appearance="subtle" isDisabled={busy} onClick={() => setReviewOpen(false)}>Cancel</Button>
            <Button spacing="compact" appearance="primary" isDisabled={busy || !reviewId}
              testId={`strata-okr-review-save-${okr.id}`}
              onClick={() => run(async () => { await kpiApi.linkOkrReview(okr.id, reviewId!); setReviewOpen(false); })}>
              Link review
            </Button>
          </div>
        </div>
      ) : null}

      {linkedReview ? (
        <div style={{ fontSize: 'var(--ds-font-size-050)', color: T.subtle }} data-testid={`strata-okr-linked-review-${okr.id}`}>
          Linked review: <strong style={{ color: T.text }}>{(linkedReview as { title?: string; review_key?: string }).title ?? (linkedReview as { review_key?: string }).review_key ?? linkedReview.id}</strong>
          {' '}· commentary, decisions and corrective actions are recorded on the review.
        </div>
      ) : null}
      {closeOpen ? (
        <div style={{ display: 'grid', gap: 6, maxWidth: 420 }}>
          <Select
            options={[
              { value: 'achieved', label: 'Achieved' },
              { value: 'partially_achieved', label: 'Partially achieved' },
              { value: 'missed', label: 'Missed' },
            ]}
            value={{ value: finalStatus, label: labelize(finalStatus) }}
            onChange={(o) => setFinalStatus(o?.value ?? 'achieved')}
            aria-label="Final status"
          />
          <TextArea value={closeReason} minimumRows={2}
            onChange={(e) => setCloseReason((e.target as HTMLTextAreaElement).value)}
            placeholder="Closure reason and final evidence" aria-label="Closure reason"
            data-testid={`strata-okr-close-reason-${okr.id}`} />
          <div style={{ display: 'flex', gap: 8 }}>
            <Button spacing="compact" appearance="subtle" onClick={() => setCloseOpen(false)} isDisabled={busy}>Cancel</Button>
            <Button spacing="compact" appearance="primary" isDisabled={busy || closeReason.trim() === ''}
              testId={`strata-okr-close-confirm-${okr.id}`}
              onClick={() => run(() => kpiApi.closeOkr(okr.id, finalStatus, closeReason.trim()))}>
              Confirm close
            </Button>
          </div>
        </div>
      ) : null}
      {error ? (
        <SectionMessage appearance="error" title="Action rejected">
          <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{error}</p>
        </SectionMessage>
      ) : null}
    </div>
  );
}

// ── Project Card rollup + forecast resolver (canonical — shared by Execution ──
//    page's own rollup panels and Theme detail's Execution Summary, CAT-STRATA
//    -THEME-DETAIL-20260710-001 Slice 3. One definition, two call sites.) ──
export interface CardRollup {
  total: number;
  onHold: number;
  onTrack: number;
  minorDelay: number;
  majorDelay: number;
  notStarted: number;
  notAvailable: number;
  avgProgress: number | null;
  blockedDependencies: number;
}

/** Rule 2/14: On Hold projects are counted separately and excluded from
 * overall progress rollups and the on-track/minor/major/not-started/
 * not-available counts. Self-contained — does not depend on page-local
 * healthBucketOf/isOpenBlocker helpers. */
export function computeCardRollup(cards: StrataProjectCard[], dependencies: StrataDependency[]): CardRollup {
  const ids = new Set(cards.map((c) => c.id));
  let onHold = 0; let onTrack = 0; let minorDelay = 0; let majorDelay = 0; let notStarted = 0; let notAvailable = 0;
  let progressSum = 0; let progressCount = 0;
  cards.forEach((c) => {
    const bucket = c.calculated_health ?? 'not_available';
    if (bucket === 'on_hold') { onHold += 1; return; }
    if (bucket === 'on_track') onTrack += 1;
    else if (bucket === 'minor_delay') minorDelay += 1;
    else if (bucket === 'major_delay') majorDelay += 1;
    else if (bucket === 'not_started') notStarted += 1;
    else notAvailable += 1;
    const v = c.actual_progress;
    const frac = v == null ? null : Math.max(0, Math.min(1, v > 1 ? v / 100 : v));
    if (frac != null) { progressSum += frac; progressCount += 1; }
  });
  const isOpenBlocker = (d: StrataDependency) => d.is_blocker && d.status !== 'resolved' && d.status !== 'cancelled';
  const blockedDependencies = dependencies.filter((d) => isOpenBlocker(d) && (
    (d.requesting_type === 'project_card' && ids.has(d.requesting_id))
    || (d.serving_type === 'project_card' && !!d.serving_id && ids.has(d.serving_id))
  )).length;
  return {
    total: cards.length, onHold, onTrack, minorDelay, majorDelay, notStarted, notAvailable,
    avgProgress: progressCount > 0 ? progressSum / progressCount : null, blockedDependencies,
  };
}

/**
 * Forecast source — `final_forecast_end` is already the canonical resolved
 * value (server-computed as GREATEST(system_forecast_end, forecast_end) or
 * whichever exists — "Rule 8",
 * supabase/migrations/20260706231000_strata_execution_health_forecast_rpcs.sql:93-98).
 * This does not recompute the forecast; it only reports which input won.
 */
export function forecastSource(card: StrataProjectCard): 'system' | 'manual' | null {
  if (card.final_forecast_end == null) return null;
  return card.final_forecast_end === card.system_forecast_end ? 'system' : 'manual';
}
