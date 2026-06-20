// @ts-nocheck
/**
 * ActiveSprintsWidget — "Sprint Timelines"
 * Gantt-style view of active releases with linked sprints.
 * NO progress bars, NO completion %. Status chips only.
 */
import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { token } from '@atlaskit/tokens';
import { supabase } from '@/integrations/supabase/client';
import type { WidgetProps } from '../widget-types';
import WidgetWrapper from '../WidgetWrapper';
import { EmptyState } from '@/components/ads';
import { useDashboardFilter } from '@/contexts/DashboardFilterContext';
import { useGadgetSettings } from '@/hooks/useGadgetSettings';
import WidgetGearButton from '../WidgetGearButton';
import { LABEL, STRONG, SMALL } from '../dashboardTypography';

// ─── Types ────────────────────────────────────────────────────────────────────

type SprintStatus = 'Active' | 'At Risk' | 'Upcoming' | 'Completed';
type ReleaseStatus = 'Active' | 'At Risk' | 'Blocked' | 'On Track';

interface SprintBand {
  name: string;
  start: string | null;
  end: string | null;
  status: SprintStatus;
}

interface ReleaseGroup {
  id: string;
  name: string;
  targetDate: string | null;
  total: number;
  done: number;
  status: ReleaseStatus;
  sprints: SprintBand[];
}

// ─── Status chip ──────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  Active:    { bg: token('color.background.information', '#E9F2FF'), color: token('color.text.information', '#0055CC') },
  'At Risk': { bg: token('color.background.warning', '#FFF7D6'), color: token('color.text.warning', '#7F5F01') },
  Blocked:   { bg: token('color.background.danger', '#FFECEB'), color: token('color.text.danger', '#AE2A19') },
  Upcoming:  { bg: token('color.background.neutral', '#F1F2F4'), color: token('color.text.subtle', '#626F86') },
  Completed: { bg: token('color.background.success', '#DFFCF0'), color: token('color.text.success', '#216E4E') },
  'On Track':{ bg: token('color.background.success', '#DFFCF0'), color: token('color.text.success', '#216E4E') },
};

function StatusChip({ status }: { status: string }) {
  const { bg, color } = STATUS_STYLES[status] ?? STATUS_STYLES['Active'];
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: 3,
      fontSize: 11,
      fontWeight: 600,
      lineHeight: '16px',
      background: bg,
      color,
      whiteSpace: 'nowrap',
      flexShrink: 0,
    }}>
      {status}
    </span>
  );
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

function parseDate(s: string | null): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function fmtShort(s: string | null): string {
  const d = parseDate(s);
  if (!d) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ─── Gantt bar ────────────────────────────────────────────────────────────────

const BAR_BG: Record<SprintStatus, string> = {
  Active:    token('color.background.accent.blue.subtle', '#CCE0FF'),
  'At Risk': token('color.background.accent.orange.subtle', '#FFE2BD'),
  Upcoming:  token('color.background.neutral.subtle', '#F1F2F4'),
  Completed: token('color.background.accent.green.subtle', '#BAF3DB'),
};
const BAR_BORDER: Record<SprintStatus, string> = {
  Active:    token('color.border.accent.blue', '#0C66E4'),
  'At Risk': token('color.border.accent.orange', '#D97008'),
  Upcoming:  token('color.border', '#DFE1E6'),
  Completed: token('color.border.accent.green', '#22A06B'),
};

function GanttBar({
  start, end, rangeStart, rangeEnd, status, todayPct,
}: {
  start: string | null;
  end: string | null;
  rangeStart: Date;
  rangeEnd: Date;
  status: SprintStatus;
  todayPct: number;
}) {
  const totalMs = rangeEnd.getTime() - rangeStart.getTime();
  const s = parseDate(start) ?? rangeStart;
  const e = parseDate(end) ?? rangeEnd;

  const left  = totalMs > 0 ? Math.max(0, (s.getTime() - rangeStart.getTime()) / totalMs * 100) : 0;
  const right = totalMs > 0 ? Math.min(100, (e.getTime() - rangeStart.getTime()) / totalMs * 100) : 100;
  const width = Math.max(1.5, right - left);

  return (
    <div style={{ position: 'relative', height: 20, flex: 1 }}>
      {/* Today line */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          left: `${todayPct}%`,
          top: 0,
          bottom: 0,
          width: 1.5,
          background: 'var(--ds-border-accent-red, #C9372C)',
          opacity: 0.45,
          zIndex: 1,
          pointerEvents: 'none',
        }}
      />
      {/* Sprint bar */}
      <div
        style={{
          position: 'absolute',
          left: `${left}%`,
          width: `${width}%`,
          top: 3,
          height: 14,
          borderRadius: 3,
          background: BAR_BG[status] ?? BAR_BG.Active,
          border: `1.5px solid ${BAR_BORDER[status] ?? BAR_BORDER.Active}`,
          zIndex: 2,
        }}
      />
    </div>
  );
}

