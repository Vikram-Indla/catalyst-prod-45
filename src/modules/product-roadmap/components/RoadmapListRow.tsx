/**
 * Individual row component for the list panel
 * Enterprise-grade styling with Catalyst design tokens
 */

import React from 'react';
import { GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import type { RoadmapDemand } from '../types/roadmap';
import { useRoadmapTheme } from '../lib/useRoadmapTheme';
import { catalystTokens } from '../lib/design-tokens';

interface RoadmapListRowProps {
  item: RoadmapDemand;
  index: number;
  isFocused: boolean;
  isSelected: boolean;
  onClick: () => void;
  isDragging?: boolean;
}

// Status badge styling - visible and branded
const getStatusStyle = (status: string | null, isDark: boolean): { bg: string; text: string; border: string } => {
  const textSecondary = isDark ? catalystTokens.dark.text.secondary : catalystTokens.light.text.secondary;
  const textMuted = isDark ? catalystTokens.dark.text.muted : catalystTokens.light.text.muted;
  
  const styles: Record<string, { bg: string; text: string; border: string }> = {
    new_request: {
      bg: 'rgba(198, 156, 109, 0.15)',
      text: '#b8894d',
      border: 'rgba(198, 156, 109, 0.3)',
    },
    new_demand: {
      bg: catalystTokens.secondary.olive.bg,
      text: catalystTokens.secondary.olive.base,
      border: 'rgba(92, 124, 92, 0.3)',
    },
    draft: {
      bg: catalystTokens.secondary.grey.bg,
      text: textSecondary,
      border: 'rgba(200, 204, 208, 0.3)',
    },
    submitted: {
      bg: catalystTokens.status.info.bg,
      text: catalystTokens.status.info.text,
      border: 'rgba(59, 130, 246, 0.2)',
    },
    in_review: {
      bg: catalystTokens.status.warning.bg,
      text: catalystTokens.status.warning.text,
      border: 'rgba(245, 158, 11, 0.2)',
    },
    approved: {
      bg: catalystTokens.status.success.bg,
      text: catalystTokens.status.success.text,
      border: 'rgba(34, 197, 94, 0.2)',
    },
    rejected: {
      bg: catalystTokens.status.danger.bg,
      text: catalystTokens.status.danger.text,
      border: 'rgba(239, 68, 68, 0.2)',
    },
    in_progress: {
      bg: catalystTokens.status.info.bg,
      text: catalystTokens.status.info.text,
      border: 'rgba(59, 130, 246, 0.2)',
    },
    completed: {
      bg: catalystTokens.status.success.bg,
      text: catalystTokens.status.success.text,
      border: 'rgba(34, 197, 94, 0.2)',
    },
    cancelled: {
      bg: catalystTokens.secondary.grey.bg,
      text: textMuted,
      border: 'rgba(200, 204, 208, 0.3)',
    },
  };
  return styles[status || 'draft'] || styles.draft;
};

// Health indicator styling
const getHealthStyle = (health: string | null, isDark: boolean): { color: string; label: string } => {
  const textMuted = isDark ? catalystTokens.dark.text.muted : catalystTokens.light.text.muted;
  
  const styles: Record<string, { color: string; label: string }> = {
    on_track: { color: catalystTokens.status.success.text, label: 'On Track' },
    at_risk: { color: catalystTokens.status.warning.text, label: 'At Risk' },
    off_track: { color: catalystTokens.status.danger.text, label: 'Off Track' },
  };
  return styles[health || ''] || { color: textMuted, label: '' };
};

export function RoadmapListRow({
  item,
  index,
  isFocused,
  isSelected,
  onClick,
  isDragging,
}: RoadmapListRowProps) {
  const { tokens, brand, isDark } = useRoadmapTheme();
  const productColor = item.product?.color || catalystTokens.secondary.grey.base;
  const statusStyle = getStatusStyle(item.process_step, isDark);
  const healthStyle = getHealthStyle(item.health, isDark);
  
  return (
    <div
      role="row"
      tabIndex={0}
      data-row-index={index}
      onClick={onClick}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      className={cn(
        'group flex items-center gap-2 px-3 py-2.5 h-[52px] cursor-pointer transition-colors',
        'border-b',
        isDragging && 'opacity-50'
      )}
      style={{
        backgroundColor: isSelected 
          ? tokens.surface.active 
          : isDragging 
            ? tokens.surface.hover
            : 'transparent',
        borderColor: tokens.border.subtle,
        outline: isFocused ? `2px solid ${brand.primary}` : 'none',
        outlineOffset: '-2px',
      }}
      onMouseEnter={(e) => {
        if (!isSelected && !isDragging) {
          (e.currentTarget as HTMLElement).style.backgroundColor = tokens.surface.active;
        }
      }}
      onMouseLeave={(e) => {
        if (!isSelected && !isDragging) {
          (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
        }
      }}
    >
      {/* Drag handle */}
      <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing transition-opacity">
        <GripVertical className="w-4 h-4" style={{ color: tokens.text.muted }} />
      </div>

      {/* Product color indicator */}
      <div 
        className="w-1 h-10 rounded-full flex-shrink-0"
        style={{ backgroundColor: productColor }}
      />

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Key and title row */}
        <div className="flex items-center gap-2 mb-1">
          <span 
            className="text-xs font-mono flex-shrink-0"
            style={{ color: tokens.text.muted }}
          >
            {item.request_key}
          </span>
          <span 
            className="text-sm font-semibold truncate leading-tight"
            style={{ color: tokens.text.primary }}
          >
            {item.title}
          </span>
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-3">
          {/* Product name with color dot */}
          {item.product && (
            <div className="flex items-center gap-1.5">
              <div 
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: productColor }}
              />
              <span 
                className="text-xs truncate max-w-[100px]"
                style={{ color: tokens.text.secondary }}
              >
                {item.product.name}
              </span>
            </div>
          )}
          
          {/* Progress indicator */}
          {item.progress > 0 && (
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <Progress value={item.progress} className="w-12 h-1.5" />
              <span 
                className="text-[10px] font-medium"
                style={{ color: tokens.text.muted }}
              >
                {item.progress}%
              </span>
            </div>
          )}

          {/* Health indicator */}
          {healthStyle.label && (
            <span 
              className="text-[10px] font-semibold uppercase tracking-wide"
              style={{ color: healthStyle.color }}
            >
              {healthStyle.label}
            </span>
          )}
        </div>
      </div>

      {/* Status badge - visible and branded */}
      <span 
        className="flex-shrink-0 px-2 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wide"
        style={{
          backgroundColor: statusStyle.bg,
          color: statusStyle.text,
          border: `1px solid ${statusStyle.border}`,
        }}
      >
        {(item.process_step || 'draft').replace(/_/g, ' ')}
      </span>
    </div>
  );
}
