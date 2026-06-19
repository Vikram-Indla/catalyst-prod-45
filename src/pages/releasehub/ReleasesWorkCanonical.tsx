/**
 * ReleasesWorkCanonical — /release-hub/work
 *
 * 2026-06-19: mounts the canonical ProjectAllWorkView with releases pre-fetched
 * as WorkItem[] via useReleasesAllWorkItems, plus entityKind='release' so the
 * row-click short-circuits to /release-hub/:id (existing 8-tab ReleaseDetailPage).
 * Same UI shell as /project-hub/:key/allwork, /product-hub/:key/allwork,
 * /incident-hub/work, /tasks/work — per CLAUDE.md "ADOPT CANONICAL COMPONENTS
 * — DO NOT REIMPLEMENT".
 */
import ProjectAllWorkView from '@/pages/project-hub/jira-list/ProjectAllWorkView';
import { useReleasesAllWorkItems } from '@/hooks/useReleasesAllWorkItems';

const RELEASES_SENTINEL_KEY = 'RELEASES';

export default function ReleasesWorkCanonical() {
  const { data: items, isLoading } = useReleasesAllWorkItems();

  return (
    <div
      data-testid="releases-work-layout"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 52px)',
        maxHeight: 'calc(100vh - 52px)',
        minHeight: 0,
        overflow: 'hidden',
        background: 'transparent',
      }}
    >
      <ProjectAllWorkView
        projectKey={RELEASES_SENTINEL_KEY}
        tasksItems={isLoading ? [] : (items ?? [])}
        entityKind="release"
      />
    </div>
  );
}
