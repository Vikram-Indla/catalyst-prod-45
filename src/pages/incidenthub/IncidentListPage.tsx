/**
 * IncidentListPage — /incident-hub
 *
 * 2026-06-16: switched from bespoke chrome + JiraTable to the canonical
 * BacklogPage with an incidents data adapter. Per PO + CLAUDE.md "ADOPT
 * CANONICAL COMPONENTS — DO NOT REIMPLEMENT". Inherits same column
 * picker, column filters, toolbar, sticky header, sort, keyboard nav,
 * pagination as /project-hub/BAU/backlog.
 *
 * Stats cards (Critical / High / Active / Committee / Resolved 7d) are
 * preserved as a page header above the BacklogPage mount per Vikram —
 * the PO hasn't specifically asked to remove them.
 *
 * Data: Production Incidents (ph_issues.issue_type = 'Production Incident')
 *       via useIncidentsBacklogSource — mutations are no-ops because
 *       incidents are Jira-sourced (read-only in Catalyst).
 */

import Spinner from '@atlaskit/spinner';
import { BacklogPage } from '@/modules/project-work-hub/pages/BacklogPage.atlaskit';
import { useIncidentStats } from '@/hooks/useIncidentHub';
import { useIncidentsBacklogSource } from './incidentsBacklogDataSource';

const INCIDENTS_SENTINEL_KEY = 'INCIDENTS';
const INCIDENTS_SENTINEL_ID = 'incidents';

const surfaceBg   = 'var(--cp-bg-elevated, #FFFFFF)';
const borderColor = 'var(--cp-border-default, rgba(15,23,42,0.12))';
const textSecondary = 'var(--cp-text-tertiary, var(--cp-ink-3, #64748B))';

function StatsStrip() {
  const stats = useIncidentStats();
  const cards = [
    { label: 'Critical (SEV-1)',  value: stats.sev1,             accent: 'var(--ds-text-danger, #DC2626)' },
    { label: 'High (SEV-2)',      value: stats.sev2,             accent: 'var(--ds-text-warning, #D97706)' },
    { label: 'Active Incidents',  value: stats.active,           accent: 'var(--cp-text-link, var(--cp-workstream-catalyst-primary, #2563EB))' },
    { label: 'Committee Pending', value: stats.committeePending, accent: textSecondary },
    { label: 'Resolved (7d)',     value: stats.resolvedWeek,     accent: 'var(--ds-text-success, #16A34A)' },
  ];
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
        gap: 12,
        padding: '12px 16px',
        flexShrink: 0,
        background: 'transparent',
      }}
    >
      {cards.map((s) => (
        <div
          key={s.label}
          style={{
            background: surfaceBg,
            border: `1px solid ${borderColor}`,
            borderRadius: 6,
            padding: 12,
          }}
        >
          <div style={{ fontFamily: 'var(--cp-font-body)', fontSize: 11, color: textSecondary, marginBottom: 4 }}>
            {s.label}
          </div>
          <div style={{ fontFamily: 'var(--cp-font-mono)', fontSize: 22, fontWeight: 700, color: s.accent }}>
            {s.value}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function IncidentListPage() {
  const adapter = useIncidentsBacklogSource();

  if (!adapter) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100%', padding: 48 }}>
        <Spinner size="large" />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, overflow: 'hidden' }}>
      <StatsStrip />
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <BacklogPage
          /* projectId / projectKey are sentinels — BacklogPage's own ph_issues
             query returns nothing for these (no project has key='INCIDENTS'),
             so all rows come from the adapter's extraStories. */
          projectId={INCIDENTS_SENTINEL_ID}
          projectKey={INCIDENTS_SENTINEL_KEY}
          displayName="Incidents"
          baseUrl="/incident-hub"
          dataSource={adapter}
        />
      </div>
    </div>
  );
}
