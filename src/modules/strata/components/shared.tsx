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
import { useNavigate } from 'react-router-dom';
import {
  Button, CatalystDrawer, Heading, Lozenge,
} from '@/components/ads';
import { Check, ChevronDown } from '@/lib/atlaskit-icons';
import { useBandResolver, useStrataContext } from '../hooks/useStrata';
import { fmtDateTime, fmtScore, labelize } from './format';
import type { DataState, StrataCalculatedValue, ThresholdBand } from '../types';
import { Routes } from '@/lib/routes';

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

// ── Band lozenge + band tone (governed config; zero-assumption when unknown) ─
export function StrataBandLozenge({ bandKey, band }: { bandKey?: string | null; band?: ThresholdBand | null }) {
  const resolve = useBandResolver();
  const resolved = band ?? resolve(bandKey ?? null);
  if (!resolved) return bandKey ? <Lozenge appearance="default">{bandKey}</Lozenge> : null;
  return (
    <Lozenge appearance={(resolved.appearance as React.ComponentProps<typeof Lozenge>['appearance']) ?? 'default'}>
      {resolved.label}
    </Lozenge>
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
// ads DropdownMenu's custom-trigger path drops triggerRef (mis-anchors) and
// @atlaskit/popup renders empty portals in this codebase (documented in
// AllProjectsTable.tsx) — so this follows the repo-proven pattern there:
// fixed-position menu computed from the trigger rect + click-outside.
export interface StrataMenuOption {
  key: string;
  label: React.ReactNode;
  isSelected?: boolean;
  onClick?: () => void;
}

function ChipMenuItem({ option, onPick }: { option: StrataMenuOption; onPick: () => void }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      onClick={() => { option.onClick?.(); onPick(); }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', width: '100%', alignItems: 'center', gap: 8, padding: '8px 12px',
        borderRadius: 4, border: 'none', cursor: 'pointer', font: 'inherit', textAlign: 'left',
        fontSize: 'var(--ds-font-size-200)', color: T.text,
        background: option.isSelected ? T.selected : hover ? T.sunken : 'transparent',
      }}
    >
      <span style={{ flex: 1, whiteSpace: 'nowrap' }}>{option.label}</span>
      {option.isSelected ? <Check size={12} /> : null}
    </button>
  );
}

const CHIP_MENU_WIDTH = 220;

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
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);

  const recompute = React.useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    let left = r.left;
    if (left + CHIP_MENU_WIDTH > window.innerWidth - 8) {
      left = Math.max(8, r.right - CHIP_MENU_WIDTH);
    }
    setPos({ top: r.bottom + 4, left });
  }, []);

  React.useEffect(() => {
    if (!open) { setPos(null); return; }
    recompute();
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', recompute, true);
    window.addEventListener('resize', recompute);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', recompute, true);
      window.removeEventListener('resize', recompute);
    };
  }, [open, recompute]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        data-testid={testId}
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="menu"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 8, height: 28, padding: '0 12px',
          borderRadius: 6, cursor: 'pointer', whiteSpace: 'nowrap', font: 'inherit',
          border: `1px solid ${active ? 'var(--ds-border-focused)' : T.border}`,
          background: active ? T.selected : T.raised,
          fontSize: 'var(--ds-font-size-100)', color: T.subtle,
        }}
      >
        {label}
        <strong style={{ color: T.text, fontWeight: 600 }}>{value}</strong>
        <ChevronDown size={12} />
      </button>
      {open && pos ? (
        <div
          ref={menuRef}
          role="menu"
          style={{
            position: 'fixed', top: pos.top, left: pos.left, zIndex: 1000,
            minWidth: 180, maxWidth: CHIP_MENU_WIDTH, maxHeight: 320, overflowY: 'auto',
            padding: 4, borderRadius: 8,
            background: 'var(--ds-surface-overlay)', border: `1px solid ${T.border}`,
            boxShadow: 'var(--ds-shadow-overlay)',
          }}
        >
          {options.map((o) => (
            <ChipMenuItem key={o.key} option={o} onPick={() => setOpen(false)} />
          ))}
        </div>
      ) : null}
    </>
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
      <div style={{ padding: noPadding ? 0 : 16, minWidth: 0 }}>
        {children}
      </div>
    </section>
  );
}

// ── Evidence drawer (lineage on every executive number — blueprint §19) ─────
const isUuid = (v: unknown): v is string =>
  typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
const shortId = (v: string) => `${v.slice(0, 8)}…`;

/** Executive-readable rendering of calc inputs: perspective rollups become rows,
 *  flat objects become key/value lines; unknown shapes fall back to JSON. */
