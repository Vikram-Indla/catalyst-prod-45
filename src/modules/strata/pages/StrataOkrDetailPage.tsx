/**
 * STRATA Theme-owned OKR detail — /strata/okrs/:slug (CAT-STRATA-THEMEOKR-20260719-001).
 * Deep-link surface for a single Theme-owned OKR: objective statement, KRs (with observation
 * entry/validation), official progress (observation-based v2), governed lifecycle, and version
 * history. Reuses the canonical OKR/KR components — one definition, many call sites.
 */
import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, EmptyState, Lozenge, Spinner } from '@/components/ads';
import { Target } from '@/lib/atlaskit-icons';
import { Routes } from '@/lib/routes';
import { kpiApi } from '@/modules/strata/domain';
import { useStrataRoles, useStrategyElements } from '@/modules/strata/hooks/useStrata';
import {
  KeyResultsList, OKR_STATUS_LOZENGE, OkrLifecycleActions, OkrOfficialProgress,
  StrataPageShell, StrataPanel, T,
} from '@/modules/strata/components/shared';
import { fmtDateTime, labelize } from '@/modules/strata/components/format';

const AUTHOR_ROLES = ['strategy_office', 'okr_owner', 'strata_admin'];
const VALIDATE_ROLES = ['data_steward', 'strategy_office', 'okr_approver', 'strata_admin'];

const VERSION_STATUS: Record<string, React.ComponentProps<typeof Lozenge>['appearance']> = {
  draft: 'default', approved: 'success', superseded: 'moved',
};

// D4: governed toggle for whether standalone (non-assignment-backed) KRs count toward official
// progress. New OKRs default to 'unofficial' (standalone excluded); legacy OKRs can be opted in
// consciously by an owner — preserves the S5 backfill / D-1 "don't move historical numbers" rule.
function StandaloneKrPolicyControl({ okr, canAuthor, onChanged }: {
  okr: { id: string; standalone_kr_policy?: string | null };
  canAuthor: boolean; onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const excluded = (okr.standalone_kr_policy ?? 'legacy') === 'unofficial';
  const toggle = async () => {
    setBusy(true); setError(null);
    try { await kpiApi.setOkrStandaloneKrPolicy(okr.id, excluded ? 'legacy' : 'unofficial'); onChanged(); }
    catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  };
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', fontSize: 'var(--ds-font-size-100)', color: T.subtle }}>
      <span>Standalone KRs: <strong style={{ color: T.text }}>{excluded ? 'excluded from official progress' : 'counted (legacy)'}</strong></span>
      {canAuthor ? (
        <Button appearance="subtle" spacing="compact" isDisabled={busy} testId="okr-standalone-policy-toggle" onClick={toggle}>
          {excluded ? 'Count standalone KRs (legacy)' : 'Exclude standalone KRs'}
        </Button>
      ) : null}
      {error ? <span style={{ color: 'var(--ds-text-danger)' }}>{error}</span> : null}
    </div>
  );
}

