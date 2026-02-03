// ═══════════════════════════════════════════════════════════════════════════
// TASK¹⁰ PANEL DETAILS TAB COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

import { useState } from 'react';
import { Calendar, User, Tag, FileText } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import type { T10ItemWithAssignee } from '../../types';
import { T10RankBadge } from '../week-view/T10RankBadge';

interface T10PanelDetailsTabProps {
  item: T10ItemWithAssignee;
  onUpdate?: (itemId: string, updates: Partial<T10ItemWithAssignee>) => void;
}

export function T10PanelDetailsTab({ item, onUpdate }: T10PanelDetailsTabProps) {
  const [description, setDescription] = useState(item.description || '');
  const [isEditingDescription, setIsEditingDescription] = useState(false);

  const handleDescriptionSave = () => {
    if (description !== item.description) {
      onUpdate?.(item.id, { description });
    }
    setIsEditingDescription(false);
  };

  return (
    <div className="t10-panel-details">
      {/* Rank & Status */}
      <div className="t10-panel-details__section">
        <div className="t10-panel-details__row">
          <div className="t10-panel-details__field">
            <span className="t10-panel-details__label">Priority Rank</span>
            <div className="t10-panel-details__rank">
              <T10RankBadge rank={item.rank} />
              <span className="t10-panel-details__rank-text">
                {item.rank <= 5 ? 'Top 5' : item.rank <= 10 ? 'Top 10' : 'Buffer'}
              </span>
            </div>
          </div>
          
          <div className="t10-panel-details__field">
            <span className="t10-panel-details__label">Status</span>
            <span className={`t10-status-badge t10-status-badge--${item.status}`}>
              {item.status === 'todo' ? 'To Do' : 
               item.status === 'done' ? 'Done' : 
               item.status === 'resolved' ? 'Resolved' : 'Removed'}
            </span>
          </div>
        </div>
      </div>

      {/* Assignee */}
      <div className="t10-panel-details__section">
        <div className="t10-panel-details__field">
          <span className="t10-panel-details__label">
            <User className="t10-panel-details__label-icon" />
            Assignee
          </span>
          {item.assignee ? (
            <div className="t10-panel-details__assignee">
              {item.assignee.avatar_url ? (
                <img 
                  src={item.assignee.avatar_url} 
                  alt={item.assignee.full_name || ''} 
                  className="t10-panel-details__avatar"
                />
              ) : (
                <span className="t10-panel-details__avatar-placeholder">
                  {(item.assignee.full_name || 'U').charAt(0)}
                </span>
              )}
              <span>{item.assignee.full_name}</span>
            </div>
          ) : (
            <span className="t10-panel-details__empty">Unassigned</span>
          )}
        </div>
      </div>

      {/* Due Date */}
      <div className="t10-panel-details__section">
        <div className="t10-panel-details__field">
          <span className="t10-panel-details__label">
            <Calendar className="t10-panel-details__label-icon" />
            Due Date
          </span>
          {item.due_date ? (
            <span className="t10-panel-details__date">
              {format(parseISO(item.due_date), 'MMM d, yyyy')}
            </span>
          ) : (
            <span className="t10-panel-details__empty">No due date</span>
          )}
        </div>
      </div>

      {/* Label */}
      <div className="t10-panel-details__section">
        <div className="t10-panel-details__field">
          <span className="t10-panel-details__label">
            <Tag className="t10-panel-details__label-icon" />
            Label
          </span>
          {item.label ? (
            <span className="t10-panel-details__tag">{item.label}</span>
          ) : (
            <span className="t10-panel-details__empty">No label</span>
          )}
        </div>
      </div>

      {/* Description */}
      <div className="t10-panel-details__section t10-panel-details__section--description">
        <div className="t10-panel-details__field">
          <span className="t10-panel-details__label">
            <FileText className="t10-panel-details__label-icon" />
            Description
          </span>
          {isEditingDescription ? (
            <div className="t10-panel-details__description-edit">
              <textarea
                className="t10-textarea"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add a description..."
                rows={4}
                autoFocus
              />
              <div className="t10-panel-details__description-actions">
                <button 
                  className="t10-btn t10-btn--sm t10-btn--ghost"
                  onClick={() => {
                    setDescription(item.description || '');
                    setIsEditingDescription(false);
                  }}
                >
                  Cancel
                </button>
                <button 
                  className="t10-btn t10-btn--sm t10-btn--primary"
                  onClick={handleDescriptionSave}
                >
                  Save
                </button>
              </div>
            </div>
          ) : (
            <div 
              className="t10-panel-details__description"
              onClick={() => setIsEditingDescription(true)}
            >
              {item.description || 'Click to add a description...'}
            </div>
          )}
        </div>
      </div>

      {/* Carryover Info */}
      {item.carryover_count > 0 && (
        <div className="t10-panel-details__section">
          <div className="t10-panel-details__carryover-notice">
            <span>⚠️ This item has been carried over {item.carryover_count} time{item.carryover_count > 1 ? 's' : ''}</span>
          </div>
        </div>
      )}

      {/* Timestamps */}
      <div className="t10-panel-details__section t10-panel-details__section--meta">
        <div className="t10-panel-details__meta">
          <span>Created {format(parseISO(item.created_at), 'MMM d, yyyy')}</span>
          <span>Updated {format(parseISO(item.updated_at), 'MMM d, yyyy')}</span>
        </div>
      </div>
    </div>
  );
}

export default T10PanelDetailsTab;
