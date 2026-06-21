/**
 * TestHub DashboardPage — /testhub/dashboard
 *
 * 2026-06-21: thin wrapper mounting the canonical ProjectDashboardPage with
 * mode='test' per CLAUDE.md "ADOPT CANONICAL COMPONENTS — DO NOT
 * REIMPLEMENT". Same 12-column edit-mode grid, gallery, and persistence
 * surface as /project-hub/:key/dashboard, /product-hub/:key/dashboard,
 * /incident-hub/dashboard. The default ph_issues-backed widgets are
 * filtered out via the 'test' branch of getWidgetRegistry (TestHub data
 * lives in test_cases/test_cycles). Test-specific widgets land later by
 * setting hideOnTest=false on each new WidgetDefinition.
 */
import ProjectDashboardPage from '../project-hub/ProjectDashboardPage';

export default function DashboardPage() {
  return <ProjectDashboardPage mode="test" />;
}