export default function StrataOkrDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const okrQ = useQuery({ queryKey: ['strata', 'okr-by-slug', slug], queryFn: () => kpiApi.okrBySlug(slug!), enabled: !!slug, staleTime: 0 });
  const okr = okrQ.data;
  const roles = useStrataRoles();
  const canAuthor = (roles.data ?? []).some((r) => AUTHOR_ROLES.includes(r));
  const canValidate = (roles.data ?? []).some((r) => VALIDATE_ROLES.includes(r));
  const elementsQ = useStrategyElements(okr?.cycle_id ?? undefined);
  const theme = (elementsQ.data ?? []).find((e) => e.id === okr?.theme_id);
  const versionsQ = useQuery({
    queryKey: ['strata', 'okr-versions', okr?.id], queryFn: () => kpiApi.okrVersions(okr!.id),
    enabled: !!okr?.id, staleTime: 30_000,
  });

  if (okrQ.isLoading) {
    return <StrataPageShell trail={[{ text: 'Strategy', href: Routes.strata.strategy() }]} title="Loading…"><Spinner size="large" aria-label="Loading OKR" /></StrataPageShell>;
  }
  if (!okr) {
    return (
      <StrataPageShell trail={[{ text: 'Strategy', href: Routes.strata.strategy() }]} title="OKR not found">
        <EmptyState header="OKR not found" description="This OKR does not exist or has been removed." />
      </StrataPageShell>
    );
  }
  const status = OKR_STATUS_LOZENGE[okr.status];
  const themeOwned = okr.theme_id != null;

  return (
    <StrataPageShell
      docTitle={okr.name}
      title={okr.name}
      trail={[
        { text: 'Strategy', href: Routes.strata.strategy() },
        ...(theme ? [{ text: theme.name, href: Routes.strata.strategyElement(theme.slug ?? '') }] : []),
      ]}
      headerActions={
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          {/* STRATA-KPI-024: author a Strategic KPI Assignment scoped to this OKR's owning objective. */}
          {canAuthor && okr.objective_id ? (
            <Button appearance="default" onClick={() => navigate(`${Routes.strata.kpis()}?tab=assignments&scope=strategic&element=${okr.objective_id}&objective=${okr.objective_id}&okr=${okr.id}&from=${encodeURIComponent(Routes.strata.okr(slug!))}`)} testId="strata-okr-create-assignment">
              Create Strategic Assignment
            </Button>
          ) : null}
          {canAuthor && !okr.objective_id ? (
            <Button appearance="default" isDisabled testId="strata-okr-create-assignment-blocked">
              Assignment unavailable · no Strategic Objective
            </Button>
          ) : null}
          {/* CAT-STRATA-EXECMODEL: OKRs predating Objective-ownership are grandfathered historical
              records (Theme-owned, no objective_id) — clearly flagged, never silently re-parented. */}
          {okr.objective_id == null && okr.theme_id != null ? (
            <Lozenge appearance="moved">Grandfathered · Theme-owned</Lozenge>
          ) : null}
          {status ? <Lozenge appearance={status.appearance}>{status.label}</Lozenge> : null}
        </span>
      }
      testId={`strata-okr-detail-${okr.id}`}
    >
      <div style={{ display: 'grid', gap: 16 }}>
      <StrataPanel title="Objective" icon={<Target size={16} />}>
        <div style={{ display: 'grid', gap: 8 }}>
          <p style={{ margin: 0, color: T.text, fontSize: 'var(--ds-font-size-200)' }}>
            {okr.objective_statement || <span style={{ color: T.subtlest }}>No objective statement recorded.</span>}
          </p>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 'var(--ds-font-size-100)', color: T.subtle }}>
            {okr.commitment ? <span>Commitment: <strong style={{ color: T.text }}>{labelize(okr.commitment)}</strong></span> : null}
            {theme ? <span>Theme: <strong style={{ color: T.text }}>{theme.name}</strong></span> : null}
          </div>
          <OkrOfficialProgress okrId={okr.id} themeOwned={themeOwned} />
          <StandaloneKrPolicyControl okr={okr} canAuthor={canAuthor} onChanged={() => {
            okrQ.refetch();
            qc.invalidateQueries({ queryKey: ['strata', 'okr-official-progress-v2', okr.id] });
            qc.invalidateQueries({ queryKey: ['strata', 'okr-official-progress', okr.id] });
          }} />
        </div>
      </StrataPanel>

      <StrataPanel title="Key Results" icon={<Target size={16} />}>
        <KeyResultsList okrId={okr.id} canUpdate={canAuthor} canValidate={canValidate} />
        {canAuthor ? <OkrLifecycleActions okr={okr} /> : null}
      </StrataPanel>

      <StrataPanel title="Version history" count={(versionsQ.data ?? []).length}>
        {(versionsQ.data ?? []).length === 0
          ? <EmptyState size="compact" header="No versions" description="Version history will appear here." />
          : (
            <div style={{ display: 'grid', gap: 6 }}>
              {(versionsQ.data ?? []).map((v, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: 'var(--ds-font-size-100)' }}>
                  <strong style={{ color: T.text, minWidth: 30 }}>v{String(v.version)}</strong>
                  <Lozenge appearance={VERSION_STATUS[String(v.status)] ?? 'default'}>{labelize(String(v.status))}</Lozenge>
                  <span style={{ color: T.subtle }}>{String(v.objective_statement ?? '')}</span>
                  {v.approved_at ? <span style={{ color: T.subtlest }}>· approved {fmtDateTime(String(v.approved_at))}</span> : null}
                  {v.change_rationale ? <span style={{ color: T.subtlest }}>· {String(v.change_rationale)}</span> : null}
                </div>
              ))}
            </div>
          )}
      </StrataPanel>

      <div style={{ marginTop: 8 }}>
        <Button appearance="subtle" spacing="compact" onClick={() => navigate(theme?.slug ? Routes.strata.strategyElement(theme.slug) : Routes.strata.strategy())}>
          ← Back to {theme ? theme.name : 'Strategy'}
        </Button>
      </div>
      </div>
    </StrataPageShell>
  );
}
