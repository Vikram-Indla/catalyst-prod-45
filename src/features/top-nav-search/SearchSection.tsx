import React from 'react';
import { SearchItemRow } from './SearchItemRow';
import type { SearchItem } from './types';

interface SearchSectionProps {
  label: string;
  items: SearchItem[];
  activeIndex: number;
  indexOffset: number;
  onItemHover: (index: number) => void;
  onItemClick: (item: SearchItem) => void;
}

export function SearchSection({
  label,
  items,
  activeIndex,
  indexOffset,
  onItemHover,
  onItemClick,
}: SearchSectionProps) {
  if (items.length === 0) return null;

  return (
    <div>
      <div
        style={{
          padding: '8px 12px 4px',
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: '#94A3B8',
          fontFamily: 'Inter, system-ui, sans-serif',
        }}
      >
        {label}
      </div>
      {items.map((item, i) => {
        const globalIndex = indexOffset + i;
        return (
          <SearchItemRow
            key={item.id}
            id={`tnav-option-${globalIndex}`}
            item={item}
            isActive={activeIndex === globalIndex}
            onMouseEnter={() => onItemHover(globalIndex)}
            onClick={() => onItemClick(item)}
          />
        );
      })}
    </div>
  );
}
