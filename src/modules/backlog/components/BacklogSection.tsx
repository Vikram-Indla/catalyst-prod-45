import { useState } from 'react';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import { BacklogPISection, BacklogItem } from '../types';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, GripVertical, Download, TrendingUp } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { QuickAddRow } from './QuickAddRow';
import { BacklogContextMenu } from './BacklogContextMenu';
import { useBacklogActions } from '../hooks/useBacklogActions';
import { useBacklogState } from '../hooks/useBacklogState';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

interface BacklogSectionProps {
  section: BacklogPISection;
  selectedItems: string[];
  onItemClick: (itemId: string) => void;
  onItemSelect: (itemId: string, selected: boolean) => void;
}

export function BacklogSection({
  section,
  selectedItems,
  onItemClick,
  onItemSelect,
}: BacklogSectionProps) {
  const [isExpanded, setIsExpanded] = useState(section.isExpanded);
  const { columnsShown, isEpicBacklog } = useBacklogState();

  return (
    <div className="border rounded-lg bg-card overflow-hidden">
      {/* Section Header - Jira Align style */}
      <div className="flex items-center gap-3 border-b bg-muted/30 px-4 py-2.5">
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 hover:bg-muted"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </Button>
        
        <span className="font-medium text-sm">{section.title}</span>
        <span className="text-sm text-brand-gold font-medium">
          Total Items: {section.itemCount}
        </span>

        <div className="flex-1" />

        {/* Section Actions */}
        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5">
          <TrendingUp className="h-3.5 w-3.5" />
          Prioritize
        </Button>
        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5">
          <Download className="h-3.5 w-3.5" />
          Export
        </Button>

        {section.progress !== undefined && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">PI Progress:</span>
            <div className="h-2 w-24 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-success"
                style={{ width: `${section.progress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Section Content */}
      {isExpanded && (
        <div>
          {/* Column Headers */}
          <div className="flex items-center gap-3 px-4 py-2 bg-muted/20 border-b text-xs font-medium text-muted-foreground">
            <div className="w-6" /> {/* Drag handle space */}
            <div className="w-5" /> {/* Checkbox space */}
            <div className="w-2" /> {/* Health dot space */}
            
            {/* Epic column - always shown */}
            {(columnsShown.includes('epic') || columnsShown.includes('name')) && (
              <div className="flex-1 min-w-[200px]">Epic</div>
            )}
            
            {/* Labels column */}
            {columnsShown.includes('labels') && (
              <div className="min-w-[120px]" />
            )}
            
            {/* Points column */}
            {columnsShown.includes('points') && (
              <div className="min-w-[60px] text-right">Points</div>
            )}
            
            {/* MVP column */}
            {columnsShown.includes('mvp') && (
              <div className="min-w-[50px] text-center">MVP</div>
            )}
            
            {/* Process Step column */}
            {columnsShown.includes('processStep') && (
              <div className="min-w-[100px]">Process Step</div>
            )}
            
            {/* Strategic Value Score column */}
            {columnsShown.includes('strategicValueScore') && (
              <div className="min-w-[80px] text-right">Strategic Value Score</div>
            )}
          </div>

          <QuickAddRow itemType={isEpicBacklog ? 'epic' : 'epic'} />
          
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
        </div>
      )}
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

  // Check if column should be shown
  const showColumn = (columnKey: string) => columnsShown.includes(columnKey);

  // Generate mock labels for PI tags (in real implementation, this would come from item.labels)
  const mockLabels = item.labels || [
    { id: '1', name: 'PI-5', color: '#8B5CF6' },
    { id: '2', name: 'PI-6', color: '#8B5CF6' },
  ];

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

        {/* Rank number */}
        <div className="text-xs text-muted-foreground min-w-[20px]">
          {rank}
        </div>

        {/* Drag handle */}
        <div {...dragHandleProps} className="cursor-grab active:cursor-grabbing">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>

        {/* Health status dot */}
        <div className={cn('h-3 w-3 rounded-full flex-shrink-0', healthColor)} />

        {/* Epic ID */}
        <div className="font-mono text-xs text-muted-foreground min-w-[45px]">
          {item.displayId}
        </div>

        {/* Checkbox icon (mock - representing epic type) */}
        <Checkbox
          checked={isSelected}
          onCheckedChange={(checked) => onItemSelect(item.id, checked as boolean)}
          onClick={(e) => e.stopPropagation()}
          className="h-4 w-4"
        />

        {/* Epic Name */}
        {(showColumn('epic') || showColumn('name')) && (
          <div className="flex-1 min-w-[200px]">
            <span className="text-sm font-medium truncate">{item.name}</span>
          </div>
        )}

        {/* Labels (PI tags) */}
        {showColumn('labels') && (
          <div className="flex items-center gap-1 min-w-[120px]">
            {mockLabels.slice(0, 3).map((label) => (
              <Badge 
                key={label.id} 
                variant="outline" 
                className="text-[10px] px-1.5 py-0 h-5"
                style={{ borderColor: label.color, color: label.color }}
              >
                {label.name}
              </Badge>
            ))}
            {mockLabels.length > 3 && (
              <span className="text-[10px] text-muted-foreground">+{mockLabels.length - 3}</span>
            )}
          </div>
        )}

        {/* Points */}
        {showColumn('points') && (
          <div className="text-sm text-right min-w-[60px]">
            {item.points ?? item.totalEstimate ?? 0}
          </div>
        )}

        {/* MVP */}
        {showColumn('mvp') && (
          <div className="text-sm text-center min-w-[50px]">
            {item.mvp ? 'Yes' : 'No'}
          </div>
        )}

        {/* Process Step */}
        {showColumn('processStep') && (
          <div className="text-sm min-w-[100px] truncate">
            {item.processStep || item.state || '—'}
          </div>
        )}

        {/* Strategic Value Score */}
        {showColumn('strategicValueScore') && (
          <div className="text-sm text-right min-w-[80px] font-medium">
            {item.technicalScore ?? item.businessScore ?? '—'}
          </div>
        )}
      </div>
    </BacklogContextMenu>
  );
}