function EvidenceInputs({ inputs }: { inputs: Record<string, unknown> | null | undefined }) {
  if (!inputs) return <>—</>;
  const perspectives = (inputs as { perspectives?: unknown }).perspectives;
  if (Array.isArray(perspectives)) {
    return (
      <span style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {perspectives.map((p, i) => {
          const row = p as { name?: string; score?: number; weight?: number; has_data?: boolean; status_key?: string | null };
          return (
            <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ minWidth: 96 }}>{row.name ?? '—'}</span>
              <strong style={{ color: T.text, fontVariantNumeric: 'tabular-nums' }}>{row.has_data === false ? '—' : fmtScore(row.score)}</strong>
              <span style={{ color: T.subtlest }}>w {row.weight ?? '—'}</span>
              <StrataBandLozenge bandKey={row.status_key} />
            </span>
          );
        })}
      </span>
    );
  }
  // Flatten one level of nesting (e.g. line inputs = {ref_type, weight, detail:{actual, target, …}})
  const flat: Array<[string, unknown]> = [];
  Object.entries(inputs).forEach(([k, v]) => {
    if (v != null && typeof v === 'object' && !Array.isArray(v)) {
      Object.entries(v as Record<string, unknown>).forEach(([ck, cv]) => flat.push([ck, cv]));
    } else {
      flat.push([k, v]);
    }
  });
  if (flat.length > 0 && flat.every(([, v]) => v == null || ['string', 'number', 'boolean'].includes(typeof v))) {
    return (
      <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {flat.map(([k, v], i) => (
          <span key={`${k}-${i}`}>
            <span style={{ color: T.subtlest }}>{labelize(k)}: </span>
            {v == null ? '—' : isUuid(v) ? shortId(v) : String(v)}
          </span>
        ))}
      </span>
    );
  }
  return <>{JSON.stringify(inputs)}</>;
}

function EvidenceConfigContext({ ctx }: { ctx: Record<string, unknown> | null | undefined }) {
  if (!ctx) return <>—</>;
  return (
    <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {Object.entries(ctx).map(([k, v]) => (
        <span key={k}>
          <span style={{ color: T.subtlest }}>{labelize(k)}: </span>
          {v == null ? '—' : isUuid(v) ? shortId(v) : typeof v === 'object' ? JSON.stringify(v) : String(v)}
        </span>
      ))}
    </span>
  );
}

function EvidenceRow({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 12, padding: '8px 0', borderBottom: `1px solid ${T.border}` }}>
      <span style={{ width: 140, flexShrink: 0, fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: T.subtle }}>{k}</span>
      <span style={{ fontSize: 'var(--ds-font-size-200)', color: T.text, minWidth: 0, overflowWrap: 'anywhere' }}>{children}</span>
    </div>
  );
}

export function StrataEvidenceDrawer({
  open, onClose, title, calcValues, runKeysById,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  calcValues: StrataCalculatedValue[];
  /** optional map upload_run_id → run_key for linking */
  runKeysById?: Record<string, string>;
}) {
  const navigate = useNavigate();
  return (
    <CatalystDrawer isOpen={open} onClose={onClose} width="wide" label={`Evidence: ${title}`}>
      <div style={{ padding: '0 24px 24px 0' }}>
        <Heading as="h2" size="medium">{title}</Heading>
        <p style={{ fontSize: 'var(--ds-font-size-100)', color: T.subtlest, margin: '4px 0 16px' }}>
          Every number traces to source, formula version, validation and snapshot. Nothing here is computed in the UI.
        </p>
        {calcValues.length === 0 ? (
          <p style={{ color: T.subtle }}>No calculated values recorded yet.</p>
        ) : (
          calcValues.map((cv) => (
            <div key={cv.id} style={{ marginBottom: 24, padding: 12, background: T.sunken, borderRadius: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <strong style={{ color: T.text, fontSize: 'var(--ds-font-size-200)' }}>{labelize(cv.metric_key)}</strong>
                <StrataBandLozenge bandKey={cv.status_key} />
              </div>
              <EvidenceRow k="Value / score">
                {fmtScore(cv.value)}{cv.score != null && cv.score !== cv.value ? ` · score ${fmtScore(cv.score)}` : ''}
              </EvidenceRow>
              <EvidenceRow k="Formula version">{cv.formula_version ?? '—'}</EvidenceRow>
              <EvidenceRow k="Inputs"><EvidenceInputs inputs={cv.inputs} /></EvidenceRow>
              <EvidenceRow k="Source runs">
                {cv.source_run_ids?.length
                  ? cv.source_run_ids.map((rid) => {
                      const key = runKeysById?.[rid];
                      return key ? (
                        <Button key={rid} appearance="subtle" spacing="compact" onClick={() => navigate(Routes.strata.run(key))}>
                          {key}
                        </Button>
                      ) : (<span key={rid}>{shortId(rid)} </span>);
                    })
                  : '—'}
              </EvidenceRow>
              <EvidenceRow k="Config context"><EvidenceConfigContext ctx={cv.config_context} /></EvidenceRow>
              <EvidenceRow k="Confidence">{cv.confidence ?? '—'}</EvidenceRow>
              <EvidenceRow k="Calculated at">{fmtDateTime(cv.calculated_at)}</EvidenceRow>
              <EvidenceRow k="Snapshot">{cv.snapshot_id ? 'Frozen in snapshot' : 'Live (not yet snapshotted)'}</EvidenceRow>
            </div>
          ))
        )}
      </div>
    </CatalystDrawer>
  );
}

/** Small "ⓘ evidence" affordance for metric surfaces. */
export function useEvidenceDrawer(runKeysById?: Record<string, string>) {
  const [state, setState] = useState<{ title: string; values: StrataCalculatedValue[] } | null>(null);
  return {
    open: (title: string, values: StrataCalculatedValue[]) => setState({ title, values }),
    drawer: (
      <StrataEvidenceDrawer
        open={!!state}
        onClose={() => setState(null)}
        title={state?.title ?? ''}
        calcValues={state?.values ?? []}
        runKeysById={runKeysById}
      />
    ),
  };
}
