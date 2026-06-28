// @ts-nocheck
/**
 * ActiveInitiativesWidget — "Release Timelines"
 * Gantt-style view of active releases with BRs grouped underneath.
 * Product dashboard replacement for RecentReleasesWidget.
 * NO progress bars, NO completion %. Status chips only.
 */
import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { token } from '@atlaskit/tokens';
import { supabase } from '@/integrations/supabase/client';
import { WidgetShell, WidgetIconBtn } from '../WidgetShell';

// ─── Types ────────────────────────────────────────────────────────────────────

type BrStatus = 'Active' | 'In Review' | 'Blocked' | 'Done' | 'Planned' | 'On Hold';

interface BrRow {
  id: string;
  key: string;
  title: string;
  status: BrStatus;
  startDate: string | null;
  endDate: string | null;
  urgency: string | null;
}

interface SprintTag {
  name: string;
  start: string | null;
  end: string | null;
}

interface ReleaseSection {
  quarter: string;  // e.g. "Q2 2026" or "Unscheduled"
  qStart: Date | null;
  qEnd: Date | null;
  brs: BrRow[];
  sprints: SprintTag[];
}

// ─── Quarter parsing ──────────────────────────────────────────────────────────

function parseQuarter(q: string | null | undefined): { start: Date; end: Date } | null {
  if (!q) return null;
  const m = q.match(/Q([1-4])\s*(\d{4})/i);
  if (!m) return null;
  const [, qn, yr] = m;
  const y = parseInt(yr, 10);
  const startMonth = (parseInt(qn, 10) - 1) * 3;
  const start = new Date(y, startMonth, 1);
  const end   = new Date(y, startMonth + 3, 0); // last day of quarter
  return { start, end };
}

// ─── Status mapping ───────────────────────────────────────────────────────────

const DONE_STEPS  = new Set(['done', 'approved', 'completed', 'closed']);
const TODO_STEPS  = new Set(['new', 'new_request', 'backlog', 'planned', 'ready']);
const HOLD_STEPS  = new Set(['on hold', 'on_hold', 'paused']);
const BLOCK_STEPS = new Set(['blocked']);
const REV_STEPS   = new Set(['in review', 'awaiting info', 'awaiting_info']);

function stepToStatus(step: string | null): BrStatus {
  const s = (step ?? '').toLowerCase().trim();
  if (DONE_STEPS.has(s))  return 'Done';
  if (TODO_STEPS.has(s))  return 'Planned';
  if (HOLD_STEPS.has(s))  return 'On Hold';
  if (BLOCK_STEPS.has(s)) return 'Blocked';
  if (REV_STEPS.has(s))   return 'In Review';
  return 'Active';
}

// ─── Status chip ──────────────────────────────────────────────────────────────

const CHIP_STYLE: Record<BrStatus, { bg: string; color: string }> = {
  Active:    { bg: token('color.background.information', 'var(--ds-background-selected)'), color: token('color.text.information', 'var(--ds-link, var(--ds-link))') },
  'In Review':{ bg: token('color.background.discovery', 'var(--ds-background-discovery)'), color: token('color.text.discovery', 'var(--ds-background-discovery-bold)') },
  Blocked:   { bg: token('color.background.danger', 'var(--ds-background-danger)'), color: token('color.text.danger', 'var(--ds-text-danger, var(--ds-text-danger))') },
  Done:      { bg: token('color.background.success', 'var(--ds-background-success)'), color: token('color.text.success', 'var(--ds-text-success, var(--ds-chart-green-bold))') },
  Planned:   { bg: token('color.background.neutral', 'var(--ds-background-neutral)'), color: token('color.text.subtle', 'var(--ds-icon-subtle, var(--ds-text-subtlest))') },
  'On Hold': { bg: token('color.background.warning', 'var(--ds-background-warning)'), color: token('color.text.warning', 'var(--ds-text-warning, var(--ds-text-warning))') },
};

