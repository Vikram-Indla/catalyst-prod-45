/**
 * Kanban Board Page
 * Full Kanban board with columns, search, quick filters, and drag-drop placeholders
 */

import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  MoreHorizontal, 
  Plus,
  User,
  Flag,
  Layers,
  ChevronDown
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { useInJira } from '../context/InJiraContext';
import { DEFAULT_KANBAN_COLUMNS, Issue, IssuePriority, IssueType } from '../types';

// Quick filter options
const QUICK_FILTERS = [
  { id: 'only-my-issues', label: 'Only My Issues' },
  { id: 'recently-updated', label: 'Recently Updated' },
  { id: 'no-assignee', label: 'No Assignee' },
  { id: 'bugs-only', label: 'Bugs Only' },
];

// Mock issues per column
const MOCK_ISSUES: Record<string, Issue[]> = {
  'backlog': [
    { id: '1', key: 'PROJ-101', summary: 'Implement user profile page', type: 'story', status: 'Backlog', statusCategory: 'to-do', priority: 'medium', createdAt: '2024-01-01', updatedAt: '2024-01-10', storyPoints: 5 },
    { id: '2', key: 'PROJ-102', summary: 'Add dark mode support', type: 'feature', status: 'Backlog', statusCategory: 'to-do', priority: 'low', createdAt: '2024-01-02', updatedAt: '2024-01-11', storyPoints: 8 },
    { id: '3', key: 'PROJ-103', summary: 'Fix login button alignment', type: 'defect', status: 'Backlog', statusCategory: 'to-do', priority: 'high', createdAt: '2024-01-03', updatedAt: '2024-01-12' },
  ],
  'in-review': [
    { id: '4', key: 'PROJ-104', summary: 'API endpoint for notifications', type: 'story', status: 'In Review', statusCategory: 'in-progress', priority: 'high', createdAt: '2024-01-04', updatedAt: '2024-01-13', storyPoints: 3, assigneeId: 'user1' },
  ],
  'ready-for-analysis': [
    { id: '5', key: 'PROJ-105', summary: 'Database schema optimization', type: 'story', status: 'Ready for Analysis', statusCategory: 'in-progress', priority: 'medium', createdAt: '2024-01-05', updatedAt: '2024-01-14', storyPoints: 5, assigneeId: 'user2' },
    { id: '6', key: 'PROJ-106', summary: 'Add export to CSV feature', type: 'feature', status: 'Ready for Analysis', statusCategory: 'in-progress', priority: 'low', createdAt: '2024-01-06', updatedAt: '2024-01-15', storyPoints: 3 },
  ],
  'implementation-review': [
    { id: '7', key: 'PROJ-107', summary: 'Refactor authentication flow', type: 'story', status: 'Implementation Review', statusCategory: 'in-progress', priority: 'highest', createdAt: '2024-01-07', updatedAt: '2024-01-16', storyPoints: 8, assigneeId: 'user1' },
  ],
  'under-implementation': [
    { id: '8', key: 'PROJ-108', summary: 'Implement search functionality', type: 'story', status: 'Under Implementation', statusCategory: 'in-progress', priority: 'high', createdAt: '2024-01-08', updatedAt: '2024-01-17', storyPoints: 5, assigneeId: 'user3' },
    { id: '9', key: 'PROJ-109', summary: 'Fix memory leak in dashboard', type: 'defect', status: 'Under Implementation', statusCategory: 'in-progress', priority: 'highest', createdAt: '2024-01-09', updatedAt: '2024-01-18', assigneeId: 'user2' },
  ],
  'done': [
    { id: '10', key: 'PROJ-110', summary: 'Setup CI/CD pipeline', type: 'story', status: 'Done', statusCategory: 'done', priority: 'medium', createdAt: '2024-01-10', updatedAt: '2024-01-19', storyPoints: 3, assigneeId: 'user1' },
    { id: '11', key: 'PROJ-111', summary: 'Add unit tests for auth module', type: 'story', status: 'Done', statusCategory: 'done', priority: 'medium', createdAt: '2024-01-11', updatedAt: '2024-01-20', storyPoints: 5, assigneeId: 'user2' },
    { id: '12', key: 'PROJ-112', summary: 'Documentation update', type: 'subtask', status: 'Done', statusCategory: 'done', priority: 'low', createdAt: '2024-01-12', updatedAt: '2024-01-21', assigneeId: 'user3' },
  ],
};

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

