/**
 * Kanban View - 5 column board with drag and drop - WIRED TO SUPABASE
 * Uses @dnd-kit for accessible drag and drop
 */

import React, { useState, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { CATALYST_V5, TEST_PRIORITY_COLORS } from '@/lib/catalyst-colors';
import { useUpdateScopeItem, type ScopeStatus } from '@/hooks/test-cycles/useCycleScopeMutations';
import type { CycleTestCase } from '@/hooks/test-cycles/useCycleTestCases';

interface CycleKanbanViewProps {
  cycleId: string;
  testCases: CycleTestCase[];
  isLoading: boolean;
}

// Map UI status to DB status
const UI_TO_DB_STATUS: Record<string, ScopeStatus> = {
  'not_started': 'not_run',
  'in_progress': 'in_progress',
  'passed': 'passed',
  'failed': 'failed',
  'blocked': 'blocked',
  'skipped': 'skipped',
};

const COLUMNS = [
  { id: 'not_started', label: 'Not Started', bg: '#f8fafc', dot: '#94a3b8' },
  { id: 'in_progress', label: 'In Progress', bg: CATALYST_V5.primaryLighter, dot: CATALYST_V5.primary },
  { id: 'passed', label: 'Passed', bg: CATALYST_V5.tealLighter, dot: CATALYST_V5.teal },
  { id: 'failed', label: 'Failed', bg: CATALYST_V5.dangerLighter, dot: CATALYST_V5.danger },
  { id: 'blocked', label: 'Blocked', bg: CATALYST_V5.warningLighter, dot: CATALYST_V5.warning },
];

// Sortable card component
function SortableCard({ testCase }: { testCase: CycleTestCase }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: testCase.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const priorityStyle = TEST_PRIORITY_COLORS[testCase.priority];

  return (
    <div
      ref={setNodeRef}
      style={{ ...style, borderLeftWidth: 3, borderLeftColor: priorityStyle?.text || '#94a3b8' }}
      className="bg-background rounded-lg border p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
      {...attributes}
      {...listeners}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium" style={{ color: CATALYST_V5.primary }}>
          {testCase.caseKey}
        </span>
        <Badge 
          className="text-[10px] px-1.5 py-0 border-0"
          style={{ backgroundColor: priorityStyle?.bg, color: priorityStyle?.text }}
        >
          {testCase.priority}
        </Badge>
      </div>
      <p className="text-sm text-foreground line-clamp-2 mb-2">
        {testCase.title}
      </p>
      <div className="flex items-center justify-between">
        {testCase.assignee ? (
          <div className="flex items-center gap-1.5">
            <div 
              className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-medium"
              style={{ color: CATALYST_V5.primary }}
            >
              {testCase.assignee.full_name.split(' ').map(n => n[0]).join('')}
            </div>
            <span className="text-xs text-muted-foreground">{testCase.assignee.full_name}</span>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">Unassigned</span>
        )}
        {testCase.linkedDefectKey && (
          <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
            {testCase.linkedDefectKey}
          </Badge>
        )}
      </div>
    </div>
  );
}

// Overlay card (shown while dragging)
function DragOverlayCard({ testCase }: { testCase: CycleTestCase }) {
  const priorityStyle = TEST_PRIORITY_COLORS[testCase.priority];
  
  return (
    <div
      className="bg-background rounded-lg border p-3 shadow-lg"
      style={{ borderLeftWidth: 3, borderLeftColor: priorityStyle?.text || '#94a3b8' }}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium" style={{ color: CATALYST_V5.primary }}>
          {testCase.caseKey}
        </span>
        <Badge 
          className="text-[10px] px-1.5 py-0 border-0"
          style={{ backgroundColor: priorityStyle?.bg, color: priorityStyle?.text }}
        >
          {testCase.priority}
        </Badge>
      </div>
      <p className="text-sm text-foreground line-clamp-2">
        {testCase.title}
      </p>
    </div>
  );
}

export function CycleKanbanView({ cycleId, testCases, isLoading }: CycleKanbanViewProps) {
  const [activeCard, setActiveCard] = useState<CycleTestCase | null>(null);
  const updateScopeItem = useUpdateScopeItem(cycleId);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    const card = testCases.find(tc => tc.id === active.id);
    if (card) setActiveCard(card);
  }, [testCases]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveCard(null);

    if (!over) return;

    // Determine target column
    let targetColumnId: string | null = null;

    // Check if dropped on a column
    const column = COLUMNS.find(c => c.id === over.id);
    if (column) {
      targetColumnId = column.id;
    } else {
      // Dropped on a card - find its column
      const overCard = testCases.find(tc => tc.id === over.id);
      if (overCard) {
        targetColumnId = overCard.status;
      }
    }

    if (!targetColumnId) return;

    // Find the dragged card
    const draggedCard = testCases.find(tc => tc.id === active.id);
    if (!draggedCard || draggedCard.status === targetColumnId) return;

    // Update status in database
    const dbStatus = UI_TO_DB_STATUS[targetColumnId];
    if (dbStatus) {
      updateScopeItem.mutate({
        scopeId: draggedCard.id,
        patch: { current_status: dbStatus },
      });
    }
  }, [testCases, updateScopeItem]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-5 gap-4">
        {COLUMNS.map((col) => (
          <div key={col.id} className="space-y-3">
            <Skeleton className="h-8 rounded" />
            <Skeleton className="h-32 rounded-xl" />
            <Skeleton className="h-32 rounded-xl" />
          </div>
        ))}
      </div>
    );
  }

  const groupedCases = COLUMNS.reduce((acc, col) => {
    acc[col.id] = testCases.filter(tc => tc.status === col.id);
    return acc;
  }, {} as Record<string, CycleTestCase[]>);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-5 gap-4 min-h-[600px]">
        {COLUMNS.map((column) => (
          <div key={column.id} className="flex flex-col">
            {/* Column Header */}
            <div className="flex items-center gap-2 mb-3 px-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: column.dot }} />
              <span className="text-sm font-medium text-foreground">{column.label}</span>
              <Badge variant="secondary" className="ml-auto text-xs">
                {groupedCases[column.id]?.length || 0}
              </Badge>
            </div>

            {/* Column Content - Droppable */}
            <SortableContext
              id={column.id}
              items={groupedCases[column.id]?.map(tc => tc.id) || []}
              strategy={verticalListSortingStrategy}
            >
              <div 
                className="flex-1 rounded-xl p-2 space-y-2 min-h-[500px]"
                style={{ backgroundColor: column.bg }}
                data-column-id={column.id}
              >
                {groupedCases[column.id]?.map((testCase) => (
                  <SortableCard key={testCase.id} testCase={testCase} />
                ))}
              </div>
            </SortableContext>
          </div>
        ))}
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeCard && <DragOverlayCard testCase={activeCard} />}
      </DragOverlay>
    </DndContext>
  );
}
