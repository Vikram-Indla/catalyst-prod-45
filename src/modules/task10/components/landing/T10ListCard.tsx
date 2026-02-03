// ═══════════════════════════════════════════════════════════════════════════
// TASK¹⁰ LIST CARD COMPONENT
// Full-width card with creator info, week progress, and expandable history
// ═══════════════════════════════════════════════════════════════════════════

import { useState } from 'react';
import { MoreVertical, Clock, ChevronDown, Check } from 'lucide-react';
import { format, startOfWeek } from 'date-fns';
import type { T10ListWithStats } from '../../types';

interface WeekHistoryItem {
  id: string;
  date: string;
  checkedOutBy: string;
  checkedOutAt: string;
  closedCount: number;
  carriedCount: number;
}

interface T10ListCardProps {
  list: T10ListWithStats;
  onClick?: () => void;
  onMenuClick?: (e: React.MouseEvent) => void;
}

export function T10ListCard({ list, onClick, onMenuClick }: T10ListCardProps) {
  const [historyOpen, setHistoryOpen] = useState(false);
  
  const progress = list.item_count > 0 
    ? Math.round((list.completed_count / list.item_count) * 100) 
    : 0;

  // Format created date
  const createdDate = format(new Date(list.created_at), 'MMM d, yyyy');
  const creatorName = list.creator?.full_name || 'Unknown';
  
  // Current week date
  const currentWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekOfDate = format(currentWeekStart, 'MMM d, yyyy');

  // Mock week history - in real implementation, fetch from API
  const weekHistory: WeekHistoryItem[] = [
    {
      id: '1',
      date: 'Jan 27, 2026',
      checkedOutBy: 'Vikram Rao',
      checkedOutAt: 'Jan 31, 2026 at 5:42 PM',
      closedCount: 7,
      carriedCount: 3,
    },
    {
      id: '2',
      date: 'Jan 20, 2026',
      checkedOutBy: 'Sarah Chen',
      checkedOutAt: 'Jan 24, 2026 at 6:15 PM',
      closedCount: 8,
      carriedCount: 2,
    },
  ];

  const handleToggleHistory = (e: React.MouseEvent) => {
    e.stopPropagation();
    setHistoryOpen(!historyOpen);
  };

  const getStatusLabel = () => {
    switch (list.status) {
      case 'active': return 'Active';
      case 'inactive': return 'Inactive';
      case 'archived': return 'Archived';
      default: return list.status;
    }
  };

  return (
    <div className="t10-list-card">
      {/* Main clickable area */}
      <div className="t10-list-card__main" onClick={onClick}>
        {/* HEADER ROW - Everything on one line */}
        <div className="t10-list-card__header">
          {/* Left side: ID + Title */}
          <div className="t10-list-card__title-row">
            <span className="t10-list-id">{list.list_key}</span>
            <h3 className="t10-list-card__title">{list.name}</h3>
          </div>
          {/* Right side: Status + Menu */}
          <div className="t10-list-card__actions">
            <span className={`t10-status-badge t10-status-badge--${list.status}`}>
              {getStatusLabel()}
            </span>
            <button 
              className="t10-menu-btn"
              onClick={(e) => {
                e.stopPropagation();
                onMenuClick?.(e);
              }}
            >
              <MoreVertical size={20} />
            </button>
          </div>
        </div>
        
        {/* Meta line - Created by */}
        <div className="t10-list-card__meta">
          Created by <strong>{creatorName}</strong> · {createdDate}
        </div>
        
        {/* Week info */}
        <div className="t10-list-card__week">
          Week of <strong>{weekOfDate}</strong>
        </div>
        
        {/* Progress bar */}
        <div className="t10-progress-bar">
          <div 
            className="t10-progress-bar__fill" 
            style={{ width: `${progress}%` }}
          />
        </div>
        
        {/* Stats */}
        <div className="t10-list-card__stats">
          <strong>{list.completed_count}</strong> of <strong>{list.item_count}</strong> completed
          {list.slots_available > 0 && (
            <> · <span className="slots">{list.slots_available} slots available</span></>
          )}
        </div>
      </div>
      
      {/* Week history toggle */}
      <div 
        className={`t10-week-history-toggle ${historyOpen ? 't10-week-history-toggle--expanded' : ''}`}
        onClick={handleToggleHistory}
      >
        <span className="t10-week-history-toggle__text">
          <Clock size={16} />
          {historyOpen ? 'Hide past weeks' : 'Show past weeks'}
        </span>
        <ChevronDown className="t10-week-history-toggle__chevron" />
      </div>
      
      {/* Expandable history */}
      {historyOpen && (
        <div className="t10-week-history">
          {weekHistory.map((week) => (
            <div key={week.id} className="t10-week-history__item">
              <div className="t10-week-history__check">
                <Check size={12} />
              </div>
              <span className="t10-week-history__date">{week.date}</span>
              <div className="t10-week-history__info">
                <div className="t10-week-history__author">
                  Checked out by <strong>{week.checkedOutBy}</strong>
                </div>
                <div className="t10-week-history__timestamp">{week.checkedOutAt}</div>
                <div className="t10-week-history__stats">
                  <span className="closed">{week.closedCount} closed</span> · 
                  <span className="carried"> {week.carriedCount} carried</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default T10ListCard;
