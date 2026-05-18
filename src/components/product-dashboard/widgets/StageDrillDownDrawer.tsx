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
  if (days <= 7) return token('color.background.success.bold', '#1F845A');
  if (days <= 21) return token('color.background.warning.bold', '#E2B203');
  return token('color.background.danger.bold', '#AE2A19');
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
        background: token('elevation.surface.overlay', '#FFFFFF'),
        borderLeft: `1px solid ${'var(--ds-border, #DFE1E6)'}`,
        boxShadow: token('elevation.shadow.overlay', '-4px 0 12px rgba(0,0,0,0.12)'),
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
          borderBottom: `1px solid ${'var(--ds-border, #DFE1E6)'}`,
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: 16,
            fontWeight: 600,
            color: token('color.text', '#172B4D'),
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
            color: token('color.text.subtlest', '#8993A4'),
            fontSize: 18,
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
              fontSize: 12,
              fontWeight: 600,
              color: token('color.text.subtlest', '#8993A4'),
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}
          >
            AI Summary
          </h3>
          <div
            style={{
              padding: token('space.150', '12px'),
              background: token('color.background.information', '#E9F2FF'),
              borderRadius: 6,
              fontSize: 13,
              color: token('color.text', '#172B4D'),
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
              fontSize: 12,
              fontWeight: 600,
              color: token('color.text.subtlest', '#8993A4'),
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}
          >
            Business Requests
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {brs.length === 0 ? (
              <span style={{ fontSize: 13, color: token('color.text.subtlest', '#8993A4') }}>
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
                      background: token('color.background.neutral.subtle', '#FAFBFC'),
                      border: `1px solid ${'var(--ds-border, #DFE1E6)'}`,
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
                        fontSize: 13,
                        color: token('color.text', '#172B4D'),
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {br.title}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        color: token('color.text.subtlest', '#8993A4'),
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
                        border: `1px solid ${'var(--ds-border, #DFE1E6)'}`,
                        borderRadius: 4,
                        cursor: 'pointer',
                        fontSize: 11,
                        color: token('color.text.subtle', '#505258'),
                        padding: '2px 6px',
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
              fontSize: 12,
              fontWeight: 600,
              color: token('color.text.subtlest', '#8993A4'),
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}
          >
            Stage Handoff SLA
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[
              { label: '≤ 7 days (on track)', color: slaColor(0), count: brs.filter(br => daysAgo(br.entered_step_at) <= 7).length },
              { label: '8–21 days (at risk)',  color: slaColor(14), count: brs.filter(br => { const d = daysAgo(br.entered_step_at); return d > 7 && d <= 21; }).length },
              { label: '> 21 days (overdue)',  color: slaColor(30), count: overdueBrs },
            ].map(band => (
              <div key={band.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: band.color, flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: token('color.text.subtle', '#505258'), flex: 1 }}>
                  {band.label}
                </span>
                <span style={{ fontSize: 13, fontWeight: 600, color: token('color.text', '#172B4D') }}>
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
          borderTop: `1px solid ${'var(--ds-border, #DFE1E6)'}`,
          padding: token('space.150', '12px'),
          background: token('color.background.neutral.subtle', '#FAFBFC'),
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: token('color.text.subtlest', '#8993A4'),
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            display: 'block',
            marginBottom: 8,
          }}
        >
          Owner Accountability
        </span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {ownerMap.size === 0 ? (
            <span style={{ fontSize: 12, color: token('color.text.subtlest', '#8993A4') }}>—</span>
          ) : (
            Array.from(ownerMap.entries()).map(([name, count]) => (
              <div
                key={name}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '3px 8px',
                  background: 'var(--ds-background-neutral, #F4F5F7)',
                  borderRadius: 12,
                  fontSize: 12,
                  color: token('color.text', '#172B4D'),
                }}
              >
                <span>{name}</span>
                <span
                  style={{
                    fontWeight: 700,
                    color: token('color.text.subtle', '#505258'),
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
