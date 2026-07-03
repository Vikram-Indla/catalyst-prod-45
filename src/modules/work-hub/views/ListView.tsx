import React, { useMemo, useState } from 'react';
import {
  Search, ChevronDown,
  Settings2, MoreHorizontal
} from '@/lib/atlaskit-icons';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { AvatarGroup } from '@/components/ads';
import { cn } from '@/lib/utils';
import { catalystToast } from '@/lib/catalystToast';
import {
  GroupByMenu,
  type GroupByOption,
} from '../components';
import { lazy, Suspense } from 'react';
import {
  JiraTable,
  makeCommentsCell,
  makeDateEditCell,
  makeLabelsEditCell,
  makeAssigneeEditCell,
  makePriorityEditCell,
  makeSummaryInlineEditCell,
  makeStatusEditCellAkPopup,
  type StatusOption,
  type AssigneeChoice,
} from '@/components/shared/JiraTable';
import type { Column, RowGroup } from '@/components/shared/JiraTable/types';

const CatalystDetailRouter = lazy(() => import('@/components/catalyst-detail-views/CatalystDetailRouter'));

interface WorkItem {
  id: string;
  type: 'Feature' | 'Story' | 'Task' | 'Defect' | 'Subtask' | 'Incident';
  key: string;
  summary: string;
  status: string;
  comments: number;
  assignee: { name: string; avatar?: string } | null;
  dueDate: string | null;
  priority: 'Highest' | 'High' | 'Medium' | 'Low' | 'Lowest';
  labels: string[];
  created: string;
  updated: string;
  hasChildren?: boolean;
  parentKey?: string;
  parentSummary?: string;
  description?: string;
}

// Empty array - data should come from database queries
const mockItems: WorkItem[] = [];

// Status lozenge - NEUTRAL STYLING (no colors per status)
const statusOptions = ['Backlog', 'To Do', 'In Progress', 'In Requirement', 'In Production', 'Done', 'Closed', 'Blocked'];

const STATUS_EDIT_OPTIONS: StatusOption[] = statusOptions.map((s) => ({
  value: s,
  label: s.toUpperCase(),
  appearance: 'default',
}));

const assigneeOptionsData = [
  { name: 'Amal Alghofaily' },
  { name: 'Abdulrahman Saad' },
  { name: 'Mohammed Hassan' },
  { name: 'Waad Alasim' },
  { name: 'Faisal Javed Parachcha' },
  { name: 'Abdulrhman Alghizzi' },
  { name: 'Kareem Abu Elenin' },
  { name: 'nada nader' },
  { name: 'Alaa Al-Khayyat' },
  { name: 'Maaz Majid' },
];

const assigneeChoices: AssigneeChoice[] = assigneeOptionsData.map((a) => ({ id: a.name, name: a.name }));

const PRIORITY_OPTIONS = ['highest', 'high', 'medium', 'low', 'lowest'];

type SortField = string;
type SortDirection = 'asc' | 'desc';

