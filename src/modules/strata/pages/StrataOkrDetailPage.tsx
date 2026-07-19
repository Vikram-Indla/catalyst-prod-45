/**
 * STRATA Theme-owned OKR detail — /strata/okrs/:slug (CAT-STRATA-THEMEOKR-20260719-001).
 * Deep-link surface for a single Theme-owned OKR: objective statement, KRs (with observation
 * entry/validation), official progress (observation-based v2), governed lifecycle, and version
 * history. Reuses the canonical OKR/KR components — one definition, many call sites.
 */
import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
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

export default function StrataOkrDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
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
      headerActions={status ? <Lozenge appearance={status.appearance}>{status.label}</Lozenge> : undefined}
      testId={`strata-okr-detail-${okr.id}`}
    >
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
    </StrataPageShell>
  );
}
