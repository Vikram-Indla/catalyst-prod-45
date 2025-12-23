/**
 * Left panel containing the list of demands with drag & drop support
 * Enterprise-grade styling with Catalyst colors
 */

import React from 'react';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import { RoadmapListRow } from './RoadmapListRow';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { RoadmapDemand, RoadmapGroup } from '../types/roadmap';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useRoadmapTheme } from '../lib/useRoadmapTheme';

interface RoadmapListPanelProps {
  items: RoadmapDemand[];
  groups?: RoadmapGroup[];
  focusedIndex: number;
  selectedItemId: string | null;
  onItemClick: (id: string) => void;
  onToggleGroup?: (groupKey: string) => void;
  listWidth?: number;
}

export function RoadmapListPanel({
  items,
  groups,
  focusedIndex,
  selectedItemId,
  onItemClick,
  onToggleGroup,
  listWidth = 380,
}: RoadmapListPanelProps) {
  const { tokens } = useRoadmapTheme();
  
  // If groups are provided, render grouped view (no DnD for now)
  if (groups && groups.length > 0) {
    return (
      <div 
        className="flex-shrink-0 flex flex-col"
        style={{ 
          width: listWidth,
          backgroundColor: tokens.surface.card,
          borderRight: `1px solid ${tokens.border.default}`,
        }}
      >
        {/* Header - matches timeline header height (2 lines) */}
        <div 
          className="flex items-center justify-between px-4 h-[52px]"
          style={{
            borderBottom: `1px solid ${tokens.border.default}`,
            backgroundColor: tokens.surface.card,
          }}
        >
          <div>
            <span 
              className="text-xs font-semibold uppercase tracking-wider block"
              style={{ color: tokens.text.muted }}
            >
              Demands
            </span>
            <span 
              className="text-xs"
              style={{ color: tokens.text.secondary }}
            >
              {items.length} items
            </span>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div role="table">
            {groups.map((group) => (
              <div 
                key={group.key} 
                style={{ borderBottom: `1px solid ${tokens.border.subtle}` }}
              >
                {/* Group header */}
                <button
                  onClick={() => onToggleGroup?.(group.key)}
                  className="w-full flex items-center gap-2 px-4 py-2.5 transition-colors"
                  style={{ backgroundColor: tokens.surface.hover }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.backgroundColor = tokens.surface.active;
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.backgroundColor = tokens.surface.hover;
                  }}
                >
                  {group.isExpanded ? (
                    <ChevronDown className="w-4 h-4" style={{ color: tokens.text.muted }} />
                  ) : (
                    <ChevronRight className="w-4 h-4" style={{ color: tokens.text.muted }} />
                  )}
                  {group.color && (
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: group.color }}
                    />
                  )}
                  <span 
                    className="text-sm font-semibold"
                    style={{ color: tokens.text.primary }}
                  >
                    {group.label}
                  </span>
                  <span 
                    className="text-xs font-medium ml-auto"
                    style={{ color: tokens.text.muted }}
                  >
                    {group.items.length}
                  </span>
                </button>

                {/* Group items */}
                {group.isExpanded && (
                  <div>
                    {group.items.map((item) => {
                      const globalIndex = items.findIndex(i => i.id === item.id);
                      return (
                        <RoadmapListRow
                          key={item.id}
                          item={item}
                          index={globalIndex}
                          isFocused={focusedIndex === globalIndex}
                          isSelected={selectedItemId === item.id}
                          onClick={() => onItemClick(item.id)}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    );
  }

  // Flat list view with drag & drop
  return (
    <div 
      className="flex-shrink-0 flex flex-col"
      style={{ 
        width: listWidth,
        backgroundColor: tokens.surface.card,
        borderRight: `1px solid ${tokens.border.default}`,
      }}
    >
      {/* Header - matches timeline header height (2 lines) */}
      <div 
        className="flex items-center justify-between px-4 h-[52px]"
        style={{
          borderBottom: `1px solid ${tokens.border.default}`,
          backgroundColor: tokens.surface.card,
        }}
      >
        <div>
          <span 
            className="text-xs font-semibold uppercase tracking-wider block"
            style={{ color: tokens.text.muted }}
          >
            Demands
          </span>
          <span 
            className="text-xs"
            style={{ color: tokens.text.secondary }}
          >
            {items.length} items
          </span>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <Droppable droppableId="roadmap-list">
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              role="table"
              style={{
                backgroundColor: snapshot.isDraggingOver 
                  ? tokens.surface.active 
                  : 'transparent',
              }}
            >
              {items.map((item, index) => (
                <Draggable key={item.id} draggableId={item.id} index={index}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                    >
                      <RoadmapListRow
                        item={item}
                        index={index}
                        isFocused={focusedIndex === index}
                        isSelected={selectedItemId === item.id}
                        onClick={() => onItemClick(item.id)}
                        isDragging={snapshot.isDragging}
                      />
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </ScrollArea>
    </div>
  );
}