export function ListView() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [items, setItems] = useState<WorkItem[]>(mockItems);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [groupBy, setGroupBy] = useState<GroupByOption>('none');
  const [selectedItem, setSelectedItem] = useState<WorkItem | null>(null);

  const handleInlineEdit = (id: string, field: keyof WorkItem, value: any) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
    if (selectedItem?.id === id) {
      setSelectedItem(prev => prev ? { ...prev, [field]: value } : null);
    }
    catalystToast.success('Changes saved');
  };

  const handleRowClick = (item: WorkItem) => {
    setSelectedItem(item);
  };

  const handleToggleRowExpanded = (rowId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(rowId)) {
      newExpanded.delete(rowId);
    } else {
      newExpanded.add(rowId);
    }
    setExpandedItems(newExpanded);
  };

  const filteredItems = items.filter(item =>
    item.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.key.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sortedItems = sortField
    ? [...filteredItems].sort((a, b) => {
        const aValue = (a as any)[sortField];
        const bValue = (b as any)[sortField];
        if (aValue === null) return 1;
        if (bValue === null) return -1;
        if (typeof aValue === 'object' || typeof bValue === 'object') return 0;
        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      })
    : filteredItems;

  const groups: RowGroup<WorkItem>[] | undefined = useMemo(() => {
    if (groupBy === 'none') return undefined;
    const buckets = new Map<string, WorkItem[]>();
    for (const item of sortedItems) {
      let groupKey: string;
      switch (groupBy) {
        case 'status':
          groupKey = item.status;
          break;
        case 'assignee':
          groupKey = item.assignee?.name || 'Unassigned';
          break;
        case 'priority':
          groupKey = item.priority;
          break;
        default:
          groupKey = 'All';
      }
      if (!buckets.has(groupKey)) buckets.set(groupKey, []);
      buckets.get(groupKey)!.push(item);
    }
    return Array.from(buckets.entries()).map(([id, rows]) => ({
      id,
      label: id,
      rows,
    }));
  }, [groupBy, sortedItems]);

  const columns: Column<WorkItem>[] = useMemo(() => [
    {
      id: 'type',
      label: 'Type',
      width: 6,
      alwaysVisible: true,
      cell: ({ row }) => (
        <span style={{ display: 'inline-flex', alignItems: 'center' }}>
          <JiraIssueTypeIcon type={row.type} size={16} />
        </span>
      ),
    },
    {
      id: 'key',
      label: 'Key',
      width: 8,
      sortable: true,
      alwaysVisible: true,
      cell: ({ row }) => (
        <span
          style={{
            fontSize: 'var(--ds-font-size-400)',
            fontWeight: 400,
            color: 'var(--ds-link)',
            textDecoration: 'underline',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          {row.key}
        </span>
      ),
    },
    {
      id: 'summary',
      label: 'Summary',
      flex: true,
      sortable: true,
      alwaysVisible: true,
      cell: makeSummaryInlineEditCell<WorkItem>({
        getSummary: (row) => row.summary,
        onChange: (row, next) => handleInlineEdit(row.id, 'summary', next),
      }),
    },
    {
      id: 'status',
      label: 'Status',
      width: 12,
      sortable: true,
      cell: makeStatusEditCellAkPopup<WorkItem>({
        getStatus: (row) => row.status,
        appearanceFor: () => 'default',
        options: STATUS_EDIT_OPTIONS,
        onChange: (row, next) => handleInlineEdit(row.id, 'status', next),
        lockWhenDone: false,
      }),
    },
    {
      id: 'comments',
      label: 'Comments',
      width: 10,
      cell: makeCommentsCell(
        (row) => row.comments,
        (row) => handleRowClick(row),
      ),
    },
    {
      id: 'assignee',
      label: 'Assignee',
      width: 14,
      sortable: true,
      cell: makeAssigneeEditCell<WorkItem>({
        getAssignee: (row) => row.assignee ? { id: row.assignee.name, name: row.assignee.name, avatarUrl: row.assignee.avatar } : null,
        options: assigneeChoices,
        onChange: (row, next) => handleInlineEdit(row.id, 'assignee', next ? { name: next.name } : null),
      }),
    },
    {
      id: 'dueDate',
      label: 'Due date',
      width: 9,
      sortable: true,
      cell: makeDateEditCell<WorkItem>({
        getDate: (row) => row.dueDate,
        onChange: (row, next) => handleInlineEdit(row.id, 'dueDate', next),
      }),
    },
    {
      id: 'priority',
      label: 'Priority',
      width: 9,
      sortable: true,
      cell: makePriorityEditCell<WorkItem>({
        getPriority: (row) => row.priority,
        options: PRIORITY_OPTIONS,
        onChange: (row, next) => handleInlineEdit(row.id, 'priority', (next.charAt(0).toUpperCase() + next.slice(1)) as WorkItem['priority']),
      }),
    },
    {
      id: 'labels',
      label: 'Labels',
      width: 8,
      cell: makeLabelsEditCell<WorkItem>({
        getLabels: (row) => row.labels,
        onChange: (row, next) => handleInlineEdit(row.id, 'labels', next),
      }),
    },
    {
      id: 'created',
      label: 'Created',
      width: 9,
      sortable: true,
      cell: ({ row }) => (
        <span style={{ color: 'var(--ds-text-subtle)', fontSize: 'var(--ds-font-size-300)', whiteSpace: 'nowrap' }}>
          {row.created ? new Date(row.created).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null}
        </span>
      ),
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [items, selectedItem]);

  return (
    <div className="h-full flex bg-background" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif" }}>
      {/* Main content area */}
      <div className={cn("flex-1 flex flex-col min-w-0", selectedItem && "border-r border-border")}>
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-background">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search list"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-8 w-44 text-[14px] bg-slate-50 dark:bg-[var(--ds-surface-overlay,var(--cp-ink-1))] border-transparent rounded focus:border-blue-400 focus:bg-white dark:focus:bg-[var(--ds-surface-raised,var(--cp-ink-1))] placeholder:text-slate-400 dark:placeholder:text-[var(--ds-text-subtlest,var(--cp-text-secondary))]"
              />
            </div>
            {/* Avatar group */}
            <AvatarGroup
              size="small"
              maxCount={3}
              data={assigneeOptionsData.map((a) => ({ key: a.name, name: a.name }))}
            />
            <Button variant="ghost" size="sm" className="h-8 gap-1 text-[14px] text-slate-600 dark:text-[var(--ds-text-subtlest)] hover:bg-slate-50 dark:hover:bg-[var(--ds-surface-overlay)] font-normal">
              Filter
              <ChevronDown className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <GroupByMenu value={groupBy} onChange={setGroupBy} />
            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-slate-50 dark:hover:bg-[var(--ds-surface-overlay)]">
              <Settings2 className="h-4 w-4 text-slate-500 dark:text-[var(--ds-text-subtlest,var(--cp-text-secondary))]" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-slate-50 dark:hover:bg-[var(--ds-surface-overlay)]">
              <MoreHorizontal className="h-4 w-4 text-slate-500 dark:text-[var(--ds-text-subtlest,var(--cp-text-secondary))]" />
            </Button>
          </div>
        </div>

        {/* Card container wrapping the table */}
        <div className="flex-1 p-4 overflow-hidden">
          <div className="h-full flex flex-col rounded-lg border border-slate-200 dark:border-[var(--ds-border,var(--cp-ink-1))] bg-white dark:bg-[var(--ds-surface-raised,var(--cp-ink-1))] overflow-hidden">
            <div className="flex-1 overflow-auto">
              <JiraTable<WorkItem>
                columns={columns}
                data={groups ? undefined : sortedItems}
                groups={groups}
                getRowId={(row) => row.id}
                onRowClick={handleRowClick}
                selectable
                selection={selectedItems}
                onSelectionChange={setSelectedItems}
                sortKey={sortField ?? undefined}
                sortOrder={sortField ? (sortDirection === 'asc' ? 'ASC' : 'DESC') : undefined}
                onSortChange={(key, order) => {
                  setSortField(key);
                  setSortDirection(order === 'ASC' ? 'asc' : 'desc');
                }}
                getRowHasChildren={(row) => !!row.hasChildren}
                expandedRowIds={expandedItems}
                onToggleRowExpanded={handleToggleRowExpanded}
                focusedRowId={selectedItem?.id}
                showRowCount
                totalRowCount={items.length}
                density="compact"
                ariaLabel="List view"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Detail Modal — unified StoryDetailModal */}
      {selectedItem && (
        <Suspense fallback={null}>
          <CatalystDetailRouter
            isOpen={true}
            onClose={() => setSelectedItem(null)}
            itemId={selectedItem.id}
            projectId=""
          />
        </Suspense>
      )}
    </div>
  );
}

export default ListView;