// ─── Release Gantt bar (thin underline style) ─────────────────────────────────

function ReleaseBar({
  targetDate, rangeStart, rangeEnd, status, todayPct,
}: {
  targetDate: string | null;
  rangeStart: Date;
  rangeEnd: Date;
  status: ReleaseStatus;
  todayPct: number;
}) {
  const totalMs = rangeEnd.getTime() - rangeStart.getTime();
  const e = parseDate(targetDate) ?? rangeEnd;
  const right = totalMs > 0 ? Math.min(100, (e.getTime() - rangeStart.getTime()) / totalMs * 100) : 90;
  const isAtRisk = status === 'At Risk' || status === 'Blocked';

  return (
    <div style={{ position: 'relative', height: 20, flex: 1 }}>
      {/* Today line */}
      <div aria-hidden style={{
        position: 'absolute', left: `${todayPct}%`, top: 0, bottom: 0,
        width: 1.5, background: 'var(--ds-border-accent-red, #C9372C)', opacity: 0.45, zIndex: 1, pointerEvents: 'none',
      }} />
      {/* Release bar: spans from left edge to target date */}
      <div style={{
        position: 'absolute', left: 0, width: `${Math.max(4, right)}%`,
        top: 6, height: 8, borderRadius: 2,
        background: isAtRisk
          ? 'var(--ds-background-accent-red-subtlest, #FFECEB)'
          : 'var(--ds-background-accent-blue-subtlest, #E9F2FF)',
        borderBottom: `2px solid ${isAtRisk ? 'var(--ds-border-accent-red, #C9372C)' : 'var(--ds-border-accent-blue, #0C66E4)'}`,
        zIndex: 2,
      }} />
    </div>
  );
}

// ─── Data hook ────────────────────────────────────────────────────────────────

