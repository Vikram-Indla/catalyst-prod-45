import { useState, useRef, useEffect, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult, DragUpdate } from '@hello-pangea/dnd';
import { Users, X, GripVertical, ArrowLeftRight, Percent } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
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

interface PendingMove {
  resourceId: string;
  resourceName: string;
  fromAssignment: string;
  toAssignment: string;
  currentAllocation: number;
}

interface KanbanAssignViewProps {
  resources: ResourceMetric[];
  assignments: ResourceAssignment[];
  onMoveResource: (resourceId: string, fromAssignment: string, toAssignment: string, allocation?: number) => void;
  onClose: () => void;
}

export function KanbanAssignView({ 
  resources,
  assignments,
  onMoveResource,
  onClose,
}: KanbanAssignViewProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [pendingMove, setPendingMove] = useState<PendingMove | null>(null);
  const [allocationValue, setAllocationValue] = useState(100);
  const autoScrollRef = useRef<number | null>(null);

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
      columns[0].resources.push(r);
    }
  });

  // Auto-scroll when dragging near edges
  const handleAutoScroll = useCallback((clientX: number) => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const edgeThreshold = 120; // pixels from edge to trigger scroll
    const scrollSpeed = 15;

    // Clear any existing auto-scroll
    if (autoScrollRef.current) {
      cancelAnimationFrame(autoScrollRef.current);
      autoScrollRef.current = null;
    }

    const scrollStep = () => {
      if (!scrollContainerRef.current) return;
      
      const distanceFromLeft = clientX - rect.left;
      const distanceFromRight = rect.right - clientX;

      if (distanceFromLeft < edgeThreshold) {
        // Scroll left
        const intensity = 1 - (distanceFromLeft / edgeThreshold);
        scrollContainerRef.current.scrollLeft -= scrollSpeed * intensity;
        autoScrollRef.current = requestAnimationFrame(scrollStep);
      } else if (distanceFromRight < edgeThreshold) {
        // Scroll right
        const intensity = 1 - (distanceFromRight / edgeThreshold);
        scrollContainerRef.current.scrollLeft += scrollSpeed * intensity;
        autoScrollRef.current = requestAnimationFrame(scrollStep);
      }
    };

    scrollStep();
  }, []);

  // Track mouse position during drag for auto-scroll
  useEffect(() => {
    if (!isDragging) {
      if (autoScrollRef.current) {
        cancelAnimationFrame(autoScrollRef.current);
        autoScrollRef.current = null;
      }
      return;
    }

    const handleMouseMove = (e: MouseEvent) => {
      handleAutoScroll(e.clientX);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (autoScrollRef.current) {
        cancelAnimationFrame(autoScrollRef.current);
      }
    };
  }, [isDragging, handleAutoScroll]);

  const handleDragStart = () => {
    setIsDragging(true);
  };

  const handleDragEnd = (result: DropResult) => {
    setIsDragging(false);
    
    if (autoScrollRef.current) {
      cancelAnimationFrame(autoScrollRef.current);
      autoScrollRef.current = null;
    }

    const { source, destination, draggableId } = result;

    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    // Find the resource to get its name and current allocation
    const resource = resources.find(r => r.id === draggableId);
    if (!resource) return;

    // Show allocation dialog
    setPendingMove({
      resourceId: draggableId,
      resourceName: resource.name,
      fromAssignment: source.droppableId,
      toAssignment: destination.droppableId,
      currentAllocation: resource.allocation,
    });
    setAllocationValue(resource.allocation || 100);
  };

  const confirmMove = () => {
    if (!pendingMove) return;
    onMoveResource(pendingMove.resourceId, pendingMove.fromAssignment, pendingMove.toAssignment, allocationValue);
    setPendingMove(null);
  };

  const cancelMove = () => {
    setPendingMove(null);
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

      {/* Kanban Board with native scroll for auto-scroll support */}
      <DragDropContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex-1 overflow-hidden p-4">
          <div 
            ref={scrollContainerRef}
            className="h-full overflow-x-auto overflow-y-hidden scroll-smooth"
            style={{ scrollBehavior: isDragging ? 'auto' : 'smooth' }}
          >
            <div className="flex gap-4 h-full pb-4 pr-4" style={{ minWidth: 'max-content' }}>
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
          </div>
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
          <span>Drag to edges to scroll horizontally</span>
          <span>•</span>
          <span>Set allocation % on drop</span>
        </div>
      </div>

      {/* Allocation Dialog */}
      <Dialog open={pendingMove !== null} onOpenChange={(open) => !open && cancelMove()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Percent className="h-5 w-5 text-[#2563eb]" />
              Set Allocation
            </DialogTitle>
            <DialogDescription>
              Moving <span className="font-medium text-foreground">{pendingMove?.resourceName}</span> to{' '}
              <span className="font-medium text-[#2563eb]">{pendingMove?.toAssignment}</span>
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Allocation Slider */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Allocation Percentage</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={allocationValue}
                    onChange={(e) => setAllocationValue(Math.min(100, Math.max(0, Number(e.target.value))))}
                    className="w-20 text-center"
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
              </div>
              
              <Slider
                value={[allocationValue]}
                onValueChange={([value]) => setAllocationValue(value)}
                min={0}
                max={100}
                step={5}
                className="w-full"
              />
              
              {/* Quick preset buttons */}
              <div className="flex gap-2">
                {[25, 50, 75, 100].map((preset) => (
                  <Button
                    key={preset}
                    type="button"
                    variant={allocationValue === preset ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setAllocationValue(preset)}
                    className={cn(
                      "flex-1",
                      allocationValue === preset && "bg-[#2563eb] hover:bg-[#1d4ed8]"
                    )}
                  >
                    {preset}%
                  </Button>
                ))}
              </div>
            </div>

            {/* Visual indicator */}
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-muted-foreground">Allocation</span>
                <span className={cn(
                  "font-semibold",
                  allocationValue > 100 ? 'text-[#dc2626]' :
                  allocationValue > 80 ? 'text-[#d97706]' : 'text-[#0d9488]'
                )}>
                  {allocationValue}%
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className={cn(
                    "h-full rounded-full transition-all",
                    allocationValue > 100 ? 'bg-[#dc2626]' :
                    allocationValue > 80 ? 'bg-[#d97706]' : 'bg-[#0d9488]'
                  )}
                  style={{ width: `${Math.min(allocationValue, 100)}%` }}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={cancelMove}>
              Cancel
            </Button>
            <Button 
              onClick={confirmMove}
              className="bg-[#2563eb] hover:bg-[#1d4ed8]"
            >
              Confirm Assignment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
