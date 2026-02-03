import React, { useState } from 'react';
import { MoreVertical, Edit, Trash2, Clock, Check, ChevronDown } from 'lucide-react';
import type { T10List, T10Week } from '../../types';
import { formatWeekDate, formatShortDate } from '../../utils';

interface T10ListCardProps {
  list: T10List;
  currentWeek?: T10Week;
  completedCount: number;
  totalCount: number;
  slotsAvailable?: number;
  weekHistory?: T10Week[];
  onClick: () => void;
  onRename: () => void;
  onDelete: () => void;
}

export function T10ListCard({
  list,
  currentWeek,
  completedCount,
  totalCount,
  slotsAvailable = 0,
  weekHistory = [],
  onClick,
  onRename,
  onDelete,
}: T10ListCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <div className={`t10-list-card ${list.status === 'inactive' ? 'inactive' : ''}`}>
      <div className="t10-list-card-main" onClick={onClick}>
        <div className="t10-list-card-header">
          <div className="t10-list-card-title-row">
            <span className="t10-list-id">{list.key}</span>
            <span className="t10-list-card-title">{list.name}</span>
          </div>
          <div className="t10-list-card-actions">
            <span className={`t10-status-badge ${list.status}`}>
              {list.status === 'active' ? 'Active' : 'Inactive'}
            </span>
            <button
              className="t10-list-card-menu-btn"
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen(!menuOpen);
              }}
            >
              <MoreVertical size={20} />
            </button>
            <div className={`t10-dropdown-menu ${menuOpen ? 'open' : ''}`}>
              <button
                className="t10-dropdown-item"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(false);
                  onRename();
                }}
              >
                <Edit size={16} />
                Rename
              </button>
              <div className="t10-dropdown-divider" />
              <button
                className="t10-dropdown-item danger"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(false);
                  onDelete();
                }}
              >
                <Trash2 size={16} />
                Delete
              </button>
            </div>
          </div>
        </div>
        <div className="t10-list-card-meta">
          Created by <strong>{list.created_by_name}</strong> · {formatShortDate(list.created_at)}
        </div>
        {currentWeek ? (
          <>
            <div className="t10-list-card-week">
              <span className="t10-list-card-week-label">
                Week of <strong>{formatWeekDate(currentWeek.week_start_date)}</strong>
              </span>
            </div>
            <div className="t10-progress-bar">
              <div className="t10-progress-fill" style={{ width: `${progress}%` }} />
            </div>
            <div className="t10-list-card-stats">
              <strong>{completedCount}</strong> of {totalCount} completed
              {slotsAvailable > 0 && (
                <> · <span className="slots">{slotsAvailable} slots available</span></>
              )}
            </div>
          </>
        ) : (
          <div className="t10-list-card-meta" style={{ marginTop: '8px', fontStyle: 'italic' }}>
            No active week
          </div>
        )}
      </div>

      {/* Week History Toggle */}
      {weekHistory.length > 0 && (
        <>
          <div
            className="t10-week-history-toggle"
            onClick={(e) => {
              e.stopPropagation();
              setHistoryOpen(!historyOpen);
            }}
          >
            <span className="t10-week-history-toggle-text">
              <Clock size={16} />
              {historyOpen ? 'Hide' : 'Show'} past weeks
            </span>
            <ChevronDown
              size={16}
              className={`t10-week-history-chevron ${historyOpen ? 'rotated' : ''}`}
            />
          </div>

          {historyOpen && (
            <div className="t10-week-history">
              <div className="t10-week-history-list">
                {weekHistory.map((week) => (
                  <div key={week.id} className="t10-week-history-item">
                    <span className="t10-week-history-date">
                      {formatShortDate(week.week_start_date)}
                    </span>
                    <span className="t10-week-history-check">
                      <Check size={16} />
                    </span>
                    <div className="t10-week-history-details">
                      <div className="t10-week-history-audit">
                        Checked out by <strong>{week.checked_out_by_name}</strong>
                      </div>
                      <div className="t10-week-history-timestamp">
                        {week.checked_out_at}
                      </div>
                      <div className="t10-week-history-stats">
                        <span className="closed">{week.closed_count} closed</span> ·{' '}
                        <span className="carried">{week.carried_count} carried</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