function useSprintTimelinesData(projectId: string | null | undefined) {
  return useQuery({
    queryKey: ['sprint-timelines', projectId],
    enabled: !!projectId,
    staleTime: 60_000,
    queryFn: async (): Promise<ReleaseGroup[]> => {
      // Resolve project key → canonical projects.id
      const { data: ph } = await supabase.from('ph_projects').select('key').eq('id', projectId!).maybeSingle();
      const pKey = ph?.key;
      if (!pKey) return [];
      const { data: proj } = await supabase.from('projects').select('id').eq('key', pKey).maybeSingle();
      const canonicalId = proj?.id ?? projectId!;

      // Active releases (not done/archived/shipped)
      const { data: releases } = await supabase
        .from('rh_releases')
        .select('id, name, status, target_date')
        .eq('project_id', canonicalId)
        .not('status', 'in', '(done,archived,released,shipped)')
        .order('target_date', { ascending: true });
      if (!releases?.length) return [];

      const releaseIds = releases.map(r => r.id);

      // Sprints per release
      const { data: productSprints } = await supabase
        .from('product_sprints')
        .select('name, start_date, end_date, release_id')
        .in('release_id', releaseIds)
        .order('start_date', { ascending: true });

      // Issue counts from sprint_release JSONB
      const releaseNames = releases.map(r => r.name);
      const fvOrClause = releaseNames.map(n => `sprint_release.cs.${JSON.stringify([{ name: n }])}`).join(',');
      const { data: issues } = await supabase
        .from('ph_issues')
        .select('sprint_release, status_category')
        .eq('project_key', pKey)
        .is('deleted_at', null)
        .or(fvOrClause);

      // Build issue counts per release
      const issuesByRelease = new Map<string, { total: number; done: number }>();
      for (const issue of issues ?? []) {
        const fv = Array.isArray(issue.sprint_release) ? issue.sprint_release : [];
        for (const v of fv) {
          const n = typeof v === 'string' ? v : v?.name;
          if (!n || !releaseNames.includes(n)) continue;
          const e = issuesByRelease.get(n) ?? { total: 0, done: 0 };
          e.total++;
          if ((issue.status_category ?? '').toLowerCase() === 'done') e.done++;
          issuesByRelease.set(n, e);
        }
      }

      // Build sprint map
      const sprintMapByRelease = new Map<string, SprintBand[]>();
      const todayStr = new Date().toISOString().slice(0, 10);
      const at7days  = new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10);
      for (const s of productSprints ?? []) {
        const arr = sprintMapByRelease.get(s.release_id) ?? [];
        const start = s.start_date?.slice(0, 10) ?? null;
        const end   = s.end_date?.slice(0, 10) ?? null;
        let spStatus: SprintStatus = 'Active';
        if (end && end < todayStr)   spStatus = 'Completed';
        else if (start && start > todayStr) spStatus = 'Upcoming';
        else if (end && end <= at7days)     spStatus = 'At Risk';
        arr.push({ name: s.name, start, end, status: spStatus });
        sprintMapByRelease.set(s.release_id, arr);
      }

      const todayMs = Date.now();
      return releases.map(rel => {
        const counts = issuesByRelease.get(rel.name) ?? { total: 0, done: 0 };
        const daysLeft = rel.target_date
          ? Math.ceil((new Date(rel.target_date).getTime() - todayMs) / 86_400_000)
          : null;
        let relStatus: ReleaseStatus = 'Active';
        if (daysLeft !== null && daysLeft < 0)  relStatus = 'Blocked';
        else if (daysLeft !== null && daysLeft < 14) relStatus = 'At Risk';
        else if (counts.total > 0 && counts.done / counts.total >= 0.8) relStatus = 'On Track';
        return {
          id: rel.id,
          name: rel.name,
          targetDate: rel.target_date ?? null,
          total: counts.total,
          done: counts.done,
          status: relStatus,
          sprints: sprintMapByRelease.get(rel.id) ?? [],
        };
      });
    },
  });
}

// ─── Sprint row ───────────────────────────────────────────────────────────────

function SprintRow({ sprint, rangeStart, rangeEnd, todayPct }: {
  sprint: SprintBand;
  rangeStart: Date;
  rangeEnd: Date;
  todayPct: number;
}) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '196px 1fr 80px 64px',
      alignItems: 'center',
      gap: 8,
      padding: '5px 0',
      borderBottom: `1px solid ${token('color.border', '#DFE1E6')}20`,
    }}>
      <span style={{
        ...SMALL,
        paddingLeft: 20,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        color: token('color.text', '#292A2E'),
      }}>
        {sprint.name}
      </span>
      <GanttBar start={sprint.start} end={sprint.end} rangeStart={rangeStart} rangeEnd={rangeEnd} status={sprint.status} todayPct={todayPct} />
      <StatusChip status={sprint.status} />
      <span style={{ ...LABEL, textAlign: 'right', whiteSpace: 'nowrap', color: token('color.text.subtle', '#626F86') }}>
        {fmtShort(sprint.end)}
      </span>
    </div>
  );
}

// ─── Release header row ───────────────────────────────────────────────────────

