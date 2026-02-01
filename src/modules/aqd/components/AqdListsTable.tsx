// Aqd¹⁰ Enhanced Lists Table with Actions + Progress
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Edit2, Trash2, MoreHorizontal, Archive, Pin, Check, Clock } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { AqdList } from '@/types/aqd';

interface AqdListsTableProps {
  lists: AqdList[];
  onTogglePin: (id: string, isPinned: boolean) => void;
  onArchive: (id: string) => void;
  onDelete: (id: string, hasItems: boolean) => void;
  onEdit?: (id: string) => void;
}

// Helper to get relative time
function getRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function AqdListsTable({ lists, onTogglePin, onArchive, onDelete, onEdit }: AqdListsTableProps) {
  const navigate = useNavigate();

  const handleRowClick = (list: AqdList) => {
    const listSlug = encodeURIComponent(list.name.toLowerCase().replace(/\s+/g, '-'));
    navigate(`/aqd/${listSlug}`);
  };

  return (
    <div className="aqd-dash-table-container">
      <div className="aqd-dash-section-title">
        <h3>Priority Lists</h3>
        <span className="count">{lists.length}</span>
      </div>

      <table className="aqd-dash-table">
        <thead>
          <tr>
            <th style={{ width: 50 }}>#</th>
            <th>List Name</th>
            <th style={{ width: 140 }}>Owner</th>
            <th style={{ width: 160 }}>Progress</th>
            <th style={{ width: 130 }}>Status</th>
            <th style={{ width: 150, textAlign: 'right' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {lists.map((list, index) => {
            const itemCount = list.item_count ?? 0;
            const completedCount = list.completed_count ?? 0;
            const progressPercent = itemCount > 0 ? Math.round((completedCount / itemCount) * 100) : 0;
            
            return (
              <tr 
                key={list.id} 
                onClick={() => handleRowClick(list)}
              >
                <td>
                  <span className="aqd-dash-row-num">{index + 1}</span>
                </td>
                <td>
                  <div className="aqd-dash-list-name">
                    <div className="aqd-dash-list-badge">10</div>
                    <div className="aqd-dash-list-info">
                      <h4>
                        {list.name}
                        {list.is_pinned && (
                          <Pin 
                            size={12} 
                            style={{ 
                              marginLeft: 6, 
                              display: 'inline', 
                              fill: 'var(--aqd-dash-blue-500)',
                              color: 'var(--aqd-dash-blue-500)' 
                            }} 
                          />
                        )}
                      </h4>
                      <p>Updated {getRelativeTime(list.updated_at)}</p>
                    </div>
                  </div>
                </td>
                <td>
                  <span className="aqd-dash-owner">{list.created_by_name || '—'}</span>
                </td>
                <td>
                  <div className="aqd-dash-progress-cell">
                    <div className="aqd-dash-progress-bar">
                      <div 
                        className="aqd-dash-progress-fill" 
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                    <span className="aqd-dash-progress-text">{completedCount}/{itemCount}</span>
                  </div>
                </td>
                <td>
                  {list.is_archived ? (
                    <span className="aqd-dash-status aqd-dash-status--archived">
                      <span className="aqd-dash-status-dot" />
                      Archived
                    </span>
                  ) : list.current_week_status === 'checkout_pending' ? (
                    <span className="aqd-dash-status" style={{ 
                      background: 'var(--aqd-dash-amber-100)', 
                      color: '#d97706' 
                    }}>
                      <Clock size={12} />
                      Pending
                    </span>
                  ) : (
                    <span className="aqd-dash-status aqd-dash-status--active">
                      <span className="aqd-dash-status-dot" />
                      Active
                    </span>
                  )}
                </td>
                <td>
                  <div className="aqd-dash-actions" onClick={(e) => e.stopPropagation()}>
                    <button 
                      className="aqd-dash-action-btn"
                      title="View"
                      onClick={() => handleRowClick(list)}
                    >
                      <Eye size={16} />
                    </button>
                    <button 
                      className="aqd-dash-action-btn"
                      title="Pin"
                      onClick={() => onTogglePin(list.id, !list.is_pinned)}
                    >
                      <Pin 
                        size={16} 
                        style={list.is_pinned ? { fill: 'var(--aqd-dash-blue-500)', color: 'var(--aqd-dash-blue-500)' } : undefined}
                      />
                    </button>
                    <button 
                      className="aqd-dash-action-btn aqd-dash-action-btn--danger"
                      title="Delete"
                      onClick={() => onDelete(list.id, (list.item_count ?? 0) > 0)}
                    >
                      <Trash2 size={16} />
                    </button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="aqd-dash-action-btn" title="More">
                          <MoreHorizontal size={16} />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEdit?.(list.id)}>
                          <Edit2 size={14} style={{ marginRight: 8 }} />
                          Edit List
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onArchive(list.id)}>
                          <Archive size={14} style={{ marginRight: 8 }} />
                          Archive
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => onDelete(list.id, (list.item_count ?? 0) > 0)}
                          className="text-red-600"
                        >
                          <Trash2 size={14} style={{ marginRight: 8 }} />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {lists.length === 0 && (
        <div style={{ 
          padding: '48px 0', 
          textAlign: 'center', 
          color: 'var(--aqd-dash-slate-400)' 
        }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>⭐</div>
          <div style={{ fontWeight: 500, color: 'var(--aqd-dash-slate-600)' }}>
            No priority lists yet
          </div>
          <div style={{ fontSize: 13, marginTop: 4 }}>
            Create your first Aqd¹⁰ list to start tracking top priorities
          </div>
        </div>
      )}
    </div>
  );
}
