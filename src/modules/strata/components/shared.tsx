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
import React, { useState } from 'react';
import {
  Button, DropdownMenu, Heading, Lozenge,
  Modal, ModalBody, ModalFooter, ModalHeader, ModalTitle, SectionMessage, Textfield, Tooltip,
} from '@/components/ads';
import { ProjectPageHeader } from '@/components/layout/ProjectPageHeader';
import { ChevronDown } from '@/lib/atlaskit-icons';
import { useBandResolver, useStrataContext } from '../hooks/useStrata';
import { StrataNotificationBell } from './StrataNotificationBell';
import { fmtSarCompact, fmtScore } from './format';
import type { DataState, ThresholdBand } from '../types';

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
  planned, forecast, realized, validated, periodName, testId,
}: {
  planned: number | null; forecast: number | null; realized: number | null; validated: number | null;
  periodName?: string | null; testId?: string;
}) {
  const scale = Math.max(planned ?? 0, forecast ?? 0, realized ?? 0);
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
  modelLabel, extra, state,
}: { modelLabel?: string | null; extra?: React.ReactNode; state?: DataState | string | null }) {
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
      <span style={{ marginLeft: 'auto' }}><StrataDataStateLozenge state={state ?? null} /></span>
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
  trail, title, hideTitle, headerActions, modelLabel, state, extra, toolbarActions, docTitle, children, testId,
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
        <StrataContextToolbar modelLabel={modelLabel} extra={
          <>
            {extra}
            {toolbarActions ? <span style={{ display: 'inline-flex', gap: 8, marginLeft: 8 }}>{toolbarActions}</span> : null}
          </>
        } state={state} />
      </div>
      {children}
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
        return (
          <button
            key={m.key}
            type="button"
            onClick={m.onClick}
            disabled={!clickable}
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
            {m.ring ? <StrataScoreRing score={m.ring.score} bandKey={m.ring.bandKey} size={56} strokeWidth={5} /> : null}
            <span style={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
              <span style={{
                fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: T.subtlest,
                letterSpacing: '0.04em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {m.label}
              </span>
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
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
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
        <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 8 }}>{actions}</span>
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
