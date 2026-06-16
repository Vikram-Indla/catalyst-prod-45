/**
 * KanbanDataSource — extraction seam for the canonical KanbanBoardPage.
 *
 * Project Hub mounts the board with a `projectHubKanbanSource` that reads from
 * `ph_workflow_statuses` / `ph_issues`. Tasks Hub mounts the same board with a
 * `tasksKanbanSource` that reads from `task_statuses` / `tasks`. The board UI
 * stays identical; the data wiring is swapped via this interface.
 */

export type KanbanColumn = {
  id: string;
  name: string;
  color: string;
  sort_order: number;
  category?: string;
  wip_limit?: number | null;
};

export type KanbanItem = {
  id: string;
  key: string;
  title: string;
  status_id: string;
  priority: string | null;
  assignee_id: string | null;
  group_id?: string | null; // workstream_id for tasks, project_key or epic_key for project hub
  blocked?: boolean;
  due_date?: string | null;
  description?: string | null;
};

export type KanbanFilters = {
  search?: string;
  statusIds?: string[];
  priorities?: string[];
  assigneeIds?: string[];
  groupIds?: string[];
};

export type KanbanFeatureFlags = {
  hideIssueTypeFilter?: boolean;
  hideEpicGroupBy?: boolean;
  hideDensityToggle?: boolean;
  hideAddColumn?: boolean;
};

export type KanbanDataSource = {
  useColumns: () => { data: KanbanColumn[]; isLoading: boolean; error: unknown };
  useItems: (filters: KanbanFilters) => { data: KanbanItem[]; isLoading: boolean; error: unknown };
  mutations: {
    onStatusChange: (itemId: string, statusId: string) => Promise<void>;
    onCreate: (statusId: string, payload: { title: string; group_id?: string | null }) => Promise<void>;
    onReorder: (statusId: string, orderedIds: string[]) => Promise<void>;
    onColumnReorder?: (orderedColumnIds: string[]) => Promise<void>;
  };
  features: KanbanFeatureFlags;
  groupLabel: string; // 'Workstream' for tasks, 'Project' or 'Epic' for project hub
};
