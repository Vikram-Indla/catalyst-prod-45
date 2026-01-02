/**
 * Scrum Board Page
 * Sprint-based board with backlog, sprint selector, and burndown
 */

import React, { useState } from 'react';
import { 
  Search, 
  MoreHorizontal, 
  Plus,
  User,
  Flag,
  Layers,
  ChevronDown,
  Calendar,
  Target,
  BarChart3
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useInJira } from '../context/InJiraContext';
import { Issue, IssuePriority, IssueType } from '../types';

// Mock sprints
const SPRINTS = [
  { id: 'sprint-10', name: 'Sprint 10', state: 'active', startDate: '2024-01-15', endDate: '2024-01-29' },
  { id: 'sprint-9', name: 'Sprint 9', state: 'closed', startDate: '2024-01-01', endDate: '2024-01-14' },
  { id: 'sprint-11', name: 'Sprint 11', state: 'future', startDate: '2024-01-30', endDate: '2024-02-12' },
];

// Scrum columns
const SCRUM_COLUMNS = [
  { id: 'to-do', name: 'To Do', statusCategory: 'to-do' as const },
  { id: 'in-progress', name: 'In Progress', statusCategory: 'in-progress' as const },
  { id: 'in-review', name: 'In Review', statusCategory: 'in-progress' as const },
  { id: 'done', name: 'Done', statusCategory: 'done' as const },
];

// Mock issues for active sprint
const SPRINT_ISSUES: Record<string, Issue[]> = {
  'to-do': [
    { id: '1', key: 'PROJ-201', summary: 'Implement password reset flow', type: 'story', status: 'To Do', statusCategory: 'to-do', priority: 'high', createdAt: '2024-01-15', updatedAt: '2024-01-16', storyPoints: 5 },
    { id: '2', key: 'PROJ-202', summary: 'Add email verification', type: 'story', status: 'To Do', statusCategory: 'to-do', priority: 'medium', createdAt: '2024-01-15', updatedAt: '2024-01-16', storyPoints: 3 },
  ],
  'in-progress': [
    { id: '3', key: 'PROJ-203', summary: 'Build notification preferences UI', type: 'story', status: 'In Progress', statusCategory: 'in-progress', priority: 'medium', createdAt: '2024-01-15', updatedAt: '2024-01-17', storyPoints: 5, assigneeId: 'user1' },
  ],
  'in-review': [
    { id: '4', key: 'PROJ-204', summary: 'API rate limiting implementation', type: 'story', status: 'In Review', statusCategory: 'in-progress', priority: 'high', createdAt: '2024-01-15', updatedAt: '2024-01-18', storyPoints: 8, assigneeId: 'user2' },
  ],
  'done': [
    { id: '5', key: 'PROJ-205', summary: 'Setup error tracking', type: 'story', status: 'Done', statusCategory: 'done', priority: 'medium', createdAt: '2024-01-15', updatedAt: '2024-01-19', storyPoints: 3, assigneeId: 'user1' },
    { id: '6', key: 'PROJ-206', summary: 'Add logging middleware', type: 'story', status: 'Done', statusCategory: 'done', priority: 'low', createdAt: '2024-01-15', updatedAt: '2024-01-20', storyPoints: 2, assigneeId: 'user3' },
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

export function ScrumBoardPage() {
  const { openIssueDrawer, openCreateModal, searchQuery, setSearchQuery } = useInJira();
  const [selectedSprintId, setSelectedSprintId] = useState('sprint-10');

  const selectedSprint = SPRINTS.find(s => s.id === selectedSprintId);
  const totalPoints = Object.values(SPRINT_ISSUES).flat().reduce((sum, i) => sum + (i.storyPoints || 0), 0);
  const donePoints = SPRINT_ISSUES['done'].reduce((sum, i) => sum + (i.storyPoints || 0), 0);

  const handleIssueClick = (issue: Issue) => {
    openIssueDrawer(issue);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Sprint Header */}
      <div className="px-4 py-3 border-b border-border-default bg-surface-1">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            {/* Sprint Selector */}
            <Select value={selectedSprintId} onValueChange={setSelectedSprintId}>
              <SelectTrigger className="w-48 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SPRINTS.map(sprint => (
                  <SelectItem key={sprint.id} value={sprint.id}>
                    <div className="flex items-center gap-2">
                      <span>{sprint.name}</span>
                      {sprint.state === 'active' && (
                        <Badge variant="default" className="text-xs h-4 px-1">
                          Active
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Sprint Dates */}
            {selectedSprint && (
              <div className="flex items-center gap-1.5 text-sm text-text-tertiary">
                <Calendar className="h-4 w-4" />
                <span>{selectedSprint.startDate} - {selectedSprint.endDate}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Sprint Goal */}
            <Button variant="outline" size="sm" className="gap-1.5">
              <Target className="h-4 w-4" />
              Sprint Goal
            </Button>
            {/* Burndown */}
            <Button variant="outline" size="sm" className="gap-1.5">
              <BarChart3 className="h-4 w-4" />
              Burndown
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Sprint Progress */}
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-text-secondary">Sprint Progress</span>
              <span className="text-text-primary font-medium">
                {donePoints} / {totalPoints} points ({Math.round((donePoints / totalPoints) * 100)}%)
              </span>
            </div>
            <Progress value={(donePoints / totalPoints) * 100} className="h-2" />
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border-default bg-surface-2">
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search sprint"
              className="pl-8 w-56 h-8"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="gap-1.5">
            <User className="h-4 w-4" />
            Assignee
            <ChevronDown className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Board */}
      <ScrollArea className="flex-1">
        <div className="flex gap-3 p-4 min-w-max">
          {SCRUM_COLUMNS.map((column) => {
            const issues = SPRINT_ISSUES[column.id] || [];
            const columnPoints = issues.reduce((sum, i) => sum + (i.storyPoints || 0), 0);
            
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
                    <span className="text-xs text-text-tertiary">
                      {columnPoints} pts
                    </span>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6"
                    onClick={() => openCreateModal({ projectKey: 'PROJ' })}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {/* Cards */}
                <div className="p-2 space-y-2 min-h-[200px]">
                  {issues.length === 0 ? (
                    <div className="h-24 border-2 border-dashed border-border-default rounded-lg flex items-center justify-center text-text-tertiary text-sm">
                      No issues
                    </div>
                  ) : (
                    issues.map((issue) => (
                      <div
                        key={issue.id}
                        className="bg-surface-1 rounded-md border border-border-default p-3 cursor-pointer hover:border-accent-primary hover:shadow-sm transition-all"
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

export default ScrumBoardPage;
