import React from 'react';
import { Star, MoreHorizontal } from 'lucide-react';
import type { Initiative } from '@/types/initiative';
import { STATUS_DISPLAY, getAvatarColor, getInitials } from '@/types/initiative';
import { formatDistanceToNow, format } from 'date-fns';
import { getTypeLabel } from '@/utils/initiative-type-utils';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface PCInitiativeCardProps {
  initiative: Initiative;
  isSelected: boolean;
  onClick: () => void;
}

const STATUS_PILL_STYLES: Record<string, { color: string; bg: string; border: string }> = {
  new: { color: '#2563EB', bg: '#EFF6FF', border: 'rgba(37,99,235,0.2)' },
  portfolio_review: { color: '#8B5CF6', bg: '#F5F3FF', border: 'rgba(139,92,246,0.2)' },
  technical_validation: { color: '#A855F7', bg: '#FAF5FF', border: 'rgba(168,85,247,0.2)' },
  estimate: { color: '#6366F1', bg: '#EEF2FF', border: 'rgba(99,102,241,0.2)' },
  demand_approved: { color: '#06B6D4', bg: '#ECFEFF', border: 'rgba(6,182,212,0.2)' },
  analysis: { color: '#0EA5E9', bg: '#F0F9FF', border: 'rgba(14,165,233,0.2)' },
  ready_for_development: { color: '#14B8A6', bg: '#F0FDFA', border: 'rgba(20,184,166,0.2)' },
  under_implementation: { color: '#D97706', bg: '#FFFBEB', border: 'rgba(217,119,6,0.2)' },
  on_hold: { color: '#6B7280', bg: '#F9FAFB', border: 'rgba(107,114,128,0.2)' },
  implementation_review: { color: '#F97316', bg: '#FFF7ED', border: 'rgba(249,115,22,0.2)' },
  in_support: { color: '#10B981', bg: '#ECFDF5', border: 'rgba(16,185,129,0.2)' },
  done: { color: '#16A34A', bg: '#F0FDF4', border: 'rgba(22,163,74,0.2)' },
  cancelled: { color: '#DC2626', bg: '#FEF2F2', border: 'rgba(220,38,38,0.2)' },
};

const TYPE_COLORS: Record<string, string> = {
  project: '#0D9488',
  enhancement: '#2563EB',
  improvement: '#D97706',
  entity_integration: '#7C3AED',
};

function getScoreLevel(score: number | null): number {
  if (score === null) return 0;
  return Math.round(score);
}

function getPriorityLevel(score: number | null): number {
  if (score === null) return 0;
  if (score >= 4.0) return 4;
  if (score >= 3.0) return 3;
  if (score >= 2.0) return 2;
  return 1;
}

export const PCInitiativeCard: React.FC<PCInitiativeCardProps> = ({ initiative, isSelected, onClick }) => {
  const queryClient = useQueryClient();
  const status = STATUS_DISPLAY[initiative.status];
  const pillStyle = STATUS_PILL_STYLES[initiative.status] || STATUS_PILL_STYLES.new;
  const scoreLevel = getScoreLevel(initiative.computed_score);
  const priorityLevel = getPriorityLevel(initiative.computed_score);
  const typeColor = TYPE_COLORS[initiative.initiative_type_key || ''] || '#71717A';

  const handleStar = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      if (initiative.is_favorited) {
        await (supabase as any).from('ph_user_favorites').delete().eq('user_id', user.id).eq('initiative_id', initiative.id);
      } else {
        await (supabase as any).from('ph_user_favorites').insert({ user_id: user.id, initiative_id: initiative.id });
      }
      queryClient.invalidateQueries({ queryKey: ['mdt-backlog'] });
    } catch {
      toast.error('Failed to update star');
    }
  };

  return (
    <div
      className={`pc-card ${isSelected ? 'pc-card--selected' : ''}`}
      onClick={onClick}
    >
      {/* Hover actions */}
      <div className="pc-card-actions">
        <button className={`pc-action-btn ${initiative.is_favorited ? 'pc-action-btn--starred' : ''}`} onClick={handleStar}>
          <Star size={14} fill={initiative.is_favorited ? 'currentColor' : 'none'} />
        </button>
        <button className="pc-action-btn" onClick={e => e.stopPropagation()}>
          <MoreHorizontal size={14} />
        </button>
      </div>

      {/* Header: Status pill + ID */}
      <div className="pc-card-header">
        <span
          className="pc-status-pill"
          style={{ color: pillStyle.color, background: pillStyle.bg, borderColor: pillStyle.border }}
        >
          <span className="pc-status-dot" style={{ background: pillStyle.color }} />
          {status.label}
        </span>
        <span className="pc-card-id">{initiative.initiative_key}</span>
      </div>

      {/* Title */}
      <div className="pc-card-title">{initiative.title}</div>

      {/* Type badge */}
      {initiative.initiative_type_key && (
        <div className="pc-type-badge" style={{ color: typeColor }}>
          <span className="pc-type-dot" style={{ background: typeColor }} />
          {getTypeLabel(initiative.initiative_type_key)}
        </div>
      )}

      {/* Score + Priority */}
      <div className="pc-metrics">
        <div>
          <div className="pc-metric-label">Score</div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div className="pc-score-bars">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className={`pc-score-bar ${i <= scoreLevel ? 'pc-score-bar--filled' : 'pc-score-bar--empty'}`} />
              ))}
            </div>
            <span className={`pc-score-text ${initiative.computed_score === null ? 'pc-score-text--unscored' : ''}`}>
              {initiative.computed_score !== null ? `${initiative.computed_score.toFixed(1)} /5.0` : '— /5.0'}
            </span>
          </div>
        </div>
        <div>
          <div className="pc-metric-label">Priority</div>
          <div className="pc-priority-bars">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className={`pc-priority-bar ${i <= priorityLevel ? 'pc-priority-bar--filled' : 'pc-priority-bar--empty'}`} />
            ))}
          </div>
        </div>
      </div>

      {/* Progress */}
      <div className="pc-progress">
        <div className="pc-progress-track">
          <div className="pc-progress-fill" style={{ width: `${initiative.progress}%` }} />
        </div>
        <span className="pc-progress-text">{initiative.progress}%</span>
      </div>

      {/* Footer */}
      <div className="pc-card-footer">
        <div className="pc-card-footer-left">
          {initiative.department_name && (
            <div className="pc-card-dept">{initiative.department_name}</div>
          )}
          <div className="pc-card-meta">
            {initiative.target_quarter && <span className="pc-card-meta-bold">{initiative.target_quarter}</span>}
            {initiative.target_complete && (
              <>
                {initiative.target_quarter && ' · '}
                <span>📅 {format(new Date(initiative.target_complete), 'MMM dd, yyyy')}</span>
              </>
            )}
          </div>
          <div className="pc-card-updated">
            Updated {formatDistanceToNow(new Date(initiative.updated_at), { addSuffix: true })}
          </div>
        </div>
        {initiative.assignee_name && (
          <div className="pc-avatar" style={{ background: getAvatarColor(initiative.assignee_name) }}>
            {getInitials(initiative.assignee_name)}
          </div>
        )}
      </div>
    </div>
  );
};

export default PCInitiativeCard;
