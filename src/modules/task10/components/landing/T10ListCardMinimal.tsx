// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT: T10ListCardMinimal
// Purpose: Linear-inspired list card with subtle borders, hover lift, inline progress
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { MoreHorizontal, Pencil, Trash2, ChevronDown, ChevronUp, Play } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useT10WeekHistory, useT10CreateWeek, getCurrentWeekRange } from '../../hooks';
import { formatT10Date, getT10Progress } from '../../utils';
import type { T10ListSummary } from '../../types';

interface T10ListCardMinimalProps {
  list: T10ListSummary;
  onRename: () => void;
  onDelete: () => void;
}

export function T10ListCardMinimal({ list, onRename, onDelete }: T10ListCardMinimalProps) {
  const navigate = useNavigate();
  const [showHistory, setShowHistory] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  
  const { data: weekHistory } = useT10WeekHistory(list.id);
  const createWeek = useT10CreateWeek();

  const progress = getT10Progress(list.completed_count || 0, list.total_count || 0);
  const hasWeeks = (weekHistory?.length ?? 0) > 0;
  const currentWeek = weekHistory?.find(w => w.is_current);

  const handleCardClick = () => {
    if (currentWeek) {
      navigate(`/taskhub/task10/list/${list.id}/week/${currentWeek.id}`);
    }
  };

  const handleStartWeek = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const { start, end } = getCurrentWeekRange();
      await createWeek.mutateAsync({
        list_id: list.id,
        week_start: start,
        week_end: end,
        is_current: true,
      });
      navigate(`/taskhub/task10/list/${list.id}`);
    } catch (err) {
      console.error('[T10] Failed to create week:', err);
    }
  };

  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(!showMenu);
  };

  return (
    <div 
      className="t10-card-minimal"
      onClick={handleCardClick}
      style={{ cursor: currentWeek ? 'pointer' : 'default' }}
    >
      {/* Header Row */}
      <div className="t10-card-minimal-header">
        <div className="t10-card-minimal-info">
          {/* Status dot */}
          <div className={`t10-dot ${list.status === 'active' ? 't10-dot-active' : 't10-dot-inactive'}`} />
          
          {/* Name */}
          <span className="t10-card-minimal-name">{list.name}</span>
          
          {/* Key */}
          <span className="t10-card-minimal-key">{list.key}</span>
        </div>

        {/* Actions */}
        <div className="t10-card-minimal-actions">
          {!currentWeek && (
            <button
              type="button"
              className="t10-btn-start"
              onClick={handleStartWeek}
              disabled={createWeek.isPending}
            >
              <Play size={12} />
              Start week
            </button>
          )}
          
          <div className="t10-menu-wrap">
            <button
              type="button"
              className="t10-btn-icon-minimal"
              onClick={handleMenuClick}
            >
              <MoreHorizontal size={16} />
            </button>
            
            {showMenu && (
              <>
                <div className="t10-menu-backdrop-minimal" onClick={() => setShowMenu(false)} />
                <div className="t10-menu-minimal">
                  <button
                    type="button"
                    className="t10-menu-item-minimal"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMenu(false);
                      onRename();
                    }}
                  >
                    <Pencil size={14} />
                    Rename
                  </button>
                  <button
                    type="button"
                    className="t10-menu-item-minimal t10-menu-danger"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMenu(false);
                      onDelete();
                    }}
                  >
                    <Trash2 size={14} />
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Progress Bar (always visible, 4px thin) */}
      <div className="t10-progress-minimal">
        <div 
          className={`t10-progress-fill-minimal ${progress === 100 ? 't10-progress-complete' : ''}`}
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Meta Row */}
      <div className="t10-card-minimal-meta">
        <span className="t10-card-minimal-stats">
          {list.completed_count || 0}/{list.total_count || 0} completed
        </span>
        {currentWeek && (
          <span className="t10-card-minimal-week">
            Week of {formatT10Date(currentWeek.week_start)}
          </span>
        )}
      </div>

      {/* Week History Toggle */}
      {hasWeeks && (weekHistory?.length ?? 0) > 1 && (
        <button
          type="button"
          className="t10-history-toggle"
          onClick={(e) => {
            e.stopPropagation();
            setShowHistory(!showHistory);
          }}
        >
          {showHistory ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          {(weekHistory?.length ?? 0) - 1} past week{(weekHistory?.length ?? 0) - 1 !== 1 ? 's' : ''}
        </button>
      )}

      {/* Week History (collapsed by default) */}
      {showHistory && weekHistory && weekHistory.length > 1 && (
        <div className="t10-history-list">
          {weekHistory
            .filter(w => !w.is_current)
            .slice(0, 3)
            .map(week => (
              <div 
                key={week.id} 
                className="t10-history-item"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/taskhub/task10/list/${list.id}/week/${week.id}`);
                }}
              >
                <span className="t10-history-date">
                  Week of {formatT10Date(week.week_start)}
                </span>
                <span className="t10-history-stats">
                  {week.completed_count}/{week.total_count}
                </span>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

export default T10ListCardMinimal;
