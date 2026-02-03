// ═══════════════════════════════════════════════════════════════════════════
// TASK¹⁰ BUFFER SECTION COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { T10ItemWithAssignee } from '../../types';
import { T10PriorityCard } from './T10PriorityCard';

interface T10BufferSectionProps {
  items: T10ItemWithAssignee[];
  onToggleStatus: (itemId: string, done: boolean) => void;
  onItemClick?: (item: T10ItemWithAssignee) => void;
}

export function T10BufferSection({ items, onToggleStatus, onItemClick }: T10BufferSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  if (items.length === 0) return null;

  return (
    <div className="t10-buffer-section">
      <button 
        className="t10-buffer-section__toggle"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="t10-buffer-section__toggle-content">
          {isExpanded ? <ChevronUp /> : <ChevronDown />}
          <span className="t10-buffer-section__title">Buffer Items</span>
          <span className="t10-buffer-section__count">{items.length}</span>
        </div>
        <span className="t10-buffer-section__hint">
          Items ranked 11+ waiting to move into Top 10
        </span>
      </button>
      
      {isExpanded && (
        <div className="t10-buffer-section__list">
          {items.map((item) => (
            <T10PriorityCard
              key={item.id}
              item={item}
              onToggleStatus={onToggleStatus}
              onClick={() => onItemClick?.(item)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default T10BufferSection;
