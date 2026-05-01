/**
 * Individual row component for the list panel
 * Spec: 44px height, 4px type color accent, monospace ID, owner avatar from real data
 */

import React from 'react';
import { GripVertical, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/hooks/useTheme';
import type { RoadmapDemand } from '../types/roadmap';

// ── Request type color map ──
const TYPE_COLORS: Record<string, string> = {
  project: 'var(--ds-text-brand, var(--ds-text-brand, #2563EB))',
  enhancement: '#0D9488',
  improvement: 'var(--ds-text-warning, var(--ds-text-warning, #D97706))',
};

// ── Avatar color — deterministic from initials ──
const AVATAR_COLORS = [
  'var(--ds-text-brand, var(--ds-text-brand, #2563EB))', // blue
  '#6366F1', // indigo
  '#0D9488', // teal
  'var(--ds-text-warning, var(--ds-text-warning, #D97706))', // amber
  'var(--ds-text-success, var(--ds-text-success, #16A34A))', // green
  '#0891B2', // cyan
  'var(--ds-text-danger, var(--ds-text-danger, #DC2626))', // red
  'var(--ds-text-subtle, var(--ds-text-subtle, #334155))', // slate
];

function getColorFromName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

interface RoadmapListRowProps {
  item: RoadmapDemand;
  index: number;
  isFocused: boolean;
  isSelected: boolean;
  onClick: () => void;
  isDragging?: boolean;
  ownerName?: string | null;
}

export function RoadmapListRow({ item, index, isFocused, isSelected, onClick, isDragging, ownerName }: RoadmapListRowProps) {
  const { isDark } = useTheme();
  const typeKey = (item as any).initiative_type_key || 'project';
  const typeColor = TYPE_COLORS[typeKey] || 'var(--ds-text-subtlest, var(--ds-text-subtlest, #94A3B8))';
  const isCritical = item.priority_tier === 'P0' || item.priority_tier === 'critical';

  const name = ownerName || null;
  const initials = name ? getInitials(name) : null;
  const avatarColor = name ? getColorFromName(name) : 'var(--ds-text-disabled, var(--ds-text-disabled, #CBD5E1))';

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
        backgroundColor: isSelected ? ('var(--cp-primary-light, #EFF6FF)') : 'transparent',
        borderBottom: `1px solid ${'var(--cp-border, #E2E8F0)'}`,
        outline: isFocused ? '2px solid #2563EB' : 'none',
        outlineOffset: -2,
      }}
      onMouseEnter={e => { if (!isSelected) e.currentTarget.style.backgroundColor = 'var(--bg-1, #F8FAFC)'; }}
      onMouseLeave={e => { if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent'; }}
    >
      {/* 4px accent bar */}
      <div
        className="absolute left-0 top-2 bottom-2 rounded-r"
        style={{ width: 4, background: typeColor }}
      />

      {/* Drag handle */}
      <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
        <GripVertical className="w-3.5 h-3.5" style={{ color: 'var(--ds-text-disabled, var(--ds-text-disabled, #CBD5E1))' }} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pl-1">
        <div className="flex items-center gap-1.5">
          {/* ID */}
          <span style={{ fontFamily: 'var(--cp-font-mono)', fontSize: 10, fontWeight: 700, color: typeColor, letterSpacing: '0.02em' }} className="flex-shrink-0">
            {item.request_key}
          </span>
          {/* P0 badge */}
          {isCritical && (
            <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--ds-surface, var(--ds-surface, #FFFFFF))', background: 'var(--ds-text-danger, var(--ds-text-danger, #EF4444))', borderRadius: 4, padding: '1px 4px' }}>P0</span>
          )}
          {/* Title */}
          <span className="truncate" style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-1, #0F172A)', letterSpacing: '-0.01em' }}>
            {item.title}
          </span>
        </div>
      </div>

      {/* Owner avatar */}
      {initials ? (
        <div
          className="flex-shrink-0 flex items-center justify-center rounded-full"
          style={{
            width: 28, height: 28,
            background: avatarColor,
            color: 'var(--ds-surface, var(--ds-surface, #FFFFFF))',
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.02em',
            boxShadow: '0 0 0 2px #FFFFFF',
          }}
          title={name || undefined}
        >
          {initials}
        </div>
      ) : (
        <div
          className="flex-shrink-0 flex items-center justify-center rounded-full"
          style={{ width: 28, height: 28, background: 'var(--bd-default, #E2E8F0)' }}
        >
          <User className="w-3.5 h-3.5" style={{ color: 'var(--ds-text-subtlest, var(--ds-text-subtlest, #94A3B8))' }} />
        </div>
      )}
    </div>
  );
}
