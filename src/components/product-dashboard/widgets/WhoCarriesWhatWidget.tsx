import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { token } from '@atlaskit/tokens';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { WidgetShell, WidgetIconBtn } from '../WidgetShell';

// ── Avatar colours — cycling through 6 brand colours ─────────────────────────

const AVATAR_COLORS = ['var(--ds-background-discovery-bold, #6554C0)', '#00A3BF', 'var(--ds-background-warning-bold, #E2B203)', 'var(--ds-background-success-bold, #1F845A)', 'var(--ds-background-discovery-bold, #6E5DC6)', 'var(--ds-background-danger-bold, #C9372C)'];

function avatarColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(p => p[0])
    .join('')
    .toUpperCase();
}

// ── Workload row ──────────────────────────────────────────────────────────────

function WorkloadRow({
  id,
  name,
  count,
  maxCount,
}: {
  id: string;
  name: string;
  count: number;
  maxCount: number;
}) {
  const pct = maxCount === 0 ? 0 : (count / maxCount) * 100;
  const isHeavy  = pct >= 90;
  const isMedium = pct >= 50 && !isHeavy;
  const barColor = isHeavy
    ? token('color.text.danger', 'var(--ds-text-danger, #AE2A19)')
    : isMedium
    ? '#F5A623'
    : '#8A7CFF';

  return (
    <div
      data-testid={`workload-row-${id}`}
      style={{
        display: 'grid',
        gridTemplateColumns: '160px 1fr 40px',
        alignItems: 'center',
        gap: 10,
        padding: '8px 0',
        borderBottom: `1px solid ${token('color.border', 'var(--cp-lozenge-grey-bg, var(--cp-border-neutral, #DFE1E6))')}`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        <span
          style={{
            width: 24,
            height: 24,
            borderRadius: '50%',
            background: avatarColor(name),
            color: 'var(--ds-text-inverse, #FFFFFF)',
            fontSize: 11,
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {initials(name)}
        </span>
        <span
          style={{
            fontSize: 14,
            fontWeight: 500,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            color: token('color.text', 'var(--cp-text-primary, var(--cp-text-inverse, #172B4D))'),
          }}
        >
          {name}
        </span>
      </div>

      <div
        style={{
          height: 18,
          borderRadius: 3,
          background: token('color.background.neutral.subtle', 'var(--ds-background-neutral-subtle, #F4F5F7)'),
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${pct}%`,
            background: barColor,
            transition: 'width 200ms',
          }}
        />
      </div>

      <div
        style={{
          fontSize: 14,
          fontWeight: 700,
          textAlign: 'right',
          fontVariantNumeric: 'tabular-nums',
          color: token('color.text', 'var(--cp-text-primary, var(--cp-text-inverse, #172B4D))'),
        }}
      >
        {count}
      </div>
    </div>
  );
}

// ── Column ────────────────────────────────────────────────────────────────────

function WorkloadCol({
  heading,
  rows,
  maxCount,
}: {
  heading: string;
  rows: AssigneeLoad[];
  maxCount: number;
}) {
  return (
    <div>
      <h3
        style={{
          margin: '0 0 12px',
          paddingBottom: 8,
          borderBottom: `1px solid ${token('color.border', 'var(--cp-lozenge-grey-bg, var(--cp-border-neutral, #DFE1E6))')}`,
          fontSize: 11,
          fontWeight: 600,
          color: token('color.text.subtle', 'var(--cp-text-secondary, var(--cp-text-secondary, #44546F))'),
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
        }}
      >
        {heading}
      </h3>
      {rows.length === 0 ? (
        <div
          style={{
            fontSize: 13,
            color: token('color.text.subtlest', 'var(--ds-text-disabled, #8590A2)'),
            padding: '12px 0',
          }}
        >
          No data.
        </div>
      ) : (
        rows.map(r => (
          <WorkloadRow key={r.assignee_id} id={r.assignee_id} name={r.name} count={r.count} maxCount={maxCount} />
        ))
      )}
    </div>
  );
}

// ── WhoCarriesWhatWidget ──────────────────────────────────────────────────────

interface BrRow {
  id: string;
  assignee_id: string | null;
  assignee_name: string | null;
}

interface AssigneeLoad {
  assignee_id: string;
  name: string;
  count: number;
}

export function WhoCarriesWhatWidget() {
  const { user, loading } = useAuth();

  const { data: brs, isLoading } = useQuery({
    queryKey: ['who-carries-what'],
    enabled: !loading && !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('business_requests')
        .select('id, assignee_id, assignee_name')
        .is('deleted_at', null);
      if (error) throw error;
      return (data ?? []) as BrRow[];
    },
  });

  if (isLoading) {
    return (
      <div
        data-testid="workload-skeleton"
        style={{
          height: 200,
          borderRadius: 8,
          background: token('color.background.neutral', 'var(--ds-background-neutral-subtle, #F4F5F7)'),
          boxShadow: '0 1px 1px var(--ds-shadow-raised, rgba(9,30,66,0.25)), 0 0 1px var(--ds-shadow-raised, rgba(9,30,66,0.31))',
        }}
      />
    );
  }

  // Aggregate by assignee_id, sort heaviest first
  const byId = new Map<string, AssigneeLoad>();
  (brs ?? []).forEach(br => {
    if (!br.assignee_id) return;
    const existing = byId.get(br.assignee_id);
    if (existing) {
      existing.count += 1;
    } else {
      byId.set(br.assignee_id, {
        assignee_id: br.assignee_id,
        name: br.assignee_name ?? br.assignee_id,
        count: 1,
      });
    }
  });

  const sorted = Array.from(byId.values()).sort((a, b) => b.count - a.count);

  // Split into two columns since we don't have DM/PO role data in business_requests
  const mid = Math.ceil(sorted.length / 2);
  const leftRows  = sorted.slice(0, mid);
  const rightRows = sorted.slice(mid);

  const maxCount = sorted[0]?.count ?? 1;
  const heaviest = sorted[0];
  const footerText = heaviest && sorted.length > 1
    ? `${heaviest.name} (${heaviest.count}) carries the most — rebalancing recommended if load gap exceeds 2×.`
    : `${sorted.length} assignee${sorted.length !== 1 ? 's' : ''} across all active requests.`;

  const actions = (
    <>
      <WidgetIconBtn title="Fullscreen">⛶</WidgetIconBtn>
      <WidgetIconBtn title="Download">⤓</WidgetIconBtn>
    </>
  );

  return (
    <WidgetShell
      title="Who's carrying what"
      question="Active workload across assignees — heaviest at the top"
      actions={actions}
      footerLeft={footerText}
      footerRight="Open workload planner →"
    >
      <div
        data-testid="who-carries-what-widget"
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 24,
        }}
      >
        <WorkloadCol heading="Delivery load" rows={leftRows} maxCount={maxCount} />
        <WorkloadCol heading="Active pipeline" rows={rightRows} maxCount={maxCount} />
      </div>

      {sorted.length === 0 && (
        <div
          data-testid="workload-empty"
          style={{
            padding: 24,
            fontSize: 13,
            color: token('color.text.subtlest', 'var(--ds-text-disabled, #8590A2)'),
            textAlign: 'center',
          }}
        >
          No assigned business requests.
        </div>
      )}
    </WidgetShell>
  );
}
