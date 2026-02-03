// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT: T10ListCardNew
// Purpose: Individual list card with current week + week history
// Uses database hooks to fetch week data
// ═══════════════════════════════════════════════════════════════════════════════

import React from 'react';
import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { T10StatusBadge } from './T10StatusBadge';
import { T10ProgressBar } from './T10ProgressBar';
import { T10ListCardMenu } from './T10ListCardMenu';
import { T10WeekHistory } from './T10WeekHistory';
import { useT10CurrentWeek, useT10CreateWeek, getCurrentWeekRange } from '../../hooks';
import { formatT10Date, getT10SlotsAvailable } from '../../utils';
import type { T10List } from '../../types';

interface T10ListCardNewProps {
  list: T10List;
  onRename: () => void;
  onDelete: () => void;
}

export function T10ListCardNew({ list, onRename, onDelete }: T10ListCardNewProps) {
  const navigate = useNavigate();
  
  // Fetch current week for this list
  const { data: currentWeek, isLoading: weekLoading } = useT10CurrentWeek(list.id);
  const createWeek = useT10CreateWeek();

  const hasCurrentWeek = !!currentWeek;
  const completedCount = currentWeek?.completed_count ?? 0;
  const totalCount = currentWeek?.total_count ?? 0;
  const slotsAvailable = getT10SlotsAvailable(totalCount);

  // Format current week date
  const weekLabel = currentWeek?.week_start 
    ? formatT10Date(currentWeek.week_start)
    : '';

  const handleCardClick = () => {
    if (hasCurrentWeek && currentWeek) {
      navigate(`/taskhub/task10/list/${list.id}/week/${currentWeek.id}`);
    } else {
      // Navigate to list view
      navigate(`/taskhub/task10/list/${list.id}`);
    }
    console.log('[T10] List card clicked:', list.key);
  };

  const handleStartWeek = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const range = getCurrentWeekRange();
    try {
      const newWeek = await createWeek.mutateAsync({
        list_id: list.id,
        week_start: range.start,
        week_end: range.end,
        is_current: true,
      });
      console.log('[T10] New week started for list:', list.key, newWeek.id);
      // Navigate to the newly created week
      navigate(`/taskhub/task10/list/${list.id}/week/${newWeek.id}`);
    } catch (error) {
      console.error('[T10] Failed to start week:', error);
    }
  };

  return (
    <div 
      className={`t10-list-card ${list.status === 'inactive' ? 'inactive' : ''}`}
      onClick={handleCardClick}
      role="article"
      aria-label={`List: ${list.name}`}
      style={{ cursor: 'pointer', padding: '20px 24px' }}
    >
      {/* Header */}
      <div className="t10-list-card-header">
        <div className="t10-list-card-header-left">
          <span className="t10-list-card-key">{list.key}</span>
          <h3 className="t10-list-card-title">{list.name}</h3>
        </div>
        <div className="t10-list-card-header-right">
          <T10StatusBadge status={list.status} />
          <T10ListCardMenu onRename={onRename} onDelete={onDelete} />
        </div>
      </div>

      {/* Meta */}
      <p className="t10-list-card-meta">
        Created {list.created_by_name ? `by ${list.created_by_name}` : ''} · {formatT10Date(list.created_at)}
      </p>

      {/* Current Week */}
      {weekLoading ? (
        <div className="t10-current-week">
          <div className="t10-skeleton" style={{ height: '16px', width: '120px', marginBottom: '8px' }} />
          <div className="t10-skeleton" style={{ height: '8px', width: '100%', marginBottom: '8px' }} />
          <div className="t10-skeleton" style={{ height: '14px', width: '180px' }} />
        </div>
      ) : hasCurrentWeek ? (
        <div className="t10-current-week">
          <p className="t10-current-week-label">
            Week of <strong>{weekLabel}</strong>
          </p>
          
          <T10ProgressBar 
            completed={completedCount} 
            total={totalCount} 
          />
          
          <div className="t10-current-week-stats">
            <span className="t10-current-week-completed">
              {completedCount}
            </span>
            <span className="t10-current-week-total">
              of {totalCount} completed
            </span>
            {slotsAvailable > 0 && (
              <>
                <span className="t10-current-week-separator">·</span>
                <span className="t10-current-week-slots">
                  {slotsAvailable} slots available
                </span>
              </>
            )}
          </div>
        </div>
      ) : (
        <div 
          className="t10-no-active-week"
          style={{
            padding: '20px',
            background: '#f8fafc',
            borderRadius: '12px',
            textAlign: 'center',
            marginTop: '12px',
          }}
        >
          <p 
            className="t10-no-active-week-text"
            style={{
              fontSize: '14px',
              color: '#64748b',
              marginBottom: '12px',
            }}
          >
            No active week
          </p>
          <button
            type="button"
            className="t10-no-active-week-btn"
            onClick={handleStartWeek}
            disabled={createWeek.isPending}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              height: '36px',
              padding: '0 16px',
              fontFamily: 'Inter, system-ui, sans-serif',
              fontSize: '14px',
              fontWeight: 500,
              color: '#ffffff',
              background: '#3b82f6',
              border: 'none',
              borderRadius: '8px',
              cursor: createWeek.isPending ? 'not-allowed' : 'pointer',
              opacity: createWeek.isPending ? 0.6 : 1,
              transition: 'all 0.15s ease',
            }}
          >
            <Plus size={16} style={{ color: '#ffffff' }} />
            {createWeek.isPending ? 'Starting...' : 'Start this week'}
          </button>
        </div>
      )}

      {/* CRITICAL: Week History */}
      <T10WeekHistory listId={list.id} />
    </div>
  );
}

export default T10ListCardNew;
