/**
 * TasksOverviewView — Tasks Hub overview / dashboard.
 *
 * Phase 4 of the Tasks Hub canonical alignment plan (2026-06-16). Replaces
 * the bespoke `PlannerDashboard` with the canonical `DashboardWidgetGrid`
 * mounted in `mode='tasks'` with the 5-widget `TASKS_WIDGET_REGISTRY`.
 *
 * REUSE FIRST (CLAUDE.md P0):
 *   - DashboardWidgetGrid for layout, collapse state, edit mode chrome
 *   - WidgetWrapper (via individual widgets) for header/footer/body chrome
 *   - TasksPageHeader for breadcrumb + H1 (same pattern as TasksBoardView,
 *     TasksTaskListView, TasksTimelineView)
 *
 * Persistence:
 *   - `mode='tasks'` short-circuits the dashboard_widget_config persistence
 *     layer (see DashboardWidgetGrid 2026-06-16). The 5 widgets render at
 *     their registry defaults on every load; per-user widget collapse /
 *     visibility is intentionally not persisted in v1.
 */
import DashboardWidgetGrid from '@/components/project-hub/dashboard/DashboardWidgetGrid';
import { TASKS_WIDGET_REGISTRY } from '@/modules/tasks/widgets/tasks-widget-registry';
import { TasksPageHeader } from '@/modules/tasks/components/TasksPageHeader';

/* Sentinel projectId — the dashboard grid uses this as part of the
   react-query cache key but skips all Supabase access when mode='tasks'.
   See DashboardWidgetGrid useDashboardWidgetConfig early returns. */
const TASKS_PROJECT_SENTINEL = 'tasks';

export default function TasksOverviewView() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: 0,
        background: 'var(--ds-surface, #FFFFFF)',
      }}
    >
      <TasksPageHeader routeWord="Overview" />
      <div
        style={{
          flex: 1,
          minWidth: 0,
          minHeight: 0,
          overflow: 'auto',
          padding: '0 16px 16px 16px',
        }}
      >
        <DashboardWidgetGrid
          projectId={TASKS_PROJECT_SENTINEL}
          projectKey={TASKS_PROJECT_SENTINEL}
          mode="tasks"
          registry={TASKS_WIDGET_REGISTRY}
        />
      </div>
    </div>
  );
}
