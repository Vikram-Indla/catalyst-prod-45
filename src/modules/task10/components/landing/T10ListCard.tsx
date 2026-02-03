// ═══════════════════════════════════════════════════════════════════════════
// TASK¹⁰ LIST CARD COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

import { MoreVertical } from 'lucide-react';
import type { T10ListWithStats } from '../../types';

interface T10ListCardProps {
  list: T10ListWithStats;
  onClick?: () => void;
  onMenuClick?: (e: React.MouseEvent) => void;
}

export function T10ListCard({ list, onClick, onMenuClick }: T10ListCardProps) {
  const progress = list.item_count > 0 
    ? Math.round((list.completed_count / list.item_count) * 100) 
    : 0;

  return (
    <div className="t10-list-card" onClick={onClick}>
      <div className="t10-list-card__header">
        <span className="t10-list-card__id">{list.list_key}</span>
        <button 
          className="t10-icon-btn t10-icon-btn--ghost"
          onClick={(e) => {
            e.stopPropagation();
            onMenuClick?.(e);
          }}
        >
          <MoreVertical className="t10-icon-btn__icon" />
        </button>
      </div>
      
      <h3 className="t10-list-card__title">{list.name}</h3>
      
      <div className={`t10-list-card__status t10-list-card__status--${list.status}`}>
        <span className="t10-list-card__status-dot" />
        {list.status === 'active' ? 'Active' : list.status === 'inactive' ? 'Inactive' : 'Archived'}
      </div>
      
      <div className="t10-progress-bar">
        <div 
          className="t10-progress-bar__fill" 
          style={{ width: `${progress}%` }}
        />
      </div>
      
      <div className="t10-list-card__stats">
        <strong>{list.completed_count}</strong> of <strong>{list.item_count}</strong> completed
        {list.slots_available > 0 && (
          <span> · {list.slots_available} slots available</span>
        )}
      </div>
    </div>
  );
}

export default T10ListCard;
