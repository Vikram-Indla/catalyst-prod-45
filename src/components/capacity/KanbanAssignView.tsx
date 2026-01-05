import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Users, X, GripVertical, ArrowLeftRight, Percent, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { ResourceMetric } from '@/modules/capacity-planner';
import type { ResourceAssignment } from '@/modules/capacity-planner/hooks/useResourceAssignments';
import { useResourceAllocations, type ResourceAllocation } from '@/modules/capacity-planner/hooks/useResourceAllocations';

// Assignment Avatar Colors - Catalyst V5 compliant
const assignmentColors: Record<string, { bg: string; text: string }> = {
  'Senaei BAU': { bg: 'bg-[#2563eb]', text: 'text-white' },
  'Innovation Platform': { bg: 'bg-[#1d4ed8]', text: 'text-white' },
  'Inspection Program': { bg: 'bg-[#0d9488]', text: 'text-white' },
  'International Operations': { bg: 'bg-[#0f766e]', text: 'text-white' },
  'MIM Website': { bg: 'bg-[#4f8a4f]', text: 'text-white' },
  'Senaei OPS': { bg: 'bg-[#3d6b3d]', text: 'text-white' },
  'Sectorial Services': { bg: 'bg-[#8b7355]', text: 'text-white' },
  'Tahommena': { bg: 'bg-[#6b5842]', text: 'text-white' },
  'Data Platform': { bg: 'bg-[#3b82f6]', text: 'text-white' },
  'Unassigned': { bg: 'bg-[#9ca3af]', text: 'text-white' },
};

// Color palette for dynamic assignment matching
const colorPalette = [
  { bg: '#2563eb', text: 'white', name: 'Blue' },
  { bg: '#1d4ed8', text: 'white', name: 'Blue Dark' },
  { bg: '#3b82f6', text: 'white', name: 'Blue Light' },
  { bg: '#0d9488', text: 'white', name: 'Teal' },
  { bg: '#0f766e', text: 'white', name: 'Teal Dark' },
  { bg: '#4f8a4f', text: 'white', name: 'Olive' },
  { bg: '#3d6b3d', text: 'white', name: 'Olive Dark' },
  { bg: '#8b7355', text: 'white', name: 'Bronze' },
  { bg: '#6b5842', text: 'white', name: 'Bronze Dark' },
];

// Get color for an assignment - uses hash for consistent color assignment
const getAssignmentColor = (name: string): { bg: string; text: string } => {
  if (name === 'Unassigned') {
    return { bg: 'bg-[#9ca3af]', text: 'text-white' };
  }
  
  // Check if we have a predefined color
  if (assignmentColors[name]) {
    return assignmentColors[name];
  }
  
  // Generate consistent color based on name hash
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colorPalette.length;
  const color = colorPalette[index];
  
  return { bg: `bg-[${color.bg}]`, text: 'text-white' };
};

// Department colors - Catalyst V5 compliant
const departmentColors: Record<string, { bg: string; text: string }> = {
  Product: { bg: 'bg-[#d4b896]', text: 'text-[#4a3f35]' },
  Delivery: { bg: 'bg-[#0d9488]', text: 'text-white' },
  Support: { bg: 'bg-[#4d8b4d]', text: 'text-white' },
  default: { bg: 'bg-muted', text: 'text-muted-foreground' },
};

// Extended resource type for card display in columns
type ColumnResource = ResourceMetric & { 
  isGhostCard?: boolean; 
  availableCapacity?: number;
  allocationInColumn?: number; // The allocation % for THIS column specifically
  allocationId?: string; // ID of the resource_allocations row if exists
};

interface PendingMove {
  resourceId: string;
  resourceName: string;
  fromAssignment: string;
  toAssignment: string;
  currentAllocation: number;
  isGhostCard?: boolean;
  availableCapacity?: number;
  isTransfer?: boolean; // true if moving between columns (not from Unassigned)
}

interface KanbanAssignViewProps {
  resources: ResourceMetric[];
  assignments: ResourceAssignment[];
  onMoveResource: (resourceId: string, fromAssignment: string, toAssignment: string, allocation?: number) => void;
  onClose: () => void;
  departmentFilter: string;
  onDepartmentFilterChange: (value: string) => void;
  uniqueDepartments: string[];
}