function StatusChip({ status }: { status: BrStatus }) {
  const { bg, color } = CHIP_STYLE[status] ?? CHIP_STYLE['Active'];
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: 3,
      fontSize: 'var(--ds-font-size-100)',
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

function fmtShort(d: Date | null | string): string {
  const dt = typeof d === 'string' ? new Date(d) : d;
  if (!dt || isNaN(dt.getTime())) return '—';
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ─── Gantt helpers ────────────────────────────────────────────────────────────

function pct(d: Date | null, rangeStart: Date, totalMs: number): number {
  if (!d || totalMs <= 0) return 0;
  return Math.max(0, Math.min(100, (d.getTime() - rangeStart.getTime()) / totalMs * 100));
}

// ─── Release Gantt bar ────────────────────────────────────────────────────────

function ReleaseBar({ section, rangeStart, totalMs, todayPct }: {
  section: ReleaseSection;
  rangeStart: Date;
  totalMs: number;
  todayPct: number;
}) {
  const left  = pct(section.qStart, rangeStart, totalMs);
  const right = pct(section.qEnd, rangeStart, totalMs);
  const width = Math.max(2, right - left);

  // Active if today falls within the quarter
  const today = new Date();
  const isActive = section.qStart && section.qEnd
    && today >= section.qStart && today <= section.qEnd;

  const barBg = isActive
    ? 'var(--ds-background-accent-blue-subtlest)'
    : 'var(--ds-background-neutral-subtle)';
  const barBorder = isActive
    ? 'var(--ds-border-accent-blue)'
    : 'var(--ds-border)';

  return (
    <div style={{ position: 'relative', height: 18, flex: 1, minWidth: 0 }}>
      {/* Today line */}
      <div aria-hidden style={{
        position: 'absolute', left: `${todayPct}%`, top: 0, bottom: 0,
        width: 1.5, background: 'var(--ds-border-accent-red)', opacity: 0.45, zIndex: 1, pointerEvents: 'none',
      }} />
      {/* Quarter band */}
      {section.qStart && section.qEnd && (
        <div style={{
          position: 'absolute',
          left: `${left}%`,
          width: `${width}%`,
          top: 4, height: 10,
          borderRadius: 2,
          background: barBg,
          borderBottom: `2px solid ${barBorder}`,
          zIndex: 2,
        }} />
      )}
    </div>
  );
}

// ─── BR row (mini Gantt bar) ──────────────────────────────────────────────────

function BrRow({ br, rangeStart, totalMs, todayPct }: {
  br: BrRow;
  rangeStart: Date;
  totalMs: number;
  todayPct: number;
}) {
  const s  = br.startDate ? new Date(br.startDate) : null;
  const e  = br.endDate   ? new Date(br.endDate)   : null;
  const left  = pct(s, rangeStart, totalMs);
  const right = pct(e, rangeStart, totalMs);
  const hasBar = s && e && totalMs > 0;
  const barBg     = token('color.background.accent.blue.subtle', '#CCE0FF');
  const barBorder = token('color.border.accent.blue', 'var(--ds-link)');

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '8px minmax(0,1.2fr) 1fr 72px 68px',
      alignItems: 'center',
      gap: 8,
      padding: '5px 0',
      borderBottom: `1px solid ${token('color.border', 'var(--ds-border)')}18`,
    }}>
      {/* Indent spacer */}
      <div />

      {/* BR key + title */}
      <div style={{ minWidth: 0 }}>
        <div style={{
          fontSize: 'var(--ds-font-size-100)',
          fontWeight: 600,
          color: token('color.text.subtlest', 'var(--ds-text-disabled)'),
          fontFamily: 'ui-monospace, monospace',
          letterSpacing: '0.02em',
          lineHeight: 1.3,
        }}>
          {br.key}
        </div>
        <div style={{
          fontSize: 'var(--ds-font-size-200)',
          fontWeight: 400,
          color: token('color.text', 'var(--ds-text)'),
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          lineHeight: 1.4,
        }}>
          {br.title}
        </div>
      </div>

      {/* Mini Gantt bar */}
      <div style={{ position: 'relative', height: 16, minWidth: 0 }}>
        <div aria-hidden style={{
          position: 'absolute', left: `${todayPct}%`, top: 0, bottom: 0,
          width: 1, background: 'var(--ds-border-accent-red)', opacity: 0.35, zIndex: 1,
        }} />
        {hasBar && (
          <div style={{
            position: 'absolute',
            left: `${left}%`,
            width: `${Math.max(1.5, right - left)}%`,
            top: 3, height: 10,
            borderRadius: 2,
            background: barBg,
            border: `1px solid ${barBorder}`,
            zIndex: 2,
          }} />
        )}
      </div>

      {/* Status chip */}
      <StatusChip status={br.status} />

      {/* End date */}
      <span style={{
        fontSize: 'var(--ds-font-size-100)',
        fontWeight: 400,
        color: token('color.text.subtlest', 'var(--ds-text-disabled)'),
        textAlign: 'right',
        whiteSpace: 'nowrap',
      }}>
        {fmtShort(br.endDate)}
      </span>
    </div>
  );
}

