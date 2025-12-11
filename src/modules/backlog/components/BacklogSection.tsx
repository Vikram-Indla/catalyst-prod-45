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
import { Progress } from '@/components/ui/progress';
import { EpicTimeBadges } from '@/components/items/epics/EpicTimeBadges';

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
    <div className="border rounded-lg bg-card">
      {/* Section Header */}
      <div className="flex items-center gap-2 border-b bg-muted/50 px-4 py-2">
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </Button>
        
        <span className="font-medium text-sm">{section.title}</span>
        <span className="text-xs text-muted-foreground">({section.itemCount})</span>

        {section.progress !== undefined && (
          <div className="ml-auto flex items-center gap-2">
            <div className="h-2 w-32 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary"
                style={{ width: `${section.progress}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground">{section.progress}%</span>
          </div>
        )}
      </div>

      {/* Section Content */}
      {isExpanded && (
        <div>
          <QuickAddRow itemType={isEpicBacklog ? 'epic' : 'epic'} />
          <Droppable droppableId={section.id}>
            {(provided) => (
              <div 
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="divide-y"
              >
                {section.items.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                    No items in this section
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
  isSelected: boolean;
  onItemClick: (itemId: string) => void;
  onItemSelect: (itemId: string, selected: boolean) => void;
  dragHandleProps?: any;
  isDragging?: boolean;
  columnsShown: string[];
}

function BacklogItemRow({
  item,
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
          'flex items-center gap-3 px-4 py-3 hover:bg-muted/50 cursor-pointer transition-colors',
          isSelected && 'bg-muted',
          isDragging && 'opacity-50'
        )}
        onClick={() => onItemClick(item.id)}
      >
        <div {...dragHandleProps} className="cursor-grab active:cursor-grabbing">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>

        <Checkbox
          checked={isSelected}
          onCheckedChange={(checked) => onItemSelect(item.id, checked as boolean)}
          onClick={(e) => e.stopPropagation()}
        />

        <div className={cn('h-2 w-2 rounded-full', healthColor)} />

        {/* ID Column */}
        {showColumn('id') && (
          <div className="font-mono text-xs text-muted-foreground min-w-[60px]">
            {item.displayId}
          </div>
        )}

        {/* Name Column (always shown) */}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate">{item.name}</div>
          {/* Time badges for Epics */}
          {isEpicBacklog && item.targetDate && (
            <EpicTimeBadges
              targetCompletionDate={item.targetDate}
              status={item.state}
              className="mt-0.5"
            />
          )}
        </div>

        {/* State Column */}
        {showColumn('state') && item.state && (
          <div className="px-2 py-1 text-xs bg-muted rounded">
            {item.state}
          </div>
        )}

        {/* Owner Column */}
        {showColumn('owner') && item.owner && (
          <div className="text-xs text-muted-foreground min-w-[80px]">
            {item.owner}
          </div>
        )}

        {/* Progress Column */}
        {showColumn('progress') && (
          <div className="flex items-center gap-2 min-w-[100px]">
            <Progress value={item.progress || 0} className="h-2 w-16" />
            <span className="text-xs text-muted-foreground">{item.progress || 0}%</span>
          </div>
        )}

        {/* Feature Counts Column (Epic Backlog specific) */}
        {showColumn('featureCounts') && (
          <div className="text-xs text-muted-foreground min-w-[60px] text-center">
            {item.featureCount !== undefined ? `${item.completedFeatures || 0}/${item.featureCount}` : '—'}
          </div>
        )}

        {/* Total Estimate Column (Epic Backlog specific) */}
        {showColumn('totalEstimate') && (
          <div className="text-xs text-muted-foreground min-w-[60px] text-right">
            {item.totalEstimate !== undefined ? `${item.totalEstimate} pts` : '—'}
          </div>
        )}

        {/* Technical Score Column (Epic Backlog specific) */}
        {showColumn('technicalScore') && (
          <div className="text-xs min-w-[70px] text-center">
            {item.technicalScore !== undefined ? (
              <span className="px-2 py-0.5 bg-primary/10 text-primary rounded font-medium">
                {item.technicalScore.toFixed(1)}
              </span>
            ) : '—'}
          </div>
        )}

        {/* Business Score Column (Epic Backlog specific) */}
        {showColumn('businessScore') && (
          <div className="text-xs min-w-[70px] text-center">
            {item.businessScore !== undefined ? (
              <span className="px-2 py-0.5 bg-secondary text-secondary-foreground rounded font-medium">
                {item.businessScore}
              </span>
            ) : '—'}
          </div>
        )}

        {/* Points Column */}
        {showColumn('points') && item.points !== undefined && (
          <div className="text-sm text-muted-foreground min-w-[40px] text-right">
            {item.points} pts
          </div>
        )}

        {/* MVP Badge */}
        {item.mvp && (
          <div className="px-2 py-1 text-xs bg-primary text-primary-foreground rounded">
            MVP
          </div>
        )}

        {/* Blocked Badge */}
        {item.blocked && (
          <div className="px-2 py-1 text-xs bg-destructive text-destructive-foreground rounded">
            Blocked
          </div>
        )}
      </div>
    </BacklogContextMenu>
  );
}