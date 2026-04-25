/**
 * ProjectHub Board View — Full Kanban with board switcher, typed cards, WIP limits, hover actions
 */
import React, { useState, useMemo } from 'react';
import { Plus, Check, UserPlus, Flag, MoreHorizontal, AlertTriangle, Calendar } from 'lucide-react';
import type { PHIssue, PHBoard } from '@/services/project-hub.service';
import { getDisplayKey } from '@/services/project-hub.service';
import type { IssueType } from '@/types/project-hub.types';
import { PHIssueTypeIcon, TYPE_ACCENT } from './PHIssueTypeIcon';
import { PHSourceTag } from './PHSourceTag';
import { PHPriorityIcon } from './PHPriorityIcon';
import { SkeletonCard } from '@/components/project-hub/shared/SkeletonPulse';

interface Props {
  issues: PHIssue[];
  boards: PHBoard[];
  loading?: boolean;
  onSelectIssue: (issue: PHIssue) => void;
  onUpdateIssue: (id: string, updates: Partial<PHIssue>) => void;
}

export function PHBoardView({ issues, boards, loading, onSelectIssue, onUpdateIssue }: Props) {
  const [activeBoardIdx, setActiveBoardIdx] = useState(0);
  const activeBoard = boards[activeBoardIdx] ?? boards[0];
  const columns = activeBoard?.columns ?? [];

  return (
    <div className="flex flex-col gap-3">
      {/* Board Switcher */}
      {boards.length > 1 && (
        <div className="flex items-center gap-0.5 p-1 rounded-lg w-fit bg-[var(--cp-bd-zone)]">
          {boards.map((b, i) => {
            const isActive = activeBoardIdx === i;
            return (
              <button
                key={b.id}
                onClick={() => setActiveBoardIdx(i)}
                className={`transition-all ${isActive ? 'bg-[var(--cp-blue-wash)]' : 'bg-transparent'}`}
                style={{
                  padding: '5px 14px',
                  fontSize: 12,
                  fontWeight: isActive ? 600 : 500,
                  fontFamily: 'var(--ds-font-family-body)',
                  borderRadius: 6,
                  border: isActive ? '1px solid var(--cp-primary-20)' : '1px solid transparent',
                  color: isActive ? 'var(--cp-blue)' : 'var(--fg-3)',
                  cursor: 'pointer',
                }}
              >
                {b.name}
              </button>
            );
          })}
        </div>
      )}

      {/* Kanban Columns */}
      <div
        className="flex gap-3 overflow-x-auto pb-2"
        style={{ minHeight: 'calc(100vh - 320px)' }}
      >
        {columns.map((col: any) => {
          const colIssues = issues.filter(i => col.statuses?.includes(i.status));
          const isOnHold = col.statuses?.includes('on_hold');
          const wipExceeded = col.wip_limit > 0 && colIssues.length > col.wip_limit;

          return (
            <div
              key={col.name}
              className="flex flex-col flex-shrink-0 bg-[var(--cp-bd-zone)]"
              style={{
                minWidth: 280,
                maxWidth: 320,
                flex: '1 1 280px',
                borderRadius: 12,
                padding: '10px 10px 12px',
                border: isOnHold ? '1.5px dashed var(--sem-warning)' : '1px solid var(--divider)',
              }}
            >
              {/* Column Header */}
              <div className="flex items-center gap-2 mb-3 px-1">
                <span
                  className="rounded-full flex-shrink-0"
                  style={{
                    width: 8, height: 8,
                    background: isOnHold ? 'var(--sem-warning)' : col.color,
                  }}
                />
                <span
                  className="uppercase"
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: isOnHold ? 'var(--sem-warning)' : 'var(--fg-3)',
                    fontFamily: 'var(--ds-font-family-body)',
                    letterSpacing: '0.06em',
                  }}
                >
                  {col.name}
                </span>
                <span
                  className="ml-auto flex items-center justify-center rounded-full bg-[var(--bg-app)]"
                  style={{
                    width: 20, height: 20,
                    fontSize: 10,
                    fontWeight: 700,
                    fontFamily: 'var(--ds-font-family-monospaced)',
                    color: wipExceeded ? 'var(--sem-danger)' : 'var(--fg-3)',
                    boxShadow: '0 1px 2px rgba(0,0,0,.06)',
                  }}
                >
                  {colIssues.length}
                </span>
                {col.wip_limit > 0 && (
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 600,
                      color: wipExceeded ? 'var(--sem-danger)' : 'var(--fg-4)',
                    }}
                  >
                    {wipExceeded ? `⚠ max ${col.wip_limit}` : `max ${col.wip_limit}`}
                  </span>
                )}
              </div>

              {/* Cards container */}
              <div className="flex flex-col gap-1.5 flex-1 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 400px)' }}>
                {loading ? (
                  <>
                    <SkeletonCard height={100} />
                    <SkeletonCard height={100} />
                  </>
                ) : colIssues.length === 0 ? (
                  <div
                    className="flex items-center justify-center rounded-lg"
                    style={{
                      padding: '32px 16px',
                      border: '2px dashed var(--divider)',
                      color: 'var(--fg-4)',
                      fontSize: 12,
                      fontWeight: 500,
                    }}
                  >
                    No items
                  </div>
                ) : (
                  colIssues.map(issue => (
                    <BoardCard
                      key={issue.id}
                      issue={issue}
                      isOnHold={isOnHold}
                      onClick={() => onSelectIssue(issue)}
                      onMarkDone={() => onUpdateIssue(issue.id, { status: 'production' } as any)}
                    />
                  ))
                )}
              </div>

              {/* Add issue button */}
              <button
                className="flex items-center gap-1.5 mt-2 w-full rounded-lg transition-colors"
                style={{
                  padding: '6px 10px',
                  fontSize: 12,
                  fontWeight: 500,
                  color: 'var(--fg-4)',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'var(--ds-font-family-body)',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-3)'; e.currentTarget.style.color = 'var(--fg-3)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--fg-4)'; }}
              >
                <Plus size={14} /> Add issue
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ──── Individual Board Card ──── */

function BoardCard({
  issue,
  isOnHold,
  onClick,
  onMarkDone,
}: {
  issue: PHIssue;
  isOnHold?: boolean;
  onClick: () => void;
  onMarkDone: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const accentColor = TYPE_ACCENT[issue.type as IssueType] ?? '#94A3B8';

  return (
    <div
      className="relative cursor-pointer bg-[var(--bg-app)]"
      style={{
        borderRadius: 12,
        border: isOnHold ? '1px dashed #D9770640' : '1px solid var(--divider)',
        boxShadow: hovered
          ? '0 4px 12px rgba(15,23,42,.1), 0 1px 3px rgba(15,23,42,.06)'
          : '0 1px 2px rgba(15,23,42,.06), 0 1px 3px rgba(15,23,42,.1)',
        transform: hovered ? 'translateY(-1px)' : 'none',
        transition: 'all 150ms ease',
        overflow: 'hidden',
      }}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Left accent bar */}
      <div
        className="absolute left-0 top-0 bottom-0"
        style={{ width: 3, background: accentColor, borderRadius: '12px 0 0 12px' }}
      />

      {/* Hover quick-actions */}
      <div
        className="absolute top-1 right-1 flex items-center gap-0.5 rounded-md z-10 bg-[var(--bg-app)]"
        style={{
          boxShadow: '0 2px 8px rgba(15,23,42,.12)',
          padding: '2px 4px',
          opacity: hovered ? 1 : 0,
          transform: hovered ? 'translateY(0)' : 'translateY(-4px)',
          transition: 'opacity 150ms ease, transform 150ms ease',
          pointerEvents: hovered ? 'auto' : 'none',
        }}
        onClick={e => e.stopPropagation()}
      >
        {[
          { icon: Check, label: 'Done', fn: onMarkDone },
          { icon: UserPlus, label: 'Assign', fn: () => {} },
          { icon: Flag, label: 'Flag', fn: () => {} },
          { icon: MoreHorizontal, label: 'More', fn: () => {} },
        ].map(a => (
          <button
            key={a.label}
            title={a.label}
            onClick={a.fn}
            className="p-1 rounded transition-colors"
            style={{
              border: 'none', background: 'transparent', cursor: 'pointer',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--cp-bd-zone)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
          >
            <a.icon size={12} color="var(--fg-3)" />
          </button>
        ))}
      </div>

      <div style={{ padding: '10px 12px 10px 14px' }}>
        {/* Top: Type icon + Key + Source */}
        <div className="flex items-center gap-1.5 mb-1">
          <PHIssueTypeIcon type={issue.type} size={16} />
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--fg-3)',
              fontFamily: 'var(--ds-font-family-monospaced)',
            }}
          >
            {getDisplayKey(issue)}
          </span>
          <PHSourceTag source={issue.source} />
        </div>

        {/* Overdue warning — only when > 0 */}
        {(issue.overdue_days ?? 0) > 0 && (
          <div
            className="flex items-center gap-1 mb-1"
            style={{ fontSize: 10, fontWeight: 600, color: 'var(--sem-warning)' }}
          >
            <AlertTriangle size={10} />
            <span>{issue.overdue_days}d overdue</span>
          </div>
        )}

        {/* Title — 2-line clamp */}
        <div
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: 'var(--fg-1)',
            lineHeight: 1.35,
            marginBottom: 6,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical' as const,
            overflow: 'hidden',
            fontFamily: 'var(--ds-font-family-body)',
          }}
        >
          {issue.title}
        </div>

        {/* Footer: Priority + Due + Assignee */}
        <div className="flex items-center justify-between">
          <PHPriorityIcon priority={issue.priority} />
          <div className="flex items-center gap-2">
            {issue.due_date ? (
              <span className="flex items-center gap-1" style={{ fontSize: 10, color: 'var(--fg-4)' }}>
                <Calendar size={10} />
                {new Date(issue.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            ) : null}
            {/* Assignee avatar — dashed circle when null */}
            <span
              className={`rounded-full flex items-center justify-center flex-shrink-0 ${issue.assignee_id ? 'bg-[var(--bg-3)]' : 'bg-transparent'}`}
              style={{
                width: 20, height: 20,
                border: issue.assignee_id ? 'none' : '1.5px dashed var(--divider)',
                fontSize: 8,
                fontWeight: 700,
                color: 'var(--fg-3)',
              }}
            >
              {issue.assignee_id ? '👤' : ''}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
