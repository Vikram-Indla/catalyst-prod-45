import React, { useMemo, useState } from 'react';
import { Search, Filter, ChevronDown, Settings2, MessageSquare } from '@/lib/atlaskit-icons';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ads';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { JiraTable } from '@/components/shared/JiraTable';
import type { Column } from '@/components/shared/JiraTable/types';
import { useWorkItemsHierarchy } from '../../hooks/useWorkItems';
import { WorkItemWithChildren, WorkItem, ListViewMode } from '../../types';
import { WorkTypeIcon } from '../WorkTypeIcon';
import { PriorityIcon } from '../PriorityIcon';
import { StatusLozenge } from '../StatusLozenge';
import { format } from 'date-fns';

interface ListTabProps {
  projectId: string;
  onItemClick: (item: WorkItem) => void;
  onFilterClick: () => void;
}

// A row as rendered by JiraTable — either a hierarchy node (with depth +
// hasChildren) or a flat WorkItem, normalized to the same shape so the same
// column set can render both view modes.
type ListRow = WorkItem & { depth: number; hasChildren: boolean };

// Flatten the hierarchy tree into a list of visible rows (respecting which
// parents are expanded), attaching depth for JiraTable's indent rendering.
function flattenHierarchy(
  items: WorkItemWithChildren[] | undefined,
  expandedRows: Set<string>,
  depth = 0,
): ListRow[] {
  if (!items) return [];
  const rows: ListRow[] = [];
  for (const item of items) {
    rows.push({ ...item, depth, hasChildren: item.hasChildren });
    if (item.hasChildren && expandedRows.has(item.id)) {
      rows.push(...flattenHierarchy(item.children, expandedRows, depth + 1));
    }
  }
  return rows;
}

export const ListTab: React.FC<ListTabProps> = ({ projectId, onItemClick, onFilterClick }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode] = useState<ListViewMode>('HIERARCHY');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [groupBy, setGroupBy] = useState<string>('none');

  const { data: hierarchyData, flat: flatData, isLoading } = useWorkItemsHierarchy(projectId);

  const toggleRow = (id: string) => {
    const next = new Set(expandedRows);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setExpandedRows(next);
  };

  // Get unique assignees for avatar group
  const assignees = [...new Map(flatData?.filter(i => i.assigneeAvatar).map(i => [i.assigneeName, i]) || []).values()].slice(0, 4);

  const rows: ListRow[] = useMemo(() => {
    if (viewMode === 'HIERARCHY') {
      return flattenHierarchy(hierarchyData, expandedRows);
    }
    return (flatData || []).map((item) => ({ ...item, depth: 0, hasChildren: false }));
  }, [viewMode, hierarchyData, flatData, expandedRows]);

  const columns: Column<ListRow>[] = useMemo(
    () => [
      {
        id: 'type',
        label: 'Type',
        width: 6,
        alwaysVisible: true,
        cell: ({ row }) => <WorkTypeIcon type={row.type} />,
      },
      {
        id: 'key',
        label: 'Key',
        width: 10,
        alwaysVisible: true,
        cell: ({ row }) => (
          <a href="#" className="text-primary hover:underline text-sm">{row.key}</a>
        ),
      },
      {
        id: 'summary',
        label: 'Summary',
        flex: true,
        alwaysVisible: true,
        cell: ({ row }) => <span className="text-sm text-foreground">{row.summary}</span>,
      },
      {
        id: 'status',
        label: 'Status',
        width: 12,
        cell: ({ row }) => <StatusLozenge status={row.status} statusCategory={row.statusCategory} />,
      },
      {
        id: 'comments',
        label: 'Comments',
        width: 10,
        cell: ({ row }) => (
          <div className="flex items-center gap-1 text-muted-foreground text-sm">
            <MessageSquare className="h-3.5 w-3.5" />
            {row.commentsCount > 0 ? `${row.commentsCount}` : 'Add'}
          </div>
        ),
      },
      {
        id: 'assignee',
        label: 'Assignee',
        width: 15,
        cell: ({ row }) => (
          row.assigneeName ? (
            <div className="flex items-center gap-2">
              <Avatar src={row.assigneeAvatar} name={row.assigneeName} size="xxsmall" />
              <span className="text-sm text-foreground truncate">{row.assigneeName}</span>
            </div>
          ) : null
        ),
      },
      {
        id: 'dueDate',
        label: 'Due date',
        width: 10,
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.dueDate ? format(new Date(row.dueDate), 'MMM d, yyyy') : ''}
          </span>
        ),
      },
      {
        id: 'priority',
        label: 'Priority',
        width: 8,
        cell: ({ row }) => <PriorityIcon priority={row.priority} showLabel />,
      },
      {
        id: 'createdAt',
        label: 'Created',
        width: 12,
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {format(new Date(row.createdAt), 'MMM d, yyyy')}
          </span>
        ),
      },
      {
        id: 'updatedAt',
        label: 'Updated',
        width: 12,
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {format(new Date(row.updatedAt), 'MMM d, yyyy')}
          </span>
        ),
      },
    ],
    [],
  );

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Top Control Bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        {/* Left side */}
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative w-44">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search list"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8"
            />
          </div>

          {/* Assignee Avatars */}
          <div className="flex items-center -space-x-2">
            {assignees.map((item) => (
              <span key={item.assigneeName} className="border-2 border-background rounded-full">
                <Avatar src={item.assigneeAvatar} name={item.assigneeName || ''} size="xsmall" />
              </span>
            ))}
            {flatData && flatData.length > 4 && (
              <span className="ml-2 text-xs text-muted-foreground">+6</span>
            )}
          </div>

          {/* Filter Button */}
          <Button variant="ghost" size="sm" onClick={onFilterClick} className="gap-1">
            <Filter className="h-4 w-4" />
            Filter
            <ChevronDown className="h-4 w-4" />
          </Button>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {/* Group Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1">
                Group
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setGroupBy('none')}>None (Hierarchy)</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setGroupBy('assignee')}>Assignee</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setGroupBy('status')}>Status</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setGroupBy('quarter')}>Quarter</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setGroupBy('priority')}>Priority</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Settings2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <JiraTable<ListRow>
          columns={columns}
          data={rows}
          getRowId={(row) => row.id}
          getRowDepth={viewMode === 'HIERARCHY' ? (row) => row.depth : undefined}
          getRowHasChildren={viewMode === 'HIERARCHY' ? (row) => row.hasChildren : undefined}
          expandedRowIds={expandedRows}
          onToggleRowExpanded={toggleRow}
          onRowClick={(row) => onItemClick(row)}
          selectable
          selection={selectedRows}
          onSelectionChange={setSelectedRows}
          showRowCount={false}
          density="compact"
          ariaLabel="Work item list"
          isLoading={isLoading}
        />
      </div>
    </div>
  );
};
