import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Users, X, GripVertical, ArrowLeftRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { ResourceMetric } from '@/modules/capacity-planner';
import type { ResourceAssignment } from '@/modules/capacity-planner/hooks/useResourceAssignments';

// Department colors - Catalyst V5 compliant
const departmentColors: Record<string, { bg: string; text: string }> = {
  Product: { bg: 'bg-[#d4b896]', text: 'text-[#4a3f35]' },
  Delivery: { bg: 'bg-[#0d9488]', text: 'text-white' },
  Support: { bg: 'bg-[#4d8b4d]', text: 'text-white' },
  default: { bg: 'bg-muted', text: 'text-muted-foreground' },
};

interface KanbanAssignViewProps {
  resources: ResourceMetric[];
  assignments: ResourceAssignment[];
  onMoveResource: (resourceId: string, fromAssignment: string, toAssignment: string) => void;
  onClose: () => void;
}

export function KanbanAssignView({ 
  resources,
  assignments,
  onMoveResource,
  onClose,
}: KanbanAssignViewProps) {
  // Build columns: all active assignments + Unassigned
  const columns = [
    { id: 'Unassigned', name: 'Unassigned', resources: [] as ResourceMetric[] },
    ...assignments.map(a => ({ id: a.name, name: a.name, resources: [] as ResourceMetric[] })),
  ];

  // Populate columns with resources
  resources.forEach(r => {
    const assignmentName = r.assignmentName || 'Unassigned';
    const column = columns.find(c => c.name === assignmentName);
    if (column) {
      column.resources.push(r);
    } else {
      // If assignment not found, add to Unassigned
      columns[0].resources.push(r);
    }
  });

  const handleDragEnd = (result: DropResult) => {
    const { source, destination, draggableId } = result;

    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    onMoveResource(draggableId, source.droppableId, destination.droppableId);
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#2563eb] flex items-center justify-center">
            <ArrowLeftRight className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Assign Mode</h2>
            <p className="text-sm text-muted-foreground">
              Drag resources between assignments • {resources.length} resources across {columns.length} assignments
            </p>
          </div>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onClose}
          className="gap-2"
        >
          <X className="h-4 w-4" />
          Exit Assign Mode
        </Button>
      </div>

      {/* Kanban Board */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex-1 overflow-hidden p-4">
          <ScrollArea className="h-full w-full">
            <div className="flex gap-4 h-full pb-4" style={{ minWidth: 'max-content' }}>
              {columns.map((column) => (
                <Droppable key={column.id} droppableId={column.id}>
                  {(provided, snapshot) => (
                    <div
                      className={cn(
                        "flex flex-col w-[280px] shrink-0 bg-card border rounded-xl transition-all",
                        snapshot.isDraggingOver 
                          ? "border-[#2563eb] ring-2 ring-[#2563eb]/20" 
                          : "border-border"
                      )}
                    >
                      {/* Column Header - Sticky */}
                      <div className={cn(
                        "sticky top-0 z-10 flex items-center gap-2 px-3 py-3 border-b rounded-t-xl",
                        snapshot.isDraggingOver 
                          ? "bg-[#2563eb]/5 border-[#2563eb]/20" 
                          : "bg-card border-border"
                      )}>
                        <div className={cn(
                          "w-7 h-7 rounded-md flex items-center justify-center",
                          column.id === 'Unassigned' ? 'bg-muted' : 'bg-[#2563eb]'
                        )}>
                          <Users className={cn(
                            "h-3.5 w-3.5",
                            column.id === 'Unassigned' ? 'text-muted-foreground' : 'text-white'
                          )} />
                        </div>
                        <span className="text-sm font-semibold text-foreground truncate flex-1">
                          {column.name}
                        </span>
                        <span className={cn(
                          "text-xs font-medium px-2 py-0.5 rounded-full",
                          snapshot.isDraggingOver 
                            ? "bg-[#2563eb]/10 text-[#2563eb]" 
                            : "bg-muted text-muted-foreground"
                        )}>
                          {column.resources.length}
                        </span>
                      </div>

                      {/* Column Content - Scrollable */}
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={cn(
                          "flex-1 overflow-y-auto p-2 space-y-2 min-h-[200px] max-h-[calc(100vh-220px)]",
                          snapshot.isDraggingOver && "bg-[#2563eb]/5"
                        )}
                      >
                        {column.resources.map((resource, index) => (
                          <Draggable key={resource.id} draggableId={resource.id} index={index}>
                            {(draggableProvided, draggableSnapshot) => (
                              <div
                                ref={draggableProvided.innerRef}
                                {...draggableProvided.draggableProps}
                                {...draggableProvided.dragHandleProps}
                              >
                                <CompactResourceCard 
                                  resource={resource} 
                                  isDragging={draggableSnapshot.isDragging}
                                />
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}

                        {/* Empty state */}
                        {column.resources.length === 0 && !snapshot.isDraggingOver && (
                          <div className="flex flex-col items-center justify-center py-8 text-center">
                            <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-2">
                              <Users className="h-5 w-5 text-muted-foreground/50" />
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Drop resources here
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </Droppable>
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>
      </DragDropContext>

      {/* Footer with tips */}
      <div className="px-6 py-3 border-t border-border bg-muted/30">
        <div className="flex items-center gap-6 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <GripVertical className="h-3.5 w-3.5" />
            Drag to reassign
          </span>
          <span>•</span>
          <span>Scroll horizontally to see all assignments</span>
          <span>•</span>
          <span>Changes save automatically</span>
        </div>
      </div>
    </div>
  );
}

// Compact card for Kanban view - optimized for density
function CompactResourceCard({ 
  resource, 
  isDragging 
}: { 
  resource: ResourceMetric; 
  isDragging: boolean;
}) {
  const dept = resource.department || 'Unassigned';
  const deptColor = departmentColors[dept] || departmentColors.default;
  const initials = resource.name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'NA';

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div 
            className={cn(
              "flex items-center gap-2.5 px-3 py-2.5 rounded-lg border transition-all cursor-grab active:cursor-grabbing",
              isDragging 
                ? "bg-card border-[#2563eb] shadow-lg ring-2 ring-[#2563eb]/20 rotate-1 scale-105" 
                : "bg-card/50 border-border hover:border-border-strong hover:bg-card"
            )}
          >
            {/* Avatar */}
            <div className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0',
              deptColor.bg, 
              deptColor.text
            )}>
              {initials}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{resource.name}</p>
              <p className="text-[11px] text-muted-foreground truncate">{resource.role || 'Team Member'}</p>
            </div>

            {/* Allocation indicator */}
            <div className={cn(
              "text-xs font-semibold px-1.5 py-0.5 rounded",
              resource.allocation > 100 ? 'text-[#dc2626] bg-[#dc2626]/10' :
              resource.allocation > 80 ? 'text-[#d97706] bg-[#d97706]/10' : 
              'text-[#0d9488] bg-[#0d9488]/10'
            )}>
              {resource.allocation}%
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="right" className="max-w-xs">
          <div className="space-y-1">
            <p className="font-medium">{resource.name}</p>
            <p className="text-xs text-muted-foreground">{resource.role || 'Team Member'}</p>
            <p className="text-xs">Department: {resource.department || 'Unassigned'}</p>
            <p className="text-xs">Allocation: {resource.allocation}%</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
