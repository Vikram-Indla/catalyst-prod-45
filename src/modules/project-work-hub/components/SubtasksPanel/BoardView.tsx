import React from 'react';
import type { SubtaskRow } from './hooks/useSubtaskMutations';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { PriorityIndicator } from '@/components/shared/PriorityIndicator';
import { getInitials, getAvatarColor } from '../dialogs/story-detail-modules/helpers';

interface BoardViewProps {
  subtasks: SubtaskRow[];
  avatarMap: Record<string, string | null>;
  onCardClick: (id: string) => void;
}

const COLUMNS: Array<{ key: 'todo' | 'in_progress' | 'done'; label: string; badge: string }> = [
  { key: 'todo', label: 'To Do', badge: 'sp-status-btn--todo' },
  { key: 'in_progress', label: 'In Progress', badge: 'sp-status-btn--inprogress' },
  { key: 'done', label: 'Done', badge: 'sp-status-btn--done' },
];

export function BoardView({ subtasks, avatarMap, onCardClick }: BoardViewProps) {
  const byCat: Record<string, SubtaskRow[]> = { todo: [], in_progress: [], done: [] };
  for (const s of subtasks) {
    const cat = (s.status_category ?? 'todo').toLowerCase();
    const bucket = cat === 'done' ? 'done' : cat === 'in_progress' || cat === 'indeterminate' ? 'in_progress' : 'todo';
    byCat[bucket].push(s);
  }

  return (
    <div className="sp-board">
      {COLUMNS.map((col) => (
        <div key={col.key} className="sp-board-col">
          <div className="sp-board-col-header">
            <span className={`sp-status-btn ${col.badge}`} style={{ cursor: 'default' }}>
              {col.label}
            </span>
            <span className="sp-board-count">{byCat[col.key].length}</span>
          </div>
          <div className="sp-board-col-body">
            {byCat[col.key].length === 0 && (
              <div className="sp-board-empty">No items</div>
            )}
            {byCat[col.key].map((s) => (
              <div
                key={s.id}
                className="sp-board-card"
                onClick={() => onCardClick(s.id)}
              >
                <div className="sp-board-card-summary">{s.summary}</div>
                <div className="sp-board-card-meta">
                  <span className="sp-board-card-key">
                    <JiraIssueTypeIcon type={s.issue_type} size={14} />
                    <span>{s.issue_key}</span>
                  </span>
                  <PriorityIndicator priority={s.priority} showLabel={false} barHeight={12} barWidth={3} />
                  {s.assignee_display_name ? (
                    s.assignee_account_id && avatarMap[s.assignee_account_id] ? (
                      <img
                        src={avatarMap[s.assignee_account_id]!}
                        alt={s.assignee_display_name}
                        className="sp-avatar"
                        style={{ width: 20, height: 20, marginLeft: 'auto' }}
                      />
                    ) : (
                      <span
                        className="sp-avatar-fallback"
                        style={{
                          width: 20,
                          height: 20,
                          fontSize: 9,
                          background: getAvatarColor(s.assignee_display_name),
                          marginLeft: 'auto',
                        }}
                      >
                        {getInitials(s.assignee_display_name)}
                      </span>
                    )
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
