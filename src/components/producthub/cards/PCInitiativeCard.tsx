import React from 'react';
import { Star, MoreHorizontal, Flag, Activity, Target } from 'lucide-react';
import type { Initiative } from '@/types/initiative';
import { BusinessRequestBadge } from '@/components/producthub/shared/BusinessRequestBadge';
import { STATUS_DISPLAY, getAvatarColor, getInitials } from '@/types/initiative';
import { InitiativeMetrics } from '@/components/backlog/MetricBars';
import { formatDistanceToNow, format } from 'date-fns';
import { supabase, typedQuery } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTheme } from '@/hooks/useTheme';
import { SourceBadge } from '@/components/producthub/shared/SourceBadge';

interface PCInitiativeCardProps {
  initiative: Initiative;
  isSelected: boolean;
  onClick: () => void;
}

const STATUS_PILL_STYLES: Record<string, { color: string; bg: string; border: string }> = {
  new: { color: '#2563EB', bg: '#EFF6FF', border: 'rgba(37,99,235,0.2)' },
  new_demand: { color: '#2563EB', bg: '#EFF6FF', border: 'rgba(37,99,235,0.2)' },
  portfolio_review: { color: '#16A34A', bg: '#F0FDF4', border: 'rgba(22,163,74,0.2)' },
  under_review: { color: '#8B5CF6', bg: '#F5F3FF', border: 'rgba(139,92,246,0.2)' },
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

const DEFAULT_STATUS_PILL = { color: '#71717A', bg: '#F4F4F5', border: 'rgba(113,113,122,0.2)' };

/** Dark mode wash: lighten color, use rgba bg, and rgba border */
function darkPill(pill: { color: string; bg: string; border: string }): { color: string; bg: string; border: string } {
  // Extract rgb from hex color and create a wash
  const hex = pill.color;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return {
    color: `rgba(${Math.min(r + 80, 255)},${Math.min(g + 80, 255)},${Math.min(b + 80, 255)},0.9)`,
    bg: `rgba(${r},${g},${b},0.10)`,
    border: `rgba(${r},${g},${b},0.20)`,
  };
}

// Type concept removed — every Product Hub item is a Business Request.

const PRIORITY_STYLE: Record<string, { color: string; bg: string }> = {
  critical: { color: '#B91C1C', bg: '#FEE2E2' },
  high:     { color: '#C2410C', bg: '#FFEDD5' },
  medium:   { color: '#A16207', bg: '#FEF3C7' },
  low:      { color: '#15803D', bg: '#DCFCE7' },
};

const HEALTH_STYLE: Record<string, { color: string; bg: string; label: string }> = {
  green:    { color: '#15803D', bg: '#DCFCE7', label: 'On Track' },
  on_track: { color: '#15803D', bg: '#DCFCE7', label: 'On Track' },
  amber:    { color: '#A16207', bg: '#FEF3C7', label: 'At Risk' },
  at_risk:  { color: '#A16207', bg: '#FEF3C7', label: 'At Risk' },
  red:      { color: '#B91C1C', bg: '#FEE2E2', label: 'Off Track' },
  off_track:{ color: '#B91C1C', bg: '#FEE2E2', label: 'Off Track' },
};


export const PCInitiativeCard: React.FC<PCInitiativeCardProps> = ({ initiative, isSelected, onClick }) => {
  const queryClient = useQueryClient();
  const { isDark } = useTheme();
  const status = STATUS_DISPLAY[initiative.status];
  const rawPill = STATUS_PILL_STYLES[initiative.status] || DEFAULT_STATUS_PILL;
  const pillStyle = isDark ? darkPill(rawPill) : rawPill;
  

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
          {status?.label || initiative.status}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <SourceBadge source={initiative.source} />
          <span className="pc-card-id">{initiative.initiative_key}</span>
        </div>
      </div>

      {/* Title */}
      <div className="pc-card-title">{initiative.title}</div>

      {/* Business Request label — single canonical type */}
      <div style={{ marginBottom: 10 }}>
        <BusinessRequestBadge iconSize={14} fontSize={11} />
      </div>

      {/* Priority + Health chips */}
      {(initiative.priority || initiative.health_status) && (() => {
        const prioKey = (initiative.priority || '').toLowerCase();
        const prio = PRIORITY_STYLE[prioKey];
        const healthKey = (initiative.health_status || '').toLowerCase();
        const health = HEALTH_STYLE[healthKey];
        return (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
            {prio && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '2px 8px', borderRadius: 4,
                fontSize: 10.5, fontWeight: 600, letterSpacing: '0.02em',
                color: prio.color, background: prio.bg,
                fontFamily: 'var(--cp-font-body)',
              }}>
                <Flag size={10} />
                {initiative.priority}
              </span>
            )}
            {health && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '2px 8px', borderRadius: 4,
                fontSize: 10.5, fontWeight: 600, letterSpacing: '0.02em',
                color: health.color, background: health.bg,
                fontFamily: 'var(--cp-font-body)',
              }}>
                <Activity size={10} />
                {health.label}
              </span>
            )}
          </div>
        );
      })()}

      {/* Score + Priority */}
      <div style={{ marginBottom: 10 }}>
        <InitiativeMetrics score={initiative.computed_score} />
      </div>

      {/* Progress */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <div style={{ flex: 1, height: 4, background: '#F4F4F5', borderRadius: 4, overflow: 'hidden', border: 'none' }}>
          <div style={{
            height: '100%',
            width: `${Math.min(initiative.progress, 100)}%`,
            background: 'var(--cp-blue)',
            borderRadius: 4,
            border: 'none',
            transition: 'width 0.3s ease',
          }} />
        </div>
        <span style={{
          fontFamily: 'var(--cp-font-mono)',
          fontSize: 11,
          fontWeight: 500,
          color: '#71717A',
          minWidth: 28,
          textAlign: 'right' as const,
        }}>
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
            {initiative.target_quarter && <span className="pc-card-meta-bold">{initiative.target_quarter}</span>}
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
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 3,
                fontSize: 10.5, fontWeight: 600, color: '#475569',
              }}>
                <Target size={10} />
                {initiative.milestone_count}
              </span>
            )}
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
