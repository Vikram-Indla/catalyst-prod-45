/**
 * Scrum Board Components
 * Backlog, Sprint Planning, and Active Sprint Board
 */

import React, { useState, useMemo, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Plus, Play, CheckCircle, Calendar, Target, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Lozenge } from '@/components/ads';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { IssueCard } from './IssueCard';
import { BoardColumn } from './BoardColumn';
import { useBoardData, useBoardColumns, useSprintManagement, type BoardIssue } from '../../hooks/useBoardData';
import { compareRanks } from '../../utils/lexorank';
import type { Sprint } from '../../types';

interface ScrumBoardProps {
  boardId: string;
  projectId: string;
  tenantId: string;
  onIssueClick?: (issue: BoardIssue) => void;
}

export function ScrumBoard({ boardId, projectId, tenantId, onIssueClick }: ScrumBoardProps) {
  const [view, setView] = useState<'backlog' | 'board'>('board');
  const [showCreateSprint, setShowCreateSprint] = useState(false);
  const [newSprintName, setNewSprintName] = useState('');
  const [newSprintGoal, setNewSprintGoal] = useState('');

  const { board, issues, sprints, isLoading, moveIssue, rankIssue, refetch } = useBoardData(boardId, projectId);
  const { columns } = useBoardColumns(boardId);
  const { createSprint, startSprint, completeSprint, isCreating } = useSprintManagement(boardId, tenantId);

  const activeSprint = useMemo(() => sprints.find(s => s.state === 'active'), [sprints]);
  const futureSprints = useMemo(() => sprints.filter(s => s.state === 'future'), [sprints]);
  const backlogIssues = useMemo(() => 
    issues.filter(i => !i.sprintId).sort((a, b) => compareRanks(a.rankLexo, b.rankLexo)),
    [issues]
  );

  const handleCreateSprint = () => {
    if (!newSprintName.trim()) return;
    createSprint({ name: newSprintName, goal: newSprintGoal || undefined });
    setShowCreateSprint(false);
    setNewSprintName('');
    setNewSprintGoal('');
  };

  const handleDragEnd = useCallback((result: DropResult) => {
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

  if (isLoading) {
    return <div className="flex items-center justify-center h-96"><RefreshCw className="w-6 h-6 animate-spin" /></div>;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold">{board?.name || 'Scrum Board'}</h2>
          <div className="flex gap-1 bg-muted rounded-lg p-1">
            <Button variant={view === 'backlog' ? 'secondary' : 'ghost'} size="sm" onClick={() => setView('backlog')}>Backlog</Button>
            <Button variant={view === 'board' ? 'secondary' : 'ghost'} size="sm" onClick={() => setView('board')}>Board</Button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowCreateSprint(true)}>
            <Plus className="w-4 h-4 mr-1" /> Sprint
          </Button>
          <Button variant="ghost" size="sm" onClick={refetch}><RefreshCw className="w-4 h-4" /></Button>
        </div>
      </div>

      {/* Content */}
      {view === 'backlog' ? (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex-1 overflow-auto p-4 space-y-4">
            {/* Active Sprint */}
            {activeSprint && (
              <SprintPanel 
                sprint={activeSprint} 
                issues={issues.filter(i => i.sprintId === activeSprint.id)}
                onComplete={() => completeSprint({ sprintId: activeSprint.id })}
                onIssueClick={onIssueClick}
              />
            )}
            
            {/* Future Sprints */}
            {futureSprints.map(sprint => (
              <SprintPanel 
                key={sprint.id}
                sprint={sprint}
                issues={issues.filter(i => i.sprintId === sprint.id)}
                onStart={() => startSprint(sprint.id)}
                onIssueClick={onIssueClick}
              />
            ))}

            {/* Backlog */}
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-base flex items-center gap-2">
                  Backlog <Lozenge appearance="inprogress">{backlogIssues.length}</Lozenge>
                </CardTitle>
              </CardHeader>
              <Droppable droppableId="backlog">
                {(provided, snapshot) => (
                  <CardContent ref={provided.innerRef} {...provided.droppableProps}
                    className={cn("min-h-[100px] space-y-2", snapshot.isDraggingOver && "bg-primary/5")}>
                    {backlogIssues.map((issue, idx) => (
                      <Draggable key={issue.id} draggableId={issue.id} index={idx}>
                        {(dragProvided, dragSnapshot) => (
                          <div ref={dragProvided.innerRef} {...dragProvided.draggableProps} {...dragProvided.dragHandleProps}>
                            <IssueCard issue={issue} isDragging={dragSnapshot.isDragging} onClick={() => onIssueClick?.(issue)} />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </CardContent>
                )}
              </Droppable>
            </Card>
          </div>
        </DragDropContext>
      ) : (
        <ActiveSprintBoard 
          boardId={boardId}
          projectId={projectId}
          activeSprint={activeSprint}
          issues={issues}
          columns={columns}
          onIssueClick={onIssueClick}
          moveIssue={moveIssue}
          rankIssue={rankIssue}
        />
      )}

      {/* Create Sprint Dialog */}
      <Dialog open={showCreateSprint} onOpenChange={setShowCreateSprint}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Sprint</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Name</Label><Input value={newSprintName} onChange={e => setNewSprintName(e.target.value)} placeholder="Sprint 1" /></div>
            <div><Label>Goal</Label><Textarea value={newSprintGoal} onChange={e => setNewSprintGoal(e.target.value)} placeholder="Sprint goal..." /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateSprint(false)}>Cancel</Button>
            <Button onClick={handleCreateSprint} disabled={isCreating || !newSprintName.trim()}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SprintPanel({ sprint, issues, onStart, onComplete, onIssueClick }: {
  sprint: Sprint;
  issues: BoardIssue[];
  onStart?: () => void;
  onComplete?: () => void;
  onIssueClick?: (issue: BoardIssue) => void;
}) {
  const storyPoints = issues.reduce((sum, i) => sum + (i.storyPoints || 0), 0);
  
  return (
    <Card className={cn(sprint.state === 'active' && "border-primary")}>
      <CardHeader className="py-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            {sprint.state === 'active' && <Play className="w-4 h-4 text-primary" />}
            {sprint.name}
            <Lozenge appearance="inprogress">{issues.length} issues</Lozenge>
            <Lozenge appearance="default">{storyPoints} SP</Lozenge>
          </CardTitle>
          <div className="flex gap-2">
            {sprint.state === 'future' && onStart && (
              <Button size="sm" onClick={onStart}><Play className="w-3 h-3 mr-1" />Start</Button>
            )}
            {sprint.state === 'active' && onComplete && (
              <Button size="sm" variant="outline" onClick={onComplete}><CheckCircle className="w-3 h-3 mr-1" />Complete</Button>
            )}
          </div>
        </div>
      </CardHeader>
      <Droppable droppableId={sprint.id}>
        {(provided, snapshot) => (
          <CardContent ref={provided.innerRef} {...provided.droppableProps}
            className={cn("min-h-[60px] space-y-2", snapshot.isDraggingOver && "bg-primary/5")}>
            {issues.sort((a, b) => compareRanks(a.rankLexo, b.rankLexo)).map((issue, idx) => (
              <Draggable key={issue.id} draggableId={issue.id} index={idx}>
                {(dragProvided, dragSnapshot) => (
                  <div ref={dragProvided.innerRef} {...dragProvided.draggableProps} {...dragProvided.dragHandleProps}>
                    <IssueCard issue={issue} isDragging={dragSnapshot.isDragging} onClick={() => onIssueClick?.(issue)} />
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
            {issues.length === 0 && <div className="text-center py-4 text-muted-foreground text-sm">Drag issues here</div>}
          </CardContent>
        )}
      </Droppable>
    </Card>
  );
}

function ActiveSprintBoard({ boardId, projectId, activeSprint, issues, columns, onIssueClick, moveIssue, rankIssue }: any) {
  const sprintIssues = useMemo(() => 
    activeSprint ? issues.filter((i: BoardIssue) => i.sprintId === activeSprint.id) : [],
    [issues, activeSprint]
  );

  const issuesByColumn = useMemo(() => {
    const grouped: Record<string, BoardIssue[]> = {};
    columns.forEach((col: any) => { grouped[col.id] = []; });
    sprintIssues.forEach((issue: BoardIssue) => {
      const col = columns.find((c: any) => c.statusIds.includes(issue.status));
      if (col) grouped[col.id].push(issue);
    });
    Object.keys(grouped).forEach(id => grouped[id].sort((a, b) => compareRanks(a.rankLexo, b.rankLexo)));
    return grouped;
  }, [sprintIssues, columns]);

  const handleDragEnd = useCallback((result: DropResult) => {
    if (!result.destination) return;
    const destCol = columns.find((c: any) => c.id === result.destination!.droppableId);
    if (!destCol) return;
    const destIssues = issuesByColumn[destCol.id]?.filter((i: BoardIssue) => i.id !== result.draggableId) || [];
    const newRank = rankIssue(result.draggableId, result.destination.index, destIssues);
    const newStatus = result.source.droppableId !== result.destination.droppableId ? destCol.statusIds[0] : undefined;
    moveIssue({ issueId: result.draggableId, targetStatusId: newStatus, newRank });
  }, [columns, issuesByColumn, moveIssue, rankIssue]);

  if (!activeSprint) {
    return <div className="flex-1 flex items-center justify-center text-muted-foreground">No active sprint</div>;
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-4 p-4 overflow-x-auto flex-1">
        {columns.map((col: any) => (
          <BoardColumn key={col.id} column={col} issues={issuesByColumn[col.id] || []} onIssueClick={onIssueClick} />
        ))}
      </div>
    </DragDropContext>
  );
}

export default ScrumBoard;
