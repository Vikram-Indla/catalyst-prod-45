import React from 'react';
import { Star, MoreHorizontal, FolderKanban, Zap, Wrench, Link, Lightbulb, Target } from 'lucide-react';
import type { Initiative } from '@/types/initiative';
import { STATUS_DISPLAY } from '@/types/initiative';
import { InitiativeMetrics } from '@/components/backlog/MetricBars';
import { Lozenge, Avatar, Tooltip } from '@/components/ads';
import type { LozengeAppearance } from '@/components/ads';
import { SourceBadge } from '@/components/producthub/shared/SourceBadge';
import { formatDistanceToNow, format } from 'date-fns';
import { supabase, typedQuery } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface PCInitiativeCardProps {
  initiative: Initiative;
  isSelected: boolean;
  onClick: () => void;
}

const STATUS_TO_LOZENGE: Record<string, LozengeAppearance> = {
  portfolio_review: 'success',
  done: 'success',
  in_support: 'success',
  demand_approved: 'success',
  ready_for_development: 'success',
  under_implementation: 'moved',
  implementation_review: 'moved',
  under_review: 'new',
  technical_validation: 'new',
  estimate: 'new',
  cancelled: 'removed',
  new: 'inprogress',
  new_demand: 'inprogress',
  analysis: 'inprogress',
  on_hold: 'inprogress',
};

const PRIORITY_TO_LOZENGE: Record<string, LozengeAppearance> = {
  critical: 'removed',
  high: 'moved',
  medium: 'default',
  low: 'success',
};

const HEALTH_TO_PROGRESS_COLOR: Record<string, string> = {
  on_track: '#16A34A',
  at_risk: '#D97706',
  off_track: '#DC2626',
};

const TYPE_CONFIG: Record<string, { label: string; color: string; Icon: typeof FolderKanban }> = {
  project: { label: 'Project', color: '#0D9488', Icon: FolderKanban },
  enhancement: { label: 'Enhancement', color: '#2563EB', Icon: Zap },
  improvement: { label: 'Improvement', color: '#D97706', Icon: Wrench },
  entity_integration: { label: 'Entity Integration', color: '#7C3AED', Icon: Link },
  business_request: { label: 'Business Request', color: '#B45309', Icon: Lightbulb },
};

function formatStatusFallback(s: string): string {
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export const PCInitiativeCard: React.FC<PCInitiativeCardProps> = ({ initiative, isSelected, onClick }) => {
  const queryClient = useQueryClient();

  const statusAppearance: LozengeAppearance = STATUS_TO_LOZENGE[initiative.status] ?? 'default';
  const statusLabel = STATUS_DISPLAY[initiative.status]?.label ?? formatStatusFallback(initiative.status);

  const typeKey = initiative.initiative_type_key || '';
  const typeConf = TYPE_CONFIG[typeKey];

  const priorityKey = (initiative.priority || '').toLowerCase();
  const priorityAppearance: LozengeAppearance = PRIORITY_TO_LOZENGE[priorityKey] ?? 'default';
  const priorityLabel = initiative.priority
    ? initiative.priority.charAt(0).toUpperCase() + initiative.priority.slice(1).toLowerCase()
    : '';

  const healthKey = (initiative.health_status || '').toLowerCase();
  const progressColor = HEALTH_TO_PROGRESS_COLOR[healthKey] ?? '#2563EB';

  const handleStar = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      if (initiative.is_favorited) {
        await typedQuery('ph_user_favorites').delete().eq('user_id', user.id).eq('initiative_id', initiative.id);
      } else {
        await typedQuery('ph_user_favorites').insert({ user_id: user.id, initiative_id: initiative.id });
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
        <button
          className={`pc-action-btn ${initiative.is_favorited ? 'pc-action-btn--starred' : ''}`}
          onClick={handleStar}
        >
          <Star size={14} fill={initiative.is_favorited ? 'currentColor' : 'none'} />
        </button>
        <button className="pc-action-btn" onClick={(e) => e.stopPropagation()}>
          <MoreHorizontal size={14} />
        </button>
      </div>

      {/* Header: Status lozenge + Source/ID */}
      <div className="pc-card-header">
        <Lozenge appearance={statusAppearance}>{statusLabel}</Lozenge>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <SourceBadge source={initiative.source} />
          <span className="pc-card-id">{initiative.initiative_key}</span>
        </div>
      </div>

      {/* Title */}
      <div className="pc-card-title">{initiative.title}</div>

      {/* Type + Priority row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        {typeConf && (
          <div className="pc-type-badge" style={{ color: typeConf.color }}>
            <typeConf.Icon size={13} />
            {typeConf.label}
          </div>
        )}
        {initiative.priority && (
          <div style={{ marginLeft: 'auto' }}>
            <Lozenge appearance={priorityAppearance}>{priorityLabel}</Lozenge>
          </div>
        )}
      </div>

      {/* Score */}
      <div style={{ marginBottom: 10 }}>
        <InitiativeMetrics score={initiative.computed_score} />
      </div>

      {/* Progress bar — width = completion, color = health */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <div style={{ flex: 1, height: 4, background: '#F4F4F5', borderRadius: 4, overflow: 'hidden' }}>
          <div
            style={{
              height: '100%',
              width: `${Math.min(initiative.progress, 100)}%`,
              background: progressColor,
              borderRadius: 4,
              transition: 'width 0.3s ease',
            }}
          />
        </div>
        <span
          style={{
            fontFamily: 'var(--cp-font-mono)',
            fontSize: 11,
            fontWeight: 500,
            color: '#71717A',
            minWidth: 28,
            textAlign: 'right' as const,
          }}
        >
          {initiative.progress}%
        </span>
      </div>

      {/* Footer */}
      <div className="pc-card-footer">
        <div className="pc-card-footer-left">
          {initiative.department_name && (
            <div className="pc-card-dept">{initiative.department_name}</div>
          )}
          <div className="pc-card-meta">
            {initiative.target_quarter && (
              <span className="pc-card-meta-bold">{initiative.target_quarter}</span>
            )}
            {initiative.target_complete && (
              <>
                {initiative.target_quarter && ' · '}
                <span>📅 {format(new Date(initiative.target_complete), 'MMM dd, yyyy')}</span>
              </>
            )}
          </div>
          <div className="pc-card-updated" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>Updated {formatDistanceToNow(new Date(initiative.updated_at), { addSuffix: true })}</span>
            {!!initiative.milestone_count && initiative.milestone_count > 0 && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 3,
                  fontSize: 10.5,
                  fontWeight: 600,
                  color: '#475569',
                }}
              >
                <Target size={10} />
                {initiative.milestone_count}
              </span>
            )}
          </div>
        </div>
        {initiative.assignee_name && (
          <Tooltip content={initiative.assignee_name}>
            <Avatar
              name={initiative.assignee_name ?? ''}
              src={initiative.assignee_avatar ?? undefined}
              size="small"
            />
          </Tooltip>
        )}
      </div>
    </div>
  );
};

export default PCInitiativeCard;
