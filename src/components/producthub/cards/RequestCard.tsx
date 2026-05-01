import React from 'react';
import { cn } from '@/lib/utils';
import { Star, MoreHorizontal, Pencil, MessageSquare, Link2, AlertTriangle, Calendar } from 'lucide-react';
import type { Request } from '@/types/request';
import { STATUS_DISPLAY, getAvatarColor, getInitials } from '@/types/request';
import { CardScoreRing } from './CardScoreRing';
import type { GridSize } from './GridSizeToggle';
import { formatDistanceToNow, format, isPast, differenceInDays } from 'date-fns';

interface RequestCardProps {
  request: Request;
  gridSize: GridSize;
  onClick: () => void;
}

function getScoreBorderClass(score: number | null): string {
  if (score === null) return 'border-l-zinc-200';
  if (score >= 4.0) return 'border-l-emerald-500';
  if (score >= 3.0) return 'border-l-blue-500';
  return 'border-l-amber-500';
}

function getPriorityLabel(score: number | null): { label: string; color: string } {
  if (score === null) return { label: 'Unscored', color: '#6B7280' };
  if (score >= 4.0) return { label: 'High', color: '#059669' };
  if (score >= 3.0) return { label: 'Medium', color: 'var(--ds-text-brand, #2563EB)' };
  if (score >= 2.0) return { label: 'Low', color: 'var(--ds-text-warning, #D97706)' };
  return { label: 'Rejected', color: 'var(--ds-text-danger, #DC2626)' };
}

function getDateColor(dateStr: string | null): string {
  if (!dateStr) return 'text-zinc-500';
  const d = new Date(dateStr);
  if (isPast(d)) return 'text-red-600';
  if (differenceInDays(d, new Date()) <= 14) return 'text-amber-600';
  return 'text-emerald-600';
}

function relativeTime(dateStr: string): string {
  return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
}

