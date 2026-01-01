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

// Extended resource type for ghost card support
type ExtendedResourceMetric = ResourceMetric & { 
  isGhostCard?: boolean; 
  availableCapacity?: number;
};

interface PendingMove {
  resourceId: string;
  resourceName: string;
  fromAssignment: string;
  toAssignment: string;
  currentAllocation: number;
  isGhostCard?: boolean;
  availableCapacity?: number;
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
    { id: 'Unassigned', name: 'Unassigned', resources: [] as ExtendedResourceMetric[] },
    ...assignments.map(a => ({ id: a.name, name: a.name, resources: [] as ExtendedResourceMetric[] })),
  ];

  // Populate columns with resources
  // Logic:
  // 1. If assignmentName is null → treat as 0% allocation (unassigned)
  // 2. Resources appear in their assigned column (if they have one)
  // 3. Resources with < 100% allocation appear in Unassigned showing available capacity
  // 4. Resources at 100% do NOT appear in Unassigned
  resources.forEach(r => {
    const assignmentName = r.assignmentName || null;
    // If no assignment, allocation is 0% regardless of any data
    const totalAllocation = assignmentName ? (r.allocation || 0) : 0;
    const remainingCapacity = 100 - totalAllocation;
    
    // Add to assigned column if resource has an assignment
    if (assignmentName) {
      const column = columns.find(c => c.name === assignmentName);
      if (column) {
        column.resources.push({
          ...r,
          allocation: totalAllocation, // Use calculated allocation
        });
      }
    }
    
    // Add to Unassigned column ONLY if allocation < 100% (has remaining capacity)
    if (remainingCapacity > 0) {
      columns[0].resources.push({
        ...r,
        isGhostCard: true,
        allocation: totalAllocation, // Use calculated allocation (0 if no assignment)
        availableCapacity: remainingCapacity,
      });
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

    // Check if this is a ghost card (draggableId ends with "-ghost")
    const isGhostCard = draggableId.endsWith('-ghost');
    const actualResourceId = isGhostCard ? draggableId.replace('-ghost', '') : draggableId;
    
    // Find the resource to get its name and current allocation
    const resource = resources.find(r => r.id === actualResourceId);
    if (!resource) return;

    // For ghost cards, calculate available capacity
    const availableCapacity = isGhostCard ? 100 - (resource.allocation || 0) : undefined;

    // Show allocation dialog
    setPendingMove({
      resourceId: actualResourceId,
      resourceName: resource.name,
      fromAssignment: source.droppableId,
      toAssignment: destination.droppableId,
      currentAllocation: resource.allocation,
      isGhostCard,
      availableCapacity,
    });
    
    // For ghost cards, default to the available capacity; otherwise use current allocation
    setAllocationValue(isGhostCard ? (availableCapacity || 100) : (resource.allocation || 100));
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
                        {column.resources.map((resource, index) => {
                          // Use unique key for ghost cards
                          const cardId = resource.isGhostCard ? `${resource.id}-ghost` : resource.id;
                          return (
                            <Draggable key={cardId} draggableId={cardId} index={index}>
                              {(draggableProvided, draggableSnapshot) => (
                                <div
                                  ref={draggableProvided.innerRef}
                                  {...draggableProvided.draggableProps}
                                  {...draggableProvided.dragHandleProps}
                                >
                                  <CompactResourceCard 
                                    resource={resource} 
                                    isDragging={draggableSnapshot.isDragging}
                                    isGhostCard={resource.isGhostCard}
                                    availableCapacity={resource.availableCapacity}
                                  />
                                </div>
                              )}
                            </Draggable>
                          );
                        })}
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
              {pendingMove?.isGhostCard ? 'Assign Available Capacity' : 'Set Allocation'}
            </DialogTitle>
            <DialogDescription>
              {pendingMove?.isGhostCard ? (
                <>
                  Assigning remaining capacity of <span className="font-medium text-foreground">{pendingMove?.resourceName}</span>{' '}
                  (<span className="text-[#2563eb]">{pendingMove?.availableCapacity}% available</span>) to{' '}
                  <span className="font-medium text-[#2563eb]">{pendingMove?.toAssignment}</span>
                </>
              ) : (
                <>
                  Moving <span className="font-medium text-foreground">{pendingMove?.resourceName}</span> to{' '}
                  <span className="font-medium text-[#2563eb]">{pendingMove?.toAssignment}</span>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Ghost card info banner */}
            {pendingMove?.isGhostCard && (
              <div className="bg-[#2563eb]/10 border border-[#2563eb]/20 rounded-lg p-3">
                <p className="text-sm text-[#2563eb]">
                  This resource is currently assigned to <span className="font-medium">{pendingMove.fromAssignment}</span> at {pendingMove.currentAllocation}%.
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Maximum you can assign: {pendingMove.availableCapacity}%
                </p>
              </div>
            )}
            
            {/* Allocation Slider */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Allocation Percentage</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    max={pendingMove?.isGhostCard ? pendingMove.availableCapacity : 100}
                    value={allocationValue}
                    onChange={(e) => {
                      const max = pendingMove?.isGhostCard ? (pendingMove.availableCapacity || 100) : 100;
                      setAllocationValue(Math.min(max, Math.max(0, Number(e.target.value))));
                    }}
                    className="w-20 text-center"
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
              </div>
              
              <Slider
                value={[allocationValue]}
                onValueChange={([value]) => setAllocationValue(value)}
                min={0}
                max={pendingMove?.isGhostCard ? (pendingMove.availableCapacity || 100) : 100}
                step={5}
                className="w-full"
              />
              
              {/* Quick preset buttons - adjusted for ghost cards */}
              <div className="flex gap-2">
                {(pendingMove?.isGhostCard 
                  ? [25, 50, pendingMove.availableCapacity || 100].filter((v, i, arr) => arr.indexOf(v) === i).sort((a, b) => a - b)
                  : [25, 50, 75, 100]
                ).map((preset) => (
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
  isDragging,
  isGhostCard,
  availableCapacity,
}: { 
  resource: ResourceMetric; 
  isDragging: boolean;
  isGhostCard?: boolean;
  availableCapacity?: number;
}) {
  const dept = resource.department || 'Unassigned';
  const deptColor = departmentColors[dept] || departmentColors.default;
  const initials = resource.name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'NA';

  const isTrulyUnassigned = !resource.assignmentName;

  // Display rules:
  // - Unassigned resources: always show Allocation = 0%
  // - Ghost cards for partially allocated resources: show remaining capacity as "Available"
  const displayValue = isGhostCard
    ? (isTrulyUnassigned ? 0 : (availableCapacity || 0))
    : (resource.allocation || 0);

  const displayLabel = isGhostCard
    ? (isTrulyUnassigned ? 'Unassigned' : 'Available')
    : 'Allocated';

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div 
            className={cn(
              "flex items-center gap-2.5 px-3 py-2.5 rounded-lg border transition-all cursor-grab active:cursor-grabbing",
              isDragging 
                ? "bg-card border-[#2563eb] shadow-lg ring-2 ring-[#2563eb]/20 rotate-1 scale-105" 
                : isGhostCard
                  ? "bg-muted/30 border-dashed border-muted-foreground/30 hover:border-[#2563eb]/50 hover:bg-muted/50"
                  : "bg-card/50 border-border hover:border-border-strong hover:bg-card"
            )}
          >
            {/* Avatar - semi-transparent for ghost cards */}
            <div className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0',
              deptColor.bg, 
              deptColor.text,
              isGhostCard && 'opacity-60'
            )}>
              {initials}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className={cn(
                "text-sm font-medium truncate",
                isGhostCard ? "text-muted-foreground" : "text-foreground"
              )}>
                {resource.name}
              </p>
              <p className="text-[11px] text-muted-foreground truncate">
                {isGhostCard
                  ? (isTrulyUnassigned ? 'Not assigned yet' : `Assigned: ${resource.assignmentName}`)
                  : (resource.role || 'Team Member')}
              </p>
            </div>

            {/* Allocation/Availability indicator */}
            <div className="text-right">
              <div className={cn(
                "text-xs font-semibold px-1.5 py-0.5 rounded",
                isGhostCard
                  ? (isTrulyUnassigned ? 'text-muted-foreground bg-muted' : 'text-[#2563eb] bg-[#2563eb]/10')
                  : resource.allocation === 0 
                    ? 'text-muted-foreground bg-muted' // Truly unassigned - neutral
                    : resource.allocation > 100 ? 'text-[#dc2626] bg-[#dc2626]/10' 
                    : resource.allocation > 80 ? 'text-[#d97706] bg-[#d97706]/10' 
                    : 'text-[#0d9488] bg-[#0d9488]/10'
              )}>
                {displayValue}%
              </div>
              {isGhostCard ? (
                <p className="text-[9px] text-muted-foreground mt-0.5">{displayLabel}</p>
              ) : resource.allocation === 0 ? (
                <p className="text-[9px] text-muted-foreground mt-0.5">Unassigned</p>
              ) : null}
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="right" className="max-w-xs">
          <div className="space-y-1">
            <p className="font-medium">{resource.name}</p>
            <p className="text-xs text-muted-foreground">{resource.role || 'Team Member'}</p>
            <p className="text-xs">Department: {resource.department || 'Unassigned'}</p>
            {isGhostCard ? (
              isTrulyUnassigned ? (
                <>
                  <p className="text-xs">Allocation: 0%</p>
                  <p className="text-xs text-[#2563eb]">Available: {availableCapacity}%</p>
                </>
              ) : (
                <>
                  <p className="text-xs text-[#2563eb]">Available: {availableCapacity}%</p>
                  <p className="text-xs text-muted-foreground">Currently at: {resource.assignmentName}</p>
                </>
              )
            ) : (
              <p className="text-xs">Allocation: {resource.allocation}%</p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
