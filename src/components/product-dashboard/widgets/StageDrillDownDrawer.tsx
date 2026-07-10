import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { token } from '@atlaskit/tokens';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { BrPostMortemModal } from '../BrPostMortemModal';

interface BrRow {
  id: string;
  title: string;
  process_step: string;
  assignee: string | null;
  entered_step_at: string | null;
}

interface StageDrillDownDrawerProps {
  stageValue: string | null;
  stageLabel: string;
  onClose: () => void;
}

function daysAgo(iso: string | null): number {
  if (!iso) return 0;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

function slaColor(days: number): string {
  if (days <= 7) return token('color.background.success.bold', 'var(--ds-background-success-bold, var(--ds-background-success-bold))');
  if (days <= 21) return token('color.background.warning.bold', 'var(--ds-background-warning-bold, var(--ds-background-warning-bold))');
  return token('color.background.danger.bold', 'var(--ds-text-danger)');
}

export function StageDrillDownDrawer({ stageValue, stageLabel, onClose }: StageDrillDownDrawerProps) {
  const { user, loading } = useAuth();
  const [postMortem, setPostMortem] = useState<{ id: string; title: string } | null>(null);

  const { data: brs = [] } = useQuery({
    queryKey: ['stage-drilldown-brs', stageValue],
    enabled: !loading && !!user?.id && !!stageValue,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('business_requests')
        .select('id, title, process_step, assignee, entered_step_at')
        .eq('process_step', stageValue!)
        .is('deleted_at', null);
      if (error) throw error;
      return (data ?? []) as BrRow[];
    },
  });

  if (!stageValue) return null;

  // AI summary: derive from BR data
  const totalBrs = brs.length;
  const overdueBrs = brs.filter(br => daysAgo(br.entered_step_at) > 21).length;

  // Owner map: assignee_name → count
  const ownerMap = new Map<string, number>();
  brs.forEach(br => {
    const name = br.assignee ?? 'Unassigned';
    ownerMap.set(name, (ownerMap.get(name) ?? 0) + 1);
  });

  return (
    <div
      data-testid="stage-drilldown-drawer"
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        width: 420,
        height: '100%',
        background: token('elevation.surface.overlay', 'var(--ds-surface)'),
        borderLeft: `1px solid ${token('color.border', 'var(--cp-lozenge-grey-bg, var(--cp-border-neutral))')}`,
        boxShadow: token('elevation.shadow.overlay', '-4px 0 12px var(--ds-shadow-raised)'),
        display: 'flex',
        flexDirection: 'column',
        zIndex: 400,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: `${token('space.200', '16px')} ${token('space.200', '16px')} ${token('space.150', '12px')}`,
          borderBottom: `1px solid ${token('color.border', 'var(--cp-lozenge-grey-bg, var(--cp-border-neutral))')}`,
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: 'var(--ds-font-size-500)',
            fontWeight: 600,
            color: token('color.text', 'var(--cp-text-primary, var(--cp-text-inverse))'),
          }}
        >
          {stageLabel}
        </h2>
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: token('color.text.subtlest', 'var(--ds-text-disabled)'),
            fontSize: 'var(--ds-font-size-600)',
            lineHeight: 1,
            padding: 4,
            borderRadius: 4,
          }}
        >
          ×
        </button>
      </div>

      {/* Body */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: token('space.200', '16px'),
          display: 'flex',
          flexDirection: 'column',
          gap: token('space.200', '16px'),
        }}
      >
        {/* AI Summary */}
        <section data-testid="stage-ai-summary">
          <h3
            style={{
              margin: '0 0 8px',
              fontSize: 'var(--ds-font-size-200)',
              fontWeight: 600,
              color: token('color.text.subtlest', 'var(--ds-text-disabled)'),
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}
          >
            AI Summary
          </h3>
          <div
            style={{
              padding: token('space.150', '12px'),
              background: token('color.background.information', 'var(--ds-background-selected)'),
              borderRadius: 6,
              fontSize: 'var(--ds-font-size-300)',
              color: token('color.text', 'var(--cp-text-primary, var(--cp-text-inverse))'),
              lineHeight: 1.5,
            }}
          >
            {totalBrs === 0
              ? 'No active business requests in this stage.'
              : `${totalBrs} business request${totalBrs !== 1 ? 's' : ''} in this stage.${overdueBrs > 0 ? ` ${overdueBrs} ${overdueBrs !== 1 ? 'are' : 'is'} overdue (>21 days).` : ' All within SLA.'}`}
          </div>
        </section>

        {/* BR Colour Tree */}
        <section data-testid="stage-br-tree">
          <h3
            style={{
              margin: '0 0 8px',
              fontSize: 'var(--ds-font-size-200)',
              fontWeight: 600,
              color: token('color.text.subtlest', 'var(--ds-text-disabled)'),
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}
          >
            Business Requests
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {brs.length === 0 ? (
              <span style={{ fontSize: 'var(--ds-font-size-300)', color: token('color.text.subtlest', 'var(--ds-text-disabled)') }}>
                No items
              </span>
            ) : (
              brs.map(br => {
                const days = daysAgo(br.entered_step_at);
                return (
                  <div
                    key={br.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: `6px ${token('space.100', '8px')}`,
                      borderRadius: 4,
                      background: token('color.background.neutral.subtle', 'var(--ds-surface-sunken)'),
                      border: `1px solid ${token('color.border', 'var(--cp-lozenge-grey-bg, var(--cp-border-neutral))')}`,
                    }}
                  >
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: slaColor(days),
                        flexShrink: 0,
                      }}
                    />
                    <span
                      style={{
                        flex: 1,
                        fontSize: 'var(--ds-font-size-300)',
                        color: token('color.text', 'var(--cp-text-primary, var(--cp-text-inverse))'),
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {br.title}
                    </span>
                    <span
                      style={{
                        fontSize: 'var(--ds-font-size-100)',
                        color: token('color.text.subtlest', 'var(--ds-text-disabled)'),
                        flexShrink: 0,
                      }}
                    >
                      {days}d
                    </span>
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); setPostMortem({ id: br.id, title: br.title }); }}
                      style={{
                        background: 'none',
                        border: `1px solid ${token('color.border', 'var(--cp-lozenge-grey-bg, var(--cp-border-neutral))')}`,
                        borderRadius: 4,
                        cursor: 'pointer',
                        fontSize: 'var(--ds-font-size-100)',
                        color: token('color.text.subtle', 'var(--ds-text-subtle)'),
                        padding: '0px 6px',
                        flexShrink: 0,
                        lineHeight: 1.4,
                      }}
                    >
                      ✦ Post-mortem
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* SLA Timeline */}
        <section data-testid="stage-sla-timeline">
          <h3
            style={{
              margin: '0 0 8px',
              fontSize: 'var(--ds-font-size-200)',
              fontWeight: 600,
              color: token('color.text.subtlest', 'var(--ds-text-disabled)'),
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}
          >
            Stage Handoff SLA
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {[
              { label: '≤ 7 days (on track)', color: slaColor(0), count: brs.filter(br => daysAgo(br.entered_step_at) <= 7).length },
              { label: '8–21 days (at risk)',  color: slaColor(14), count: brs.filter(br => { const d = daysAgo(br.entered_step_at); return d > 7 && d <= 21; }).length },
              { label: '> 21 days (overdue)',  color: slaColor(30), count: overdueBrs },
            ].map(band => (
              <div key={band.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: band.color, flexShrink: 0 }} />
                <span style={{ fontSize: 'var(--ds-font-size-200)', color: token('color.text.subtle', 'var(--ds-text-subtle)'), flex: 1 }}>
                  {band.label}
                </span>
                <span style={{ fontSize: 'var(--ds-font-size-300)', fontWeight: 600, color: token('color.text', 'var(--cp-text-primary, var(--cp-text-inverse))') }}>
                  {band.count}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <BrPostMortemModal
        brId={postMortem?.id ?? null}
        brTitle={postMortem?.title ?? ''}
        onClose={() => setPostMortem(null)}
      />

      {/* Owner Accountability Footer */}
      <div
        data-testid="stage-owner-footer"
        style={{
          borderTop: `1px solid ${token('color.border', 'var(--cp-lozenge-grey-bg, var(--cp-border-neutral))')}`,
          padding: token('space.150', '12px'),
          background: token('color.background.neutral.subtle', 'var(--ds-surface-sunken)'),
        }}
      >
        <span
          style={{
            fontSize: 'var(--ds-font-size-100)',
            fontWeight: 600,
            color: token('color.text.subtlest', 'var(--ds-text-disabled)'),
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            display: 'block',
            marginBottom: 8,
          }}
        >
          Owner Accountability
        </span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {ownerMap.size === 0 ? (
            <span style={{ fontSize: 'var(--ds-font-size-200)', color: token('color.text.subtlest', 'var(--ds-text-disabled)') }}>—</span>
          ) : (
            Array.from(ownerMap.entries()).map(([name, count]) => (
              <div
                key={name}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '4px 8px',
                  background: token('color.background.neutral', 'var(--ds-background-neutral-subtle)'),
                  borderRadius: 12,
                  fontSize: 'var(--ds-font-size-200)',
                  color: token('color.text', 'var(--cp-text-primary, var(--cp-text-inverse))'),
                }}
              >
                <span>{name}</span>
                <span
                  style={{
                    fontWeight: 700,
                    color: token('color.text.subtle', 'var(--ds-text-subtle)'),
                  }}
                >
                  {count}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
