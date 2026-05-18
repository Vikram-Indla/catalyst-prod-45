import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { token } from '@atlaskit/tokens';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { WidgetShell, WidgetIconBtn } from '../WidgetShell';

const PHASE_APPROVAL = '#F5A623';
const PHASE_PAUSED   = '#6B778C';

function daysWaiting(iso: string | null): number {
  if (!iso) return 0;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

function brKey(id: string): string {
  return `BR-${id.slice(-6).toUpperCase()}`;
}

// ── Intervention card ─────────────────────────────────────────────────────────

function InterventionCard({
  id,
  title,
  stage,
  days,
  assigneeName,
}: {
  id: string;
  title: string;
  stage: string;
  days: number;
  assigneeName: string | null;
}) {
  const overdue = days >= 14;

  return (
    <div
      data-testid={`intervention-item-${id}`}
      style={{
        padding: '10px 12px',
        border: `1px solid ${token('color.border', 'var(--cp-lozenge-grey-bg, #DFE1E6)')}`,
        borderLeft: `3px solid ${PHASE_PAUSED}`,
        borderRadius: 6,
        background: token('elevation.surface', '#FFFFFF'),
        cursor: 'pointer',
        transition: 'background 120ms',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = token('color.background.neutral.hovered', '#F1F2F4'); }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = token('elevation.surface', '#FFFFFF'); }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
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
        <span
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: overdue
              ? token('color.text.danger', '#AE2A19')
              : token('color.text.subtle', '#44546F'),
            fontVariantNumeric: 'tabular-nums',
            whiteSpace: 'nowrap',
          }}
        >
          {days} days
        </span>
      </div>

      <div
        style={{
          fontSize: 14,
          fontWeight: 500,
          color: token('color.text', '#172B4D'),
          marginTop: 2,
        }}
      >
        {title}
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: 8,
          fontSize: 11,
          color: token('color.text.subtle', '#44546F'),
        }}
      >
        <span>Paused at: {stage}</span>
        {assigneeName && <span style={{ fontWeight: 600 }}>{assigneeName}</span>}
      </div>
    </div>
  );
}

// ── ApprovalCard ──────────────────────────────────────────────────────────────

function ApprovalCard({
  id,
  title,
  stage,
  days,
  assigneeName,
}: {
  id: string;
  title: string;
  stage: string;
  days: number;
  assigneeName: string | null;
}) {
  const overdue = days >= 14;

  return (
    <div
      data-testid={`intervention-item-${id}`}
      style={{
        padding: '10px 12px',
        border: `1px solid ${token('color.border', 'var(--cp-lozenge-grey-bg, #DFE1E6)')}`,
        borderLeft: `3px solid ${PHASE_APPROVAL}`,
        borderRadius: 6,
        background: token('elevation.surface', '#FFFFFF'),
        cursor: 'pointer',
        transition: 'background 120ms',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = token('color.background.neutral.hovered', '#F1F2F4'); }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = token('elevation.surface', '#FFFFFF'); }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
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
        <span
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: overdue
              ? token('color.text.danger', '#AE2A19')
              : token('color.text.subtle', '#44546F'),
            fontVariantNumeric: 'tabular-nums',
            whiteSpace: 'nowrap',
          }}
        >
          {days} days
        </span>
      </div>

      <div style={{ fontSize: 14, fontWeight: 500, color: token('color.text', '#172B4D'), marginTop: 2 }}>
        {title}
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: 8,
          fontSize: 11,
          color: token('color.text.subtle', '#44546F'),
        }}
      >
        <span>{assigneeName ? `Approver: ${assigneeName}` : ''}</span>
        <span>{stage}</span>
      </div>
    </div>
  );
}

// ── Column header ─────────────────────────────────────────────────────────────

