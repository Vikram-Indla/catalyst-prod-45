/**
 * STRATA Board Pack — read-only editorial preview + Present mode (anchor 24, slice 4G).
 * Route: /strata/reviews/:snapshotKey/pack.
 *
 * Scope (P4-D2): a READ-ONLY editorial arc generated CLIENT-SIDE from the frozen
 * snapshot (items + decisions + actions) — Cover · Condition · Explanation · Value ·
 * Decisions · Follow-through, each with a per-page snapshot stamp. Present mode is a
 * chrome-stripped 16:9 overlay stepped by ←/→ (Esc returns to the cockpit). Print/PDF
 * reuses the existing generateBoardPackPdf. The editorial BUILDER (narrative editing,
 * reorder, draft N→N+1) and Issue (freeze→issued + distribution + immutable copy) are
 * DEFERRED to a separate backend feature — no draft numbers or distribution are fabricated.
 * Narrative is GROUNDED prose composed from real snapshot figures; missing data renders
 * as an honest labeled gap, never invented. ADS tokens only.
 */
import React, { useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Button, EmptyState, SectionMessage, Spinner } from '@/components/ads';
import { StatusLozenge } from '@/components/shared/StatusLozenge';
import { Routes } from '@/lib/routes';
import { ChevronLeft, ChevronRight, FileBarChart, Play, X } from '@/lib/atlaskit-icons';
import {
  useSnapshotByKey, useSnapshotItems, useDecisions, useActions, useStrataContext, useProfileNames,
} from '@/modules/strata/hooks/useStrata';
import { StrataPageShell, StrataSnapshotBand, T } from '@/modules/strata/components/shared';
import { generateBoardPackPdf, type BoardPackData } from '@/modules/strata/lib/boardPack';
import { fmtDate, fmtDateTime } from '@/modules/strata/components/format';
import type { StrataAction, StrataDecision, StrataSnapshot } from '@/modules/strata/types';

interface SnapshotItemRow { id: string; snapshot_id: string; entity_type: string; entity_id: string | null; payload: Record<string, unknown> | null; }

const bodyStyle: React.CSSProperties = { fontSize: 'var(--ds-font-size-200)', color: T.text };
const captionStyle: React.CSSProperties = { fontSize: 'var(--ds-font-size-100)', color: T.subtlest };

/** One editorial page (grounded body + snapshot-stamp page number). */
interface PackPage { id: string; kicker: string; title: string; body: React.ReactNode; }

const DECISION_LOZENGE: Record<StrataDecision['status'], 'inprogress' | 'success' | 'default'> = {
  open: 'inprogress', decided: 'success', closed: 'default',
};

