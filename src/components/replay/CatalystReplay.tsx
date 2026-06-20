/**
 * CatalystReplay — flight-tracker lifecycle viewer.
 *
 * Entry points:
 *   1. /replay?key=BAU-5609   (standalone search page)
 *   2. <CatalystReplay rootKey="BAU-5609" />  (inline from detail view)
 *
 * Anatomy:
 *   ┌─ ReplayHeader ──────────────────────────────────────┐
 *   │  [key input]   Jan ··· Jun ··· Dec         ⏮ ▶ ⏭  │
 *   ├─ ReplaySwimlane ×N ────────────────────────────────┤
 *   │  [icon] BAU-100  ─●──── In Design ────────●Done── │
 *   │         ↑ avatar        ↑ detour arc                │
 *   └─────────────────────────────────────────────────────┘
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { useReplayData } from '@/lib/replay/useReplayData';
import type { ReplayLane, ReplaySegment, ReplayDetour, ReplayMilestone, ReplayAnnotation } from '@/lib/replay/replayTypes';
import Spinner from '@atlaskit/spinner';
import Tooltip from '@atlaskit/tooltip';
import Button from '@atlaskit/button';
import { dateToX, getTotalWidth } from '@/components/producthub/timeline/timelineUtils';
import { supabase } from '@/integrations/supabase/client';

// ─── Constants ───────────────────────────────────────────────────────────────

const LANE_H = 52;           // px height per swimlane row
const LABEL_W = 220;         // px width of left label column
const SEGMENT_H = 18;        // px height of status bar
const ICON_SIZE = 16;        // px for child lanes
const ICON_SIZE_ROOT = 18;   // px for root issue
const GRANULARITY = 'week';  // use the week column widths

// Category → ADS colour
const CATEGORY_COLOR: Record<string, string> = {
  'To Do':       'var(--ds-background-neutral, #F1F2F4)',
  'In Progress': 'var(--ds-background-information, #E9F2FF)',
  'Done':        'var(--ds-background-success, #DCFFF1)',
};
const CATEGORY_TEXT: Record<string, string> = {
  'To Do':       'var(--ds-text-subtle, #42526E)',
  'In Progress': 'var(--ds-link, #0052CC)',
  'Done':        'var(--ds-text-success, #006644)',
};
const DETOUR_COLOR = 'var(--ds-background-warning, #FFF7D6)';
const MILESTONE_COLORS: Record<string, string> = {
  release:   'var(--ds-text-danger, #AE2A19)',
  sprint_end:'var(--ds-text-brand, #0052CC)',
  due_date:  'var(--ds-text-warning, #974F0C)',
  target_end:'var(--ds-text-subtle, #42526E)',
};

// ─── Sub-components ──────────────────────────────────────────────────────────

function SegmentBar({
  seg,
  x,
  w,
  laneY,
  scrubX,
}: {
  seg: ReplaySegment;
  x: number;
  w: number;
  laneY: number;
  scrubX: number;
}) {
  const active = scrubX >= x && scrubX <= x + w;
  const bg = CATEGORY_COLOR[seg.category] ?? CATEGORY_COLOR['In Progress'];
  const textColor = CATEGORY_TEXT[seg.category] ?? 'var(--ds-text, #172B4D)';

  return (
    <Tooltip content={`${seg.status} · ${seg.transitionedBy ?? ''}${seg.durationMs ? ` · ${Math.round(seg.durationMs / 86400000)}d` : ''}`}>
      <motion.div
        style={{
          position: 'absolute',
          left: x,
          top: laneY + (LANE_H - SEGMENT_H) / 2,
          width: Math.max(4, w),
          height: SEGMENT_H,
          background: bg,
          border: `1px solid ${active ? 'var(--ds-border-brand, #0052CC)' : 'var(--ds-border, #DFE1E6)'}`,
          borderRadius: 4,
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          paddingLeft: 6,
          boxSizing: 'border-box',
          boxShadow: active ? '0 0 0 2px var(--ds-border-brand, #0052CC)' : 'none',
          cursor: 'default',
        }}
        initial={{ scaleX: 0, originX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      >
        {w > 40 && (
          <span style={{
            fontSize: 10,
            fontWeight: 500,
            color: textColor,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            fontFamily: 'var(--ds-font-family-body)',
          }}>
            {seg.status}
          </span>
        )}
      </motion.div>
    </Tooltip>
  );
}

function DetourArc({ x1, x2, laneY }: { x1: number; x2: number; laneY: number }) {
  const cy = laneY + LANE_H / 2;
  const arcHeight = 20;
  const midX = (x1 + x2) / 2;
  const d = `M ${x1} ${cy} Q ${midX} ${cy + arcHeight} ${x2} ${cy}`;

  return (
    <svg
      style={{ position: 'absolute', left: 0, top: 0, pointerEvents: 'none', overflow: 'visible' }}
      width={0} height={0}
    >
      <path d={d} fill="none" stroke="var(--ds-border-warning, #974F0C)" strokeWidth={1.5} strokeDasharray="4 3" opacity={0.8} />
      <text x={midX} y={cy + arcHeight + 10} textAnchor="middle" fontSize={9} fill="var(--ds-text-warning, #974F0C)" fontFamily="var(--ds-font-family-body)">detour</text>
    </svg>
  );
}

function MilestoneFlag({ x, laneY, milestone }: { x: number; laneY: number; milestone: ReplayMilestone }) {
  const color = MILESTONE_COLORS[milestone.type] ?? 'var(--ds-text-subtle, #42526E)';
  return (
    <Tooltip content={`${milestone.label}: ${new Date(milestone.at).toLocaleDateString()}`}>
      <div style={{ position: 'absolute', left: x - 1, top: laneY, width: 2, height: LANE_H, background: color, opacity: 0.6 }}>
        <div style={{
          position: 'absolute',
          top: 4,
          left: 4,
          background: color,
          color: 'white',
          fontSize: 8,
          padding: '1px 3px',
          borderRadius: 2,
          whiteSpace: 'nowrap',
          fontFamily: 'var(--ds-font-family-body)',
        }}>
          {milestone.label}
        </div>
      </div>
    </Tooltip>
  );
}

function HandoverDot({ x, laneY, annotation }: { x: number; laneY: number; annotation: ReplayAnnotation }) {
  if (annotation.type !== 'handover') return null;
  const cy = laneY + LANE_H / 2;

  return (
    <Tooltip content={`Handover: ${annotation.fromPerson} → ${annotation.toPerson}`}>
      <div style={{
        position: 'absolute',
        left: x - 8,
        top: cy - 8,
        width: 16,
        height: 16,
        borderRadius: '50%',
        background: 'var(--ds-surface-overlay, #FFFFFF)',
        border: '2px solid var(--ds-border-brand, #0052CC)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 7,
        fontWeight: 700,
        color: 'var(--ds-link, #0052CC)',
        cursor: 'default',
        zIndex: 2,
        fontFamily: 'var(--ds-font-family-body)',
      }}>
        {(annotation.fromPerson ?? '?')[0]}{(annotation.toPerson ?? '?')[0]}
      </div>
    </Tooltip>
  );
}

// ─── Single swimlane row ──────────────────────────────────────────────────────

function ReplaySwimlane({
  lane,
  laneIndex,
  timelineStart,
  scrubX,
  isRoot,
}: {
  lane: ReplayLane;
  laneIndex: number;
  timelineStart: Date;
  scrubX: number;
  isRoot: boolean;
}) {
  const laneY = laneIndex * LANE_H;
  const iconSize = isRoot ? ICON_SIZE_ROOT : ICON_SIZE;

  // Compute segment positions.
  const segBars = lane.segments.map((seg) => {
    const start = seg.startAt ? new Date(seg.startAt) : timelineStart;
    const end = seg.endAt ? new Date(seg.endAt) : new Date();
    const x = dateToX(start, GRANULARITY);
    const x2 = dateToX(end, GRANULARITY);
    return { seg, x, w: Math.max(4, x2 - x) };
  });

  // Detour arcs.
  const detourArcs = lane.detours.map((d) => {
    const x1 = dateToX(new Date(d.detourStartAt), GRANULARITY);
    const x2 = d.detourEndAt ? dateToX(new Date(d.detourEndAt), GRANULARITY) : x1 + 40;
    return { x1, x2, d };
  });

  return (
    <div style={{ position: 'absolute', top: laneY, left: 0, right: 0, height: LANE_H }}>
      {/* Zebra stripe */}
      <div style={{
        position: 'absolute',
        left: LABEL_W,
        top: 0,
        right: 0,
        height: LANE_H,
        background: laneIndex % 2 === 0 ? 'transparent' : 'var(--ds-surface-sunken, #F7F8F9)',
      }} />

      {/* Label column */}
      <div style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: LABEL_W,
        height: LANE_H,
        display: 'flex',
        alignItems: 'center',
        paddingLeft: 8 + lane.hierarchyLevel * 12,
        paddingRight: 8,
        gap: 6,
        borderRight: '1px solid var(--ds-border, #DFE1E6)',
        background: 'var(--ds-surface, #FFFFFF)',
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}>
        <JiraIssueTypeIcon type={lane.issueType} size={iconSize} />
        <div style={{ overflow: 'hidden' }}>
          <div style={{
            fontSize: isRoot ? 12 : 11,
            fontWeight: isRoot ? 600 : 400,
            color: 'var(--ds-link, #0052CC)',
            fontFamily: 'var(--ds-font-family-body)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {lane.issueKey}
          </div>
          <div style={{
            fontSize: 10,
            color: 'var(--ds-text-subtle, #42526E)',
            fontFamily: 'var(--ds-font-family-body)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {lane.summary}
          </div>
        </div>
        {lane.isScopeCreep && (
          <Tooltip content={`Scope creep: added ${lane.scopeCreepDaysAfterParent}d after parent`}>
            <span style={{
              fontSize: 8,
              background: 'var(--ds-background-warning, #FFF7D6)',
              color: 'var(--ds-text-warning, #974F0C)',
              border: '1px solid var(--ds-border-warning, #974F0C)',
              borderRadius: 2,
              padding: '1px 3px',
              flexShrink: 0,
              fontFamily: 'var(--ds-font-family-body)',
            }}>SC</span>
          </Tooltip>
        )}
      </div>

      {/* Timeline area — offset by LABEL_W */}
      <div style={{ position: 'absolute', left: LABEL_W, top: 0, right: 0, height: LANE_H }}>
        {segBars.map(({ seg, x, w }, i) => (
          <SegmentBar key={i} seg={seg} x={x} w={w} laneY={0} scrubX={scrubX - LABEL_W} />
        ))}
        {detourArcs.map(({ x1, x2, d }, i) => (
          <DetourArc key={i} x1={x1} x2={x2} laneY={0} />
        ))}
        {lane.milestones.map((m, i) => (
          <MilestoneFlag key={i} x={dateToX(new Date(m.at), GRANULARITY)} laneY={0} milestone={m} />
        ))}
        {lane.annotations.map((a, i) => (
          <HandoverDot key={i} x={dateToX(new Date(a.at), GRANULARITY)} laneY={0} annotation={a} />
        ))}
      </div>
    </div>
  );
}

// ─── Time header ─────────────────────────────────────────────────────────────

function ReplayTimeHeader({ timelineStart, timelineEnd }: { timelineStart: Date; timelineEnd: Date }) {
  const totalW = getTotalWidth(GRANULARITY);
  // Show month markers as thin column headers using a simple approach.
  const months: { label: string; x: number }[] = [];
  let cur = new Date(timelineStart);
  cur.setDate(1);
  while (cur <= timelineEnd) {
    months.push({
      label: cur.toLocaleString('default', { month: 'short', year: '2-digit' }),
      x: dateToX(cur, GRANULARITY),
    });
    cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
  }

  return (
    <div style={{
      position: 'relative',
      height: 28,
      borderBottom: '1px solid var(--ds-border, #DFE1E6)',
      background: 'var(--ds-surface, #FFFFFF)',
    }}>
      {months.map((m, i) => (
        <div key={i} style={{
          position: 'absolute',
          left: LABEL_W + m.x,
          top: 0,
          fontSize: 10,
          color: 'var(--ds-text-subtle, #42526E)',
          borderLeft: '1px solid var(--ds-border, #DFE1E6)',
          height: 28,
          paddingLeft: 4,
          display: 'flex',
          alignItems: 'center',
          fontFamily: 'var(--ds-font-family-body)',
          fontWeight: 500,
          whiteSpace: 'nowrap',
        }}>
          {m.label}
        </div>
      ))}
    </div>
  );
}

// ─── Scrubber + play controls ─────────────────────────────────────────────────

function ReplayControls({
  visible,
  scrubX,
  totalW,
  scrubDate,
  onScrub,
}: {
  visible: boolean;
  scrubX: number;
  totalW: number;
  scrubDate: Date;
  onScrub: (x: number) => void;
}) {
  const barRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const move = (me: MouseEvent) => {
      if (!barRef.current) return;
      const rect = barRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(me.clientX - rect.left, totalW));
      onScrub(x);
    };
    const up = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  }, [totalW, onScrub]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.15 }}
          style={{
            position: 'absolute',
            bottom: 0,
            left: LABEL_W,
            right: 0,
            height: 36,
            background: 'var(--ds-surface-overlay, #FFFFFF)',
            borderTop: '1px solid var(--ds-border, #DFE1E6)',
            display: 'flex',
            alignItems: 'center',
            paddingInline: 12,
            gap: 12,
            zIndex: 10,
          }}
        >
          {/* Scrubber track */}
          <div
            ref={barRef}
            onMouseDown={handleMouseDown}
            style={{
              flex: 1,
              height: 4,
              background: 'var(--ds-border, #DFE1E6)',
              borderRadius: 2,
              position: 'relative',
              cursor: 'pointer',
            }}
          >
            <div style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: totalW > 0 ? `${(scrubX / totalW) * 100}%` : '0%',
              height: '100%',
              background: 'var(--ds-link, #0052CC)',
              borderRadius: 2,
            }} />
            <div style={{
              position: 'absolute',
              left: totalW > 0 ? `${(scrubX / totalW) * 100}%` : '0%',
              top: -6,
              transform: 'translateX(-50%)',
              width: 16,
              height: 16,
              borderRadius: '50%',
              background: 'var(--ds-link, #0052CC)',
              border: '2px solid white',
              boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
            }} />
          </div>

          {/* Date label */}
          <span style={{
            fontSize: 11,
            color: 'var(--ds-text-subtle, #42526E)',
            fontFamily: 'var(--ds-font-family-body)',
            whiteSpace: 'nowrap',
            minWidth: 80,
          }}>
            {scrubDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Scrub timeline indicator ─────────────────────────────────────────────────

function ScrubLine({ x, totalH }: { x: number; totalH: number }) {
  return (
    <div style={{
      position: 'absolute',
      left: LABEL_W + x,
      top: 28, // below time header
      width: 1,
      height: totalH,
      background: 'var(--ds-link, #0052CC)',
      opacity: 0.5,
      pointerEvents: 'none',
      zIndex: 3,
    }} />
  );
}

// ─── Key input ───────────────────────────────────────────────────────────────

function ReplayKeyInput({ onSubmit, loading }: { onSubmit: (key: string) => void; loading: boolean }) {
  const [val, setVal] = useState('');
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <input
        value={val}
        onChange={(e) => setVal(e.target.value.toUpperCase())}
        onKeyDown={(e) => { if (e.key === 'Enter' && val.trim()) onSubmit(val.trim()); }}
        placeholder="BAU-5609"
        style={{
          fontFamily: 'var(--ds-font-family-body)',
          fontSize: 13,
          padding: '4px 8px',
          border: '1px solid var(--ds-border, #DFE1E6)',
          borderRadius: 3,
          outline: 'none',
          width: 120,
          background: 'var(--ds-surface, #FFFFFF)',
          color: 'var(--ds-text, #172B4D)',
        }}
      />
      <button
        onClick={() => { if (val.trim()) onSubmit(val.trim()); }}
        disabled={loading}
        style={{
          fontFamily: 'var(--ds-font-family-body)',
          fontSize: 12,
          padding: '4px 10px',
          background: 'var(--ds-link, #0052CC)',
          color: '#FFFFFF',
          border: 'none',
          borderRadius: 3,
          cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.6 : 1,
        }}
      >
        {loading ? 'Loading…' : 'Replay'}
      </button>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export interface CatalystReplayProps {
  /** Pre-fill key (e.g. from URL param or detail view chip). If omitted, shows key input. */
  rootKey?: string | null;
  /** Set to true when embedded inside a modal/panel (no internal scroll). */
  embedded?: boolean;
}

export function CatalystReplay({ rootKey: propKey, embedded }: CatalystReplayProps) {
  const [activeKey, setActiveKey] = useState<string | null>(propKey ?? null);
  const { data, isLoading, error } = useReplayData(activeKey);

  const totalW = getTotalWidth(GRANULARITY);
  const timelineStartDate = data ? new Date(data.timelineStart) : new Date('2026-01-01');
  const timelineEndDate = data ? new Date(data.timelineEnd) : new Date();

  // Scrubber state — position in timeline px (relative to timeline area)
  const [scrubX, setScrubX] = useState(0);
  const [controlsVisible, setControlsVisible] = useState(false);

  // AI narrative panel
  const [narrativeOpen, setNarrativeOpen] = useState(false);
  const [narrativeText, setNarrativeText] = useState<string | null>(null);
  const [narrativeLoading, setNarrativeLoading] = useState(false);
  const [narrativeError, setNarrativeError] = useState<string | null>(null);

  async function fetchNarrative() {
    if (!activeKey) return;
    setNarrativeOpen(true);
    if (narrativeText) return; // already loaded for this key
    setNarrativeLoading(true);
    setNarrativeError(null);
    const { data: fn, error } = await supabase.functions.invoke('replay-narrate', {
      body: { issue_key: activeKey.toUpperCase() },
    });
    setNarrativeLoading(false);
    if (error) { setNarrativeError(error.message); return; }
    setNarrativeText(fn?.narrative ?? '(No narrative returned)');
  }

  // Clear narrative cache when key changes
  React.useEffect(() => {
    setNarrativeText(null);
    setNarrativeOpen(false);
    setNarrativeError(null);
  }, [activeKey]);

  // Convert scrubX back to date for display
  const scrubDate = React.useMemo(() => {
    const totalMs = timelineEndDate.getTime() - timelineStartDate.getTime();
    const ms = (scrubX / totalW) * totalMs;
    return new Date(timelineStartDate.getTime() + ms);
  }, [scrubX, totalW, timelineStartDate, timelineEndDate]);

  const lanes = data?.lanes ?? [];
  const totalH = lanes.length * LANE_H;

  // Identify root lane (the one matching activeKey)
  const rootIssueKey = activeKey?.toUpperCase() ?? null;

  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to where the data lives when lanes load
  useEffect(() => {
    if (!data || !lanes.length || !containerRef.current) return;
    // Find the earliest segment start across all lanes
    let earliest = Infinity;
    for (const lane of lanes) {
      for (const seg of lane.segments) {
        const x = dateToX(new Date(seg.startAt), GRANULARITY);
        if (x < earliest) earliest = x;
      }
    }
    if (earliest === Infinity) return;
    // Scroll so earliest segment is ~80px from the left edge of the timeline area
    const target = Math.max(0, earliest - 80);
    containerRef.current.scrollLeft = target;
  }, [data]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: embedded ? '100%' : 'calc(100vh - 56px)',
        minHeight: 300,
        background: 'var(--ds-surface, #FFFFFF)',
        fontFamily: 'var(--ds-font-family-body)',
      }}
    >
      {/* ── Header bar ──────────────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '8px 16px',
        borderBottom: '1px solid var(--ds-border, #DFE1E6)',
        background: 'var(--ds-surface, #FFFFFF)',
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ds-text, #172B4D)' }}>
          Catalyst Replay
        </span>
        <ReplayKeyInput onSubmit={setActiveKey} loading={isLoading} />

        {data && (
          <>
            <span style={{ fontSize: 11, color: 'var(--ds-text-subtle, #42526E)', marginLeft: 'auto' }}>
              {lanes.length} lanes · {data.lanes.reduce((n, l) => n + l.segments.length, 0)} transitions
            </span>
            <Button
              appearance="subtle"
              onClick={fetchNarrative}
              isDisabled={narrativeLoading}
              style={{ marginLeft: 8 }}
            >
              {narrativeLoading ? 'Narrating…' : narrativeOpen ? 'Hide narrative' : '✦ Narrate'}
            </Button>
          </>
        )}
      </div>

      {/* ── AI Narrative panel ──────────────────────────────────────── */}
      <AnimatePresence>
        {narrativeOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: 'hidden', flexShrink: 0 }}
          >
            <div style={{
              padding: '12px 20px',
              borderBottom: '1px solid var(--ds-border, #DFE1E6)',
              background: 'var(--ds-surface-sunken, #F7F8F9)',
              fontSize: 13,
              lineHeight: 1.7,
              color: 'var(--ds-text, #172B4D)',
              position: 'relative',
            }}>
              <span style={{
                fontSize: 11,
                fontWeight: 600,
                color: 'var(--ds-text-subtlest, #6B778C)',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                display: 'block',
                marginBottom: 6,
              }}>
                AI Narrative · {activeKey}
              </span>
              {narrativeLoading && <Spinner size="small" />}
              {narrativeError && (
                <span style={{ color: 'var(--ds-text-danger, #AE2A19)' }}>{narrativeError}</span>
              )}
              {narrativeText && !narrativeLoading && (
                <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{narrativeText}</p>
              )}
              <button
                onClick={() => setNarrativeOpen(false)}
                style={{
                  position: 'absolute', top: 10, right: 12,
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 16, color: 'var(--ds-text-subtlest, #6B778C)',
                  lineHeight: 1,
                }}
                aria-label="Close narrative"
              >
                ×
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Body ─────────────────────────────────────────────────────── */}
      {isLoading && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Spinner size="large" />
        </div>
      )}

      {error && !isLoading && (
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--ds-text-danger, #AE2A19)',
          fontSize: 13,
        }}>
          {(error as Error).message}
        </div>
      )}

      {!isLoading && !error && !data && (
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--ds-text-subtlest, #6B778C)',
          fontSize: 13,
        }}>
          Enter a Jira key above to replay its lifecycle.
        </div>
      )}

      {data && lanes.length > 0 && (
        <div
          ref={containerRef}
          style={{ flex: 1, overflow: 'auto', position: 'relative' }}
          onMouseEnter={() => setControlsVisible(true)}
          onMouseLeave={() => setControlsVisible(false)}
          onMouseMove={(e) => {
            if (!containerRef.current) return;
            const rect = containerRef.current.getBoundingClientRect();
            const rawX = e.clientX - rect.left - LABEL_W;
            if (rawX >= 0 && rawX <= totalW) setScrubX(rawX);
          }}
        >
          {/* Time header (sticky) */}
          <div style={{ position: 'sticky', top: 0, zIndex: 5, width: totalW + LABEL_W }}>
            <ReplayTimeHeader timelineStart={timelineStartDate} timelineEnd={timelineEndDate} />
          </div>

          {/* Swimlane canvas */}
          <div style={{
            position: 'relative',
            width: totalW + LABEL_W,
            height: totalH + 36, // +36 for controls
            marginBottom: 36,
          }}>
            {lanes.map((lane, i) => (
              <ReplaySwimlane
                key={lane.issueKey}
                lane={lane}
                laneIndex={i}
                timelineStart={timelineStartDate}
                scrubX={scrubX}
                isRoot={lane.issueKey === rootIssueKey}
              />
            ))}

            {/* Scrub line */}
            <ScrubLine x={scrubX} totalH={totalH} />

            {/* Controls */}
            <ReplayControls
              visible={controlsVisible}
              scrubX={scrubX}
              totalW={totalW}
              scrubDate={scrubDate}
              onScrub={setScrubX}
            />
          </div>
        </div>
      )}
    </div>
  );
}
