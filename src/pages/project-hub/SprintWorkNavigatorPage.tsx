/**
 * SprintWorkNavigatorPage — /project-hub/:key/sprints/:sprintSlug/work
 *
 * 2026-06-26 Phase 2a: mounts canonical ReleaseWorkNavigatorPage with
 * SPRINT_CONFIG. The :sprintSlug param resolves to UUID via useSprintBySlug
 * and maps onto entityIdOverride.
 *
 * 2026-07-01 Phase 3B: :sprintId → :sprintSlug with dual-mode resolution.
 */
import { useParams } from 'react-router-dom';
import { ReleaseWorkNavigatorPage } from '@/pages/release-hub/ReleaseWorkNavigatorPage';
import { SPRINT_CONFIG } from '@/lib/entity-hub/config';
import { useSprintBySlug } from '@/hooks/useSprintBySlug';

export function SprintWorkNavigatorPage() {
  const { key, sprintSlug } = useParams<{ key: string; sprintSlug: string }>();
  const { data: sprint } = useSprintBySlug(key, sprintSlug);
  return (
    <ReleaseWorkNavigatorPage
      config={SPRINT_CONFIG}
      entityIdOverride={sprint?.id ?? sprintSlug}
    />
  );
}
