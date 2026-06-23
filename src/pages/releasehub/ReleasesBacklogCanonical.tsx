/**
 * ReleasesBacklogCanonical — /release-hub/releases
 *
 * 2026-06-19: mounts the canonical BacklogPage with the releases data
 * source. Same UI shell as /project-hub/:key/backlog and /product-hub/:key/backlog
 * — per CLAUDE.md "ADOPT CANONICAL COMPONENTS — DO NOT REIMPLEMENT".
 *
 * Internally:
 *   - cards:     rh_releases (cancelled hidden)
 *   - statuses:  9-stage release lifecycle (draft → completed)
 *   - row click: entityKind='release' → /release-hub/:id (existing detail view)
 *   - mutations: rh_releases status / soft-retire / create
 */

import Spinner from '@atlaskit/spinner';
import { BacklogPage } from '@/modules/project-work-hub/pages/BacklogPage.atlaskit';
import { useReleasesSource } from '@/modules/project-work-hub/adapters/releasesDataSource';
import { ProjectPageHeader } from '@/components/layout/ProjectPageHeader';

export default function ReleasesBacklogCanonical() {
  const adapter = useReleasesSource();

  if (!adapter) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100%', padding: 48 }}>
        <Spinner size="large" />
      </div>
    );
  }

  /* Column allowlist — only those that map to rh_releases columns. Keeps the
     picker clean and prevents non-applicable columns (parent / labels / sprint
     / reporter / comments / priority) from rendering as empty. */
  /* Phase 1B (2026-06-23): structural move toward Jira Releases columns —
     Version, Status, Progress, Start date, Release date, Description, Actions —
     using only the additive, opt-in canonical-table contract (columnLabelOverrides
     / defaultVisibleColumns / nonDestructiveActions + the release-only columns).
     Data is rh_releases via useReleasesSource. No schema/RLS/CRUD change. */
  const adapterWithChrome = {
    ...adapter,
    ChromeHeader: () => <ProjectPageHeader projectKey="RELEASES" hubType="release" />,
    allowedColumnIds: [
      'key',               // Version  ← rh_releases.name / version
      'status',            // Status   ← rh_releases.status
      'release_progress',  // Progress ← rh_releases.readiness_pct (ReleaseProgressBar)
      'start_date',        // Start date   ← rh_releases.planned_start_date
      'target_date',       // Release date ← rh_releases.planned_release_date / target_date
      'description',       // Description  ← rh_releases.description
      '__actions',         // Actions  (non-destructive placeholder this phase)
    ] as const,
    columnLabelOverrides: {
      // Phase 1C (2026-06-23): Jira Releases screenshot header column 1 reads
      // "Release" (the release name), not "Version". Release-adapter-only
      // override — zero blast radius on other hubs.
      key: 'Release',
      target_date: 'Release date',
    } as const,
    defaultVisibleColumns: [
      'key', 'status', 'release_progress', 'start_date', 'target_date', 'description', '__actions',
    ] as const,
    // Phase 1B: no delete / archive / release / unrelease / merge / edit yet.
    nonDestructiveActions: true,
  };

  return (
    <BacklogPage
      projectId="RELEASES"
      projectKey="RELEASES"
      displayName="Releases"
      baseUrl="/release-hub"
      dataSource={adapterWithChrome}
    />
  );
}
