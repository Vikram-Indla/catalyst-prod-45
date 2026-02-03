// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT: T10CompletedWeeksTable
// Purpose: Main table of completed weeks with expandable rows
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useT10CompletedWeeks } from '../../hooks/useT10Completed';
import { T10CompletedItemsList } from './T10CompletedItemsList';
import { formatT10DateRange } from '../../utils';
import type { T10CompletedFilters } from '../../types/completed';

interface Props {
  filters?: T10CompletedFilters;
  onListClick?: (listId: string) => void;
}

export function T10CompletedWeeksTable({ filters, onListClick }: Props) {
  const { data: weeks, isLoading, error } = useT10CompletedWeeks(filters);
  const [expandedWeekId, setExpandedWeekId] = useState<string | null>(null);

  const toggleExpand = (weekId: string) => {
    setExpandedWeekId(expandedWeekId === weekId ? null : weekId);
  };

  const getStatusBadge = (rate: number) => {
    if (rate === 100) return { label: '✓ Full', className: 'full' };
    if (rate >= 70) return { label: '○ Part', className: 'partial' };
    return { label: '◐ Low', className: 'low' };
  };

  const getRateClass = (rate: number) => {
    if (rate === 100) return 'high';
    if (rate >= 70) return 'medium';
    return 'low';
  };

  if (isLoading) {
    return (
      <div className="t10-table-loading">
        <div className="t10-spinner" />
        <span>Loading completed weeks...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="t10-table-error">
        Error loading data. Please try again.
      </div>
    );
  }

  if (!weeks?.length) {
    return (
      <div className="t10-table-empty">
        <div className="t10-empty-icon">📋</div>
        <div className="t10-empty-title">No completed weeks yet</div>
        <div className="t10-empty-description">
          Complete a week by checking out your current week
        </div>
      </div>
    );
  }

  return (
    <div className="t10-table-container">
      <table className="t10-table">
        <thead>
          <tr>
            <th style={{ width: '24px' }}></th>
            <th>List Name</th>
            <th>Week</th>
            <th>Total</th>
            <th>Done</th>
            <th>Fwd</th>
            <th>Rate</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {weeks.map((week) => (
            <React.Fragment key={week.week_id}>
              {/* Main Row */}
              <tr
                className={expandedWeekId === week.week_id ? 't10-row-expanded' : ''}
                onClick={() => toggleExpand(week.week_id)}
              >
                <td>
                  {expandedWeekId === week.week_id ? (
                    <ChevronDown size={16} />
                  ) : (
                    <ChevronRight size={16} />
                  )}
                </td>
                <td>
                  <div
                    className="t10-list-name"
                    onClick={(e) => {
                      e.stopPropagation();
                      onListClick?.(week.list_id);
                    }}
                  >
                    {week.list_name}
                  </div>
                  <div className="t10-list-key">{week.list_key}</div>
                </td>
                <td className="t10-week-range">
                  {formatT10DateRange(week.week_start, week.week_end)}
                </td>
                <td className="t10-number">{week.total_count}</td>
                <td className="t10-number">{week.completed_count}</td>
                <td className="t10-number">{week.carried_forward_count}</td>
                <td className={`t10-rate ${getRateClass(week.completion_rate)}`}>
                  {week.completion_rate}%
                </td>
                <td>
                  <span className={`t10-status-badge ${getStatusBadge(week.completion_rate).className}`}>
                    {getStatusBadge(week.completion_rate).label}
                  </span>
                </td>
              </tr>

              {/* Expanded Row */}
              {expandedWeekId === week.week_id && (
                <tr className="t10-expanded-row">
                  <td colSpan={8}>
                    <T10CompletedItemsList
                      weekId={week.week_id}
                      checkoutAt={week.checkout_at}
                      checkoutByName={week.checkout_by_name}
                      completedCount={week.completed_count}
                      carriedForwardCount={week.carried_forward_count}
                      droppedCount={week.dropped_count}
                      totalCount={week.total_count}
                    />
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default T10CompletedWeeksTable;
