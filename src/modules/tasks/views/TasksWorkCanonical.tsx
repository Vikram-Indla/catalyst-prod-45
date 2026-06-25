/**
 * TasksWorkCanonical — /tasks/work
 *
 * 2026-06-17: mounts the canonical ProjectAllWorkView with `tasksItems`
 * pre-fetched from the `tasks` table + `entityKind='task'` so the detail
 * panel routes to TaskCatalystView. Same UI shell as
 * /project-hub/:key/allwork, /product-hub/:key/allwork, /incident-hub/work
 * (per CLAUDE.md "ADOPT CANONICAL COMPONENTS — DO NOT REIMPLEMENT").
 *
 * 2026-06-22: injects Group-by + All-workstreams dropdowns into the
 * AllWorkToolbar's `leftToolbarSlot`, so they sit next to (to the left of)
 * the canonical filter instead of in a separate top toolbar.
 */
import React, { useState } from 'react';
import { token } from '@atlaskit/tokens';
import ChevronDownIcon from '@atlaskit/icon/glyph/chevron-down';
import ProjectAllWorkView from '@/pages/project-hub/jira-list/ProjectAllWorkView';
import { useTasksAllWorkItems } from '@/modules/tasks/hooks/useTasksAllWorkItems';

const TASKS_SENTINEL_KEY = 'TASKS';

type GroupByOption = 'none' | 'status' | 'priority' | 'assignee' | 'workstream';

const GROUP_OPTIONS: Array<{ id: GroupByOption; label: string }> = [
  { id: 'none',       label: 'None' },
  { id: 'status',     label: 'Status' },
  { id: 'priority',   label: 'Priority' },
  { id: 'assignee',   label: 'Assignee' },
  { id: 'workstream', label: 'Workstream' },
];

function TasksLeftToolbarSlot({
  groupBy,
  onGroupByChange,
  selectedTeamId,
  onTeamChange,
  teams,
}: {
  groupBy: GroupByOption;
  onGroupByChange: (v: GroupByOption) => void;
  selectedTeamId: string | null;
  onTeamChange: (id: string | null) => void;
  teams: Array<{ id: string; name: string }>;
}) {
  const [groupOpen, setGroupOpen] = useState(false);
  const [teamOpen, setTeamOpen] = useState(false);
  const groupLabel = GROUP_OPTIONS.find((o) => o.id === groupBy)?.label ?? 'None';
  const teamLabel = teams.find((t) => t.id === selectedTeamId)?.name ?? 'All Workstreams';
  const borderSubtle = token('color.border', 'var(--ds-border, #DFE1E6)');
  const surface = token('elevation.surface', 'var(--ds-surface, #FFFFFF)');
  const textPrimary = token('color.text', 'var(--ds-text, #172B4D)');
  const hoverNeutral = token('color.background.neutral.subtle.hovered', 'var(--ds-background-neutral, #F1F2F4)');
  const btnStyle = (active: boolean): React.CSSProperties => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    height: 32,
    padding: '0 10px',
    border: `1px solid ${active ? token('color.border.selected', 'var(--ds-link, #0C66E4)') : borderSubtle}`,
    borderRadius: 3,
    background: active ? token('color.background.selected', 'var(--ds-background-selected, #E9F2FF)') : surface,
    color: active ? token('color.text.selected', 'var(--ds-link, #0C66E4)') : textPrimary,
    fontSize: 13,
    fontWeight: 500,
    fontFamily: 'inherit',
    cursor: 'pointer',
  });
  const menuStyle: React.CSSProperties = {
    position: 'absolute',
    top: 36,
    left: 0,
    minWidth: 200,
    background: token('elevation.surface.overlay', 'var(--ds-surface, #FFFFFF)'),
    border: `1px solid ${borderSubtle}`,
    borderRadius: 6,
    boxShadow: '0 8px 28px var(--ds-shadow-raised, rgba(9,30,66,0.25))',
    padding: '4px 0',
    zIndex: 1000,
    fontFamily: 'inherit',
  };
  const itemStyle: React.CSSProperties = {
    height: 32,
    padding: '0 12px',
    display: 'flex',
    alignItems: 'center',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    color: textPrimary,
  };

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <div style={{ position: 'relative' }}>
        <button
          type="button"
          onClick={() => setGroupOpen((v) => !v)}
          style={btnStyle(groupBy !== 'none')}
        >
          <span>Group: {groupLabel}</span>
          <ChevronDownIcon label="" size="small" />
        </button>
        {groupOpen && (
          <div
            role="menu"
            style={menuStyle}
            onMouseLeave={() => setGroupOpen(false)}
          >
            {GROUP_OPTIONS.map((o) => (
              <div
                key={o.id}
                role="menuitem"
                onClick={() => { onGroupByChange(o.id); setGroupOpen(false); }}
                onMouseEnter={(e) => { e.currentTarget.style.background = hoverNeutral; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                style={{ ...itemStyle, background: groupBy === o.id ? hoverNeutral : 'transparent' }}
              >
                {o.label}
              </div>
            ))}
          </div>
        )}
      </div>
      <div style={{ position: 'relative' }}>
        <button
          type="button"
          onClick={() => setTeamOpen((v) => !v)}
          style={btnStyle(selectedTeamId !== null)}
        >
          <span>{teamLabel}</span>
          <ChevronDownIcon label="" size="small" />
        </button>
        {teamOpen && (
          <div
            role="menu"
            style={menuStyle}
            onMouseLeave={() => setTeamOpen(false)}
          >
            <div
              role="menuitem"
              onClick={() => { onTeamChange(null); setTeamOpen(false); }}
              onMouseEnter={(e) => { e.currentTarget.style.background = hoverNeutral; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              style={{ ...itemStyle, background: selectedTeamId === null ? hoverNeutral : 'transparent' }}
            >
              All Workstreams
            </div>
            {teams.length > 0 && (
              <div style={{ height: 1, background: borderSubtle, margin: '4px 0' }} />
            )}
            {teams.map((t) => (
              <div
                key={t.id}
                role="menuitem"
                onClick={() => { onTeamChange(t.id); setTeamOpen(false); }}
                onMouseEnter={(e) => { e.currentTarget.style.background = hoverNeutral; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                style={{ ...itemStyle, background: selectedTeamId === t.id ? hoverNeutral : 'transparent' }}
              >
                {t.name}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function TasksWorkCanonical() {
  const { data: items, isLoading } = useTasksAllWorkItems();
  const [groupBy, setGroupBy] = useState<GroupByOption>('none');
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  // Workstreams: placeholder empty list. Once a workstreams data source is
  // wired (currently `teams={[]}` per PlannerPage), pass it here.
  const teams: Array<{ id: string; name: string }> = [];

  return (
    <div
      data-testid="tasks-work-layout"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 52px)',
        maxHeight: 'calc(100vh - 52px)',
        minHeight: 0,
        overflow: 'hidden',
        background: 'transparent',
      }}
    >
      <ProjectAllWorkView
        projectKey={TASKS_SENTINEL_KEY}
        tasksItems={isLoading ? [] : (items ?? [])}
        entityKind="task"
        leftToolbarSlot={
          <TasksLeftToolbarSlot
            groupBy={groupBy}
            onGroupByChange={setGroupBy}
            selectedTeamId={selectedTeamId}
            onTeamChange={setSelectedTeamId}
            teams={teams}
          />
        }
      />
    </div>
  );
}