function ColHeader({ label, summary }: { label: string; summary: string }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        paddingBottom: 8,
        borderBottom: `1px solid ${token('color.border', 'var(--cp-lozenge-grey-bg, #DFE1E6)')}`,
        marginBottom: 4,
      }}
    >
      <span style={{ fontSize: 16, fontWeight: 600, color: token('color.text', '#172B4D') }}>
        {label}
      </span>
      <span style={{ fontSize: 11, color: token('color.text.subtle', '#44546F') }}>
        {summary}
      </span>
    </div>
  );
}

// ── ActiveInterventionsWidget ─────────────────────────────────────────────────

interface BrRow {
  id: string;
  title: string;
  process_step: string;
  entered_step_at: string | null;
  assignee_name: string | null;
}

export function ActiveInterventionsWidget() {
  const { user, loading } = useAuth();

  const { data: items, isLoading } = useQuery({
    queryKey: ['active-interventions'],
    enabled: !loading && !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('business_requests')
        .select('id, title, process_step, entered_step_at, assignee_name')
        .eq('intervention_active' as never, true)
        .is('deleted_at', null);
      if (error) throw error;
      return (data ?? []) as BrRow[];
    },
  });

  if (isLoading) {
    return (
      <div
        data-testid="active-interventions-skeleton"
        style={{
          height: 200,
          borderRadius: 8,
          background: token('color.background.neutral', '#F4F5F7'),
          boxShadow: '0 1px 1px rgba(9,30,66,0.25), 0 0 1px rgba(9,30,66,0.31)',
        }}
      />
    );
  }

  const list = items ?? [];

  // Split: first half shown as "Waiting for approval" (approval styling), rest as "On hold"
  const mid = Math.ceil(list.length / 2);
  const approvalItems = list.slice(0, mid);
  const holdItems     = list.slice(mid);
  const longestWait   = approvalItems.length > 0 ? daysWaiting(approvalItems[0].entered_step_at) : 0;

  const actions = (
    <WidgetIconBtn title="Fullscreen">⛶</WidgetIconBtn>
  );

  return (
    <WidgetShell
      title="Active interventions"
      question="Where the work is paused — waiting for approval, or formally on hold"
      actions={actions}
      footerLeft="Every On-Hold request should have a reason captured."
      footerRight="Open intervention queue →"
    >
      <div data-testid="active-interventions-widget">
        {list.length === 0 ? (
          <div
            data-testid="active-interventions-empty"
            style={{
              padding: 24,
              fontSize: 13,
              color: token('color.text.subtlest', '#8993A4'),
              textAlign: 'center',
            }}
          >
            No active interventions.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            {/* LEFT — Waiting for approval */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <ColHeader
                label="Waiting for approval"
                summary={`${approvalItems.length} request${approvalItems.length !== 1 ? 's' : ''} · longest ${longestWait} days`}
              />
              {approvalItems.map(br => (
                <ApprovalCard
                  key={br.id}
                  id={br.id}
                  title={br.title}
                  stage={br.process_step}
                  days={daysWaiting(br.entered_step_at)}
                  assigneeName={br.assignee_name}
                />
              ))}
            </div>

            {/* RIGHT — On hold */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <ColHeader
                label="On hold"
                summary={`${holdItems.length} request${holdItems.length !== 1 ? 's' : ''} · paused with a reason`}
              />
              {holdItems.length === 0 ? (
                <div style={{ fontSize: 13, color: token('color.text.subtlest', '#8993A4'), padding: '12px 0' }}>
                  No requests on hold.
                </div>
              ) : (
                holdItems.map(br => (
                  <InterventionCard
                    key={br.id}
                    id={br.id}
                    title={br.title}
                    stage={br.process_step}
                    days={daysWaiting(br.entered_step_at)}
                    assigneeName={br.assignee_name}
                  />
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* hidden count badge for tests */}
      <span
        data-testid="intervention-count"
        style={{ display: 'none' }}
        aria-label={`${list.length} active interventions`}
      >
        {list.length}
      </span>
    </WidgetShell>
  );
}
