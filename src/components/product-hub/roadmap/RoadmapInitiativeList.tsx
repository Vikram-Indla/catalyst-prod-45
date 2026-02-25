/**
 * Product Roadmap — Left panel initiative list (340px)
 * Polish: instant hover sync, focus-visible, aria roles, 4px grid
 */
import React from 'react';
import { ArrowUpDown, ChevronDown, Plus, GripVertical } from 'lucide-react';
import type { RoadmapInitiative, RoadmapGroup } from './types/roadmap.types';
import { TYPE_COLORS, INK, SURFACE, FONT, ROW_HEIGHT, GROUP_HEADER_HEIGHT, LIST_PANEL_WIDTH } from './constants/roadmap.constants';

interface RoadmapInitiativeListProps {
  groups: RoadmapGroup[];
  selectedId: string | null;
  hoveredId: string | null;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
  onAddClick: () => void;
}

export function RoadmapInitiativeList({ groups, selectedId, hoveredId, onSelect, onHover, onAddClick }: RoadmapInitiativeListProps) {
  const totalCount = groups.reduce((sum, g) => sum + g.items.length, 0);

  return (
    <div className="flex-shrink-0 flex flex-col roadmap-scroll" style={{ width: LIST_PANEL_WIDTH, borderRight: `1px solid ${SURFACE.border}`, background: SURFACE.card }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-4"
        style={{ height: ROW_HEIGHT, borderBottom: `1px solid ${SURFACE.border}`, background: '#FAFBFC' }}
      >
        <div className="flex items-center gap-2">
          <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: INK[3] }}>
            Initiatives
          </span>
          <span style={{ fontSize: 10, fontWeight: 600, color: INK[3], background: SURFACE.borderLight, borderRadius: 10, padding: '2px 8px', fontFamily: FONT.mono }}>
            {totalCount}
          </span>
        </div>
        <ArrowUpDown className="w-3.5 h-3.5" style={{ color: INK[4] }} />
      </div>

      <div className="flex-1 overflow-y-auto roadmap-scroll">
        {groups.map(group => (
          <div key={group.key} style={{ borderBottom: `1px solid ${SURFACE.borderLight}` }}>
            {groups.length > 1 && (
              <div
                className="flex items-center gap-2 px-4 cursor-pointer"
                style={{ height: GROUP_HEADER_HEIGHT, background: '#FAFBFC', transition: 'background-color 0.15s ease' }}
              >
                <ChevronDown className="w-3.5 h-3.5" style={{ color: INK[4] }} />
                <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: group.color }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: INK[2] }}>{group.label}</span>
                <span style={{ fontSize: 11, fontWeight: 500, color: INK[4], marginLeft: 'auto' }}>{group.items.length}</span>
              </div>
            )}

            {group.items.map(item => (
              <InitiativeRow
                key={item.id}
                item={item}
                isSelected={selectedId === item.id}
                isHovered={hoveredId === item.id}
                onSelect={() => onSelect(item.id)}
                onHover={onHover}
              />
            ))}
          </div>
        ))}

        <button
          onClick={onAddClick}
          className="w-full flex items-center gap-2 px-4 py-3 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
          style={{ color: '#2563EB', borderTop: `1px solid ${SURFACE.borderLight}`, transition: 'background-color 0.15s ease' }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#EFF6FF')}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
        >
          <Plus className="w-4 h-4" />
          Add Initiative to Roadmap
        </button>
      </div>
    </div>
  );
}

function InitiativeRow({
  item, isSelected, isHovered, onSelect, onHover,
}: {
  item: RoadmapInitiative;
  isSelected: boolean;
  isHovered: boolean;
  onSelect: () => void;
  onHover: (id: string | null) => void;
}) {
  const typeColor = TYPE_COLORS[item.type]?.solid || '#94A3B8';
  const isCritical = item.priority === 'P0';

  return (
    <div
      role="row"
      tabIndex={0}
      aria-label={`${item.initiativeKey}: ${item.titleEn}, ${TYPE_COLORS[item.type]?.label}, ${item.status}`}
      onClick={onSelect}
      onKeyDown={e => e.key === 'Enter' && onSelect()}
      onMouseEnter={() => onHover(item.id)}
      onMouseLeave={() => onHover(null)}
      className="group flex items-center gap-2 px-2 cursor-pointer relative focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-blue-500"
      style={{
        height: ROW_HEIGHT,
        backgroundColor: isSelected ? '#EFF6FF' : isHovered ? '#F8FAFC' : 'transparent',
        borderBottom: `1px solid ${SURFACE.borderLight}`,
        transition: 'background-color 0.15s ease',
      }}
    >
      {/* 4px accent bar */}
      <div
        className="absolute left-0 top-2 bottom-2 rounded-r"
        style={{ width: 4, background: `linear-gradient(180deg, ${typeColor}, ${typeColor}dd)` }}
      />

      {/* Drag handle */}
      <div className="flex-shrink-0 opacity-0 group-hover:opacity-100" style={{ marginLeft: 8, transition: 'opacity 0.15s ease' }}>
        <GripVertical className="w-3.5 h-3.5" style={{ color: '#CBD5E1' }} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pl-1">
        <div className="flex items-center gap-1.5">
          <span style={{ fontFamily: FONT.mono, fontSize: 10, fontWeight: 600, color: typeColor }} className="flex-shrink-0">
            {item.initiativeKey}
          </span>
          {isCritical && (
            <span style={{ fontSize: 9, fontWeight: 700, color: '#FFFFFF', background: '#EF4444', borderRadius: 3, padding: '1px 4px' }}>P0</span>
          )}
          <span className="truncate" style={{ fontSize: 12.5, fontWeight: 600, color: INK[1], lineHeight: 1.3 }}>
            {item.titleEn}
          </span>
        </div>
        <div className="truncate" dir="rtl" style={{ fontSize: 11, color: INK[4], lineHeight: 1.2, marginTop: 1 }}>
          {item.titleAr}
        </div>
      </div>

      {/* Owner avatar */}
      <div
        className="flex-shrink-0 flex items-center justify-center rounded-full"
        style={{ width: 26, height: 26, background: item.ownerColor, color: '#FFFFFF', fontSize: 10, fontWeight: 600 }}
        title={item.ownerName}
      >
        {item.ownerInitials}
      </div>
    </div>
  );
}
