/**
 * SprintDetailPage — /project-hub/:key/sprints/:sprintSlug
 *
 * 2026-06-26 Phase 2a: mounts the canonical ReleaseDetailPage with
 * SPRINT_CONFIG. Same UI, same flow — just sprint table + sprint labels +
 * sprint breadcrumb. Per CLAUDE.md "ADOPT CANONICAL — DO NOT REIMPLEMENT".
 *
 * 2026-07-01 Phase 3B: :sprintId → :sprintSlug. Dual-mode resolution via
 * useSprintBySlug (accepts UUID or slug for backward compat).
 */
import { useParams } from 'react-router-dom';
import { ReleaseDetailPage } from '@/pages/release-hub/ReleaseDetailPage';
import { SPRINT_CONFIG } from '@/lib/entity-hub/config';
import { useSprintBySlug } from '@/hooks/useSprintBySlug';

export function SprintDetailPage() {
  const { key, sprintSlug } = useParams<{ key: string; sprintSlug: string }>();
  const projectKey = key ?? 'BAU';
  const { data: sprint } = useSprintBySlug(projectKey, sprintSlug);
  return (
    <ReleaseDetailPage
      config={SPRINT_CONFIG}
      entityIdOverride={sprint?.id ?? sprintSlug}
      listHrefOverride={`/project-hub/${projectKey}/sprints`}
    />
  );
}
