/**
 * IncidentWorkPage — /incident-hub/work
 *
 * 2026-06-16: mounts the canonical ProjectAllWorkView with mode='incident'.
 * Same UI shell as /project-hub/:key/allwork and /product-hub/:key/allwork
 * (per CLAUDE.md "ADOPT CANONICAL COMPONENTS — DO NOT REIMPLEMENT").
 * Internally the view queries ph_issues filtered by
 * issue_type='Production Incident' across all projects.
 */
import ProjectAllWorkView from '../project-hub/jira-list/ProjectAllWorkView';

const INCIDENTS_SENTINEL_KEY = 'INCIDENTS';

export default function IncidentWorkPage() {
  return (
    <div
      data-testid="incident-work-layout"
      style={{
        display: 'flex', flexDirection: 'column',
        height: 'calc(100vh - 52px)',
        maxHeight: 'calc(100vh - 52px)',
        minHeight: 0, overflow: 'hidden',
        background: 'transparent',
      }}
    >
      <ProjectAllWorkView
        projectKey={INCIDENTS_SENTINEL_KEY}
        mode="incident"
      />
    </div>
  );
}
