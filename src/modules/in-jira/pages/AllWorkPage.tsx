/**
 * All Work Page
 * Similar to List but with additional hierarchy and grouping options
 */

import React, { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import {
  Search,
  Filter,
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
  Columns3,
  Layers,
  FolderTree,
  List,
  Grid3X3
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Lozenge, type LozengeAppearance } from '@/components/ads';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useInJira } from '../context/InJiraContext';
import { useInJiraIssues } from '../hooks/useInJiraIssues';
import { Issue, IssueType } from '../types';

// View modes
type ViewMode = 'flat' | 'hierarchy' | 'grouped';

// Grouping options
const GROUP_BY_OPTIONS = [
  { id: 'none', label: 'No grouping' },
  { id: 'type', label: 'Type' },
  { id: 'status', label: 'Status' },
  { id: 'priority', label: 'Priority' },
  { id: 'assignee', label: 'Assignee' },
  { id: 'epic', label: 'Epic' },
];


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

type HierarchyIssue = Issue & { children?: Issue[] };

function buildHierarchy(issues: Issue[]): HierarchyIssue[] {
  const byId = new Map<string, HierarchyIssue>(issues.map(i => [i.id, { ...i, children: [] }]));
  const roots: HierarchyIssue[] = [];
  for (const item of byId.values()) {
    if (item.parentId && byId.has(item.parentId)) {
      byId.get(item.parentId)!.children!.push(item);
    } else {
      roots.push(item);
    }
  }
  return roots;
}

export function AllWorkPage() {
  const { projectKey } = useParams<{ projectKey: string }>();
  const { openIssueDrawer, searchQuery, setSearchQuery } = useInJira();
  const { data: flatIssues = [], isLoading } = useInJiraIssues(projectKey || '');
  const [viewMode, setViewMode] = useState<ViewMode>('hierarchy');
  const [groupBy, setGroupBy] = useState('none');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const hierarchy = useMemo(() => buildHierarchy(flatIssues), [flatIssues]);
  const childCount = flatIssues.length - hierarchy.length;

  const toggleExpand = (itemId: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  const renderIssueRow = (issue: HierarchyIssue, depth: number = 0) => {
    const hasChildren = issue.children && issue.children.length > 0;
    const isExpanded = expandedItems.has(issue.id);

    return (
      <React.Fragment key={issue.id}>
        <div
          className="flex items-center gap-3 px-4 py-2 border-b border-border-default hover:bg-surface-hover cursor-pointer transition-colors"
          style={{ paddingLeft: `${16 + depth * 24}px` }}
          onClick={() => openIssueDrawer(issue)}
        >
          {/* Expand/collapse */}
          <div className="w-5 flex-shrink-0">
            {hasChildren && (
              <button
                className="p-0.5 hover:bg-surface-3 rounded"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpand(issue.id);
                }}
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-text-tertiary" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-text-tertiary" />
                )}
              </button>
            )}
          </div>

          {/* Type icon */}
          <div className={cn(
            "w-5 h-5 rounded-sm flex items-center justify-center flex-shrink-0",
            TYPE_COLORS[issue.type]
          )}>
            <Layers className="h-3 w-3 text-white" />
          </div>

          {/* Key */}
          <span className="text-sm font-medium text-accent-primary w-24 flex-shrink-0">
            {issue.key}
          </span>

          {/* Summary */}
          <span className="text-sm text-text-primary flex-1 truncate">
            {issue.summary}
          </span>

          {/* Status */}
          <span className="flex-shrink-0">
            <Lozenge appearance={STATUS_APPEARANCE[issue.statusCategory] ?? 'default'}>
              {issue.status}
            </Lozenge>
          </span>

          {/* Story points */}
          {issue.storyPoints && (
            <span className="flex-shrink-0">
              <Lozenge appearance="default">
                {issue.storyPoints}
              </Lozenge>
            </span>
          )}

          {/* Children count */}
          {hasChildren && (
            <span className="text-xs text-text-tertiary flex-shrink-0">
              {issue.children!.length} children
            </span>
          )}
        </div>

        {/* Render children if expanded */}
        {hasChildren && isExpanded && (
          issue.children!.map(child => renderIssueRow(child as HierarchyIssue, depth + 1))
        )}
      </React.Fragment>
    );
  };

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
              placeholder="Search all work"
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
          {/* View mode toggle */}
          <div className="flex items-center border border-border-default rounded-md">
            <Button
              variant={viewMode === 'flat' ? 'secondary' : 'ghost'}
              size="sm"
              className="rounded-r-none h-8"
              onClick={() => setViewMode('flat')}
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'hierarchy' ? 'secondary' : 'ghost'}
              size="sm"
              className="rounded-none border-x border-border-default h-8"
              onClick={() => setViewMode('hierarchy')}
            >
              <FolderTree className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'grouped' ? 'secondary' : 'ghost'}
              size="sm"
              className="rounded-l-none h-8"
              onClick={() => setViewMode('grouped')}
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
          </div>

          {/* Group by */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5">
                <Layers className="h-4 w-4" />
                Group by
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {GROUP_BY_OPTIONS.map(option => (
                <DropdownMenuItem
                  key={option.id}
                  onClick={() => setGroupBy(option.id)}
                  className={cn(groupBy === option.id && "bg-accent-primary/10")}
                >
                  {option.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="min-w-0">
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-2 border-b border-border-default bg-surface-2 sticky top-0 z-10">
            <div className="w-5" />
            <div className="w-5" />
            <span className="text-xs font-medium text-text-secondary uppercase w-24">Key</span>
            <span className="text-xs font-medium text-text-secondary uppercase flex-1">Summary</span>
            <span className="text-xs font-medium text-text-secondary uppercase w-32 text-center">Status</span>
            <span className="text-xs font-medium text-text-secondary uppercase w-16 text-center">Points</span>
            <span className="text-xs font-medium text-text-secondary uppercase w-20 text-center">Children</span>
          </div>

          {/* Items */}
          {isLoading ? (
            <div className="px-4 py-8 text-center text-sm text-text-tertiary">Loading…</div>
          ) : hierarchy.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-text-tertiary">No issues found.</div>
          ) : null}
          {hierarchy.map(item => renderIssueRow(item))}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-border-default bg-surface-2 flex items-center justify-between">
        <span className="text-sm text-text-tertiary">
          {hierarchy.length} top-level, {childCount} children
        </span>
      </div>
    </div>
  );
}

export default AllWorkPage;
