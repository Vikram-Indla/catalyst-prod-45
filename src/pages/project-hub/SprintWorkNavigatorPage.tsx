/**
 * SprintWorkNavigatorPage — /project-hub/:key/sprints/:sprintId/work
 *
 * 2026-06-26 Phase 2a: mounts canonical ReleaseWorkNavigatorPage with
 * SPRINT_CONFIG. The :sprintId param maps onto entityIdOverride; the
 * canonical component reads sprint name from ph_jira_sprints and filters
 * ph_issues by sprint_name (text) instead of sprint_release JSONB.
 */
import { useParams } from 'react-router-dom';
import { ReleaseWorkNavigatorPage } from '@/pages/release-hub/ReleaseWorkNavigatorPage';
import { SPRINT_CONFIG } from '@/lib/entity-hub/config';

export function SprintWorkNavigatorPage() {
  const { sprintId } = useParams<{ key: string; sprintId: string }>();
  return (
    <ReleaseWorkNavigatorPage
      config={SPRINT_CONFIG}
      entityIdOverride={sprintId}
    />
  );
}
