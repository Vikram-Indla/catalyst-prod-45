/**
 * Left panel — Initiative list (340px)
 * Spec: grouped by type, 44px rows, bottom "Add" link
 */

import React from 'react';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import { RoadmapListRow } from './RoadmapListRow';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { RoadmapDemand, RoadmapGroup } from '../types/roadmap';
import { ChevronDown, ChevronRight, ArrowUpDown, Plus } from 'lucide-react';

interface RoadmapListPanelProps {
  items: RoadmapDemand[];
  groups?: RoadmapGroup[];
  focusedIndex: number;
  selectedItemId: string | null;
  onItemClick: (id: string) => void;
  onToggleGroup?: (groupKey: string) => void;
  listWidth?: number;
}

const BUSINESS_REQUEST_COLOR = '#B38600';

export function RoadmapListPanel({
  items, groups, focusedIndex, selectedItemId, onItemClick, onToggleGroup, listWidth = 340,
}: RoadmapListPanelProps) {

  const renderHeader = () => (
    <div
      className="flex items-center justify-between px-4"
      style={{ height: 44, borderBottom: '1px solid var(--bd-default, #E2E8F0)', background: '#FAFBFC' }}
    >
      <div className="flex items-center gap-2">
        <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748B' }}>
          Business Requests
        </span>
        <span
          style={{
            fontSize: 10, fontWeight: 600, color: '#64748B', background: '#F1F5F9',
            borderRadius: 12, padding: '2px 7px', fontFamily: 'var(--cp-font-mono)',
          }}
        >
          {items.length}
        </span>
      </div>
      <ArrowUpDown className="w-3.5 h-3.5" style={{ color: '#94A3B8' }} />
    </div>
  );

  const renderAddRow = () => (
    <button
      className="w-full flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors hover:bg-blue-50"
      style={{ color: '#2563EB', borderTop: '1px solid #F1F5F9' }}
    >
      <Plus className="w-4 h-4" />
      Add Initiative to Roadmap
    </button>
  );

  // Grouped view
  if (groups && groups.length > 0) {
    return (
      <div className="flex-shrink-0 flex flex-col" style={{ width: listWidth, borderRight: '1px solid var(--bd-default, #E2E8F0)', background: 'var(--bg-app, #FFFFFF)' }}>
        {renderHeader()}
        <ScrollArea className="flex-1">
          <div role="table">
            {groups.map(group => {
              const color = group.color || BUSINESS_REQUEST_COLOR;
              return (
                <div key={group.key} style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <button
                    onClick={() => onToggleGroup?.(group.key)}
                    className="w-full flex items-center gap-2 px-4 py-2 transition-colors hover:bg-gray-50"
                    style={{ background: '#FAFBFC', height: 50 }}
                  >
                    {group.isExpanded ? <ChevronDown className="w-3.5 h-3.5" style={{ color: '#94A3B8' }} /> : <ChevronRight className="w-3.5 h-3.5" style={{ color: '#94A3B8' }} />}
                    <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: color }} />
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#334155' }}>{group.label}</span>
                    <span style={{ fontSize: 11, fontWeight: 500, color: '#94A3B8', marginLeft: 'auto' }}>{group.items.length}</span>
                  </button>
                  {group.isExpanded && group.items.map(item => {
                    const gi = items.findIndex(i => i.id === item.id);
                    return (
                      <RoadmapListRow
                        key={item.id}
                        item={item}
                        index={gi}
                        isFocused={focusedIndex === gi}
                        isSelected={selectedItemId === item.id}
                        onClick={() => onItemClick(item.id)}
                        ownerName={(item as any).owner_name}
                      />
                    );
                  })}
                </div>
              );
            })}
          </div>
          {renderAddRow()}
        </ScrollArea>
      </div>
    );
  }

  // Flat list with DnD
  return (
    <div className="flex-shrink-0 flex flex-col" style={{ width: listWidth, borderRight: '1px solid var(--bd-default, #E2E8F0)', background: 'var(--bg-app, #FFFFFF)' }}>
      {renderHeader()}
      <ScrollArea className="flex-1">
        <Droppable droppableId="roadmap-list">
          {(provided, snapshot) => (
            <div ref={provided.innerRef} {...provided.droppableProps} role="table">
              {items.map((item, index) => (
                <Draggable key={item.id} draggableId={item.id} index={index}>
                  {(provided, snapshot) => (
                    <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}>
                       <RoadmapListRow
                        item={item}
                        index={index}
                        isFocused={focusedIndex === index}
                        isSelected={selectedItemId === item.id}
                        onClick={() => onItemClick(item.id)}
                        isDragging={snapshot.isDragging}
                        ownerName={(item as any).owner_name}
                      />
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
        {renderAddRow()}
      </ScrollArea>
    </div>
  );
}
