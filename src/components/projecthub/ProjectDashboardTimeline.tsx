import React, { useState } from 'react';
import { format, startOfDay, addDays, differenceInDays } from 'date-fns';
import { useProjectTimeline } from '@/hooks/useProjectTimeline';

const T = {
  card: 'var(--ds-surface-raised, #FFFFFF)',
  border: 'var(--ds-border, #DFE1E6)',
  text: 'var(--ds-text, #172B4D)',
  subtle: 'var(--ds-text-subtle, #44546F)',
  subtlest: 'var(--ds-text-subtlest, #626F86)',
  bgNeutral: 'var(--ds-background-neutral, #F1F2F4)',
  link: 'var(--ds-link, #0C66E4)',
  success: 'var(--ds-background-success, #216E4E)',
  warning: 'var(--ds-background-warning, #974F0C)',
  danger: 'var(--ds-background-danger, #AE2A19)',
};

const CONF_DOT: Record<string, string> = {
  high: T.success,
  medium: T.warning,
  low: T.danger,
  draft: 'var(--ds-background-subtlest, #B3B9C4)',
};

export function ProjectDashboardTimeline({ projectKey }: { projectKey: string }) {
  const { data, isLoading } = useProjectTimeline(projectKey);
  const [selectedSprintId, setSelectedSprintId] = useState<string | null>(null);

  if (isLoading || !data?.sprints) return null;
  if (data.sprints.length === 0) return null;

  const sprints = data.sprints;
  const today = startOfDay(new Date());
  const rangeStart = addDays(today, -14);
  const rangeEnd = sprints.length > 0
    ? addDays(new Date(sprints[sprints.length - 1].releaseDate), 21)
    : addDays(today, 90);
  const totalDays = Math.max(1, differenceInDays(rangeEnd, rangeStart));
  const todayPct = Math.max(0, Math.min(100, (differenceInDays(today, rangeStart) / totalDays) * 100));

  const pct = (d: Date) => {
    const p = (differenceInDays(d, rangeStart) / totalDays) * 100;
    return Math.max(0, Math.min(100, p));
  };

  const selectedSprint = sprints.find(s => s.id === selectedSprintId);

  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: `1px solid ${T.border}` }}>
        <span style={{ fontSize: 16, fontWeight: 600, color: T.text }}>Sprint Timeline</span>
        <span style={{ fontSize: 12, color: T.subtlest }}>
          {format(rangeStart, 'MMM d')} – {format(rangeEnd, 'MMM d')}
        </span>
      </div>

      <div style={{ padding: '16px 16px 0' }}>
        {/* Track */}
        <div style={{ position: 'relative', height: 44, borderRadius: 4, background: T.bgNeutral }}>
          {/* Today hairline */}
          <div style={{ position: 'absolute', left: `${todayPct}%`, top: -4, bottom: -4, width: 2, background: T.link, zIndex: 2 }}>
            <span style={{ position: 'absolute', bottom: '100%', marginBottom: 4, left: '50%', transform: 'translateX(-50%)', fontSize: 9, fontWeight: 700, color: T.link, whiteSpace: 'nowrap', letterSpacing: '0.06em' }}>TODAY</span>
          </div>

          {/* Sprint dots */}
          {sprints.map((sprint) => {
            const p = pct(startOfDay(new Date(sprint.releaseDate)));
            const isSelected = sprint.id === selectedSprintId;
            return (
              <div
                key={sprint.id}
                onClick={() => setSelectedSprintId(isSelected ? null : sprint.id)}
                title={`${sprint.name} — ${sprint.storyCount ?? 0} stories`}
                style={{
                  position: 'absolute',
                  left: `${p}%`,
                  top: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: 14,
                  height: 14,
                  borderRadius: '50%',
                  background: CONF_DOT[sprint.confidence || 'draft'],
                  border: isSelected ? `3px solid ${T.link}` : '2px solid white',
                  zIndex: 3,
                  cursor: 'pointer',
                  boxShadow: isSelected ? `0 0 0 2px ${T.card}` : 'none',
                }}
              />
            );
          })}
        </div>

        {/* Axis labels */}
        <div style={{ position: 'relative', height: 18, marginTop: 4 }}>
          <span style={{ position: 'absolute', left: 0, fontSize: 10, color: T.subtlest }}>{format(rangeStart, 'MMM d')}</span>
          <span style={{ position: 'absolute', left: `${todayPct}%`, transform: 'translateX(-50%)', fontSize: 10, fontWeight: 600, color: T.link, whiteSpace: 'nowrap' }}>{format(new Date(), 'MMM d')}</span>
          <span style={{ position: 'absolute', right: 0, fontSize: 10, color: T.subtlest }}>{format(rangeEnd, 'MMM d')}</span>
        </div>
      </div>

      {/* Legend chips */}
      <div style={{ padding: '8px 16px 12px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {sprints.map((sprint) => (
          <div key={sprint.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 8px', background: T.bgNeutral, borderRadius: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: CONF_DOT[sprint.confidence || 'draft'], flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: T.subtle, fontWeight: 500 }}>{sprint.name}</span>
            {sprint.releaseDate && (
              <span style={{ fontSize: 11, color: T.subtlest }}>
                {format(new Date(sprint.releaseDate), 'MMM d')}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Selected sprint details */}
      {selectedSprint && (
        <div style={{ padding: '12px 16px', borderTop: `1px solid ${T.border}`, background: T.bgNeutral }}>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 8, color: T.text }}>
            {selectedSprint.name} · {selectedSprint.storyCount ?? 0} stories
          </div>
          <div style={{ fontSize: 12, color: T.subtlest }}>
            Stories in this sprint appear in the list below
          </div>
        </div>
      )}
    </div>
  );
}

export default ProjectDashboardTimeline;
