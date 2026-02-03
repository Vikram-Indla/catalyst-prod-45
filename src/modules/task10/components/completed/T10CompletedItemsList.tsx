// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT: T10CompletedItemsList
// Purpose: Expanded row showing items for verification
// ═══════════════════════════════════════════════════════════════════════════════

import React from 'react';
import { Check, ArrowRight, X } from 'lucide-react';
import { useT10CompletedItems } from '../../hooks/useT10Completed';
import { formatT10Date } from '../../utils';
import type { T10CompletedItem } from '../../types/completed';

interface Props {
  weekId: string;
  checkoutAt: string | null;
  checkoutByName: string | null;
  completedCount: number;
  carriedForwardCount: number;
  droppedCount: number;
  totalCount: number;
}

export function T10CompletedItemsList({
  weekId,
  checkoutAt,
  checkoutByName,
  completedCount,
  carriedForwardCount,
  droppedCount,
  totalCount,
}: Props) {
  const { data: items, isLoading } = useT10CompletedItems(weekId);

  const getStatusIcon = (status: T10CompletedItem['item_status']) => {
    switch (status) {
      case 'completed':
        return <Check size={14} className="t10-status-done" />;
      case 'carried_forward':
        return <ArrowRight size={14} className="t10-status-fwd" />;
      case 'dropped':
        return <X size={14} className="t10-status-drop" />;
    }
  };

  const getStatusLabel = (status: T10CompletedItem['item_status']) => {
    switch (status) {
      case 'completed':
        return 'Done';
      case 'carried_forward':
        return 'Fwd';
      case 'dropped':
        return 'Drop';
    }
  };

  if (isLoading) {
    return (
      <div className="t10-items-loading">
        Loading items...
      </div>
    );
  }

  const rate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="t10-expanded-inner">
      <div className="t10-expanded-header">
        <span className="t10-expanded-title">
          Items for this week ({items?.length || 0})
        </span>
        {checkoutAt && (
          <span className="t10-expanded-meta">
            Checked out: {formatT10Date(checkoutAt)} by {checkoutByName || 'Unknown'}
          </span>
        )}
      </div>

      <table className="t10-items-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Item</th>
            <th>Assignee</th>
            <th>Due</th>
            <th>Status</th>
            <th>TaskHub</th>
          </tr>
        </thead>
        <tbody>
          {items?.map((item) => (
            <tr key={item.item_id}>
              <td className="t10-rank">{item.rank}</td>
              <td className="t10-item-title">{item.title}</td>
              <td>
                {item.assignee_name ? (
                  <div className="t10-assignee">
                    <span className="t10-avatar">
                      {item.assignee_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </span>
                    {item.assignee_name}
                  </div>
                ) : (
                  <span className="t10-unassigned">—</span>
                )}
              </td>
              <td>
                {item.due_date ? formatT10Date(item.due_date) : '—'}
              </td>
              <td>
                <span className={`t10-item-status ${item.item_status}`}>
                  {getStatusIcon(item.item_status)}
                  {getStatusLabel(item.item_status)}
                </span>
              </td>
              <td>
                {item.taskhub_key ? (
                  <a
                    href={`/taskhub/${item.taskhub_key}`}
                    className="t10-taskhub-link"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {item.taskhub_key}
                  </a>
                ) : (
                  '—'
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="t10-expanded-footer">
        <span>
          <strong>Completed:</strong> {completedCount}/{totalCount} ({rate}%)
        </span>
        <span>
          <strong>Carried Forward:</strong> {carriedForwardCount}
        </span>
        <span>
          <strong>Dropped:</strong> {droppedCount}
        </span>
      </div>
    </div>
  );
}

export default T10CompletedItemsList;
