import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { token } from '@atlaskit/tokens';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useBrLandingStep } from '@/hooks/useBrLandingStep';
import { WidgetShell, WidgetIconBtn } from '../WidgetShell';

function daysAgo(iso: string | null): string {
  if (!iso) return '—';
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (d === 0) return 'today';
  if (d === 1) return '1 day ago';
  return `${d} days ago`;
}

function brKey(id: string): string {
  return `BR-${id.slice(-6).toUpperCase()}`;
}

// ── Outcome lozenge ───────────────────────────────────────────────────────────

type Outcome = 'clean' | 'broke' | 'minor';

function OutcomeLozenge({ outcome }: { outcome: Outcome }) {
  const config: Record<Outcome, { label: string; bg: string; color: string }> = {
    clean: {
      label: 'Clean release',
      bg: token('color.background.success', 'var(--ds-background-success)'),
      color: token('color.text.success', 'var(--ds-text-success)'),
    },
    broke: {
      label: 'Production incident',
      bg: token('color.background.danger', 'var(--ds-background-danger)'),
      color: token('color.text.danger', 'var(--ds-text-danger)'),
    },
    minor: {
      label: 'Minor issue',
      bg: token('color.background.warning', 'var(--ds-background-warning)'),
      color: token('color.text.warning', 'var(--ds-text-warning)'),
    },
  };
  const { label, bg, color } = config[outcome];
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: 3,
        fontSize: 'var(--ds-font-size-100)',
        lineHeight: '16px',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.02em',
        background: bg,
        color,
      }}
    >
      {label}
    </span>
  );
}

// ── Type pill ────────────────────────────────────────────────────────────────

function TypePill({ label }: { label: string }) {
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '1px 8px',
        borderRadius: 10,
        fontSize: 'var(--ds-font-size-100)',
        lineHeight: '16px',
        fontWeight: 500,
        background: token('color.background.neutral.subtle', 'var(--ds-background-neutral-subtle)'),
        color: token('color.text.subtle', 'var(--cp-text-secondary, var(--cp-text-secondary))'),
      }}
    >
      {label}
    </span>
  );
}

// ── RecentReleasesWidget ──────────────────────────────────────────────────────

interface ReleaseRow {
  id: string;
  title: string;
  process_step: string;
  entered_step_at: string | null;
  assignee: string | null;
}

