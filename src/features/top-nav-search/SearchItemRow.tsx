import React from 'react';
import { WorkItemIcon } from '@/components/ja/icons/WorkItemIcon';
import type { SearchItem } from './types';

const ITEM_TYPE_COLORS: Record<string, string> = {
  bug: '#E5493A',
  defect: '#E5493A',
  story: '#63BA3C',
  task: '#4BADE8',
  epic: '#904EE2',
  subtask: '#4BADE8',
  new_feature: '#63BA3C',
  improvement: '#4BADE8',
  incident: '#E5493A',
};

interface SearchItemRowProps {
  item: SearchItem;
  isActive: boolean;
  id: string;
  onMouseEnter: () => void;
  onClick: () => void;
}

export function SearchItemRow({
  item,
  isActive,
  id,
  onMouseEnter,
  onClick,
}: SearchItemRowProps) {
  return (
    <div
      id={id}
      role="option"
      aria-selected={isActive}
      onMouseEnter={onMouseEnter}
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        height: 40,
        padding: '0 12px',
        cursor: 'pointer',
        background: isActive ? 'rgba(37,99,235,0.06)' : 'transparent',
        transition: 'background 100ms ease',
        borderRadius: 4,
        flexShrink: 0,
      }}
    >
      <span style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
        {item.type === 'work_item' && item.workItemType ? (
          <WorkItemIcon type={item.workItemType as any} size={16} showTooltip={false} />
        ) : (
          <span
            style={{
              width: 16,
              height: 16,
              borderRadius: 3,
              background: ITEM_TYPE_COLORS[item.workItemType ?? ''] ?? '#4BADE8',
              display: 'inline-block',
            }}
          />
        )}
      </span>

      <span
        style={{
          flex: 1,
          minWidth: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          fontSize: 14,
          color: '#0F172A',
          fontFamily: 'Inter, system-ui, sans-serif',
        }}
      >
        {item.label}
      </span>

      {(item.itemKey || item.meta) && (
        <span
          style={{
            flexShrink: 0,
            fontSize: 12,
            color: '#94A3B8',
            fontFamily: 'JetBrains Mono, monospace',
          }}
        >
          {item.itemKey ?? item.meta}
        </span>
      )}
    </div>
  );
}
