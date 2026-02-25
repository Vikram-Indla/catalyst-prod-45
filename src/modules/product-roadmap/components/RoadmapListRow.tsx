/**
 * Individual row component for the list panel
 * Spec: 44px height, 4px type color accent, monospace ID, Arabic subtitle, owner avatar
 */

import React from 'react';
import { GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RoadmapDemand } from '../types/roadmap';

// ── Initiative type color map ──
const TYPE_COLORS: Record<string, string> = {
  project: '#2563EB',
  enhancement: '#0D9488',
  improvement: '#D97706',
};

// ── Owner data (static for demo) ──
const OWNER_MAP: Record<number, { name: string; initials: string; bg: string }> = {
  1: { name: 'Dr. Ahmed', initials: 'AA', bg: '#2563EB' },
  2: { name: 'Eng. Fatima', initials: 'FH', bg: '#0D9488' },
  3: { name: 'Mr. Khalid', initials: 'KS', bg: '#D97706' },
  4: { name: 'Ms. Nora', initials: 'NO', bg: '#7C3AED' },
};

function getOwner(rank: number | null) {
  if (!rank) return OWNER_MAP[1];
  return OWNER_MAP[((rank - 1) % 4) + 1] || OWNER_MAP[1];
}

// Extract Arabic part from title "Arabic - English"
function getArabicTitle(title: string): string | null {
  const dashIdx = title.indexOf(' - ');
  if (dashIdx > 0) return title.substring(0, dashIdx);
  return null;
}

function getEnglishTitle(title: string): string {
  const dashIdx = title.indexOf(' - ');
  if (dashIdx > 0) return title.substring(dashIdx + 3);
  return title;
}

interface RoadmapListRowProps {
  item: RoadmapDemand;
  index: number;
  isFocused: boolean;
  isSelected: boolean;
  onClick: () => void;
  isDragging?: boolean;
}

export function RoadmapListRow({ item, index, isFocused, isSelected, onClick, isDragging }: RoadmapListRowProps) {
  const typeKey = (item as any).initiative_type_key || 'project';
  const typeColor = TYPE_COLORS[typeKey] || '#94A3B8';
  const arabicTitle = getArabicTitle(item.title);
  const englishTitle = getEnglishTitle(item.title);
  const owner = getOwner(item.rank);
  const isCritical = item.priority_tier === 'P0' || item.priority_tier === 'critical';

  return (
    <div
      role="row"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={e => e.key === 'Enter' && onClick()}
      className={cn(
        'group flex items-center gap-2 px-2 cursor-pointer transition-colors relative',
        isDragging && 'opacity-50'
      )}
      style={{
        height: 44,
        backgroundColor: isSelected ? '#EFF6FF' : 'transparent',
        borderBottom: '1px solid #F1F5F9',
        outline: isFocused ? '2px solid #2563EB' : 'none',
        outlineOffset: -2,
      }}
      onMouseEnter={e => { if (!isSelected) e.currentTarget.style.backgroundColor = '#F8FAFC'; }}
      onMouseLeave={e => { if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent'; }}
    >
      {/* 4px accent bar */}
      <div
        className="absolute left-0 top-2 bottom-2 rounded-r"
        style={{ width: 4, background: `linear-gradient(180deg, ${typeColor}, ${typeColor}dd)` }}
      />

      {/* Drag handle */}
      <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
        <GripVertical className="w-3.5 h-3.5" style={{ color: '#CBD5E1' }} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pl-1">
        <div className="flex items-center gap-1.5">
          {/* ID */}
          <span style={{ fontFamily: 'SF Mono, monospace', fontSize: 10, fontWeight: 600, color: typeColor }} className="flex-shrink-0">
            {item.request_key}
          </span>
          {/* P0 badge */}
          {isCritical && (
            <span style={{ fontSize: 9, fontWeight: 700, color: '#FFFFFF', background: '#EF4444', borderRadius: 3, padding: '1px 4px' }}>P0</span>
          )}
          {/* English title */}
          <span className="truncate" style={{ fontSize: 12.5, fontWeight: 600, color: '#0F172A', lineHeight: 1.3 }}>
            {englishTitle}
          </span>
        </div>
        {/* Arabic subtitle */}
        {arabicTitle && (
          <div className="truncate" dir="rtl" style={{ fontSize: 11, color: '#94A3B8', lineHeight: 1.2, marginTop: 1 }}>
            {arabicTitle}
          </div>
        )}
      </div>

      {/* Owner avatar */}
      <div
        className="flex-shrink-0 flex items-center justify-center rounded-full"
        style={{ width: 26, height: 26, background: owner.bg, color: '#FFFFFF', fontSize: 10, fontWeight: 600 }}
        title={owner.name}
      >
        {owner.initials}
      </div>
    </div>
  );
}
