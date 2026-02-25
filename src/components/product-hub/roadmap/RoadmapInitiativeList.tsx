/**
 * Product Roadmap — Left panel initiative list
 * AUDIT #1: JetBrains Mono keys 11px
 * AUDIT #2: Lightbulb icon before name, colored by type
 * AUDIT #3: Avatar ALWAYS blue (#2563EB)
 * AUDIT #10: Group headers with bg, border, chevron, type dot, count pill
 * AUDIT #11: Count badge pill with JetBrains Mono
 * AUDIT #12: Collapsible groups
 * AUDIT #19: Star button on each row
 * AUDIT #22: focus-visible outlines
 * AUDIT #23: 36px row height
 */
import React from 'react';
import { ArrowUpDown, ChevronDown, ChevronRight, Plus, Lightbulb, Star } from 'lucide-react';
import type { RoadmapInitiative, RoadmapGroup } from './types/roadmap.types';
import { TYPE_COLORS, INK, SURFACE, FONT, ROW_HEIGHT, GROUP_HEADER_HEIGHT, LIST_PANEL_WIDTH, AVATAR_BG } from './constants/roadmap.constants';

interface RoadmapInitiativeListProps {
  groups: RoadmapGroup[];
  selectedId: string | null;
  hoveredId: string | null;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
  onAddClick: () => void;
  width?: number;
  scrollRef?: React.RefObject<HTMLDivElement>;
  onScroll?: () => void;
  collapsedGroups: Set<string>;
  onToggleGroup: (key: string) => void;
}

/* AUDIT #3: Avatar ALWAYS blue */
function OwnerAvatar({ initials, name }: { initials?: string; name?: string }) {
  const isUnassigned = !initials || initials === '?' || initials === 'UN' || !name || name === 'Unassigned';

  if (isUnassigned) {
    return (
      <div
        className="flex-shrink-0 flex items-center justify-center rounded-full"
        style={{ width: 22, height: 22, background: '#E2E8F0' }}
        title="Unassigned"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round">
          <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
      </div>
    );
  }

  return (
    <div
      className="flex-shrink-0 flex items-center justify-center rounded-full"
      style={{ width: 22, height: 22, background: AVATAR_BG, color: '#FFFFFF', fontSize: 9, fontWeight: 700 }}
      title={name}
    >
      {initials}
    </div>
  );
}

