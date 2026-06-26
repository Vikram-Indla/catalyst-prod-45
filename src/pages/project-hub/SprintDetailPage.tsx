/**
 * SprintDetailPage — /project-hub/:key/sprints/:sprintId
 *
 * 2026-06-26 Phase 2a: mounts the canonical ReleaseDetailPage with
 * SPRINT_CONFIG. Same UI, same flow — just sprint table + sprint labels +
 * sprint breadcrumb. Per CLAUDE.md "ADOPT CANONICAL — DO NOT REIMPLEMENT".
 *
 * The :sprintId param is mapped onto entityIdOverride so the underlying
 * component (which originally read :releaseId from useParams) finds the
 * right entity ID.
 */
import { useParams } from 'react-router-dom';
import { ReleaseDetailPage } from '@/pages/release-hub/ReleaseDetailPage';
import { SPRINT_CONFIG } from '@/lib/entity-hub/config';

export function SprintDetailPage() {
  const { key, sprintId } = useParams<{ key: string; sprintId: string }>();
  const projectKey = key ?? 'BAU';
  return (
    <ReleaseDetailPage
      config={SPRINT_CONFIG}
      entityIdOverride={sprintId}
      listHrefOverride={`/project-hub/${projectKey}/sprints`}
    />
  );
}
