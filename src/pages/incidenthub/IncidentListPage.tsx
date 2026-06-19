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
import { useIncidentsBacklogSource } from './incidentsBacklogDataSource';

const INCIDENTS_SENTINEL_KEY = 'INCIDENTS';
const INCIDENTS_SENTINEL_ID = 'incidents';


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