// ─── Release section header ───────────────────────────────────────────────────

function ReleaseSectionHeader({ section, rangeStart, totalMs, todayPct, expanded, onToggle }: {
  section: ReleaseSection;
  rangeStart: Date;
  totalMs: number;
  todayPct: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  const hasBrs = section.brs.length > 0;
  const today = new Date();
  const isActive = section.qStart && section.qEnd && today >= section.qStart && today <= section.qEnd;

  return (
    <div>
      <div
        role={hasBrs ? 'button' : undefined}
        tabIndex={hasBrs ? 0 : undefined}
        onClick={hasBrs ? onToggle : undefined}
        onKeyDown={hasBrs ? (e) => { if (e.key === 'Enter' || e.key === ' ') onToggle(); } : undefined}
        style={{
          display: 'grid',
          gridTemplateColumns: '8px minmax(0,1.2fr) 1fr 72px 68px',
          alignItems: 'center',
          gap: 8,
          padding: '8px 0',
          cursor: hasBrs ? 'pointer' : 'default',
          borderBottom: `1px solid ${token('color.border', 'var(--ds-border)')}50`,
        }}
      >
        {/* Chevron */}
        <span style={{
          fontSize: 'var(--ds-font-size-100)',
          color: token('color.text.subtle', 'var(--ds-icon-subtle)'),
          transition: 'transform 120ms',
          transform: (hasBrs && expanded) ? 'rotate(90deg)' : 'rotate(0deg)',
          display: 'inline-block',
          visibility: hasBrs ? 'visible' : 'hidden',
        }}>▶</span>

        {/* Quarter label + sprint tags */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              fontSize: 'var(--ds-font-size-300)',
              fontWeight: 600,
              color: token('color.text', 'var(--ds-text)'),
              letterSpacing: '-0.003em',
              lineHeight: 1.3,
            }}>
              {section.quarter}
            </span>
            {isActive && (
              <span style={{
                fontSize: 'var(--ds-font-size-50)', fontWeight: 700,
                color: token('color.text.information', 'var(--ds-link)'),
                background: token('color.background.information', 'var(--ds-background-selected)'),
                borderRadius: 3, padding: '1px 5px',
                flexShrink: 0,
              }}>
                Current
              </span>
            )}
          </div>
          {/* Sprint tags */}
          {section.sprints.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {section.sprints.map((sp, i) => (
                <span key={i} style={{
                  fontSize: 'var(--ds-font-size-50)',
                  color: token('color.text.subtle', 'var(--ds-icon-subtle)'),
                  background: token('color.background.neutral.subtle', 'var(--ds-surface-sunken)'),
                  border: `1px solid ${token('color.border', 'var(--ds-border)')}`,
                  borderRadius: 3,
                  padding: '1px 5px',
                  whiteSpace: 'nowrap',
                  letterSpacing: '0.01em',
                }}>
                  ⚡ {sp.name}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Release bar */}
        <ReleaseBar section={section} rangeStart={rangeStart} totalMs={totalMs} todayPct={todayPct} />

        {/* BR count */}
        <span style={{ fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: token('color.text.subtle', 'var(--ds-icon-subtle)') }}>
          {section.brs.length} BR{section.brs.length !== 1 ? 's' : ''}
        </span>

        {/* Quarter end */}
        <span style={{ fontSize: 'var(--ds-font-size-100)', color: token('color.text.subtlest', 'var(--ds-text-disabled)'), textAlign: 'right', whiteSpace: 'nowrap' }}>
          {section.qEnd ? fmtShort(section.qEnd) : '—'}
        </span>
      </div>
    </div>
  );
}

// ─── Data hook ────────────────────────────────────────────────────────────────

function useReleaseTimelinesData() {
  return useQuery({
    queryKey: ['release-timelines'],
    staleTime: 60_000,
    queryFn: async (): Promise<ReleaseSection[]> => {
      // Active BRs only (exclude done/closed/archived)
      const { data: brs } = await (supabase as any)
        .from('business_requests')
        .select('id, request_key, title, process_step, urgency, planned_quarter, start_date, end_date')
        .not('process_step', 'in', '(done,approved,completed,closed,archived)')
        .is('deleted_at', null)
        .order('planned_quarter', { ascending: true });

      // Active sprints for annotation (anchor_sprints = project sprints)
      const { data: sprints } = await supabase
        .from('anchor_sprints')
        .select('name, start_date, end_date')
        .order('start_date', { ascending: true });

      const sectionMap = new Map<string, ReleaseSection>();

      for (const br of brs ?? []) {
        const pq  = Array.isArray(br.planned_quarter) ? br.planned_quarter : [];
        const key = pq[0] ?? 'Unscheduled';
        const status = stepToStatus(br.process_step);

        if (!sectionMap.has(key)) {
          const dates = key !== 'Unscheduled' ? parseQuarter(key) : null;

          // Find sprints that overlap this quarter
          const quarterSprints: SprintTag[] = (sprints ?? [])
            .filter(sp => {
              if (!dates || !sp.start_date || !sp.end_date) return false;
              const spStart = new Date(sp.start_date);
              const spEnd   = new Date(sp.end_date);
              return spStart <= dates.end && spEnd >= dates.start;
            })
            .map(sp => ({ name: sp.name, start: sp.start_date, end: sp.end_date }));

          sectionMap.set(key, {
            quarter: key,
            qStart: dates?.start ?? null,
            qEnd: dates?.end ?? null,
            brs: [],
            sprints: quarterSprints,
          });
        }

        sectionMap.get(key)!.brs.push({
          id: br.id,
          key: br.request_key ?? '—',
          title: br.title ?? 'Untitled',
          status,
          startDate: br.start_date ?? null,
          endDate: br.end_date ?? null,
          urgency: br.urgency ?? null,
        });
      }

      // Sort sections: Q1 < Q2 < Q3 < Q4, Unscheduled last
      return Array.from(sectionMap.values()).sort((a, b) => {
        if (!a.qStart && !b.qStart) return 0;
        if (!a.qStart) return 1;
        if (!b.qStart) return -1;
        return a.qStart.getTime() - b.qStart.getTime();
      });
    },
  });
}

// ─── ActiveInitiativesWidget ──────────────────────────────────────────────────

export function ActiveInitiativesWidget() {
  const { data: sections, isLoading } = useReleaseTimelinesData();

  const [expandedSections, setExpandedSections] = React.useState<Set<string>>(() => {
    // Default: expand current quarter
    const today = new Date();
    const q = `Q${Math.floor(today.getMonth() / 3) + 1} ${today.getFullYear()}`;
    return new Set([q]);
  });

  const toggleSection = (key: string) => setExpandedSections(prev => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });

  // Global date range
  const { rangeStart, totalMs, todayPct } = useMemo(() => {
    const today = new Date();
    const allMs: number[] = [today.getTime()];
    for (const sec of sections ?? []) {
      if (sec.qStart) allMs.push(sec.qStart.getTime());
      if (sec.qEnd)   allMs.push(sec.qEnd.getTime());
      for (const br of sec.brs) {
        if (br.startDate) allMs.push(new Date(br.startDate).getTime());
        if (br.endDate)   allMs.push(new Date(br.endDate).getTime());
      }
    }
    const minMs = Math.min(...allMs);
    const maxMs = Math.max(...allMs);
    const pad = 10 * 86_400_000;
    const rs = new Date(minMs - pad);
    const re = new Date(maxMs + pad);
    const tm = re.getTime() - rs.getTime();
    const tp = tm > 0 ? Math.max(0, Math.min(100, (today.getTime() - rs.getTime()) / tm * 100)) : 50;
    return { rangeStart: rs, totalMs: tm, todayPct: tp };
  }, [sections]);

  const totalBrs = sections?.reduce((a, s) => a + s.brs.length, 0) ?? 0;
  const blockedCount = sections?.flatMap(s => s.brs).filter(b => b.status === 'Blocked').length ?? 0;

  const LABEL_STYLE: React.CSSProperties = {
    fontSize: 'var(--ds-font-size-100)',
    fontWeight: 600,
    color: token('color.text.subtlest', 'var(--ds-text-disabled)'),
    letterSpacing: '0.04em',
    textTransform: 'uppercase' as const,
  };

  return (
    <WidgetShell
      title="Release Timelines"
      question="Active initiatives across release quarters"
      footerLeft={
        <span style={{ fontSize: 'var(--ds-font-size-200)', color: token('color.text.subtlest', 'var(--ds-text-disabled)') }}>
          {totalBrs} active BR{totalBrs !== 1 ? 's' : ''}
          {blockedCount > 0 && (
            <span style={{ color: 'var(--ds-text-accent-red-bolder)', fontWeight: 600, marginLeft: 8 }}>
              · {blockedCount} blocked
            </span>
          )}
        </span>
      }
      footerRight={
        <a
          href="#"
          style={{
            fontSize: 'var(--ds-font-size-200)',
            fontWeight: 500,
            color: token('color.link', 'var(--ds-link)'),
            textDecoration: 'none',
          }}
        >
          Open Roadmap →
        </a>
      }
    >
      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '8px 0' }}>
          {[0, 1, 2].map(i => (
            <div key={i} className="animate-pulse" style={{ height: 48, borderRadius: 4, background: token('color.background.neutral.subtle', 'var(--ds-background-neutral)') }} />
          ))}
        </div>
      ) : !sections?.length ? (
        <div style={{ padding: '24px 0', textAlign: 'center', color: token('color.text.subtlest', 'var(--ds-text-disabled)'), fontSize: 'var(--ds-font-size-300)' }}>
          No active initiatives scheduled across release quarters.
        </div>
      ) : (
        <div>
          {/* Column headers */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '8px minmax(0,1.2fr) 1fr 72px 68px',
            gap: 8,
            paddingBottom: 8,
            borderBottom: `2px solid ${token('color.border', 'var(--ds-border)')}`,
            marginBottom: 4,
          }}>
            <div />
            <span style={LABEL_STYLE}>Quarter / Initiative</span>
            <div style={{ position: 'relative' }}>
              <span style={{ ...LABEL_STYLE, position: 'absolute', left: 0 }}>
                {rangeStart.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}
              </span>
              <span style={{
                ...LABEL_STYLE,
                color: 'var(--ds-text-accent-red-bolder)',
                position: 'absolute',
                left: `${todayPct}%`,
                transform: 'translateX(-50%)',
                whiteSpace: 'nowrap',
                letterSpacing: 0,
                textTransform: 'none' as const,
              }}>
                ▼ Today
              </span>
            </div>
            <span style={LABEL_STYLE}>Count</span>
            <span style={{ ...LABEL_STYLE, textAlign: 'right' }}>Target</span>
          </div>

          {/* Sections */}
          {sections.map(sec => (
            <div key={sec.quarter} style={{ marginBottom: 2 }}>
              <ReleaseSectionHeader
                section={sec}
                rangeStart={rangeStart}
                totalMs={totalMs}
                todayPct={todayPct}
                expanded={expandedSections.has(sec.quarter)}
                onToggle={() => toggleSection(sec.quarter)}
              />
              {expandedSections.has(sec.quarter) && (
                <div style={{ paddingBottom: 6 }}>
                  {sec.brs.length === 0 ? (
                    <div style={{ fontSize: 'var(--ds-font-size-200)', color: token('color.text.subtlest', 'var(--ds-text-disabled)'), paddingLeft: 16, paddingTop: 4 }}>
                      No active BRs in this quarter
                    </div>
                  ) : (
                    sec.brs.map(br => (
                      <BrRow key={br.id} br={br} rangeStart={rangeStart} totalMs={totalMs} todayPct={todayPct} />
                    ))
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </WidgetShell>
  );
}
