/**
 * List Page
 * Dense table view with 15+ columns, row selection, grouping, and column controls
 */

import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Search,
  Filter,
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
  Plus,
  Columns3,
  Download,
  ArrowUpDown,
  Check,
  User,
  Flag,
  Layers,
  Calendar
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, Lozenge, type LozengeAppearance } from '@/components/ads';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useInJira } from '../context/InJiraContext';
import { useInJiraIssues } from '../hooks/useInJiraIssues';
import { Issue, IssuePriority, IssueType } from '../types';

// All available columns
const ALL_COLUMNS = [
  { id: 'key', label: 'Key', width: 100, required: true },
  { id: 'type', label: 'Type', width: 80 },
  { id: 'summary', label: 'Summary', width: 300, required: true },
  { id: 'status', label: 'Status', width: 140 },
  { id: 'priority', label: 'Priority', width: 100 },
  { id: 'assignee', label: 'Assignee', width: 150 },
  { id: 'reporter', label: 'Reporter', width: 150 },
  { id: 'created', label: 'Created', width: 100 },
  { id: 'updated', label: 'Updated', width: 100 },
  { id: 'dueDate', label: 'Due Date', width: 100 },
  { id: 'storyPoints', label: 'Story Points', width: 100 },
  { id: 'labels', label: 'Labels', width: 150 },
  { id: 'components', label: 'Components', width: 150 },
  { id: 'fixVersions', label: 'Fix Versions', width: 150 },
  { id: 'sprint', label: 'Sprint', width: 120 },
  { id: 'epic', label: 'Epic', width: 150 },
];

// Default visible columns
const DEFAULT_COLUMNS = ['key', 'type', 'summary', 'status', 'priority', 'assignee', 'storyPoints', 'updated'];


// Priority colors
const PRIORITY_COLORS: Record<IssuePriority, string> = {
  highest: 'text-red-600',
  high: 'text-orange-500',
  medium: 'text-yellow-500',
  low: 'text-green-500',
  lowest: 'text-blue-400',
};

// Type colors
const TYPE_COLORS: Record<IssueType, string> = {
  feature: 'bg-purple-500',
  story: 'bg-green-500',
  subtask: 'bg-blue-400',
  defect: 'bg-red-500',
  incident: 'bg-orange-500',
};

// Status → Lozenge appearance mapping
const STATUS_APPEARANCE: Record<string, LozengeAppearance> = {
  'to-do': 'default',
  'in-progress': 'inprogress',
  'done': 'success',
};

