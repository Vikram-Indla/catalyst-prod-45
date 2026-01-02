/**
 * Scrum Board Page
 * Sprint-based board with backlog, sprint lifecycle, and active sprint board
 */

import React, { useState, useMemo, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
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
  BarChart3,
  Play,
  CheckCircle,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useInJira } from '../context/InJiraContext';
import { useBoardData, useBoardColumns, useSprintManagement, type BoardIssue, type DBBoardColumn } from '../hooks/useBoardData';
import { compareRanks } from '../utils/lexorank';
import { IssuePriority, IssueType, Sprint } from '../types';

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

// Default scrum columns
const DEFAULT_SCRUM_COLUMNS: DBBoardColumn[] = [
  { id: 'to-do', boardId: '', name: 'To Do', sortOrder: 0, statusIds: ['to-do', 'backlog'], maxLimit: null, minLimit: null },
  { id: 'in-progress', boardId: '', name: 'In Progress', sortOrder: 1, statusIds: ['in-progress'], maxLimit: null, minLimit: null },
  { id: 'in-review', boardId: '', name: 'In Review', sortOrder: 2, statusIds: ['in-review'], maxLimit: null, minLimit: null },
  { id: 'done', boardId: '', name: 'Done', sortOrder: 3, statusIds: ['done'], maxLimit: null, minLimit: null },
];

