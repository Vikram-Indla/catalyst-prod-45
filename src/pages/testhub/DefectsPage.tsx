/**
 * TestHub DefectsPage — /testhub/defects
 *
 * 2026-06-21: mounts the canonical BacklogPage with the tm_defects data
 * source — per CLAUDE.md "ADOPT CANONICAL COMPONENTS — DO NOT
 * REIMPLEMENT". Same JiraTable surface as project / product / release
 * backlog and /testhub/my-work. Empty staging DB → canonical empty state.
 */
import Spinner from '@atlaskit/spinner';
import { BacklogPage } from '@/modules/project-work-hub/pages/BacklogPage.atlaskit';
import { useDefectsSource } from '@/modules/project-work-hub/adapters/defectsDataSource';
import { ProjectPageHeader } from '@/components/layout/ProjectPageHeader';

export default function DefectsPage() {
  const adapter = useDefectsSource();

  if (!adapter) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100%', padding: 48 }}>
        <Spinner size="large" />
      </div>
    );
  }

  const adapterWithChrome = {
    ...adapter,
    ChromeHeader: () => <ProjectPageHeader projectKey="TESTHUB" hubType="test" />,
    allowedColumnIds: [
      'key',
      'status',
      'assignee',
      'reporter',
      'urgency',
    ] as const,
  };

  return (
    <BacklogPage
      projectId={adapter.productId}
      projectKey="TESTHUB"
      displayName="Defects"
      baseUrl="/testhub"
      dataSource={adapterWithChrome}
    />
  );
}