function ReleaseHeaderRow({ release, rangeStart, rangeEnd, todayPct, expanded, onToggle }: {
  release: ReleaseGroup;
  rangeStart: Date;
  rangeEnd: Date;
  todayPct: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  const hasSprints = release.sprints.length > 0;
  return (
    <div>
      <div
        role={hasSprints ? 'button' : undefined}
        tabIndex={hasSprints ? 0 : undefined}
        onClick={hasSprints ? onToggle : undefined}
        onKeyDown={hasSprints ? (e) => { if (e.key === 'Enter' || e.key === ' ') onToggle(); } : undefined}
        style={{
          display: 'grid',
          gridTemplateColumns: '196px 1fr 80px 64px',
          alignItems: 'center',
          gap: 8,
          padding: '7px 0',
          cursor: hasSprints ? 'pointer' : 'default',
          borderBottom: `1px solid ${token('color.border', '#DFE1E6')}50`,
        }}
      >
        {/* Release name + toggle chevron */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
          {hasSprints && (
            <span style={{
              fontSize: 9,
              color: token('color.text.subtle', '#626F86'),
              flexShrink: 0,
              display: 'inline-block',
              transition: 'transform 120ms',
              transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
            }}>▶</span>
          )}
          <span style={{
            ...STRONG,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            color: token('color.text', '#292A2E'),
            letterSpacing: '-0.003em',
          }} title={release.name}>
            {release.name}
          </span>
        </div>

        {/* Release timeline bar */}
        <ReleaseBar targetDate={release.targetDate} rangeStart={rangeStart} rangeEnd={rangeEnd} status={release.status} todayPct={todayPct} />

        {/* Status chip */}
        <StatusChip status={release.status} />

        {/* Target date */}
        <span style={{ ...LABEL, textAlign: 'right', whiteSpace: 'nowrap', color: token('color.text.subtle', '#626F86') }}>
          {fmtShort(release.targetDate)}
        </span>
      </div>

      {/* Subline: sprint count + item count */}
      {(release.sprints.length > 0 || release.total > 0) && (
        <div style={{
          ...LABEL,
          paddingLeft: hasSprints ? 16 : 0,
          paddingBottom: 3,
          color: token('color.text.subtlest', '#8993A4'),
          display: 'flex',
          gap: 6,
        }}>
          {release.sprints.length > 0 && (
            <span>{release.sprints.length} sprint{release.sprints.length !== 1 ? 's' : ''}</span>
          )}
          {release.total > 0 && (
            <>
              {release.sprints.length > 0 && <span>·</span>}
              <span>{release.done} of {release.total} items done</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── ActiveSprintsWidget ──────────────────────────────────────────────────────

export default function ActiveSprintsWidget({
  projectId,
  projectKey,
  collapsed,
  onToggleCollapse,
}: WidgetProps) {
  const { filter } = useDashboardFilter();
  const { settings } = useGadgetSettings('sprint-timelines', projectKey);
  const { data: releases, isLoading } = useSprintTimelinesData(projectId);

  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
  const toggleRelease = (id: string) => setExpandedIds(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  // Global date range: min/max of all sprint dates + today
  const { rangeStart, rangeEnd, todayPct } = useMemo(() => {
    const today = new Date();
    const allMs: number[] = [today.getTime()];
    for (const rel of releases ?? []) {
      if (rel.targetDate) allMs.push(new Date(rel.targetDate).getTime());
      for (const sp of rel.sprints) {
        if (sp.start) allMs.push(new Date(sp.start).getTime());
        if (sp.end)   allMs.push(new Date(sp.end).getTime());
      }
    }
    const minMs = Math.min(...allMs);
    const maxMs = Math.max(...allMs);
    const pad = 5 * 86_400_000;
    const rs = new Date(minMs - pad);
    const re = new Date(maxMs + pad);
    const totalMs = re.getTime() - rs.getTime();
    const tp = totalMs > 0 ? Math.max(0, Math.min(100, (today.getTime() - rs.getTime()) / totalMs * 100)) : 50;
    return { rangeStart: rs, rangeEnd: re, todayPct: tp };
  }, [releases]);

  const count        = releases?.length ?? 0;
  const totalSprints = releases?.reduce((a, r) => a + r.sprints.length, 0) ?? 0;
  const atRiskCount  = releases?.filter(r => r.status === 'At Risk' || r.status === 'Blocked').length ?? 0;

  const headerExtras = (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <button
        type="button"
        style={{
          height: 28,
          padding: '0 10px',
          borderRadius: 4,
          border: `1px solid ${token('color.border', '#DFE1E6')}`,
          background: 'transparent',
          color: token('color.link', '#0C66E4'),
          fontSize: 12,
          fontWeight: 500,
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          fontFamily: 'inherit',
        }}
      >
        Open Timeline →
      </button>
      <WidgetGearButton gadgetType="sprint-timelines" projectKey={projectKey} projectId={projectId} />
    </div>
  );

  const footer = count > 0 ? (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <span style={{ ...LABEL, color: token('color.text.subtlest', '#8993A4') }}>
        {count} active release{count !== 1 ? 's' : ''}
      </span>
      {totalSprints > 0 && (
        <span style={{ ...LABEL, color: token('color.text.subtlest', '#8993A4') }}>
          · {totalSprints} sprint{totalSprints !== 1 ? 's' : ''}
        </span>
      )}
      {atRiskCount > 0 && (
        <span style={{ ...LABEL, color: 'var(--ds-text-accent-red-bolder, #AE2A19)', fontWeight: 600 }}>
          · {atRiskCount} at risk
        </span>
      )}
    </div>
  ) : null;

  return (
    <WidgetWrapper
      title="Sprint Timelines"
      subtitle="Active sprints grouped by release"
      collapsed={collapsed}
      onToggleCollapse={onToggleCollapse}
      headerBadges={headerExtras}
      footer={footer}
    >
      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[0, 1, 2].map(i => (
            <div key={i} className="animate-pulse" style={{ height: 46, borderRadius: 4, background: token('color.background.neutral.subtle', '#F1F2F4') }} />
          ))}
        </div>
      ) : count === 0 ? (
        <EmptyState size="compact" header="No active releases" description="Create releases in the Releases module to track sprint timelines here." />
      ) : (
        <div>
          {/* ── Column header row ──────────────────────────────────────── */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '196px 1fr 80px 64px',
            gap: 8,
            paddingBottom: 8,
            borderBottom: `2px solid ${token('color.border', '#DFE1E6')}`,
            marginBottom: 4,
          }}>
            <span style={{ ...LABEL, color: token('color.text.subtlest', '#8993A4') }}>Release / Sprint</span>
            <div style={{ position: 'relative' }}>
              {/* Axis labels */}
              <span style={{ ...LABEL, color: token('color.text.subtlest', '#8993A4'), position: 'absolute', left: 0 }}>
                {rangeStart.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}
              </span>
              {/* Today label pinned at todayPct */}
              <span style={{
                ...LABEL,
                color: 'var(--ds-text-accent-red-bolder, #AE2A19)',
                fontWeight: 700,
                position: 'absolute',
                left: `${todayPct}%`,
                transform: 'translateX(-50%)',
                whiteSpace: 'nowrap',
                fontSize: 10,
              }}>
                ▼ Today
              </span>
              <span style={{ ...LABEL, color: token('color.text.subtlest', '#8993A4'), position: 'absolute', right: 0 }}>
                {rangeEnd.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}
              </span>
            </div>
            <span style={{ ...LABEL, color: token('color.text.subtlest', '#8993A4') }}>Status</span>
            <span style={{ ...LABEL, color: token('color.text.subtlest', '#8993A4'), textAlign: 'right' }}>Target</span>
          </div>

          {/* ── Release groups ──────────────────────────────────────────── */}
          <div>
            {(releases ?? []).map(rel => (
              <div key={rel.id} style={{ marginBottom: 2 }}>
                <ReleaseHeaderRow
                  release={rel}
                  rangeStart={rangeStart}
                  rangeEnd={rangeEnd}
                  todayPct={todayPct}
                  expanded={expandedIds.has(rel.id)}
                  onToggle={() => toggleRelease(rel.id)}
                />
                {expandedIds.has(rel.id) && (
                  <div style={{ paddingBottom: 6 }}>
                    {rel.sprints.length === 0 ? (
                      <div style={{ ...LABEL, paddingLeft: 20, paddingTop: 4, color: token('color.text.subtlest', '#8993A4') }}>
                        No sprints linked to this release
                      </div>
                    ) : (
                      rel.sprints.map((sp, i) => (
                        <SprintRow
                          key={`${sp.name}-${i}`}
                          sprint={sp}
                          rangeStart={rangeStart}
                          rangeEnd={rangeEnd}
                          todayPct={todayPct}
                        />
                      ))
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </WidgetWrapper>
  );
}