export function RoadmapInitiativeList({ groups, selectedId, hoveredId, onSelect, onHover, onAddClick, width, scrollRef, onScroll, collapsedGroups, onToggleGroup }: RoadmapInitiativeListProps) {
  const totalCount = groups.reduce((sum, g) => sum + g.items.length, 0);

  return (
    <div className="flex-shrink-0 flex flex-col roadmap-scroll" style={{ width: width || LIST_PANEL_WIDTH, borderRight: `1px solid ${SURFACE.border}`, background: SURFACE.card }}>
      {/* Column Header */}
      <div
        className="flex items-center justify-between px-4"
        style={{ height: ROW_HEIGHT, borderBottom: `1px solid ${SURFACE.border}`, background: '#FAFBFC' }}
      >
        <div className="flex items-center gap-2">
          <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: INK[2] }}>
            Initiatives
          </span>
          {/* AUDIT #11: Count badge pill */}
          <span style={{
            fontFamily: FONT.mono, fontSize: 11, fontWeight: 600, color: INK[4],
            background: SURFACE.page, border: `1px solid ${SURFACE.border}`,
            borderRadius: 9999, padding: '0 6px', height: 20, display: 'inline-flex', alignItems: 'center',
          }}>
            {totalCount}
          </span>
        </div>
        <ArrowUpDown className="w-3.5 h-3.5" style={{ color: INK[3] }} />
      </div>

      <div ref={scrollRef as any} onScroll={onScroll} className="flex-1 overflow-y-auto roadmap-scroll">
        {groups.map((group, gi) => {
          const typeColor = TYPE_COLORS[group.key]?.solid || group.color || '#64748B';
          const isCollapsed = collapsedGroups.has(group.key);
          return (
            <div key={group.key}>
              {/* AUDIT #10: Group header with bg, border, chevron, type dot, count */}
              <div
                className="flex items-center gap-2 px-4 cursor-pointer select-none focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-blue-500"
                tabIndex={0}
                role="button"
                aria-expanded={!isCollapsed}
                onKeyDown={e => e.key === 'Enter' && onToggleGroup(group.key)}
                style={{
                  height: GROUP_HEADER_HEIGHT,
                  background: SURFACE.page,
                  borderBottom: `1px solid ${SURFACE.border}`,
                  borderTop: gi > 0 ? `1px solid ${SURFACE.border}` : 'none',
                }}
                onClick={() => onToggleGroup(group.key)}
              >
                {/* AUDIT #12: Chevron rotates */}
                <div style={{ transition: 'transform 0.15s ease', transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}>
                  <ChevronDown className="w-3.5 h-3.5" style={{ color: INK[3] }} />
                </div>
                {/* Type dot 10px with rounded corners */}
                <div style={{
                  width: 10, height: 10, borderRadius: 3, flexShrink: 0,
                  background: typeColor,
                }} />
                <span style={{
                  fontSize: 12, fontWeight: 600, color: INK[2],
                  textTransform: 'uppercase', letterSpacing: '0.04em',
                }}>
                  {group.label}
                </span>
                {/* AUDIT #11: Count pill */}
                <span style={{
                  fontFamily: FONT.mono, fontSize: 11, fontWeight: 600, color: INK[4],
                  background: SURFACE.card, border: `1px solid ${SURFACE.border}`,
                  borderRadius: 9999, padding: '0 6px', height: 20,
                  display: 'inline-flex', alignItems: 'center', marginLeft: 'auto',
                }}>
                  {group.items.length}
                </span>
              </div>

              {!isCollapsed && group.items.map(item => (
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
          );
        })}

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

  return (
    <div
      role="row"
      tabIndex={0}
      aria-label={`${item.initiativeKey}: ${item.titleEn}`}
      onClick={onSelect}
      onKeyDown={e => e.key === 'Enter' && onSelect()}
      onMouseEnter={() => onHover(item.id)}
      onMouseLeave={() => onHover(null)}
      className="group flex items-center gap-1.5 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-blue-500"
      style={{
        height: ROW_HEIGHT,
        minHeight: ROW_HEIGHT,
        maxHeight: ROW_HEIGHT,
        paddingLeft: 12,
        paddingRight: 12,
        backgroundColor: isSelected ? '#EFF6FF' : isHovered ? 'rgba(37,99,235,0.04)' : 'transparent',
        borderBottom: `1px solid ${SURFACE.borderLight}`,
        borderLeft: isSelected ? '3px solid #2563EB' : '3px solid transparent',
        transition: 'background-color 0.15s ease',
        overflow: 'hidden',
      }}
    >
      {/* AUDIT #19: Star button */}
      <button
        className="flex-shrink-0 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-500"
        style={{
          width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: 'none', background: 'none', padding: 0, cursor: 'pointer',
          color: item.starred ? '#F59E0B' : INK[4],
          transition: 'color 0.15s ease, opacity 0.15s ease',
        }}
        onClick={e => { e.stopPropagation(); /* TODO: wire star toggle */ }}
        onMouseEnter={e => { e.currentTarget.style.color = '#F59E0B'; }}
        onMouseLeave={e => { if (!item.starred) e.currentTarget.style.color = INK[4]; }}
      >
        <Star className="w-3.5 h-3.5" fill={item.starred ? '#F59E0B' : 'none'} />
      </button>

      {/* AUDIT #2: Lightbulb icon colored by type */}
      <div className="flex-shrink-0" style={{ width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Lightbulb className="w-3.5 h-3.5" style={{ color: typeColor }} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          {/* AUDIT #1: JetBrains Mono 11px key */}
          <span style={{
            fontFamily: FONT.mono,
            fontSize: 11, fontWeight: 500, color: INK[4],
            fontVariantNumeric: 'tabular-nums',
            flexShrink: 0,
          }}>
            {item.initiativeKey}
          </span>
          <span className="truncate" style={{
            fontSize: 13, fontWeight: 500, color: INK[1],
            lineHeight: 1.3,
          }}>
            {item.titleEn}
          </span>
        </div>
      </div>

      {/* AUDIT #3: Avatar ALWAYS blue */}
      <OwnerAvatar initials={item.ownerInitials} name={item.ownerName} />
    </div>
  );
}