export function ListPage() {
  const { projectKey } = useParams<{ projectKey: string }>();
  const { openIssueDrawer, searchQuery, setSearchQuery } = useInJira();
  const { data: issues = [], isLoading } = useInJiraIssues(projectKey || '');
  const [visibleColumns, setVisibleColumns] = useState<string[]>(DEFAULT_COLUMNS);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [sortColumn, setSortColumn] = useState<string>('key');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const toggleColumn = (columnId: string) => {
    const column = ALL_COLUMNS.find(c => c.id === columnId);
    if (column?.required) return;
    
    setVisibleColumns(prev => 
      prev.includes(columnId)
        ? prev.filter(id => id !== columnId)
        : [...prev, columnId]
    );
  };

  const toggleRowSelection = (issueId: string) => {
    setSelectedRows(prev => {
      const next = new Set(prev);
      if (next.has(issueId)) {
        next.delete(issueId);
      } else {
        next.add(issueId);
      }
      return next;
    });
  };

  const toggleAllRows = () => {
    if (selectedRows.size === issues.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(issues.map(i => i.id)));
    }
  };

  const handleSort = (columnId: string) => {
    if (sortColumn === columnId) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(columnId);
      setSortDirection('asc');
    }
  };

  const renderCellValue = (issue: Issue, columnId: string) => {
    switch (columnId) {
      case 'key':
        return (
          <span className="text-accent-primary font-medium">{issue.key}</span>
        );
      case 'type':
        return (
          <div className="flex items-center gap-1.5">
            <div className={cn("w-4 h-4 rounded-sm flex items-center justify-center", TYPE_COLORS[issue.type])}>
              <Layers className="h-2.5 w-2.5 text-white" />
            </div>
            <span className="capitalize text-xs">{issue.type}</span>
          </div>
        );
      case 'summary':
        return (
          <span className="truncate">{issue.summary}</span>
        );
      case 'status':
        return (
          <Lozenge appearance={STATUS_APPEARANCE[issue.statusCategory] ?? 'default'}>
            {issue.status}
          </Lozenge>
        );
      case 'priority':
        return (
          <div className="flex items-center gap-1.5">
            <Flag className={cn("h-3.5 w-3.5", PRIORITY_COLORS[issue.priority])} />
            <span className="capitalize text-xs">{issue.priority}</span>
          </div>
        );
      case 'assignee':
        return issue.assigneeId ? (
          <div className="flex items-center gap-2">
            <Avatar name="User" size="xxsmall" />
            <span className="text-xs">Assigned</span>
          </div>
        ) : (
          <span className="text-text-tertiary text-xs">Unassigned</span>
        );
      case 'storyPoints':
        return issue.storyPoints ? (
          <Lozenge appearance="default">{issue.storyPoints}</Lozenge>
        ) : (
          <span className="text-text-tertiary">—</span>
        );
      case 'created':
      case 'updated':
        const date = columnId === 'created' ? issue.createdAt : issue.updatedAt;
        return (
          <span className="text-xs text-text-secondary">
            {new Date(date).toLocaleDateString()}
          </span>
        );
      default:
        return <span className="text-text-tertiary">—</span>;
    }
  };

  const columns = ALL_COLUMNS.filter(c => visibleColumns.includes(c.id));

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-default bg-surface-1">
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search issues"
              className="pl-8 w-64 h-8"
            />
          </div>

          {/* Filter */}
          <Button variant="outline" size="sm" className="gap-1.5">
            <Filter className="h-4 w-4" />
            Filter
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {/* Column selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5">
                <Columns3 className="h-4 w-4" />
                Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {ALL_COLUMNS.map(column => (
                <DropdownMenuCheckboxItem
                  key={column.id}
                  checked={visibleColumns.includes(column.id)}
                  onCheckedChange={() => toggleColumn(column.id)}
                  disabled={column.required}
                >
                  {column.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Export */}
          <Button variant="outline" size="sm" className="gap-1.5">
            <Download className="h-4 w-4" />
            Export
          </Button>

          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Selected count */}
      {selectedRows.size > 0 && (
        <div className="px-4 py-2 bg-accent-primary/10 border-b border-border-default flex items-center justify-between">
          <span className="text-sm text-text-primary">
            {selectedRows.size} selected
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">Bulk Edit</Button>
            <Button variant="outline" size="sm" className="text-red-600">Delete</Button>
          </div>
        </div>
      )}

      {/* Table */}
      <ScrollArea className="flex-1">
        <div className="min-w-max">
          {/* Header */}
          <div className="flex items-center border-b border-border-default bg-surface-2 sticky top-0 z-10">
            <div className="w-10 px-3 py-2 flex-shrink-0">
              <Checkbox
                checked={issues.length > 0 && selectedRows.size === issues.length}
                onCheckedChange={toggleAllRows}
              />
            </div>
            {columns.map(column => (
              <div
                key={column.id}
                className="px-3 py-2 text-xs font-medium text-text-secondary uppercase tracking-wide flex items-center gap-1 cursor-pointer hover:text-text-primary"
                style={{ width: column.width, minWidth: column.width }}
                onClick={() => handleSort(column.id)}
              >
                {column.label}
                {sortColumn === column.id && (
                  <ArrowUpDown className="h-3 w-3" />
                )}
              </div>
            ))}
          </div>

          {/* Rows */}
          {isLoading ? (
            <div className="px-4 py-8 text-center text-sm text-text-tertiary">Loading issues…</div>
          ) : issues.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-text-tertiary">No issues found.</div>
          ) : null}
          {issues.map((issue) => (
            <div
              key={issue.id}
              className={cn(
                "flex items-center border-b border-border-default hover:bg-surface-hover cursor-pointer transition-colors",
                selectedRows.has(issue.id) && "bg-accent-primary/5"
              )}
              onClick={() => openIssueDrawer(issue)}
            >
              <div 
                className="w-10 px-3 py-2 flex-shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleRowSelection(issue.id);
                }}
              >
                <Checkbox checked={selectedRows.has(issue.id)} />
              </div>
              {columns.map(column => (
                <div
                  key={column.id}
                  className="px-3 py-2 text-sm"
                  style={{ width: column.width, minWidth: column.width }}
                >
                  {renderCellValue(issue, column.id)}
                </div>
              ))}
            </div>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-border-default bg-surface-2 flex items-center justify-between">
        <span className="text-sm text-text-tertiary">
          {issues.length} issue{issues.length !== 1 ? 's' : ''}
        </span>
      </div>
    </div>
  );
}

export default ListPage;