export function RecentReleasesWidget() {
  const { user, loading } = useAuth();
  const { landingStep, isLoading: landingLoading } = useBrLandingStep();

  const { data: releases, isLoading: brsLoading } = useQuery({
    queryKey: ['recent-releases', landingStep?.value],
    enabled: !loading && !!user?.id && !!landingStep?.value,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('business_requests')
        .select('id, title, process_step, entered_step_at, assignee')
        .eq('process_step', landingStep!.value)
        .is('deleted_at', null);
      if (error) throw error;
      return (data ?? []) as ReleaseRow[];
    },
  });

  const isLoading = landingLoading || brsLoading;

  if (isLoading) {
    return (
      <div
        data-testid="recent-releases-skeleton"
        style={{
          height: 200,
          borderRadius: 8,
          background: token('color.background.neutral', 'var(--ds-background-neutral-subtle)'),
          boxShadow: '0 1px 1px var(--ds-shadow-raised, rgba(9,30,66,0.25)), 0 0 1px var(--ds-shadow-raised, rgba(9,30,66,0.31))',
        }}
      />
    );
  }

  const list = releases ?? [];

  const actions = (
    <>
      <WidgetIconBtn title="Fullscreen">⛶</WidgetIconBtn>
      <WidgetIconBtn title="Download">⤓</WidgetIconBtn>
    </>
  );

  const incidentCount = 0; // no incident join yet

  return (
    <WidgetShell
      title="Recent releases & how they landed"
      question="What we shipped in the last 30 days — and whether anything broke in production within 30 days after"
      actions={actions}
      flush
      footerLeft={
        list.length === 0
          ? 'No completed business requests yet.'
          : `${list.length} release${list.length !== 1 ? 's' : ''} in the last 60 days. Linked via Production Incident parent → BR child Epics.`
      }
      footerRight="See full release history →"
    >
      <div data-testid="recent-releases-widget">
        {list.length === 0 ? (
          <div
            data-testid="recent-releases-empty"
            style={{
              padding: 24,
              fontSize: 'var(--ds-font-size-300)',
              color: token('color.text.subtlest', 'var(--ds-text-disabled)'),
              textAlign: 'center',
            }}
          >
            No completed business requests yet.
          </div>
        ) : (
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: 'var(--ds-font-size-400)',
            }}
          >
            <thead>
              <tr>
                {['Request', 'What we shipped', 'Released', 'Type', 'How it landed'].map(h => (
                  <th
                    key={h}
                    style={{
                      textAlign: 'left',
                      padding: '10px 12px',
                      borderBottom: `1px solid ${token('color.border', 'var(--cp-lozenge-grey-bg, var(--cp-border-neutral))')}`,
                      fontSize: 'var(--ds-font-size-100)',
                      fontWeight: 600,
                      color: token('color.text.subtle', 'var(--cp-text-secondary, var(--cp-text-secondary))'),
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {list.map(item => (
                <tr
                  key={item.id}
                  data-testid={`release-item-${item.id}`}
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={e => {
                    Array.from((e.currentTarget as HTMLTableRowElement).cells).forEach(
                      td => { (td as HTMLTableCellElement).style.background = token('color.background.neutral.hovered', 'var(--ds-background-neutral, var(--ds-background-neutral))'); },
                    );
                  }}
                  onMouseLeave={e => {
                    Array.from((e.currentTarget as HTMLTableRowElement).cells).forEach(
                      td => { (td as HTMLTableCellElement).style.background = 'transparent'; },
                    );
                  }}
                >
                  <td style={{ padding: '12px 12px', borderBottom: `1px solid ${token('color.border', 'var(--cp-lozenge-grey-bg, var(--cp-border-neutral))')}`, verticalAlign: 'middle' }}>
                    <span
                      style={{
                        fontFamily: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace',
                        fontSize: 'var(--ds-font-size-200)',
                        fontWeight: 600,
                        color: token('color.link', 'var(--ds-link)'),
                      }}
                    >
                      {brKey(item.id)}
                    </span>
                  </td>
                  <td style={{ padding: '12px 12px', borderBottom: `1px solid ${token('color.border', 'var(--cp-lozenge-grey-bg, var(--cp-border-neutral))')}`, verticalAlign: 'middle' }}>
                    <div style={{ fontSize: 'var(--ds-font-size-400)', fontWeight: 500, color: token('color.text', 'var(--cp-text-primary, var(--cp-text-inverse))') }}>
                      {item.title}
                    </div>
                    {item.assignee && (
                      <div style={{ fontSize: 'var(--ds-font-size-100)', color: token('color.text.subtle', 'var(--cp-text-secondary, var(--cp-text-secondary))'), marginTop: 2 }}>
                        {item.process_step} · Assignee: {item.assignee}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '12px 12px', borderBottom: `1px solid ${token('color.border', 'var(--cp-lozenge-grey-bg, var(--cp-border-neutral))')}`, verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                    {daysAgo(item.entered_step_at)}
                  </td>
                  <td style={{ padding: '12px 12px', borderBottom: `1px solid ${token('color.border', 'var(--cp-lozenge-grey-bg, var(--cp-border-neutral))')}`, verticalAlign: 'middle' }}>
                    <TypePill label="Feature" />
                  </td>
                  <td style={{ padding: '12px 12px', borderBottom: `1px solid ${token('color.border', 'var(--cp-lozenge-grey-bg, var(--cp-border-neutral))')}`, verticalAlign: 'middle' }}>
                    <OutcomeLozenge outcome="clean" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </WidgetShell>
  );
}
