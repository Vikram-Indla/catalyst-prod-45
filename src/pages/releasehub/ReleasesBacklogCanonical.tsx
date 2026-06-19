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
  const adapterWithChrome = {
    ...adapter,
    ChromeHeader: () => <ProjectPageHeader projectKey="RELEASES" hubType="release" />,
    allowedColumnIds: [
      'key',           // jira_key / version / id
      'request_type',  // release_type (regular / minor / major / hotfix / emergency)
      'status',        // release lifecycle stage
      'category',      // target_env (qa / beta / staging / production)
      'target_date',   // planned_release_date
      'assignee',      // release manager
    ] as const,
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
