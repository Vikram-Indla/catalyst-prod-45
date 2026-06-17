/**
 * IncidentFilterPreviewPage — /incident-hub/filters/create
 *
 * 2026-06-16: mounts the canonical FilterPreviewPage with mode='incident'.
 * Data source: ph_issues filtered to issue_type='Production Incident' across
 * all projects. Saves use the 'INCIDENTS' projectKey sentinel.
 */
import { FilterPreviewPage } from '../project-hub/filters/FilterPreviewPage';

export default function IncidentFilterPreviewPage() {
  return <FilterPreviewPage mode="incident" />;
}
