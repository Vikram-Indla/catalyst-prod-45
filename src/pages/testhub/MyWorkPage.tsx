/**
 * TestHub MyWorkPage — /testhub/my-work
 *
 * 2026-06-21: thin wrapper mounting the canonical BacklogPage with the
 * test-cases data source — per CLAUDE.md "ADOPT CANONICAL COMPONENTS —
 * DO NOT REIMPLEMENT". Same JiraTable surface as project / product /
 * release backlog (toolbar, column picker, inline edit, bulk actions,
 * group-by, URL state, Ask Caty). Row click navigates to the Repository
 * tab with ?case=<id> so the existing CaseDrawer opens.
 */
import Spinner from "@atlaskit/spinner";
import { BacklogPage } from "@/modules/project-work-hub/pages/BacklogPage.atlaskit";
import { useTestCasesSource } from "@/modules/project-work-hub/adapters/testCasesDataSource";
import { ProjectPageHeader } from "@/components/layout/ProjectPageHeader";

export default function MyWorkPage() {
  const adapter = useTestCasesSource();

  if (!adapter) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100%",
          padding: 48,
        }}
      >
        <Spinner size="large" />
      </div>
    );
  }

  const adapterWithChrome = {
    ...adapter,
    ChromeHeader: () => (
      <ProjectPageHeader projectKey="TESTHUB" hubType="test" />
    ),
    allowedColumnIds: [
      "key",
      "status",
      "assignee",
      "reporter",
      "category",
      "sprint",
    ] as const,
  };

  return (
    <BacklogPage
      projectId={adapter.productId}
      projectKey="TESTHUB"
      displayName="Test Cases"
      baseUrl="/testhub"
      dataSource={adapterWithChrome}
      filterContext="testhub"
    />
  );
}
