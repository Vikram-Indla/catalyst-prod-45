import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { token } from '@atlaskit/tokens';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { WidgetShell, WidgetIconBtn } from '../WidgetShell';

const STALLED_DAYS  = 14;
const OVERDUE_DAYS  = 21;

function daysInStage(iso: string | null): number {
  if (!iso) return 0;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

function brKey(id: string): string {
  return `BR-${id.slice(-6).toUpperCase()}`;
}

// ── Toggle control ────────────────────────────────────────────────────────────

function ToggleGroup({
  options,
  active,
  onChange,
}: {
  options: { label: string; value: string }[];
  active: string;
  onChange: (v: string) => void;
}) {
  return (
    <div
      role="tablist"
      onClick={e => e.stopPropagation()}
      style={{
        display: 'inline-flex',
        background: token('color.background.neutral.subtle', '#F4F5F7'),
        borderRadius: 4,
        padding: 2,
      }}
    >
      {options.map(o => (
        <button
          key={o.value}
          role="tab"
          type="button"
          aria-selected={o.value === active}
          onClick={() => onChange(o.value)}
          style={{
            border: 'none',
            background: o.value === active ? token('elevation.surface', '#FFFFFF') : 'transparent',
            padding: '4px 10px',
            fontSize: 11,
            fontWeight: 500,
            color: o.value === active ? token('color.text', '#172B4D') : token('color.text.subtle', '#44546F'),
            cursor: 'pointer',
            borderRadius: 3,
            boxShadow: o.value === active ? '0 1px 1px rgba(9,30,66,0.15)' : 'none',
            fontFamily: 'inherit',
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ── Section heading ───────────────────────────────────────────────────────────

function SectionHeading({ label, count, danger }: { label: string; count: number; danger?: boolean }) {
  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 600,
        color: token('color.text.subtle', '#44546F'),
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        marginBottom: 8,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}
    >
      {label}
      <span
        style={{
          background: danger
            ? token('color.background.danger', '#FFECEB')
            : token('color.background.warning', '#FFF7D6'),
          color: danger
            ? token('color.text.danger', '#AE2A19')
            : token('color.text.warning', '#7F5F01'),
          padding: '1px 8px',
          borderRadius: 10,
          fontSize: 11,
          letterSpacing: 'normal',
          textTransform: 'none',
          fontWeight: 600,
        }}
      >
        {count}
      </span>
    </div>
  );
}

// ── Attention row ─────────────────────────────────────────────────────────────

function AttentionRow({
  id,
  title,
  stage,
  days,
  assignee,
  overdue,
}: {
  id: string;
  title: string;
  stage: string;
  days: number;
  assignee: string | null;
  overdue: boolean;
}) {
  return (
    <div
      data-testid={`attention-item-${id}`}
      style={{
        display: 'grid',
        gridTemplateColumns: '80px 1fr auto auto',
        gap: 12,
        alignItems: 'center',
        padding: '10px 12px',
        borderBottom: `1px solid ${token('color.border', 'var(--cp-lozenge-grey-bg, #DFE1E6)')}`,
        cursor: 'pointer',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = token('color.background.neutral.hovered', '#F1F2F4'); }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
    >
      <span
        style={{
          fontFamily: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace',
          fontSize: 12,
          fontWeight: 600,
          color: token('color.link', '#0C66E4'),
        }}
      >
        {brKey(id)}
      </span>
      <div>
        <div style={{ fontSize: 14, fontWeight: 500, color: token('color.text', '#172B4D') }}>
          {title}
        </div>
        {assignee && (
          <div style={{ fontSize: 11, color: token('color.text.subtle', '#44546F'), marginTop: 2 }}>
            {assignee}
          </div>
        )}
      </div>
      <span
        style={{
          display: 'inline-block',
          padding: '2px 8px',
          borderRadius: 3,
          fontSize: 11,
          fontWeight: 600,
          background: token('color.background.neutral.subtle', '#F4F5F7'),
          color: token('color.text.subtle', '#44546F'),
          whiteSpace: 'nowrap',
        }}
      >
        {stage}
      </span>
      <span
        style={{
          fontSize: 14,
          fontWeight: 600,
          color: overdue
            ? token('color.text.danger', '#AE2A19')
            : token('color.text.warning', '#7F5F01'),
          fontVariantNumeric: 'tabular-nums',
          whiteSpace: 'nowrap',
        }}
      >
        {days}d in stage
      </span>
    </div>
  );
}

// ── NeedsAttentionWidget ──────────────────────────────────────────────────────

interface BrRow {
  id: string;
  title: string;
  process_step: string;
  entered_step_at: string | null;
  assignee: string | null;
}

export function NeedsAttentionWidget() {
  const { user, loading } = useAuth();
  const [scope, setScope] = useState<'mine' | 'all'>('mine');

  const { data: brs, isLoading } = useQuery({
    queryKey: ['needs-attention-brs'],
    enabled: !loading && !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('business_requests')
        .select('id, title, process_step, entered_step_at, assignee')
        .is('deleted_at', null);
      if (error) throw error;
      return (data ?? []) as BrRow[];
    },
  });

  if (isLoading) {
    return (
      <div
        data-testid="needs-attention-skeleton"
        style={{
          height: 180,
          borderRadius: 8,
          background: token('color.background.neutral', '#F4F5F7'),
          boxShadow: '0 1px 1px rgba(9,30,66,0.25), 0 0 1px rgba(9,30,66,0.31)',
        }}
      />
    );
  }

  const all = (brs ?? []).filter(br => daysInStage(br.entered_step_at) >= STALLED_DAYS);

  const userName = (user as any)?.user_metadata?.full_name as string | undefined;
  const scoped = scope === 'mine' && userName
    ? all.filter(br => br.assignee === userName)
    : all;

  const overdue  = scoped.filter(br => daysInStage(br.entered_step_at) > OVERDUE_DAYS);
  const stalled  = scoped.filter(br => {
    const d = daysInStage(br.entered_step_at);
    return d >= STALLED_DAYS && d <= OVERDUE_DAYS;
  });

  const toggleOptions = [
    { label: `Mine (${all.filter(br => br.assignee === userName).length})`, value: 'mine' },
    { label: `All (${all.length})`, value: 'all' },
  ];

  const actions = (
    <>
      <ToggleGroup options={toggleOptions} active={scope} onChange={v => setScope(v as 'mine' | 'all')} />
      <WidgetIconBtn title="Fullscreen">⛶</WidgetIconBtn>
    </>
  );

  return (
    <WidgetShell
      title="Needs your attention"
      question="Items that are past their target date or have been sitting too long in one stage"
      actions={actions}
      flush
      footerLeft={
        scope === 'mine' && userName
          ? `Showing requests where you are the assignee. Switch to All to see org-wide.`
          : `Showing all ${all.length} item${all.length !== 1 ? 's' : ''} that need attention.`
      }
      footerRight="Open all overdue →"
    >
      <div
        data-testid="needs-attention-widget"
        style={{ padding: '0 0' }}
      >
        {scoped.length === 0 ? (
          <div
            data-testid="needs-attention-empty"
            style={{
              padding: '24px',
              fontSize: 13,
              color: token('color.text.subtlest', '#8993A4'),
              textAlign: 'center',
            }}
          >
            All business requests are on track. ✓
          </div>
        ) : (
          <>
            {overdue.length > 0 && (
              <div style={{ padding: '16px 24px 0' }}>
                <SectionHeading label="Past target date" count={overdue.length} danger />
                <div>
                  {overdue.map(br => (
                    <AttentionRow
                      key={br.id}
                      id={br.id}
                      title={br.title}
                      stage={br.process_step}
                      days={daysInStage(br.entered_step_at)}
                      assignee={br.assignee}
                      overdue
                    />
                  ))}
                </div>
              </div>
            )}

            {stalled.length > 0 && (
              <div style={{ padding: '16px 24px 0' }}>
                <SectionHeading label="Sitting too long in one stage" count={stalled.length} />
                <div>
                  {stalled.map(br => (
                    <AttentionRow
                      key={br.id}
                      id={br.id}
                      title={br.title}
                      stage={br.process_step}
                      days={daysInStage(br.entered_step_at)}
                      assignee={br.assignee}
                      overdue={false}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* count badge — outside sections so test can find it */}
        <span
          data-testid="attention-count"
          style={{ display: 'none' }}
          aria-label={`${scoped.length} items need attention`}
        >
          {scoped.length}
        </span>
      </div>
    </WidgetShell>
  );
}
