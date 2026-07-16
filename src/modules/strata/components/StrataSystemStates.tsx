/**
 * STRATA canonical system states (anchor 28 · P5-D5).
 *
 * One canonical design each, built on the ADS EmptyState (hand-rolled empty
 * states are banned):
 *  - StrataNotFound  — "recover, don't apologize": names the failed route, the
 *    likeliest cause, and ranked exits (the owning area, then home).
 *  - StrataRestricted — "explain the gate, honor the reader": says WHY the gate
 *    exists (consequence framing), names the owning role, and states the
 *    reader's actual roles. Never a bare 403.
 *
 * Scoped honestly: the anchor's not-found also offers a search box, a fuzzy
 * best-match and a "recently viewed" list — there is no recents store and no
 * STRATA search index to back those, so they are omitted rather than faked
 * (zero-assumption). The notification landing (anchor 28 state 3) is split out:
 * it needs entity_id→slug resolution per entity type (the slug contract forbids
 * UUID routes) plus a provenance band wired into every object page.
 */
import React from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button, CatalystInlineCode, EmptyState, SectionMessage } from '@/components/ads';
import { Routes } from '@/lib/routes';
import { governanceApi } from '@/modules/strata/domain';
import { useStrataNotifications, useStrataRoles } from '@/modules/strata/hooks/useStrata';
import { labelize } from '@/modules/strata/components/format';
import type { StrataNotification } from '@/modules/strata/types';

/** The owning area for a failed /strata/<area>/... route — the first exit. */
const AREAS: Record<string, { label: string; to: string }> = {
  strategy: { label: 'Strategy Room', to: Routes.strata.strategy() },
  scorecards: { label: 'Scorecards', to: Routes.strata.scorecards() },
  kpis: { label: 'KPIs & OKRs', to: Routes.strata.kpis() },
  execution: { label: 'Project Cards', to: Routes.strata.execution() },
  portfolio: { label: 'Portfolio & Benefits', to: Routes.strata.portfolio() },
  data: { label: 'Data & Lineage', to: Routes.strata.data() },
  reviews: { label: 'Reviews & Decisions', to: Routes.strata.reviews() },
  admin: { label: 'Configuration', to: Routes.strata.admin() },
};

function areaFor(pathname: string): { label: string; to: string } | null {
  const seg = pathname.replace(/^\/strata\/?/, '').split('/')[0];
  return AREAS[seg] ?? null;
}

export function StrataNotFound({ cause, testId }: {
  /** Override the generic cause when the caller knows more (e.g. bad section). */
  cause?: string;
  testId?: string;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const area = areaFor(location.pathname);
  return (
    <div style={{ padding: '48px 24px' }}>
      <EmptyState
        size="default"
        header="This page doesn't exist — but its neighbourhood does"
        description={(
          <span>
            <CatalystInlineCode>{location.pathname}</CatalystInlineCode> matches nothing in STRATA.{' '}
            {cause ?? 'The object may have been renamed or retired, or the link is stale.'}
          </span>
        )}
        primaryAction={area
          ? <Button appearance="primary" onClick={() => navigate(area.to)} testId="strata-not-found-area">{area.label}</Button>
          : <Button appearance="primary" onClick={() => navigate(Routes.strata.root())} testId="strata-not-found-home">Command Center</Button>}
        secondaryAction={area
          ? <Button onClick={() => navigate(Routes.strata.root())} testId="strata-not-found-home">Command Center</Button>
          : undefined}
        testId={testId ?? 'strata-not-found'}
      />
    </div>
  );
}

/**
 * Provenance band for a notification deep-link (anchor 28 state 3) — "why am I
 * here". Mounted once in StrataPageShell, so it appears on whichever object the
 * bell resolved to; renders nothing unless the URL carries `?n=<notificationId>`.
 *
 * Two designed variants: the live ask, and the EXPIRED one — when the action
 * already happened while the notification waited, the band releases the reader
 * instead of dead-ending them on an unchanged page. Who resolved it is not named:
 * that would need a per-type actor lookup we do not run (zero-assumption).
 */
export function StrataNotificationBand() {
  const [params, setParams] = useSearchParams();
  const id = params.get('n');
  const q = useStrataNotifications();
  const n = id ? (q.data ?? []).find((x) => x.id === id) ?? null : null;
  const targetQ = useQuery({
    queryKey: ['strata', 'notification-target', id],
    queryFn: () => governanceApi.resolveNotificationTarget(n as StrataNotification),
    enabled: !!n,
    staleTime: 60_000,
  });

  const dismiss = () => {
    const next = new URLSearchParams(params);
    next.delete('n');
    setParams(next, { replace: true });
  };

  if (!id || !n) return null;
  const done = targetQ.data?.done ?? false;

  return (
    <div style={{ marginBottom: 16 }} data-testid="strata-notification-band">
      {done ? (
        <SectionMessage appearance="success" title="Already handled — nothing is due from you">
          <p>“{n.title}” was completed while the notification waited. You are seeing the object as it stands now.</p>
          <Button spacing="compact" onClick={dismiss} testId="strata-notification-band-dismiss">Dismiss</Button>
        </SectionMessage>
      ) : (
        <SectionMessage appearance="information" title={n.title}>
          {n.body ? <p>{n.body}</p> : null}
          <p>You arrived here from this notification.</p>
          <Button spacing="compact" onClick={dismiss} testId="strata-notification-band-dismiss">Dismiss</Button>
        </SectionMessage>
      )}
    </div>
  );
}

export function StrataRestricted({ title, why, owningRole, backTo, backLabel, testId }: {
  title: string;
  /** Why the gate exists, in consequence terms — not "you lack permission". */
  why: string;
  /** The role that owns this surface, e.g. 'strata_admin'. */
  owningRole: string;
  backTo?: string;
  backLabel?: string;
  testId?: string;
}) {
  const navigate = useNavigate();
  const rolesQ = useStrataRoles();
  const mine = rolesQ.data ?? [];
  return (
    <div style={{ padding: '48px 24px' }}>
      <EmptyState
        size="default"
        header={title}
        description={(
          <span>
            {why} Changes here are limited to <strong>{owningRole}</strong>.{' '}
            {rolesQ.isLoading
              ? null
              : mine.length > 0
                ? <>Your roles — {mine.map((r) => labelize(r)).join(' · ')} — do not include it.</>
                : <>You do not hold a STRATA role yet.</>}{' '}
            Ask a {owningRole} to make the change, or to grant you the role.
          </span>
        )}
        primaryAction={backTo
          ? <Button appearance="primary" onClick={() => navigate(backTo)} testId="strata-restricted-back">{backLabel ?? 'Back'}</Button>
          : undefined}
        testId={testId ?? 'strata-restricted'}
      />
    </div>
  );
}