export function KanbanAssignView({ 
  resources,
  assignments,
  onMoveResource,
  onClose,
  departmentFilter,
  onDepartmentFilterChange,
  uniqueDepartments,
}: KanbanAssignViewProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [pendingMove, setPendingMove] = useState<PendingMove | null>(null);
  const [allocationValue, setAllocationValue] = useState(100);
  const autoScrollRef = useRef<number | null>(null);

  // Use the new allocations hook
  const { 
    allocations, 
    addAllocation, 
    transferAllocation,
    getTotalAllocation,
    getAllocationsForResource,
  } = useResourceAllocations();

  // Build columns with multi-allocation support
  const columns = useMemo(() => {
    const cols: { id: string; name: string; assignmentId?: string; resources: ColumnResource[] }[] = [
      { id: 'Unassigned', name: 'Unassigned', resources: [] },
      ...assignments.map(a => ({ id: a.name, name: a.name, assignmentId: a.id, resources: [] as ColumnResource[] })),
    ];

    // For each resource, determine where they should appear
    resources.forEach(r => {
      // Get all allocations for this resource from the new table
      const resourceAllocations = getAllocationsForResource(r.id);
      const totalFromAllocationsTable = resourceAllocations.reduce((sum, a) => sum + a.allocation_percent, 0);
      
      // Use legacy single assignment if no entries in allocations table
      const useLegacy = resourceAllocations.length === 0 && r.assignmentName;
      // Use allocation from resource if no allocations table entries (fallback to r.allocation)
      const totalAllocation = resourceAllocations.length > 0 
        ? totalFromAllocationsTable 
        : (r.allocation || 0);
      const remainingCapacity = 100 - totalAllocation;

      // Add to each column where they have an allocation
      if (useLegacy && r.assignmentName) {
        // Legacy: single assignment from resource_inventory
        const column = cols.find(c => c.name === r.assignmentName);
        if (column) {
          column.resources.push({
            ...r,
            allocation: r.allocation || 0,
            allocationInColumn: r.allocation || 0,
          });
        }
      } else {
        // New: multiple allocations from resource_allocations table
        resourceAllocations.forEach(alloc => {
          const column = cols.find(c => c.name === alloc.assignment_name);
          if (column) {
            column.resources.push({
              ...r,
              allocation: totalAllocation,
              allocationInColumn: alloc.allocation_percent,
              allocationId: alloc.id,
            });
          }
        });
      }
      
      // Add to Unassigned column if allocation < 100% (has remaining capacity)
      if (remainingCapacity > 0) {
        cols[0].resources.push({
          ...r,
          isGhostCard: true,
          allocation: totalAllocation,
          availableCapacity: remainingCapacity,
        });
      }
    });

    return cols;
  }, [resources, assignments, allocations, getAllocationsForResource]);

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

  // Track pointer position during drag for auto-scroll (mouse + touch)
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

    const handleTouchMove = (e: TouchEvent) => {
      const touch = e.touches?.[0];
      if (!touch) return;
      handleAutoScroll(touch.clientX);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchmove', handleTouchMove, { passive: true });

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
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
    
    console.log('[DnD] handleDragEnd:', { source, destination, draggableId });

    if (!destination) {
      console.log('[DnD] No destination - drop cancelled');
      return;
    }
    
    // Allow drops to same column (different index) or different column
    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      console.log('[DnD] Same position - no change');
      return;
    }
    
    // Don't allow dropping into Unassigned (that doesn't make sense)
    if (destination.droppableId === 'Unassigned') {
      console.log('[DnD] Cannot drop into Unassigned');
      return;
    }

    // Check if this is a ghost card (draggableId ends with "-ghost")
    const isGhostCard = draggableId.endsWith('-ghost');
    const actualResourceId = isGhostCard ? draggableId.replace('-ghost', '') : draggableId;
    
    // Find the resource to get its name and current allocation
    const resource = resources.find(r => r.id === actualResourceId);
    if (!resource) {
      console.log('[DnD] Resource not found:', actualResourceId);
      return;
    }

    console.log('[DnD] Moving resource:', resource.name, 'from:', source.droppableId, 'to:', destination.droppableId);

    // Calculate available capacity
    const totalAllocation = getTotalAllocation(actualResourceId);
    const availableCapacity = 100 - totalAllocation;
    
    // Determine if this is a transfer (from another assignment column) or adding from Unassigned
    const isTransfer = source.droppableId !== 'Unassigned';

    // Show allocation dialog
    setPendingMove({
      resourceId: actualResourceId,
      resourceName: resource.name,
      fromAssignment: source.droppableId,
      toAssignment: destination.droppableId,
      currentAllocation: totalAllocation,
      isGhostCard,
      availableCapacity: isGhostCard ? availableCapacity : undefined,
      isTransfer,
    });
    
    // Default allocation: for ghost cards use available capacity, for transfers use reasonable default
    if (isGhostCard) {
      setAllocationValue(Math.min(availableCapacity, 50));
    } else if (isTransfer) {
      // Find allocation in source column
      const sourceColumn = columns.find(c => c.id === source.droppableId);
      const cardInSource = sourceColumn?.resources.find(r => r.id === actualResourceId && !r.isGhostCard);
      setAllocationValue(cardInSource?.allocationInColumn || 50);
    } else {
      setAllocationValue(50);
    }
  };

  const confirmMove = () => {
    if (!pendingMove) return;
    
    const targetColumn = columns.find(c => c.id === pendingMove.toAssignment);
    const targetAssignmentId = targetColumn?.assignmentId;
    
    if (!targetAssignmentId) {
      console.error('[DnD] Target assignment ID not found');
      return;
    }

    if (pendingMove.isTransfer && pendingMove.fromAssignment !== 'Unassigned') {
      // Transfer allocation between columns
      const sourceColumn = columns.find(c => c.id === pendingMove.fromAssignment);
      const sourceAssignmentId = sourceColumn?.assignmentId;
      
      if (sourceAssignmentId) {
        transferAllocation.mutate({
          resourceId: pendingMove.resourceId,
          fromAssignmentId: sourceAssignmentId,
          toAssignmentId: targetAssignmentId,
          transferPercent: allocationValue,
        });
      }
    } else {
      // Add new allocation (from Unassigned)
      addAllocation.mutate({
        resourceId: pendingMove.resourceId,
        assignmentId: targetAssignmentId,
        allocationPercent: allocationValue,
      });
    }
    
    setPendingMove(null);
  };

  const cancelMove = () => {
    setPendingMove(null);
  };

  return (
    <div className="absolute inset-0 z-40 bg-background flex flex-col">
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
        <div className="flex items-center gap-3">
          {/* Department Filter */}
          <Select value={departmentFilter} onValueChange={onDepartmentFilterChange}>
            <SelectTrigger className="w-40 h-9 text-sm">
              <SelectValue placeholder="Department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              <SelectItem value="delivery">Delivery</SelectItem>
              <SelectItem value="product">Product</SelectItem>
              <SelectItem value="support">Support</SelectItem>
            </SelectContent>
          </Select>
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
      </div>

      {/* Kanban Board - single scroll container to avoid nested scroll issues */}
      <DragDropContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div 
          ref={scrollContainerRef}
          className="flex-1 overflow-auto p-4"
          style={{ scrollBehavior: isDragging ? 'auto' : 'smooth' }}
        >
          <div className="flex gap-4 pb-4 pr-4" style={{ minWidth: 'max-content', minHeight: 'calc(100vh - 180px)' }}>
            {columns.map((column) => {
              const columnColor = getAssignmentColor(column.name);
              return (
              <Droppable key={column.id} droppableId={column.id}>
                {(provided, snapshot) => (
                  <div
                    className={cn(
                      "flex flex-col w-[280px] shrink-0 bg-card border rounded-xl transition-all h-fit",
                      snapshot.isDraggingOver 
                        ? "border-[#2563eb] ring-2 ring-[#2563eb]/20" 
                        : "border-border"
                    )}
                  >
                    {/* Column Header */}
                    <div className={cn(
                      "flex items-center gap-2 px-3 py-3 border-b rounded-t-xl",
                      snapshot.isDraggingOver 
                        ? "bg-[#2563eb]/5 border-[#2563eb]/20" 
                        : "bg-card border-border"
                    )}>
                      <div className={cn(
                        "w-7 h-7 rounded-full flex items-center justify-center",
                        columnColor.bg
                      )}>
                        <Users className={cn(
                          "h-3.5 w-3.5",
                          columnColor.text
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

                    {/* Column Content - NO internal scroll, grows with content */}
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={cn(
                        "p-2 space-y-2 min-h-[200px]",
                        snapshot.isDraggingOver && "bg-[#2563eb]/10"
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
                                style={draggableProvided.draggableProps.style}
                              >
                                <CompactResourceCard 
                                  resource={resource} 
                                  isDragging={draggableSnapshot.isDragging}
                                  isGhostCard={resource.isGhostCard}
                                  availableCapacity={resource.availableCapacity}
                                  allocationInColumn={resource.allocationInColumn}
                                />
                              </div>
                            )}
                          </Draggable>
                        );
                      })}
                      {provided.placeholder}

                      {/* Empty state - show when no resources and not dragging over */}
                      {column.resources.length === 0 && (
                        <div 
                          className={cn(
                            "flex flex-col items-center justify-center py-12 text-center pointer-events-none",
                            snapshot.isDraggingOver && "opacity-0"
                          )}
                        >
                          <div className="w-12 h-12 rounded-full bg-muted/50 dark:bg-[var(--surface-3)] flex items-center justify-center mb-2">
                            <Users className="h-5 w-5 text-muted-foreground dark:text-[var(--text-secondary)]" />
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
            );
            })}
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
  allocationInColumn,
}: { 
  resource: ResourceMetric & { allocationInColumn?: number }; 
  isDragging: boolean;
  isGhostCard?: boolean;
  availableCapacity?: number;
  allocationInColumn?: number;
}) {
  const dept = resource.department || 'Unassigned';
  const deptColor = departmentColors[dept] || departmentColors.default;
  const initials = resource.name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'NA';

  // For ghost cards show available capacity, for regular cards show column-specific allocation
  const displayValue = isGhostCard ? (availableCapacity || 0) : (allocationInColumn || resource.allocation || 0);
  const displayLabel = isGhostCard ? 'Available' : 'Allocated';

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
                {resource.role || 'Team Member'}
              </p>
            </div>

            {/* Allocation/Availability indicator */}
            <div className="text-right">
              <div className={cn(
                "text-xs font-semibold px-1.5 py-0.5 rounded",
                isGhostCard 
                  ? 'text-[#2563eb] bg-[#2563eb]/10'
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
              <>
                <p className="text-xs text-[#2563eb]">Available: {availableCapacity}%</p>
                <p className="text-xs text-muted-foreground">Currently at: {resource.assignmentName}</p>
              </>
            ) : (
              <p className="text-xs">Allocation: {resource.allocation}%</p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
