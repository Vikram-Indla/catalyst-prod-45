import { useState } from 'react';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import { BacklogPISection, BacklogItem } from '../types';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, GripVertical } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { QuickAddRow } from './QuickAddRow';
import { BacklogContextMenu } from './BacklogContextMenu';
import { useBacklogActions } from '../hooks/useBacklogActions';
import { useBacklogState } from '../hooks/useBacklogState';
import { Badge } from '@/components/ui/badge';

interface BacklogSectionProps {
  section: BacklogPISection;
  selectedItems: string[];
  onItemClick: (itemId: string) => void;
  onItemSelect: (itemId: string, selected: boolean) => void;
}

// New column configuration matching exact requirements
const TABLE_COLUMNS = [
  { id: 'epicNumber', label: 'Epic Number', width: 'min-w-[100px]' },
  { id: 'drag', label: '', width: 'w-8' },
  { id: 'summary', label: 'Summary', width: 'flex-1 min-w-[250px]' },
  { id: 'quarters', label: 'Quarters', width: 'min-w-[120px]' },
  { id: 'mvp', label: 'MVP', width: 'min-w-[60px] text-center' },
  { id: 'status', label: 'Status', width: 'min-w-[120px]' },
  { id: 'technicalScore', label: 'Technical Score', width: 'min-w-[100px] text-right' },
];

export function BacklogSection({
  section,
  selectedItems,
  onItemClick,
  onItemSelect,
}: BacklogSectionProps) {
  const [isExpanded, setIsExpanded] = useState(section.isExpanded);
  const { columnsShown, isEpicBacklog } = useBacklogState();

  // Check if any items exist
  const hasItems = section.items.length > 0;

  return (
    <div className="border rounded-lg bg-card overflow-hidden">
      {/* Section Content - No header row with "All Items" */}
      <div>
        {/* Column Headers - starts immediately */}
        <div className="flex items-center gap-3 px-4 py-2 bg-muted/20 border-b text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {/* Expand chevron column */}
          <div className="w-6" />
          
          {/* Epic Number */}
          <div className="min-w-[100px]">Epic Number</div>
          
          {/* Drag handle column */}
          <div className="w-8">Drag</div>
          
          {/* Health dot space */}
          <div className="w-3" />
          
          {/* Checkbox space */}
          <div className="w-5" />
          
          {/* Summary */}
          <div className="flex-1 min-w-[250px]">Summary</div>
          
          {/* Quarters */}
          <div className="min-w-[120px]">Quarters</div>
          
          {/* MVP */}
          <div className="min-w-[60px] text-center">MVP</div>
          
          {/* Status (renamed from Process Step) */}
          <div className="min-w-[120px]">Status</div>
          
          {/* Technical Score (renamed from Strategic Value Score) */}
          <div className="min-w-[100px] text-right">Technical Score</div>
        </div>
        
        <Droppable droppableId={section.id}>
          {(provided) => (
            <div 
              ref={provided.innerRef}
              {...provided.droppableProps}
              className="divide-y"
            >
              {section.items.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground border-2 border-dashed border-muted mx-4 my-4 rounded">
                  Drag & Drop Items Here
                </div>
              ) : (
                section.items.map((item, index) => (
                  <Draggable key={item.id} draggableId={item.id} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                      >
                        <BacklogItemRow
                          item={item}
                          rank={index + 1}
                          isSelected={selectedItems.includes(item.id)}
                          onItemClick={onItemClick}
                          onItemSelect={onItemSelect}
                          dragHandleProps={provided.dragHandleProps}
                          isDragging={snapshot.isDragging}
                          columnsShown={columnsShown}
                        />
                      </div>
                    )}
                  </Draggable>
                ))
              )}
              {provided.placeholder}
            </div>
          )}
        </Droppable>

        {/* Quick Add Row - Always at the bottom */}
        <QuickAddRow itemType={isEpicBacklog ? 'epic' : 'epic'} />
      </div>
    </div>
  );
}

