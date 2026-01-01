import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Users, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar360 } from '@/components/capacity/Avatar360';
import type { ResourceMetric, CapacityProject } from '@/modules/capacity-planner';

// Department colors - Catalyst V5 compliant
const departmentColors: Record<string, { bg: string; text: string; badge: string }> = {
  Product: { bg: 'bg-[#d4b896]', text: 'text-[#4a3f35]', badge: 'bg-[#d4b896]/15 text-[#c69c6d]' },
  Delivery: { bg: 'bg-[#0d9488]', text: 'text-white', badge: 'bg-[#2563eb]/10 text-[#2563eb]' },
  Support: { bg: 'bg-[#4d8b4d]', text: 'text-white', badge: 'bg-[#5c7c5c]/15 text-[#5c7c5c]' },
  default: { bg: 'bg-muted', text: 'text-muted-foreground', badge: 'bg-muted text-muted-foreground' },
};

interface DraggableCardsViewProps {
  groupedByAssignment: Record<string, ResourceMetric[]>;
  onResourceClick: (r: ResourceMetric) => void;
  onEditResource: (id: string) => void;
  onMoveResource: (resourceId: string, fromAssignment: string, toAssignment: string) => void;
}

export function DraggableCardsView({ 
  groupedByAssignment, 
  onResourceClick, 
  onEditResource,
  onMoveResource,
}: DraggableCardsViewProps) {
  const handleDragEnd = (result: DropResult) => {
    const { source, destination, draggableId } = result;

    // Dropped outside a valid droppable
    if (!destination) return;

    // Dropped in the same position
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return;
    }

    // Call the callback to update the assignment
    onMoveResource(draggableId, source.droppableId, destination.droppableId);
  };

  const assignmentEntries = Object.entries(groupedByAssignment);

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="space-y-6">
        {assignmentEntries.map(([assignmentName, assignmentResources]) => (
          <Droppable key={assignmentName} droppableId={assignmentName}>
            {(provided, snapshot) => (
              <div className="space-y-3">
                {/* Group Header */}
                <div 
                  className={cn(
                    "flex items-center gap-3 p-3 bg-card border rounded-lg transition-colors",
                    snapshot.isDraggingOver 
                      ? "border-[#2563eb] bg-[#2563eb]/5" 
                      : "border-border"
                  )}
                >
                  <div className="w-8 h-8 rounded-md bg-[#2563eb] flex items-center justify-center">
                    <Users className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-sm font-semibold text-foreground">{assignmentName}</span>
                  <span className="text-xs text-muted-foreground ml-auto bg-muted px-2.5 py-1 rounded-full">
                    {assignmentResources.length} resources
                  </span>
                </div>

                {/* Cards Grid - Droppable area */}
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={cn(
                    "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 min-h-[80px] p-2 rounded-lg transition-colors",
                    snapshot.isDraggingOver 
                      ? "bg-[#2563eb]/5 border-2 border-dashed border-[#2563eb]/30" 
                      : "border-2 border-transparent"
                  )}
                >
                  {assignmentResources.map((resource, index) => (
                    <Draggable key={resource.id} draggableId={resource.id} index={index}>
                      {(draggableProvided, draggableSnapshot) => (
                        <div
                          ref={draggableProvided.innerRef}
                          {...draggableProvided.draggableProps}
                          className={cn(
                            "transition-shadow",
                            draggableSnapshot.isDragging && "shadow-lg"
                          )}
                        >
                          <DraggableResourceCard
                            resource={resource}
                            on360Click={() => onResourceClick(resource)}
                            onCardClick={() => onEditResource(resource.id)}
                            dragHandleProps={draggableProvided.dragHandleProps}
                            isDragging={draggableSnapshot.isDragging}
                          />
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                  
                  {/* Empty state */}
                  {assignmentResources.length === 0 && !snapshot.isDraggingOver && (
                    <div className="col-span-full flex items-center justify-center py-8 text-muted-foreground text-sm">
                      Drag resources here to assign
                    </div>
                  )}
                </div>
              </div>
            )}
          </Droppable>
        ))}
      </div>
    </DragDropContext>
  );
}

// Draggable Resource Card - V5 Design with Button360 and drag handle
function DraggableResourceCard({ 
  resource, 
  on360Click, 
  onCardClick,
  dragHandleProps,
  isDragging,
}: { 
  resource: ResourceMetric; 
  on360Click: () => void;
  onCardClick: () => void;
  dragHandleProps: any;
  isDragging: boolean;
}) {
  const dept = resource.department || 'Unassigned';
  const deptColor = departmentColors[dept] || departmentColors.default;
  const initials = resource.name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'NA';
  const assignmentName = resource.assignmentName || 'Unassigned';

  return (
    <div 
      className={cn(
        "bg-card border rounded-lg p-4 hover:border-border-strong transition-all cursor-pointer group",
        isDragging 
          ? "border-[#2563eb] shadow-lg rotate-2" 
          : "border-border hover:shadow-sm"
      )}
      onClick={onCardClick}
    >
      <div className="flex items-center gap-3">
        {/* Drag Handle */}
        <div 
          {...dragHandleProps}
          onClick={(e) => e.stopPropagation()}
          className="cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>

        {/* Avatar with 360° hover animation */}
        <Avatar360 
          onClick={on360Click}
          size="md"
        />

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{resource.name}</p>
          <p className="text-xs text-muted-foreground truncate">{resource.role}</p>
          {/* Assignment Tag */}
          <div className="flex gap-1.5 mt-1.5 flex-wrap">
            <span className={cn(
              "text-[10px] font-semibold px-2 py-0.5 rounded uppercase",
              assignmentName === 'Unassigned' 
                ? "bg-muted text-muted-foreground" 
                : "bg-[#4d8b4d] text-white"
            )}>
              {assignmentName}
            </span>
          </div>
        </div>

        {/* Allocation */}
        <div className="text-right">
          <p className={cn(
            'text-lg font-bold',
            resource.allocation > 100 ? 'text-[#dc2626]' :
            resource.allocation > 80 ? 'text-[#b45309]' : 'text-[#0d9488]'
          )}>
            {resource.allocation}%
          </p>
          <p className="text-[10px] text-muted-foreground">Allocated</p>
        </div>
      </div>
    </div>
  );
}
