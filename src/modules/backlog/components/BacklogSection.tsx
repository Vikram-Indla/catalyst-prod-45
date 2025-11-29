import { useState } from 'react';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import { BacklogPISection, BacklogItem } from '../types';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, GripVertical } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { QuickAddRow } from './QuickAddRow';
import { BacklogContextMenu } from './BacklogContextMenu';

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
          <QuickAddRow itemType="epic" />
          <div className="divide-y">
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
                      />
                    </div>
                  )}
                </Draggable>
              ))
            )}
          </div>
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
}

function BacklogItemRow({
  item,
  isSelected,
  onItemClick,
  onItemSelect,
  dragHandleProps,
  isDragging,
}: BacklogItemRowProps) {
  const healthColor = {
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500',
    gray: 'bg-gray-400',
  }[item.health || 'gray'];

  return (
    <BacklogContextMenu
      itemId={item.id}
      onOpen={() => onItemClick(item.id)}
      onDuplicate={() => console.log('Duplicate', item.id)}
      onMoveToTop={() => console.log('Move to top', item.id)}
      onMoveToBottom={() => console.log('Move to bottom', item.id)}
      onDelete={() => console.log('Delete', item.id)}
      onPark={() => console.log('Park', item.id)}
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

      <div className="font-mono text-xs text-muted-foreground min-w-[60px]">
        {item.displayId}
      </div>

      <div className="flex-1 text-sm">{item.name}</div>

      {item.state && (
        <div className="px-2 py-1 text-xs bg-muted rounded">
          {item.state}
        </div>
      )}

      {item.points !== undefined && (
        <div className="text-sm text-muted-foreground min-w-[40px] text-right">
          {item.points} pts
        </div>
      )}

      {item.mvp && (
        <div className="px-2 py-1 text-xs bg-primary text-primary-foreground rounded">
          MVP
        </div>
      )}

      {item.blocked && (
        <div className="px-2 py-1 text-xs bg-destructive text-destructive-foreground rounded">
          Blocked
        </div>
      )}
      </div>
    </BacklogContextMenu>
  );
}