export function ScrumBoardPage() {
  const { projectKey } = useParams<{ projectKey: string }>();
  const { 
    openIssueDrawer, 
    openCreateModal, 
    searchQuery, 
    setSearchQuery,
  } = useInJira();
  
  const [view, setView] = useState<'backlog' | 'board'>('board');
  const [showCreateSprint, setShowCreateSprint] = useState(false);
  const [newSprintName, setNewSprintName] = useState('');
  const [newSprintGoal, setNewSprintGoal] = useState('');

  // Use projectKey as fallback IDs for demo mode
  const boardId = projectKey || 'demo-board';
  const projectId = projectKey || 'demo-project';
  const tenantId = 'default-tenant';

  const {
    board,
    issues,
    sprints,
    isLoading,
    error,
    moveIssue,
    isMoving,
    rankIssue,
    refetch,
  } = useBoardData(boardId, projectId);

  const { columns: dbColumns } = useBoardColumns(boardId);
  const { createSprint, startSprint, completeSprint, isCreating, isStarting } = useSprintManagement(boardId, tenantId);

  const columns = dbColumns.length > 0 ? dbColumns : DEFAULT_SCRUM_COLUMNS;

  const activeSprint = useMemo(() => sprints.find(s => s.state === 'active'), [sprints]);
  const futureSprints = useMemo(() => sprints.filter(s => s.state === 'future'), [sprints]);
  const backlogIssues = useMemo(() => 
    issues.filter(i => !i.sprintId).sort((a, b) => compareRanks(a.rankLexo, b.rankLexo)),
    [issues]
  );

  // Calculate sprint progress
  const sprintIssues = useMemo(() => 
    activeSprint ? issues.filter(i => i.sprintId === activeSprint.id) : [],
    [issues, activeSprint]
  );
  const totalPoints = sprintIssues.reduce((sum, i) => sum + (i.storyPoints || 0), 0);
  const donePoints = sprintIssues
    .filter(i => i.status === 'done' || i.statusCategory === 'done')
    .reduce((sum, i) => sum + (i.storyPoints || 0), 0);

  // Group sprint issues by column
  const issuesByColumn = useMemo(() => {
    const grouped: Record<string, BoardIssue[]> = {};
    columns.forEach(col => { grouped[col.id] = []; });
    
    sprintIssues.forEach(issue => {
      const col = columns.find(c => c.statusIds.includes(issue.status));
      if (col) {
        grouped[col.id].push(issue);
      } else {
        grouped[columns[0]?.id]?.push(issue);
      }
    });
    
    Object.keys(grouped).forEach(id => 
      grouped[id].sort((a, b) => compareRanks(a.rankLexo, b.rankLexo))
    );
    
    return grouped;
  }, [sprintIssues, columns]);

  const handleCreateSprint = () => {
    if (!newSprintName.trim()) return;
    createSprint({ name: newSprintName, goal: newSprintGoal || undefined });
    setShowCreateSprint(false);
    setNewSprintName('');
    setNewSprintGoal('');
  };

  const handleDragEndBacklog = useCallback((result: DropResult) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const targetSprintId = destination.droppableId === 'backlog' ? null : destination.droppableId;
    const targetIssues = targetSprintId 
      ? issues.filter(i => i.sprintId === targetSprintId && i.id !== draggableId)
      : backlogIssues.filter(i => i.id !== draggableId);
    
    const newRank = rankIssue(draggableId, destination.index, targetIssues);
    moveIssue({ issueId: draggableId, targetSprintId, newRank });
  }, [issues, backlogIssues, moveIssue, rankIssue]);

  const handleDragEndBoard = useCallback((result: DropResult) => {
    if (!result.destination) return;
    
    const destCol = columns.find(c => c.id === result.destination!.droppableId);
    if (!destCol) return;
    
    const destIssues = issuesByColumn[destCol.id]?.filter(i => i.id !== result.draggableId) || [];
    const newRank = rankIssue(result.draggableId, result.destination.index, destIssues);
    const newStatus = result.source.droppableId !== result.destination.droppableId 
      ? destCol.statusIds[0] 
      : undefined;
    
    moveIssue({ issueId: result.draggableId, targetStatusId: newStatus, newRank });
  }, [columns, issuesByColumn, moveIssue, rankIssue]);

  const handleIssueClick = (issue: BoardIssue) => {
    openIssueDrawer({
      id: issue.id,
      key: issue.key,
      summary: issue.summary,
      type: issue.type,
      status: issue.status,
      statusCategory: issue.statusCategory,
      priority: issue.priority,
      createdAt: issue.createdAt,
      updatedAt: issue.updatedAt,
      assigneeId: issue.assigneeId,
      reporterId: issue.reporterId,
      storyPoints: issue.storyPoints,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <RefreshCw className="w-6 h-6 animate-spin text-text-tertiary" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Sprint Header */}
      <div className="px-4 py-3 border-b border-border-default bg-surface-1">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            {/* View Toggle */}
            <div className="flex gap-1 bg-surface-2 rounded-lg p-1">
              <Button 
                variant={view === 'backlog' ? 'secondary' : 'ghost'} 
                size="sm"
                onClick={() => setView('backlog')}
              >
                Backlog
              </Button>
              <Button 
                variant={view === 'board' ? 'secondary' : 'ghost'} 
                size="sm"
                onClick={() => setView('board')}
              >
                Board
              </Button>
            </div>

            {/* Active Sprint Info */}
            {activeSprint && (
              <div className="flex items-center gap-1.5 text-sm text-text-tertiary">
                <Calendar className="h-4 w-4" />
                <span className="font-medium text-text-primary">{activeSprint.name}</span>
                {activeSprint.startDate && activeSprint.endDate && (
                  <span>({activeSprint.startDate} - {activeSprint.endDate})</span>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowCreateSprint(true)}>
              <Plus className="h-4 w-4" />
              Sprint
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Target className="h-4 w-4" />
              Sprint Goal
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5">
              <BarChart3 className="h-4 w-4" />
              Burndown
            </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
              className="h-8 w-8"
              onClick={refetch}
              disabled={isMoving}
            >
              <RefreshCw className={cn("h-4 w-4", isMoving && "animate-spin")} />
            </Button>
          </div>
        </div>

        {/* Sprint Progress */}
        {activeSprint && totalPoints > 0 && (
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
        )}
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border-default bg-surface-2">
        <div className="flex items-center gap-3">
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

      {/* Content */}
      {view === 'backlog' ? (
        <DragDropContext onDragEnd={handleDragEndBacklog}>
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-4">
              {/* Active Sprint */}
              {activeSprint && (
                <SprintPanel 
                  sprint={activeSprint} 
                  issues={issues.filter(i => i.sprintId === activeSprint.id)}
                  onComplete={() => completeSprint({ sprintId: activeSprint.id })}
                  onIssueClick={handleIssueClick}
                />
              )}
              
              {/* Future Sprints */}
              {futureSprints.map(sprint => (
                <SprintPanel 
                  key={sprint.id}
                  sprint={sprint}
                  issues={issues.filter(i => i.sprintId === sprint.id)}
                  onStart={() => startSprint(sprint.id)}
                  onIssueClick={handleIssueClick}
                />
              ))}

              {/* Backlog */}
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    Backlog 
                    <Badge variant="secondary">{backlogIssues.length}</Badge>
                    <Badge variant="outline">
                      {backlogIssues.reduce((sum, i) => sum + (i.storyPoints || 0), 0)} SP
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <Droppable droppableId="backlog">
                  {(provided, snapshot) => (
                    <CardContent 
                      ref={provided.innerRef} 
                      {...provided.droppableProps}
                      className={cn(
                        "min-h-[100px] space-y-2", 
                        snapshot.isDraggingOver && "bg-accent-primary/5"
                      )}
                    >
                      {backlogIssues.map((issue, idx) => (
                        <Draggable key={issue.id} draggableId={issue.id} index={idx}>
                          {(dragProvided, dragSnapshot) => (
                            <div 
                              ref={dragProvided.innerRef} 
                              {...dragProvided.draggableProps} 
                              {...dragProvided.dragHandleProps}
                            >
                              <IssueRow 
                                issue={issue} 
                                isDragging={dragSnapshot.isDragging} 
                                onClick={() => handleIssueClick(issue)} 
                              />
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                      {backlogIssues.length === 0 && (
                        <div className="text-center py-8 text-text-tertiary text-sm">
                          Drag issues here or create new ones
                        </div>
                      )}
                    </CardContent>
                  )}
                </Droppable>
              </Card>
            </div>
          </ScrollArea>
        </DragDropContext>
      ) : (
        <ScrollArea className="flex-1">
          {!activeSprint ? (
            <div className="flex flex-col items-center justify-center h-96 text-text-tertiary">
              <Target className="h-12 w-12 mb-4 opacity-50" />
              <p className="text-lg font-medium">No active sprint</p>
              <p className="text-sm mt-1">Start a sprint from the backlog view</p>
              <Button variant="outline" className="mt-4" onClick={() => setView('backlog')}>
                Go to Backlog
              </Button>
            </div>
          ) : (
            <DragDropContext onDragEnd={handleDragEndBoard}>
              <div className="flex gap-3 p-4 min-w-max">
                {columns.map((column) => {
                  const columnIssues = issuesByColumn[column.id] || [];
                  const columnPoints = columnIssues.reduce((sum, i) => sum + (i.storyPoints || 0), 0);
                  
                  return (
                    <div 
                      key={column.id}
                      className="w-72 flex-shrink-0 bg-surface-2 rounded-lg border border-border-default"
                    >
                      <div className="flex items-center justify-between px-3 py-2 border-b border-border-default">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-text-primary">
                            {column.name}
                          </span>
                          <Badge variant="secondary" className="text-xs h-5 px-1.5">
                            {columnIssues.length}
                          </Badge>
                          <span className="text-xs text-text-tertiary">
                            {columnPoints} pts
                          </span>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6"
                          onClick={() => openCreateModal({ projectKey: projectKey || 'PROJ' })}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>

                      <Droppable droppableId={column.id}>
                        {(provided, snapshot) => (
                          <div 
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className={cn(
                              "p-2 space-y-2 min-h-[200px] transition-colors",
                              snapshot.isDraggingOver && "bg-accent-primary/5"
                            )}
                          >
                            {columnIssues.length === 0 ? (
                              <div className="h-24 border-2 border-dashed border-border-default rounded-lg flex items-center justify-center text-text-tertiary text-sm">
                                No issues
                              </div>
                            ) : (
                              columnIssues.map((issue, index) => (
                                <Draggable key={issue.id} draggableId={issue.id} index={index}>
                                  {(dragProvided, dragSnapshot) => (
                                    <div
                                      ref={dragProvided.innerRef}
                                      {...dragProvided.draggableProps}
                                      {...dragProvided.dragHandleProps}
                                      className={cn(
                                        "bg-surface-1 rounded-md border border-border-default p-3 cursor-pointer hover:border-accent-primary hover:shadow-sm transition-all",
                                        dragSnapshot.isDragging && "shadow-lg rotate-2"
                                      )}
                                      onClick={() => handleIssueClick(issue)}
                                    >
                                      <div className="flex items-center gap-2 mb-2">
                                        <div className={cn(
                                          "w-4 h-4 rounded-sm flex items-center justify-center",
                                          TYPE_COLORS[issue.type] || 'bg-gray-500'
                                        )}>
                                          <Layers className="h-2.5 w-2.5 text-white" />
                                        </div>
                                        <span className="text-xs font-medium text-accent-primary">
                                          {issue.key}
                                        </span>
                                      </div>

                                      <p className="text-sm text-text-primary line-clamp-2 mb-3">
                                        {issue.summary}
                                      </p>

                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                          <Flag className={cn("h-3.5 w-3.5", PRIORITY_COLORS[issue.priority] || 'text-gray-400')} />
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
                                  )}
                                </Draggable>
                              ))
                            )}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    </div>
                  );
                })}
              </div>
            </DragDropContext>
          )}
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      )}

      {/* Create Sprint Dialog */}
      <Dialog open={showCreateSprint} onOpenChange={setShowCreateSprint}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Sprint</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input 
                value={newSprintName} 
                onChange={e => setNewSprintName(e.target.value)} 
                placeholder="Sprint 1" 
              />
            </div>
            <div>
              <Label>Goal</Label>
              <Textarea 
                value={newSprintGoal} 
                onChange={e => setNewSprintGoal(e.target.value)} 
                placeholder="Sprint goal..." 
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateSprint(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateSprint} disabled={isCreating || !newSprintName.trim()}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Sprint Panel Component
function SprintPanel({ 
  sprint, 
  issues, 
  onStart, 
  onComplete, 
  onIssueClick 
}: {
  sprint: Sprint;
  issues: BoardIssue[];
  onStart?: () => void;
  onComplete?: () => void;
  onIssueClick?: (issue: BoardIssue) => void;
}) {
  const storyPoints = issues.reduce((sum, i) => sum + (i.storyPoints || 0), 0);
  const sortedIssues = [...issues].sort((a, b) => compareRanks(a.rankLexo, b.rankLexo));
  
  return (
    <Card className={cn(sprint.state === 'active' && "border-accent-primary")}>
      <CardHeader className="py-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            {sprint.state === 'active' && <Play className="w-4 h-4 text-accent-primary" />}
            {sprint.name}
            <Badge variant="secondary">{issues.length} issues</Badge>
            <Badge variant="outline">{storyPoints} SP</Badge>
          </CardTitle>
          <div className="flex gap-2">
            {sprint.state === 'future' && onStart && (
              <Button size="sm" onClick={onStart}>
                <Play className="w-3 h-3 mr-1" />Start
              </Button>
            )}
            {sprint.state === 'active' && onComplete && (
              <Button size="sm" variant="outline" onClick={onComplete}>
                <CheckCircle className="w-3 h-3 mr-1" />Complete
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <Droppable droppableId={sprint.id}>
        {(provided, snapshot) => (
          <CardContent 
            ref={provided.innerRef} 
            {...provided.droppableProps}
            className={cn(
              "min-h-[60px] space-y-2", 
              snapshot.isDraggingOver && "bg-accent-primary/5"
            )}
          >
            {sortedIssues.map((issue, idx) => (
              <Draggable key={issue.id} draggableId={issue.id} index={idx}>
                {(dragProvided, dragSnapshot) => (
                  <div 
                    ref={dragProvided.innerRef} 
                    {...dragProvided.draggableProps} 
                    {...dragProvided.dragHandleProps}
                  >
                    <IssueRow 
                      issue={issue} 
                      isDragging={dragSnapshot.isDragging} 
                      onClick={() => onIssueClick?.(issue)} 
                    />
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
            {issues.length === 0 && (
              <div className="text-center py-4 text-text-tertiary text-sm">
                Drag issues here
              </div>
            )}
          </CardContent>
        )}
      </Droppable>
    </Card>
  );
}

// Issue Row Component for backlog view
function IssueRow({ 
  issue, 
  isDragging, 
  onClick 
}: { 
  issue: BoardIssue; 
  isDragging?: boolean;
  onClick?: () => void;
}) {
  return (
    <div 
      className={cn(
        "flex items-center gap-3 p-2 bg-surface-1 rounded border border-border-default cursor-pointer hover:border-accent-primary transition-all",
        isDragging && "shadow-lg"
      )}
      onClick={onClick}
    >
      <div className={cn(
        "w-4 h-4 rounded-sm flex items-center justify-center flex-shrink-0",
        TYPE_COLORS[issue.type] || 'bg-gray-500'
      )}>
        <Layers className="h-2.5 w-2.5 text-white" />
      </div>
      <span className="text-xs font-medium text-accent-primary flex-shrink-0">
        {issue.key}
      </span>
      <span className="text-sm text-text-primary truncate flex-1">
        {issue.summary}
      </span>
      <Flag className={cn("h-3.5 w-3.5 flex-shrink-0", PRIORITY_COLORS[issue.priority] || 'text-gray-400')} />
      {issue.storyPoints && (
        <Badge variant="outline" className="text-xs h-5 px-1.5 flex-shrink-0">
          {issue.storyPoints}
        </Badge>
      )}
      {issue.assigneeId ? (
        <Avatar className="h-6 w-6 flex-shrink-0">
          <AvatarFallback className="text-xs bg-accent-primary text-white">
            {issue.assigneeId.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      ) : (
        <div className="h-6 w-6 rounded-full border-2 border-dashed border-border-default flex items-center justify-center flex-shrink-0">
          <User className="h-3 w-3 text-text-tertiary" />
        </div>
      )}
    </div>
  );
}

export default ScrumBoardPage;