export const RequestCard: React.FC<RequestCardProps> = React.memo(({ request, gridSize, onClick }) => {
  const status = STATUS_DISPLAY[request.status];
  const isCancelled = request.status === 'cancelled';
  const priority = getPriorityLabel(request.computed_score);
  const ringSize = gridSize === 'small' ? 48 : gridSize === 'medium' ? 64 : 80;

  return (
    <div
      onClick={onClick}
      className={cn(
        'group border rounded-xl border-l-4 cursor-pointer transition-all duration-200',
        'bg-white dark:bg-transparent dark:shadow-none',
        'border-zinc-200 dark:border-[var(--ds-border, #2E2E2E)]',
        'hover:shadow-lg hover:border-zinc-300 hover:-translate-y-0.5 dark:hover:shadow-none dark:hover:border-[var(--ds-border, #2E2E2E)]',
        getScoreBorderClass(request.computed_score),
        isCancelled && 'opacity-60'
      )}
    >
      {/* Header: Status + ID + actions */}
      <div className="flex items-center justify-between px-4 pt-3 pb-1">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: status.dot }} />
          <span
            className={cn(
              'text-xs font-bold uppercase rounded px-1.5 py-0.5',
              status.label === 'Done' && 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300',
              status.label === 'New' && 'bg-gray-100 text-gray-700 dark:bg-[var(--ds-surface-raised, #1A1A1A)] dark:text-[var(--ds-text, #EDEDED)]',
              (status.label === 'Under Implementation' || status.label === 'Portfolio Review' || status.label === 'In Progress') && 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300',
              !['Done','New','Under Implementation','Portfolio Review','In Progress'].includes(status.label) && 'bg-gray-100 text-gray-700 dark:bg-[var(--ds-surface-raised, #1A1A1A)] dark:text-[var(--ds-text, #EDEDED)]',
            )}
          >
            {status.label}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-[10px] font-medium text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-transparent px-1.5 py-0.5 rounded">
            {request.initiative_key}
          </span>
          {gridSize !== 'small' && (
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <button className="p-1 hover:bg-zinc-100 rounded" onClick={e => e.stopPropagation()}>
                <Star className={cn('w-3.5 h-3.5', request.is_favorited ? 'fill-amber-400 text-amber-400' : 'text-zinc-400')} />
              </button>
              {gridSize === 'large' && (
                <button className="p-1 hover:bg-zinc-100 rounded" onClick={e => e.stopPropagation()}>
                  <Pencil className="w-3.5 h-3.5 text-zinc-400" />
                </button>
              )}
              <button className="p-1 hover:bg-zinc-100 rounded" onClick={e => e.stopPropagation()}>
                <MoreHorizontal className="w-3.5 h-3.5 text-zinc-400" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Title */}
      <div className="px-4 pb-2">
        <h3
          className={cn(
            'text-sm font-semibold text-zinc-900 dark:text-white leading-snug',
            isCancelled && 'line-through',
            gridSize === 'small' ? 'line-clamp-2' : gridSize === 'medium' ? 'line-clamp-3' : ''
          )}
        >
          {request.is_favorited && <Star size={12} className="text-amber-500 fill-amber-500 inline mr-1" />}
          {request.title}
        </h3>
      </div>

      {/* Description (large only) */}
      {gridSize === 'large' && request.description && (
        <p className="px-4 pb-2 text-xs text-zinc-500 dark:text-[var(--ds-text-subtlest, #A1A1A1)] leading-relaxed line-clamp-3">
          {request.description}
        </p>
      )}

      {/* Score + Progress section */}
      <div className="px-4 pb-3">
        {gridSize === 'small' ? (
          /* Small: inline score bar + progress */
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className="w-10 h-1.5 bg-zinc-100 dark:bg-[var(--ds-surface-raised, #1A1A1A)] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${((request.computed_score ?? 0) / 5) * 100}%`,
                    background: priority.color,
                  }}
                />
              </div>
              <span className="text-[10px] font-semibold text-zinc-700 dark:text-white">
                {request.computed_score?.toFixed(1) ?? '—'}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-10 h-1.5 bg-zinc-100 dark:bg-[var(--ds-surface-raised, #1A1A1A)] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-blue-500"
                  style={{ width: `${request.progress}%` }}
                />
              </div>
              <span className="text-[10px] text-zinc-500 dark:text-[var(--ds-text-subtlest, #878787)]">{request.progress}%</span>
            </div>
          </div>
        ) : (
          /* Medium/Large: ring + details */
          <div className="flex gap-3">
            <CardScoreRing score={request.computed_score} size={ringSize} />
            <div className="flex-1 min-w-0 space-y-1.5">
              <div className="flex items-baseline gap-2">
              <span className="text-xs font-semibold text-zinc-700 dark:text-[var(--ds-text-subtlest, #A1A1A1)]">
                  Score: {request.computed_score?.toFixed(1) ?? '—'} / 5.0
                </span>
                <span
                  className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                  style={{
                    background: priority.color + '15',
                    color: priority.color,
                  }}
                >
                  {priority.label}
                </span>
              </div>

              {/* Sub-scores (large only) */}
              {gridSize === 'large' && (
                <div className="space-y-1">
                  {[
                    { label: 'Strategic', value: request.score_strategic_alignment },
                    { label: 'Business Val', value: request.score_business_impact },
                    { label: 'Feasibility', value: request.score_resource_feasibility },
                    { label: 'Risk Score', value: request.score_time_urgency },
                  ].map(s => (
                    <div key={s.label} className="flex items-center gap-2">
              <span className="text-[10px] text-zinc-500 dark:text-[var(--ds-text-subtlest, #A1A1A1)] w-16 truncate">{s.label}</span>
                      <div className="flex-1 h-1.5 bg-zinc-100 dark:bg-[var(--ds-surface-raised, #1A1A1A)] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-blue-500"
                          style={{ width: `${((s.value ?? 0) / 5) * 100}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-zinc-600 dark:text-white w-5 text-right">
                        {s.value?.toFixed(1) ?? '—'}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Progress */}
              <div>
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[10px] text-zinc-500 dark:text-[var(--ds-text-subtlest, #A1A1A1)]">Progress</span>
                  <span className="text-[10px] font-medium text-zinc-700 dark:text-[var(--ds-text-subtlest, #878787)]">{request.progress}%</span>
                </div>
                <div className="w-full h-1.5 bg-zinc-100 dark:bg-[var(--ds-surface-raised, #1A1A1A)] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-blue-500 transition-all"
                    style={{ width: `${request.progress}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Meta row */}
      <div className="px-4 pb-2">
        <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-[var(--ds-text-subtlest, #A1A1A1)] flex-wrap">
          {request.department_name && (
            <span className="truncate max-w-[100px]">
              {gridSize === 'small' ? request.department_name.split(' ')[0] : request.department_name}
            </span>
          )}
          {request.target_quarter && (
            <>
              <span>·</span>
              <span>{gridSize === 'small' ? request.target_quarter.replace('20', "'") : request.target_quarter}</span>
            </>
          )}
          {request.target_complete && (
            <>
              <span>·</span>
              <span className={cn('flex items-center gap-0.5', getDateColor(request.target_complete))}>
                <Calendar className="w-3 h-3" />
                {format(new Date(request.target_complete), gridSize === 'small' ? 'MMM dd' : 'MMM dd, yyyy')}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Assignee + counts (medium/large) */}
      {gridSize !== 'small' && (
        <div className="px-4 pb-2">
          <div className="flex items-center gap-2 text-xs text-zinc-600 dark:text-[var(--ds-text, #EDEDED)]">
            {request.assignee_name ? (
              <div className="flex items-center gap-1.5">
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
                  style={{ background: getAvatarColor(request.assignee_name) }}
                >
                  {getInitials(request.assignee_name)}
                </div>
                <span>{request.assignee_name}</span>
              </div>
            ) : (
              <span className="text-zinc-400 italic">Unassigned</span>
            )}
            {gridSize === 'large' && (
              <>
                <span className="text-zinc-300">·</span>
                <span className="flex items-center gap-0.5 text-zinc-400">
                  <MessageSquare className="w-3 h-3" /> 0
                </span>
                <span className="flex items-center gap-0.5 text-zinc-400">
                  <Link2 className="w-3 h-3" /> 0
                </span>
                {request.risk_count > 0 && (
                  <span className="flex items-center gap-0.5 text-amber-500">
                    <AlertTriangle className="w-3 h-3" /> {request.risk_count}
                  </span>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Large: extra detail rows */}
      {gridSize === 'large' && (
        <div className="px-4 pb-2 space-y-1">
          {[
            { label: 'Department', value: request.department_name },
            { label: 'Quarter', value: request.target_quarter },
            { label: 'Business Owner', value: request.business_owner_name },
          ].filter(r => r.value).map(r => (
            <div key={r.label} className="flex items-center text-xs">
              <span className="text-zinc-400 dark:text-[var(--ds-text-subtlest, #A1A1A1)] w-28">{r.label}</span>
              <span className="text-zinc-700 dark:text-white">{r.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="border-t border-zinc-100 dark:border-[var(--ds-border, #2E2E2E)] px-4 py-2">
        <span className="text-[10px] text-zinc-400 dark:text-[var(--ds-text-subtlest, #878787)]">
          {gridSize === 'large'
            ? `Created ${format(new Date(request.created_at), 'MMM dd')} · Updated ${relativeTime(request.updated_at)}`
            : `Updated ${relativeTime(request.updated_at)}`
          }
        </span>
      </div>
    </div>
  );
});

export default RequestCard;
