/**
 * FeatureKanbanColumn - Styled Kanban column for Feature Backlog
 * Follows Industry Kanban design pattern
 */
import React, { useState } from 'react';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import { FeatureBacklogItem } from '../types';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { ChevronLeft, Inbox, Plus, GripVertical } from 'lucide-react';

interface FeatureKanbanColumnProps {
  columnId: string;
  label: string;
  color: string;
  items: FeatureBacklogItem[];
  selectedItems: string[];
  onItemClick: (itemId: string) => void;
  onItemSelect: (itemId: string, selected: boolean) => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  onAddFeature?: () => void;
}

export function FeatureKanbanColumn({
  columnId,
  label,
  color,
  items,
  selectedItems,
  onItemClick,
  onItemSelect,
  collapsed = false,
  onToggleCollapse,
  onAddFeature,
}: FeatureKanbanColumnProps) {
  const [isHeaderHovered, setIsHeaderHovered] = useState(false);

  if (collapsed) {
    return (
      <div
        onClick={onToggleCollapse}
        onMouseEnter={() => setIsHeaderHovered(true)}
        onMouseLeave={() => setIsHeaderHovered(false)}
        className={cn(
          'cursor-pointer transition-all duration-150',
          'flex flex-col items-center py-3 flex-shrink-0',
          'rounded-xl border',
          'bg-gray-50 dark:bg-gray-800/50',
          'border-gray-200 dark:border-gray-700',
          isHeaderHovered ? 'shadow-md' : 'shadow-sm'
        )}
        style={{
          width: '44px',
          minWidth: '44px',
          height: '100%',
        }}
      >
        <div
          className="w-2.5 h-2.5 rounded-full mb-2 flex-shrink-0"
          style={{ backgroundColor: color }}
        />
        <span className="text-xs font-bold mb-2 text-gray-900 dark:text-gray-100">
          {items.length}
        </span>
        <span
          className="text-[10px] font-semibold tracking-wide uppercase text-gray-500 dark:text-gray-400"
          style={{
            writingMode: 'vertical-rl',
            textOrientation: 'mixed',
            transform: 'rotate(180deg)',
          }}
        >
          {label}
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex flex-col flex-shrink-0 transition-all duration-150',
        'rounded-xl border shadow-sm',
        'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50'
      )}
      style={{
        width: '320px',
        minWidth: '320px',
        maxWidth: '320px',
        height: '100%',
        minHeight: '500px',
      }}
    >
      {/* Column Header */}
      <div className="flex-shrink-0 rounded-t-xl px-4 py-3 border-b bg-gray-50 dark:bg-gray-800/30 border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: color }}
            />
            <span className="text-[14px] font-semibold text-gray-900 dark:text-gray-100">
              {label}
            </span>
            <span className="bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-[12px] font-medium px-2 py-0.5 rounded-full border border-gray-200 dark:border-gray-600 shadow-sm">
              {items.length}
            </span>
          </div>
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              onMouseEnter={() => setIsHeaderHovered(true)}
              onMouseLeave={() => setIsHeaderHovered(false)}
              className="p-1.5 rounded-lg transition-all cursor-pointer text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-white/60 dark:hover:bg-gray-700/60"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Droppable Area */}
      <Droppable droppableId={columnId}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn(
              'flex-1 overflow-y-auto p-3 flex flex-col gap-2.5',
              snapshot.isDraggingOver && 'bg-olive-50/50 dark:bg-olive-900/10'
            )}
            style={{ minHeight: 0 }}
          >
            {items.map((item, index) => (
              <Draggable key={item.id} draggableId={item.id} index={index}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                  >
                    <Card
                      className={cn(
                        'rounded-xl cursor-pointer transition-all duration-200',
                        'bg-white dark:bg-gray-900 border group relative',
                        selectedItems.includes(item.id) && 'ring-2 ring-primary',
                        snapshot.isDragging
                          ? 'shadow-lg opacity-90 rotate-1 border-gray-300 dark:border-gray-600'
                          : 'border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600 hover:-translate-y-0.5'
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        onItemClick(item.id);
                      }}
                    >
                      {/* Drag Handle */}
                      <div
                        {...provided.dragHandleProps}
                        className="absolute left-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-grab"
                      >
                        <GripVertical className="w-4 h-4 text-gray-300 dark:text-gray-600" />
                      </div>

                      <div className="p-4">
                        {/* Header: Key + Checkbox */}
                        <div className="flex items-start gap-2 mb-2">
                          <Checkbox
                            checked={selectedItems.includes(item.id)}
                            onCheckedChange={(checked) => onItemSelect(item.id, checked as boolean)}
                            onClick={(e) => e.stopPropagation()}
                            className="mt-0.5"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="font-mono text-[11px] text-gray-500 dark:text-gray-400 mb-1">
                              {item.key}
                            </div>
                            <div className="text-[14px] font-medium line-clamp-2 text-gray-900 dark:text-gray-100 group-hover:text-olive-600 dark:group-hover:text-olive-400 transition-colors">
                              {item.summary}
                            </div>
                          </div>
                        </div>

                        {/* Project & Epic info */}
                        {(item.project_name || item.epic_name) && (
                          <div className="flex flex-wrap gap-1.5 mb-2">
                            {item.project_name && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                                {item.project_name}
                              </span>
                            )}
                            {item.epic_name && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
                                {item.epic_name}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Footer */}
                        <div className="flex items-center gap-2 flex-wrap mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                          {item.health && (
                            <div
                              className={cn(
                                'h-2 w-2 rounded-full',
                                {
                                  on_track: 'bg-success',
                                  at_risk: 'bg-warning',
                                  off_track: 'bg-destructive',
                                  green: 'bg-success',
                                  yellow: 'bg-warning',
                                  red: 'bg-destructive',
                                }[item.health] || 'bg-muted-foreground'
                              )}
                              title={`Health: ${item.health}`}
                            />
                          )}

                          {item.priority && (
                            <span className={cn(
                              'text-[10px] px-1.5 py-0.5 rounded font-medium',
                              item.priority === 'critical' && 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
                              item.priority === 'high' && 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300',
                              item.priority === 'medium' && 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300',
                              item.priority === 'low' && 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400',
                            )}>
                              {item.priority}
                            </span>
                          )}

                          {item.assignee_name && (
                            <span className="ml-auto text-xs text-muted-foreground">
                              {item.assignee_name}
                            </span>
                          )}
                        </div>
                      </div>
                    </Card>
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}

            {items.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 px-4 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50/50 dark:bg-gray-800/30 mx-2 mb-2">
                <div className="w-12 h-12 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center mb-3 shadow-sm border border-gray-100 dark:border-gray-700">
                  <Inbox className="w-6 h-6 text-gray-300 dark:text-gray-600" />
                </div>
                <p className="text-[13px] font-medium text-gray-500 dark:text-gray-400 mb-1">
                  No items
                </p>
                <p className="text-[12px] text-gray-400 dark:text-gray-500 text-center">
                  Drag features here
                </p>
              </div>
            )}
          </div>
        )}
      </Droppable>

      {/* Add Item Button */}
      {onAddFeature && (
        <div className="p-2 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onAddFeature}
            className="w-full py-2 text-[13px] text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-white dark:hover:bg-gray-800 rounded-lg transition-colors flex items-center justify-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Add Feature
          </button>
        </div>
      )}
    </div>
  );
}