interface BacklogItemRowProps {
  item: BacklogItem;
  rank: number;
  isSelected: boolean;
  onItemClick: (itemId: string) => void;
  onItemSelect: (itemId: string, selected: boolean) => void;
  dragHandleProps?: any;
  isDragging?: boolean;
  columnsShown: string[];
}

function BacklogItemRow({
  item,
  rank,
  isSelected,
  onItemClick,
  onItemSelect,
  dragHandleProps,
  isDragging,
  columnsShown,
}: BacklogItemRowProps) {
  const { type, isEpicBacklog } = useBacklogState();
  const actions = useBacklogActions(type);

  const healthColor = {
    green: 'bg-success',
    yellow: 'bg-warning',
    red: 'bg-destructive',
    gray: 'bg-muted-foreground',
  }[item.health || 'gray'];

  // Format quarters for display
  const formatQuarters = (quarters?: string[]) => {
    if (!quarters || quarters.length === 0) return '—';
    return quarters.slice(0, 3).map((q, i) => (
      <Badge 
        key={i} 
        variant="outline" 
        className="text-[10px] px-1.5 py-0 h-5 border-brand-gold/50 text-brand-gold"
      >
        {q}
      </Badge>
    ));
  };

  // Format status for human-readable display
  const formatStatus = (status?: string) => {
    if (!status) return '—';
    return status.replace(/_/g, ' ').toLowerCase();
  };

  return (
    <BacklogContextMenu
      itemId={item.id}
      onOpen={() => onItemClick(item.id)}
      onDuplicate={() => actions.duplicate(item.id)}
      onMoveToTop={() => actions.moveToTop(item.id)}
      onMoveToBottom={() => actions.moveToBottom(item.id)}
      onMoveToPI={(piId) => actions.moveToPI(item.id, piId)}
      onDelete={() => actions.deleteItem(item.id)}
      onPark={() => actions.park(item.id)}
      availablePIs={isEpicBacklog ? [] : actions.availablePIs}
    >
      <div
        className={cn(
          'flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 cursor-pointer transition-colors',
          isSelected && 'bg-muted',
          isDragging && 'opacity-50 bg-muted'
        )}
        onClick={() => onItemClick(item.id)}
      >
        {/* Expand chevron */}
        <ChevronRight className="h-4 w-4 text-muted-foreground" />

        {/* Epic Number (epic_key or displayId, NOT row index) */}
        <div className="font-mono text-xs text-muted-foreground min-w-[100px]">
          {item.epicKey || item.displayId || '—'}
        </div>

        {/* Drag handle */}
        <div {...dragHandleProps} className="cursor-grab active:cursor-grabbing w-8">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>

        {/* Health status dot */}
        <div className={cn('h-3 w-3 rounded-full flex-shrink-0', healthColor)} />

        {/* Checkbox */}
        <Checkbox
          checked={isSelected}
          onCheckedChange={(checked) => onItemSelect(item.id, checked as boolean)}
          onClick={(e) => e.stopPropagation()}
          className="h-4 w-4"
        />

        {/* Summary (Epic Name) */}
        <div className="flex-1 min-w-[250px]">
          <span className="text-sm font-medium truncate">{item.name}</span>
        </div>

        {/* Quarters */}
        <div className="flex items-center gap-1 min-w-[120px]">
          {formatQuarters(item.quarters)}
        </div>

        {/* MVP */}
        <div className="text-sm text-center min-w-[60px]">
          {item.mvp ? 'Yes' : 'No'}
        </div>

        {/* Status (renamed from Process Step) */}
        <div className="text-sm min-w-[120px] truncate">
          {formatStatus(item.processStep || item.state)}
        </div>

        {/* Technical Score (renamed from Strategic Value Score) */}
        <div className="text-sm text-right min-w-[100px] font-medium">
          {item.technicalScore ?? item.businessScore ?? '—'}
        </div>
      </div>
    </BacklogContextMenu>
  );
}