export function KanbanBoardPage() {
  const { openIssueDrawer, openCreateModal, searchQuery, setSearchQuery, activeFilters, toggleFilter } = useInJira();
  const [showFilters, setShowFilters] = useState(false);

  const handleIssueClick = (issue: Issue) => {
    openIssueDrawer(issue);
  };

  const handleCreateInColumn = (columnId: string) => {
    openCreateModal({ projectKey: 'PROJ' });
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
              placeholder="Search board"
              className="pl-8 w-64 h-8"
            />
          </div>

          {/* Quick Filters */}
          <div className="flex items-center gap-1">
            {QUICK_FILTERS.map((filter) => (
              <Button
                key={filter.id}
                variant={activeFilters.includes(filter.id) ? 'default' : 'outline'}
                size="sm"
                className="h-7 text-xs"
                onClick={() => toggleFilter(filter.id)}
              >
                {filter.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="gap-1.5">
            <User className="h-4 w-4" />
            Assignee
            <ChevronDown className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="sm" className="gap-1.5">
            <Layers className="h-4 w-4" />
            Type
            <ChevronDown className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Board */}
      <ScrollArea className="flex-1">
        <div className="flex gap-3 p-4 min-w-max">
          {DEFAULT_KANBAN_COLUMNS.map((column) => {
            const issues = MOCK_ISSUES[column.id] || [];
            
            return (
              <div 
                key={column.id}
                className="w-72 flex-shrink-0 bg-surface-2 rounded-lg border border-border-default"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between px-3 py-2 border-b border-border-default">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-text-primary">
                      {column.name}
                    </span>
                    <Badge variant="secondary" className="text-xs h-5 px-1.5">
                      {issues.length}
                    </Badge>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6"
                    onClick={() => handleCreateInColumn(column.id)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {/* Cards */}
                <div className="p-2 space-y-2 min-h-[200px]">
                  {issues.length === 0 ? (
                    <div 
                      className="h-24 border-2 border-dashed border-border-default rounded-lg flex items-center justify-center text-text-tertiary text-sm cursor-pointer hover:border-accent-primary hover:text-accent-primary transition-colors"
                      onClick={() => handleCreateInColumn(column.id)}
                    >
                      Drop issues here
                    </div>
                  ) : (
                    issues.map((issue) => (
                      <div
                        key={issue.id}
                        className="bg-surface-1 rounded-md border border-border-default p-3 cursor-pointer hover:border-accent-primary hover:shadow-sm transition-all group"
                        onClick={() => handleIssueClick(issue)}
                      >
                        {/* Issue Key + Type */}
                        <div className="flex items-center gap-2 mb-2">
                          <div className={cn(
                            "w-4 h-4 rounded-sm flex items-center justify-center",
                            TYPE_COLORS[issue.type]
                          )}>
                            <Layers className="h-2.5 w-2.5 text-white" />
                          </div>
                          <span className="text-xs font-medium text-accent-primary">
                            {issue.key}
                          </span>
                        </div>

                        {/* Summary */}
                        <p className="text-sm text-text-primary line-clamp-2 mb-3">
                          {issue.summary}
                        </p>

                        {/* Footer */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Flag className={cn("h-3.5 w-3.5", PRIORITY_COLORS[issue.priority])} />
                            {issue.storyPoints && (
                              <Badge variant="outline" className="text-xs h-5 px-1.5">
                                {issue.storyPoints}
                              </Badge>
                            )}
                          </div>
                          {issue.assigneeId ? (
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="text-xs bg-accent-primary text-white">
                                {issue.assigneeId.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          ) : (
                            <div className="h-6 w-6 rounded-full border-2 border-dashed border-border-default flex items-center justify-center">
                              <User className="h-3 w-3 text-text-tertiary" />
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}

export default KanbanBoardPage;
