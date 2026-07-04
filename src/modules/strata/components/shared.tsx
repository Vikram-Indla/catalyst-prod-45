/**
 * STRATA shared surface components — ADS tokens only, canonical primitives only.
 * Data-state labels (live/draft/pending/locked) are SYSTEM states (DB CHECKs);
 * band labels/appearances come from governed threshold-scheme config at runtime.
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DropdownMenu, { DropdownItem, DropdownItemGroup } from '@atlaskit/dropdown-menu';
import { Button, CatalystDrawer, Lozenge } from '@/components/ads';
import { useBandResolver, useStrataContext } from '../hooks/useStrata';
import type { DataState, StrataCalculatedValue, ThresholdBand } from '../types';
import { Routes } from '@/lib/routes';

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

// ── Band lozenge (governed config; zero-assumption when unknown) ────────────
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

// ── Config context bar (blueprint §5: every screen states its context) ──────
export function StrataConfigContextBar({
  modelLabel,
  extra,
  state,
}: {
  modelLabel?: string | null;
  extra?: React.ReactNode;
  state?: DataState | string | null;
}) {
  const { cycles, periods, activeCycle, activePeriod, setActiveCycleId, setActivePeriodId } = useStrataContext();
  const chip: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '4px 8px', borderRadius: 4,
    background: 'var(--ds-background-neutral)', color: 'var(--ds-text-subtle)',
    font: 'inherit', fontSize: 12, fontWeight: 500, border: 'none', cursor: 'default',
  };
  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
        padding: '8px 0', borderBottom: '1px solid var(--ds-border)', marginBottom: 16,
      }}
      data-testid="strata-config-context"
    >
      <DropdownMenu
        trigger={({ triggerRef, ...props }) => (
          <button {...props} ref={triggerRef as React.Ref<HTMLButtonElement>} style={{ ...chip, cursor: 'pointer' }}>
            Cycle: <strong style={{ color: 'var(--ds-text)' }}>{activeCycle?.name ?? '—'}</strong> ▾
          </button>
        )}
      >
        <DropdownItemGroup>
          {cycles.map((c) => (
            <DropdownItem key={c.id} isSelected={c.id === activeCycle?.id} onClick={() => setActiveCycleId(c.id)}>
              {c.name}
            </DropdownItem>
          ))}
        </DropdownItemGroup>
      </DropdownMenu>
      <DropdownMenu
        trigger={({ triggerRef, ...props }) => (
          <button {...props} ref={triggerRef as React.Ref<HTMLButtonElement>} style={{ ...chip, cursor: 'pointer' }}>
            Period: <strong style={{ color: 'var(--ds-text)' }}>{activePeriod?.name ?? '—'}</strong> ▾
          </button>
        )}
      >
        <DropdownItemGroup>
          {periods.map((p) => (
            <DropdownItem key={p.id} isSelected={p.id === activePeriod?.id} onClick={() => setActivePeriodId(p.id)}>
              {p.name}{p.close_status === 'closed' ? ' · closed' : ''}
            </DropdownItem>
          ))}
        </DropdownItemGroup>
      </DropdownMenu>
      {modelLabel ? <span style={chip}>Model: <strong style={{ color: 'var(--ds-text)' }}>{modelLabel}</strong></span> : null}
      {extra}
      <span style={{ marginLeft: 'auto' }}><StrataDataStateLozenge state={state ?? null} /></span>
    </div>
  );
}

// ── Metric stat tile ─────────────────────────────────────────────────────────
export function StrataMetricStat({
  label, value, caption, bandKey, onClick, testId,
}: {
  label: string;
  value: React.ReactNode;
  caption?: React.ReactNode;
  bandKey?: string | null;
  onClick?: () => void;
  testId?: string;
}) {
  const clickable = !!onClick;
  return (
    <div
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={onClick}
      onKeyDown={clickable ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick?.(); } } : undefined}
      data-testid={testId}
      style={{
        background: 'var(--ds-surface-raised)', border: '1px solid var(--ds-border)',
        borderRadius: 8, padding: '12px 16px', minWidth: 0,
        cursor: clickable ? 'pointer' : 'default',
        display: 'flex', flexDirection: 'column', gap: 4,
        boxShadow: 'var(--ds-shadow-raised)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ds-text-subtle)' }}>{label}</span>
        <StrataBandLozenge bandKey={bandKey} />
      </div>
      <div style={{ fontSize: 24, fontWeight: 600, color: 'var(--ds-text)', lineHeight: 1.2 }}>{value}</div>
      {caption ? <div style={{ fontSize: 12, color: 'var(--ds-text-subtlest)' }}>{caption}</div> : null}
    </div>
  );
}

// ── Evidence drawer (lineage on every executive number — blueprint §19) ─────
function EvidenceRow({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 12, padding: '8px 0', borderBottom: '1px solid var(--ds-border)' }}>
      <span style={{ width: 140, flexShrink: 0, fontSize: 12, fontWeight: 600, color: 'var(--ds-text-subtle)' }}>{k}</span>
      <span style={{ fontSize: 13, color: 'var(--ds-text)', minWidth: 0, overflowWrap: 'anywhere' }}>{children}</span>
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
        <h2 style={{ fontSize: 20, fontWeight: 600, color: 'var(--ds-text)', margin: '0 0 4px' }}>{title}</h2>
        <p style={{ fontSize: 12, color: 'var(--ds-text-subtlest)', margin: '0 0 16px' }}>
          Every number traces to source, formula version, validation and snapshot. Nothing here is computed in the UI.
        </p>
        {calcValues.length === 0 ? (
          <p style={{ color: 'var(--ds-text-subtle)' }}>No calculated values recorded yet.</p>
        ) : (
          calcValues.map((cv) => (
            <div key={cv.id} style={{ marginBottom: 24, padding: 12, background: 'var(--ds-surface-sunken)', borderRadius: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <strong style={{ color: 'var(--ds-text)', fontSize: 13 }}>{cv.metric_key}</strong>
                <StrataBandLozenge bandKey={cv.status_key} />
              </div>
              <EvidenceRow k="Value / score">{cv.value ?? '—'}{cv.score != null && cv.score !== cv.value ? ` · score ${cv.score}` : ''}</EvidenceRow>
              <EvidenceRow k="Formula version">{cv.formula_version ?? '—'}</EvidenceRow>
              <EvidenceRow k="Inputs">{cv.inputs ? JSON.stringify(cv.inputs) : '—'}</EvidenceRow>
              <EvidenceRow k="Source runs">
                {cv.source_run_ids?.length
                  ? cv.source_run_ids.map((rid) => {
                      const key = runKeysById?.[rid];
                      return key ? (
                        <Button key={rid} appearance="subtle" spacing="compact" onClick={() => navigate(Routes.strata.run(key))}>
                          {key}
                        </Button>
                      ) : (<span key={rid}>{rid.slice(0, 8)}… </span>);
                    })
                  : '—'}
              </EvidenceRow>
              <EvidenceRow k="Config context">{cv.config_context ? JSON.stringify(cv.config_context) : '—'}</EvidenceRow>
              <EvidenceRow k="Confidence">{cv.confidence ?? '—'}</EvidenceRow>
              <EvidenceRow k="Calculated at">{new Date(cv.calculated_at).toLocaleString()}</EvidenceRow>
              <EvidenceRow k="Snapshot">{cv.snapshot_id ? 'Frozen in snapshot' : 'Live (not yet snapshotted)'}</EvidenceRow>
            </div>
          ))
        )}
      </div>
    </CatalystDrawer>
  );
}

/** Small "ⓘ evidence" affordance for metric surfaces. */
export function useEvidenceDrawer() {
  const [state, setState] = useState<{ title: string; values: StrataCalculatedValue[] } | null>(null);
  return {
    open: (title: string, values: StrataCalculatedValue[]) => setState({ title, values }),
    drawer: (
      <StrataEvidenceDrawer
        open={!!state}
        onClose={() => setState(null)}
        title={state?.title ?? ''}
        calcValues={state?.values ?? []}
      />
    ),
  };
}

// ── Section panel ────────────────────────────────────────────────────────────
export function StrataPanel({
  title, actions, children, testId,
}: { title: React.ReactNode; actions?: React.ReactNode; children: React.ReactNode; testId?: string }) {
  return (
    <section
      data-testid={testId}
      style={{
        background: 'var(--ds-surface-raised)', border: '1px solid var(--ds-border)',
        borderRadius: 8, padding: 16, minWidth: 0, boxShadow: 'var(--ds-shadow-raised)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, gap: 8 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--ds-text-subtle)', margin: 0 }}>
          {title}
        </h3>
        {actions}
      </div>
      {children}
    </section>
  );
}
