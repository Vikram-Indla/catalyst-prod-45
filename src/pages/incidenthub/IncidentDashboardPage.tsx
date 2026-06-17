/**
 * IncidentDashboardPage — /incident-hub/dashboard
 *
 * 2026-06-17: thin wrapper mounting the canonical ProjectDashboardPage
 * with mode='incident' per CLAUDE.md "ADOPT CANONICAL COMPONENTS — DO NOT
 * REIMPLEMENT". Same 12-column edit-mode grid, gallery, and widget set
 * as /project-hub/:key/dashboard and /product-hub/:key/dashboard. The 4
 * widgets that don't apply to a Production-Incident-filtered ph_issues
 * view (Epic Progress, Scope Change, Production Incidents peer, QA
 * Defects, Time in Status) are dropped via hideOnIncident in the widget
 * registry. Remaining widgets pull from ph_issues filtered to
 * issue_type='Production Incident' across all projects.
 */
import ProjectDashboardPage from '../project-hub/ProjectDashboardPage';

export default function IncidentDashboardPage() {
  return <ProjectDashboardPage mode="incident" />;
}