export default function StrataBoardPackPage() {
  const { snapshotKey } = useParams<{ snapshotKey: string }>();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { cycles, periods } = useStrataContext();

  const snapQ = useSnapshotByKey(snapshotKey);
  const snapshot = snapQ.data ?? null;
  const itemsQ = useSnapshotItems(snapshot?.id);
  const items = useMemo(() => (itemsQ.data ?? []) as SnapshotItemRow[], [itemsQ.data]);
  const decisionsQ = useDecisions();
  const actionsQ = useActions();
  const profilesQ = useProfileNames();
  const profileName = (id: string | null | undefined): string => (id ? profilesQ.data?.get(id)?.name ?? '—' : '—');

  const snapshotDecisions = useMemo<StrataDecision[]>(
    () => (snapshot ? (decisionsQ.data ?? []).filter((d) => d.snapshot_id === snapshot.id) : []),
    [decisionsQ.data, snapshot],
  );
  const snapshotActions = useMemo<StrataAction[]>(() => {
    const ids = new Set(snapshotDecisions.map((d) => d.id));
    return (actionsQ.data ?? []).filter((a) => a.decision_id && ids.has(a.decision_id));
  }, [actionsQ.data, snapshotDecisions]);

  // KPI band tallies from the frozen items — the numbers the Condition page states.
  const kpiTally = useMemo(() => {
    const kpis = items.filter((i) => i.entity_type === 'kpi');
    let onTrack = 0; let watch = 0; let below = 0;
    kpis.forEach((i) => {
      const band = typeof i.payload?.status_key === 'string' ? i.payload.status_key : null;
      if (band === 'green' || band === 'on_track') onTrack += 1;
      else if (band === 'amber' || band === 'watch') watch += 1;
      else if (band === 'red' || band === 'below' || band === 'danger') below += 1;
    });
    return { total: kpis.length, onTrack, watch, below };
  }, [items]);
  const benefitCount = useMemo(() => items.filter((i) => i.entity_type === 'benefit').length, [items]);

  const cycleName = snapshot?.cycle_id ? cycles.find((c) => c.id === snapshot.cycle_id)?.name ?? null : null;
  const periodName = snapshot?.period_id ? periods.find((p) => p.id === snapshot.period_id)?.name ?? null : null;

  // ── Editorial arc (grounded prose only) ─────────────────────────────────────
  const pages = useMemo<PackPage[]>(() => {
    if (!snapshot) return [];
    const gap = (label: string) => <span style={{ color: T.subtlest }}>{label}</span>;
    return [
      {
        id: 'cover', kicker: 'COVER', title: snapshot.name,
        body: (
          <span>
            {cycleName ? `${cycleName} · ` : ''}{periodName ? `${periodName} · ` : ''}
            prepared by the Strategy Office from frozen snapshot truth. Narrative is editorial; every figure is snapshot-frozen and stamped per page.
          </span>
        ),
      },
      {
        id: 'condition', kicker: 'SECTION 01 · CONDITION', title: 'Where the strategy stands',
        body: kpiTally.total === 0 ? gap('No KPI evidence was frozen in this snapshot.') : (
          <span>
            {kpiTally.total} KPI{kpiTally.total === 1 ? '' : 's'} frozen — {kpiTally.onTrack} on track, {kpiTally.watch} on watch, {kpiTally.below} below threshold.
            The figures beside these words are the snapshot actuals, not a live recalculation.
          </span>
        ),
      },
      {
        id: 'explanation', kicker: 'SECTION 02 · EXPLANATION', title: 'What moved, and why',
        body: kpiTally.below + kpiTally.watch === 0
          ? <span>No frozen KPI is below threshold or on watch — the quarter held to plan on the measured lines.</span>
          : <span>{kpiTally.below} KPI{kpiTally.below === 1 ? '' : 's'} below threshold and {kpiTally.watch} on watch drive the movement. Each is validated actuals with its threshold context; commentary is tied to the frozen period.</span>,
      },
      {
        id: 'value', kicker: 'SECTION 03 · VALUE', title: 'Value at risk',
        body: benefitCount === 0
          ? gap('No benefit realization records were frozen in this snapshot — value-at-stake is not part of this pack.')
          : <span>{benefitCount} benefit{benefitCount === 1 ? '' : 's'} carry stage figures (planned → validated) in this snapshot; realized value awaiting validation is labeled as such.</span>,
      },
      {
        id: 'decisions', kicker: 'SECTION 04 · DECISIONS', title: 'Decisions with evidence',
        body: snapshotDecisions.length === 0 ? gap('No decisions have been recorded against this snapshot yet.') : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {snapshotDecisions.map((d) => (
              <div key={d.id} style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <StatusLozenge status={d.status} label={d.status === 'open' ? 'OPEN' : 'RECORDED'} appearance={DECISION_LOZENGE[d.status] ?? 'default'} />
                <span style={bodyStyle}>{d.title}</span>
              </div>
            ))}
          </div>
        ),
      },
      {
        id: 'followthrough', kicker: 'SECTION 05 · FOLLOW-THROUGH', title: 'Actions & prior outcomes',
        body: snapshotActions.length === 0 ? gap('No follow-up actions have been assigned from this snapshot’s decisions.') : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {snapshotActions.map((a) => (
              <div key={a.id} style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                <StatusLozenge status={a.status} label={a.status.replace('_', ' ')} appearance={a.status === 'done' ? 'success' : a.status === 'cancelled' ? 'removed' : 'inprogress'} />
                <span style={bodyStyle}>{a.title}</span>
                <span style={captionStyle}>owner {profileName(a.owner_id)}{a.due_date ? ` · due ${fmtDate(a.due_date)}` : ''}</span>
              </div>
            ))}
          </div>
        ),
      },
    ];
  }, [snapshot, cycleName, periodName, kpiTally, benefitCount, snapshotDecisions, snapshotActions, profilesQ.data]);

  const stamp = snapshot ? `${snapshot.snapshot_key} · frozen ${snapshot.locked_at ? fmtDateTime(snapshot.locked_at) : '—'}` : '';

  // ── Print/PDF — reuse the existing generator (no ADS-token constraint inside binaries) ──
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const evidenceGroups = useMemo(() => {
    const m = new Map<string, number>();
    items.forEach((i) => m.set(i.entity_type, (m.get(i.entity_type) ?? 0) + 1));
    return [...m.entries()] as Array<[string, number]>;
  }, [items]);
  const printPdf = async () => {
    if (!snapshot) return;
    setBusy(true); setError(null);
    try {
      const data: BoardPackData = {
        snapshot,
        cycleName, periodName,
        evidenceGroups,
        runCount: snapshot.data_run_ids?.length ?? 0,
        evidence: items.slice(0, 40).map((i) => ({
          entityType: i.entity_type,
          entity: typeof i.payload?.entity_name === 'string' ? i.payload.entity_name : '—',
          metric: typeof i.payload?.name === 'string' ? i.payload.name : (typeof i.payload?.metric_key === 'string' ? i.payload.metric_key : '—'),
          value: i.payload?.value != null ? String(i.payload.value) : '—',
          band: typeof i.payload?.status_key === 'string' ? i.payload.status_key : '—',
        })),
        decisions: snapshotDecisions.map((d) => ({ decision: d, ownerName: profileName(d.owner_id) })),
        openActions: snapshotActions.filter((a) => a.status === 'open' || a.status === 'in_progress').map((a) => ({ action: a, ownerName: profileName(a.owner_id) })),
      };
      const artifact = await generateBoardPackPdf(data);
      const url = URL.createObjectURL(artifact.blob);
      const link = document.createElement('a');
      link.href = url; link.download = artifact.filename; link.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  // ── Present mode (?present) — chrome-stripped 16:9, keyboard-stepped ─────────
  const presenting = params.get('present') != null;
  const sectionIdx = Math.max(0, Math.min(pages.length - 1, Number(params.get('section') ?? '0') || 0));
  const setSection = (i: number) => {
    const next = new URLSearchParams(params);
    next.set('present', ''); next.set('section', String(Math.max(0, Math.min(pages.length - 1, i))));
    setParams(next, { replace: true });
  };
  const openPresent = () => { const n = new URLSearchParams(params); n.set('present', ''); n.set('section', '0'); setParams(n); };
  const exitPresent = () => { const n = new URLSearchParams(params); n.delete('present'); n.delete('section'); setParams(n); };
  React.useEffect(() => {
    if (!presenting) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') exitPresent();
      else if (e.key === 'ArrowRight') setSection(sectionIdx + 1);
      else if (e.key === 'ArrowLeft') setSection(sectionIdx - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }); // eslint-disable-line react-hooks/exhaustive-deps

  if (snapQ.isLoading) {
    return <StrataPageShell docTitle="Board pack" testId="strata-board-pack-chrome"><div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><Spinner size="large" /></div></StrataPageShell>;
  }
  if (!snapshot) {
    return (
      <StrataPageShell docTitle="Board pack" testId="strata-board-pack-chrome">
        <EmptyState
          header={`Snapshot ${snapshotKey} not found`}
          description="This board pack has no locked snapshot to render from."
          primaryAction={<Button onClick={() => navigate(Routes.strata.reviews())}>Back to reviews</Button>}
        />
      </StrataPageShell>
    );
  }

  // Present-mode overlay (rendered above the shell).
  if (presenting) {
    const page = pages[sectionIdx];
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 400, background: T.sunken, display: 'flex', flexDirection: 'column', padding: 24 }} data-testid="strata-board-pack-present" role="dialog" aria-label="Board pack present mode">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <span style={{ ...captionStyle, fontWeight: 700, letterSpacing: '0.04em' }}>{snapshot.name}</span>
          <Button appearance="subtle" spacing="compact" iconBefore={<X size={14} />} onClick={exitPresent} testId="strata-present-exit">Exit</Button>
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 0 }}>
          <div style={{ width: '100%', maxWidth: 960, aspectRatio: '16 / 9', background: T.raised, border: `1px solid ${T.border}`, borderRadius: 8, boxShadow: 'var(--ds-shadow-overlay)', padding: 48, display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
            <div style={{ ...captionStyle, fontWeight: 700, letterSpacing: '0.08em', color: T.brandText }}>{page.kicker} · {snapshot.snapshot_key}</div>
            <div style={{ fontSize: 'var(--ds-font-size-500)', fontWeight: 700, color: T.text, marginTop: 12, lineHeight: 1.25 }}>{page.title}</div>
            <div style={{ marginTop: 24, ...bodyStyle, lineHeight: 1.6 }}>{page.body}</div>
            <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 16, ...captionStyle }}>
              <span>← → step sections · Esc exits to cockpit</span>
              <span style={{ marginLeft: 'auto', fontVariantNumeric: 'tabular-nums' }}>{sectionIdx + 1} / {pages.length}</span>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 16 }}>
          <Button appearance="default" iconBefore={<ChevronLeft size={16} />} isDisabled={sectionIdx === 0} onClick={() => setSection(sectionIdx - 1)}>Previous</Button>
          <Button appearance="default" iconAfter={<ChevronRight size={16} />} isDisabled={sectionIdx === pages.length - 1} onClick={() => setSection(sectionIdx + 1)}>Next</Button>
        </div>
      </div>
    );
  }

  return (
    <StrataPageShell
      trail={[{ text: 'Reviews & decisions', href: Routes.strata.reviews() }, { text: snapshotKey!, href: Routes.strata.review(snapshotKey!) }, { text: 'Board pack' }]}
      title={`Board pack — ${snapshot.name}`}
      docTitle={`Board pack · ${snapshotKey}`}
      state={snapshot.status}
      headerActions={
        <div style={{ display: 'inline-flex', gap: 8 }}>
          <Button appearance="default" iconBefore={<Play size={14} />} onClick={openPresent} testId="strata-board-pack-present-btn">Present mode</Button>
          <Button appearance="primary" iconBefore={<FileBarChart size={14} />} isDisabled={busy} onClick={() => void printPdf()} testId="strata-board-pack-print">
            {busy ? 'Preparing…' : 'Print / PDF'}
          </Button>
        </div>
      }
      testId="strata-board-pack-chrome"
    >
      <StrataSnapshotBand
        snapshotKey={snapshot.snapshot_key}
        frozenAt={snapshot.locked_at ? fmtDateTime(snapshot.locked_at) : null}
        basis="every page renders snapshot truth, stamped per page · narrative is editorial, figures are frozen"
        testId="strata-board-pack-identity"
      />

      {error ? (
        <div style={{ marginTop: 16 }}>
          <SectionMessage appearance="error" title="Could not generate the PDF"><p style={{ whiteSpace: 'pre-wrap' }}>{error}</p></SectionMessage>
        </div>
      ) : null}

      <div style={{ marginTop: 16, border: `1px solid ${T.border}`, borderRadius: 8, background: T.raised, boxShadow: 'var(--ds-shadow-raised)', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', borderBottom: `1px solid ${T.border}` }}>
          <span style={{ ...bodyStyle, fontWeight: 600 }}>Pack structure — editorial arc</span>
          <span style={{ marginLeft: 'auto', ...captionStyle }}>Read-only preview · editorial builder &amp; Issue are a later feature</span>
        </div>
        <div style={{ display: 'flex', gap: 16, padding: 16, overflowX: 'auto', background: T.sunken }} data-testid="strata-board-pack-arc">
          {pages.map((page, i) => (
            <div key={page.id} style={{ width: 300, flexShrink: 0, aspectRatio: '0.773', background: T.raised, border: `1px solid ${T.border}`, borderRadius: 4, boxShadow: 'var(--ds-shadow-raised)', padding: 24, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ ...captionStyle, fontWeight: 700, letterSpacing: '0.08em', color: T.brandText }}>{page.kicker}</div>
              <div style={{ ...bodyStyle, fontWeight: 700, marginTop: 8, lineHeight: 1.25 }}>{page.title}</div>
              <div style={{ marginTop: 8, ...captionStyle, color: T.subtle, lineHeight: 1.6, overflow: 'auto' }}>{page.body}</div>
              <div style={{ marginTop: 'auto', paddingTop: 12, display: 'flex', justifyContent: 'space-between', ...captionStyle }}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{stamp}</span>
                <span style={{ flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>{i + 1}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </StrataPageShell>
  );
}
