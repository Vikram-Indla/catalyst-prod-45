/**
 * STRATA Key Result detail — /strata/krs/:slug (CAT-STRATA-THEMEOKR-20260719-001).
 * Deep-link surface for a single independent Key Result: measurement contract, reportability,
 * observation-based progress + performance/confidence/data-quality, and the append-only
 * observation ledger (submit + maker-checker validate). Reuses the canonical KR components.
 */
import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button, EmptyState, Lozenge, Spinner } from '@/components/ads';
import { Target } from '@/lib/atlaskit-icons';
import { Routes } from '@/lib/routes';
import { kpiApi } from '@/modules/strata/domain';
import { useProfileNames, useStrataRoles } from '@/modules/strata/hooks/useStrata';
import {
  KrObservations, KrReportabilityBadge, StrataPageShell, StrataPanel, T,
} from '@/modules/strata/components/shared';
import { fmtUnit, labelize } from '@/modules/strata/components/format';

const UPDATE_ROLES = ['kr_reporter', 'kr_owner', 'okr_owner', 'data_steward', 'strategy_office', 'strata_admin'];
const VALIDATE_ROLES = ['data_steward', 'strategy_office', 'okr_approver', 'strata_admin'];

const PERF_LOZENGE: Record<string, { label: string; appearance: React.ComponentProps<typeof Lozenge>['appearance'] }> = {
  on_track: { label: 'On track', appearance: 'success' },
  at_risk: { label: 'At risk', appearance: 'moved' },
  off_track: { label: 'Off track', appearance: 'removed' },
  not_assessed: { label: 'Not assessed', appearance: 'default' },
};

export default function StrataKrDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const krQ = useQuery({ queryKey: ['strata', 'kr-by-slug', slug], queryFn: () => kpiApi.krBySlug(slug!), enabled: !!slug, staleTime: 0 });
  const kr = krQ.data;
  const okrQ = useQuery({ queryKey: ['strata', 'okr', kr?.okr_id], queryFn: () => kpiApi.okr(kr!.okr_id), enabled: !!kr?.okr_id, staleTime: 30_000 });
  const okr = okrQ.data;
  const progQ = useQuery({ queryKey: ['strata', 'kr-progress', kr?.id], queryFn: () => kpiApi.krProgress(kr!.id), enabled: !!kr?.id, staleTime: 0 });
  const roles = useStrataRoles();
  const profiles = useProfileNames();
  const canUpdate = (roles.data ?? []).some((r) => UPDATE_ROLES.includes(r));
  const canValidate = (roles.data ?? []).some((r) => VALIDATE_ROLES.includes(r));
  const nameOf = (id: string | null | undefined) => (id ? ((profiles.data?.get(id) as { name?: string } | undefined)?.name ?? '—') : '—');

  if (krQ.isLoading) {
    return <StrataPageShell trail={[{ text: 'Strategy', href: Routes.strata.strategy() }]} title="Loading…"><Spinner size="large" aria-label="Loading Key Result" /></StrataPageShell>;
  }
  if (!kr) {
    return (
      <StrataPageShell trail={[{ text: 'Strategy', href: Routes.strata.strategy() }]} title="Key Result not found">
        <EmptyState header="Key Result not found" description="This Key Result does not exist or has been removed." />
      </StrataPageShell>
    );
  }
  const p = progQ.data as { actual?: number | string | null; progress_pct?: number | null; performance_status?: string; confidence?: string; data_quality?: string } | undefined;
  const perf = p?.performance_status ? PERF_LOZENGE[p.performance_status] : null;

  const contract: Array<[string, React.ReactNode]> = [
    ['Reference', kr.kr_ref ?? '—'],
    ['Baseline → target', `${fmtUnit(kr.baseline, kr.unit)} → ${fmtUnit(kr.target, kr.unit)}`],
    ['Direction', labelize(kr.direction)],
    ['Update method', kr.update_method ? labelize(kr.update_method) : '—'],
    ['Unit', kr.unit ?? '—'],
    ['Critical', kr.is_critical ? 'Yes' : 'No'],
    ['Weight', kr.weight != null ? String(kr.weight) : '—'],
    ['Accountable owner', nameOf(kr.accountable_owner_id)],
    ['Lifecycle', kr.lifecycle ? labelize(kr.lifecycle) : '—'],
  ];

  return (
    <StrataPageShell
      docTitle={kr.name}
      title={kr.name}
      trail={[
        { text: 'Strategy', href: Routes.strata.strategy() },
        ...(okr ? [{ text: okr.name, href: Routes.strata.okr(okr.slug ?? '') }] : []),
      ]}
      headerActions={<KrReportabilityBadge krId={kr.id} />}
      testId={`strata-kr-detail-${kr.id}`}
    >
      <div style={{ display: 'grid', gap: 16 }}>
      <StrataPanel title="Progress" icon={<Target size={16} />}>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'baseline' }}>
          <div>
            <div style={{ fontSize: 'var(--ds-font-size-600)', fontWeight: 700, color: T.text, fontVariantNumeric: 'tabular-nums' }}>
              {p?.progress_pct != null ? `${p.progress_pct}%` : '—'}
            </div>
            <div style={{ fontSize: 'var(--ds-font-size-100)', color: T.subtle }}>progress</div>
          </div>
          <div>
            <div style={{ fontWeight: 600, color: T.text, fontVariantNumeric: 'tabular-nums' }}>{p?.actual != null ? fmtUnit(Number(p.actual), kr.unit) : '—'}</div>
            <div style={{ fontSize: 'var(--ds-font-size-100)', color: T.subtle }}>current</div>
          </div>
          {perf ? <Lozenge appearance={perf.appearance}>{perf.label}</Lozenge> : null}
          {p?.confidence && p.confidence !== 'not_set' ? <span style={{ fontSize: 'var(--ds-font-size-100)', color: T.subtle }}>confidence: {labelize(p.confidence)}</span> : null}
          {p?.data_quality ? <span style={{ fontSize: 'var(--ds-font-size-100)', color: T.subtlest }}>data: {labelize(p.data_quality)}</span> : null}
        </div>
      </StrataPanel>

      <StrataPanel title="Measurement contract">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
          {contract.map(([k, v]) => (
            <div key={k}>
              <div style={{ fontSize: 'var(--ds-font-size-100)', color: T.subtle }}>{k}</div>
              <div style={{ color: T.text, fontVariantNumeric: 'tabular-nums' }}>{v}</div>
            </div>
          ))}
        </div>
        {kr.business_definition ? (
          <p style={{ marginTop: 12, color: T.subtle, fontSize: 'var(--ds-font-size-100)' }}>{kr.business_definition}</p>
        ) : null}
      </StrataPanel>

      <StrataPanel title="Observations">
        {canUpdate || canValidate
          ? <KrObservations krId={kr.id} krName={kr.name} canValidate={canValidate} embedded onClose={() => { /* inline on detail page */ }} />
          : <EmptyState size="compact" header="Observations" description="You do not have permission to record or validate observations." />}
      </StrataPanel>

      <div style={{ marginTop: 8 }}>
        <Button appearance="subtle" spacing="compact" onClick={() => navigate(okr?.slug ? Routes.strata.okr(okr.slug) : Routes.strata.strategy())}>
          ← Back to {okr ? okr.name : 'Strategy'}
        </Button>
      </div>
      </div>
    </StrataPageShell>
  );
}
