/**
 * Toolbar — matches Jira board 497 (live-probed):
 * [Search board input] [avatars] [Epic] [Type] [Quick filters] ...
 * [Group: X] [View settings] [More actions]
 * Dropdowns use PortalMenu (popper-free) to avoid the atlaskit (0,0) bug.
 */
import React from 'react';
import { token } from '@atlaskit/tokens';
import Avatar from '@atlaskit/avatar';
import Textfield from '@atlaskit/textfield';
import { IconButton } from '@atlaskit/button/new';
import SearchIcon from '@atlaskit/icon/glyph/search';
import SettingsIcon from '@atlaskit/icon/glyph/settings';
import MoreIcon from '@atlaskit/icon/glyph/more';
import GraphLineIcon from '@atlaskit/icon/glyph/graph-line';
import { PortalMenu, MenuItem, TriggerChevron } from './PortalMenu';
import { CatyBoardInsight } from '@/components/for-you/atlaskit/CatyBoardInsight';
import { SIZES, STRINGS, QUICK_FILTERS } from '../constants';
import { useFiltersForProject } from '@/hooks/workhub/useSavedFilters';
import type { FilterApi } from '../hooks/useKanbanFilters';
import type { GroupByMode, CardVisibleFields, BoardIssue } from '../types';

function InsightsBars({ issues }: { issues: BoardIssue[] }) {
  const cat = { 'To Do': 0, 'In Progress': 0, Done: 0 } as Record<string, number>;
  const byType: Record<string, number> = {};
  for (const i of issues) {
    const c = (i.statusCategory || '').toLowerCase();
    if (c.includes('done')) cat.Done++; else if (c.includes('progress')) cat['In Progress']++; else cat['To Do']++;
    if (i.issueType) byType[i.issueType] = (byType[i.issueType] || 0) + 1;
  }
  const max = Math.max(1, ...Object.values(cat));
  const colors: Record<string, string> = { 'To Do': token('color.background.neutral.bold', '#44546F'), 'In Progress': token('color.background.information.bold', '#0C66E4'), Done: token('color.background.success.bold', '#1F845A') };
  const topTypes = Object.entries(byType).sort((a, b) => b[1] - a[1]).slice(0, 5);
  return (
    <div style={{ padding: '8px 12px', width: 260 }}>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: token('color.text.subtlest', '#626F86'), marginBottom: 6 }}>Status</div>
      {Object.entries(cat).map(([k, v]) => (
        <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ width: 84, fontSize: 12, color: token('color.text.subtle', '#44546F') }}>{k}</span>
          <div style={{ flex: 1, height: 8, background: token('color.background.neutral', '#091E420F'), borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ width: `${(v / max) * 100}%`, height: '100%', background: colors[k] }} />
          </div>
          <span style={{ width: 28, textAlign: 'right', fontSize: 12, fontWeight: 600, color: token('color.text', '#172B4D') }}>{v}</span>
        </div>
      ))}
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: token('color.text.subtlest', '#626F86'), margin: '10px 0 6px' }}>Top types</div>
      {topTypes.map(([k, v]) => (
        <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: token('color.text', '#172B4D'), marginBottom: 2 }}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{k}</span><span style={{ fontWeight: 600 }}>{v}</span>
        </div>
      ))}
    </div>
  );
}

const FIELD_LABELS: { key: keyof CardVisibleFields; label: string }[] = [
  { key: 'labels', label: 'Epic / labels' },
  { key: 'priority', label: 'Priority' },
  { key: 'estimate', label: 'Estimate' },
  { key: 'assignee', label: 'Assignee' },
  { key: 'daysInColumn', label: 'Days in column' },
  { key: 'childProgress', label: 'Child progress' },
];

function AvatarFilter({ api, avatars }: { api: FilterApi; avatars: Map<string, string | null> }) {
  const shown = api.allAssignees.slice(0, SIZES.AVATAR_MAX_SHOWN);
  const overflow = api.allAssignees.length - shown.length;
  return (
    <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
      {shown.map((name, i) => {
        const active = api.assignees.has(name);
        const dim = api.assignees.size > 0 && !active;
        return (
          <span key={name} title={name} style={{ display: 'inline-flex' }}>
            <button
              onClick={() => api.toggleAssignee(name)} aria-pressed={active} aria-label={`Filter by ${name}`}
              style={{
                marginLeft: i === 0 ? 0 : SIZES.AVATAR_OVERLAP, border: 'none', background: 'none', padding: 0,
                borderRadius: '50%', cursor: 'pointer', position: 'relative', zIndex: active ? 2 : 1,
                boxShadow: active ? `0 0 0 2px ${token('color.border.selected', '#0C66E4')}` : `0 0 0 2px ${token('elevation.surface', '#FFFFFF')}`,
                filter: dim ? 'grayscale(1) opacity(0.5)' : 'none', transition: 'filter 150ms ease',
              }}
            >
              <Avatar size="small" src={avatars.get(name) ?? undefined} name={name} />
            </button>
          </span>
        );
      })}
      {overflow > 0 && <span style={{ marginLeft: 4, fontSize: 12, fontWeight: 600, color: token('color.text.subtlest', '#626F86') }}>+{overflow}</span>}
    </div>
  );
}

function triggerStyle(active: boolean): React.CSSProperties {
  return {
    height: 32, padding: '0 8px', borderRadius: 3, border: 'none', cursor: 'pointer',
    display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 14, fontWeight: 500,
    fontFamily: 'inherit', flexShrink: 0,
    background: active ? token('color.background.selected', '#E9F2FF') : 'transparent',
    color: active ? token('color.text.selected', '#0C66E4') : token('color.text.subtle', '#44546F'),
  };
}

interface ToolbarProps {
  api: FilterApi;
  total: number;
  avatars: Map<string, string | null>;
  issues: BoardIssue[];
  visibleFields: CardVisibleFields;
  onToggleField: (f: keyof CardVisibleFields) => void;
  onCopyBoardLink: () => void;
  onStartStandup: () => void;
  standupActive: boolean;
  onEndStandup: () => void;
  onOpenHistory: () => void;
  onMapStatuses: () => void;
  projectKey?: string;
}

export const Toolbar: React.FC<ToolbarProps> = ({ api, avatars, issues, visibleFields, onToggleField, onCopyBoardLink, onStartStandup, standupActive, onEndStandup, onOpenHistory, onMapStatuses, projectKey }) => {
  const groupLabels: Record<GroupByMode, string> = {
    none: STRINGS.GROUP_NONE, assignee: STRINGS.GROUP_ASSIGNEE, epic: STRINGS.GROUP_EPIC,
    subtask: STRINGS.GROUP_SUBTASK, priority: STRINGS.GROUP_PRIORITY,
  };

  const { data: savedFilters = [] } = useFiltersForProject(projectKey, 'project');

  return (
    <div className="kb-toolbar" style={{ height: SIZES.TOOLBAR_HEIGHT, padding: `8px ${SIZES.PAGE_PADDING_X}px`, display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, overflowX: 'auto' }}>
      {/* Persistent search */}
      <div style={{ width: 220, flexShrink: 0 }}>
        <Textfield
          value={api.search}
          onChange={(e) => api.setSearch((e.target as HTMLInputElement).value)}
          placeholder={STRINGS.SEARCH_PLACEHOLDER}
          aria-label={STRINGS.SEARCH_PLACEHOLDER}
          isCompact
          elemBeforeInput={<span style={{ paddingLeft: 6, display: 'inline-flex' }}><SearchIcon label="" size="small" primaryColor={token('color.icon.subtle', '#626F86')} /></span>}
        />
      </div>

      <AvatarFilter api={api} avatars={avatars} />

      <PortalMenu ariaLabel={STRINGS.FILTER_EPIC} trigger={({ open }) => (
        <button style={triggerStyle(api.epics.size > 0 || open)}>{STRINGS.FILTER_EPIC}{api.epics.size > 0 ? ` (${api.epics.size})` : ''}<TriggerChevron /></button>
      )}>
        {() => api.allEpics.length === 0
          ? <div style={{ padding: '8px 12px', fontSize: 13, color: token('color.text.subtlest', '#626F86') }}>No epics</div>
          : api.allEpics.map((e) => <MenuItem key={e.key} selected={api.epics.has(e.key)} onClick={() => api.toggleEpic(e.key)}>{e.summary}</MenuItem>)}
      </PortalMenu>

      <PortalMenu ariaLabel={STRINGS.FILTER_TYPE} trigger={({ open }) => (
        <button style={triggerStyle(api.types.size > 0 || open)}>{STRINGS.FILTER_TYPE}{api.types.size > 0 ? ` (${api.types.size})` : ''}<TriggerChevron /></button>
      )}>
        {() => api.allTypes.map((t) => <MenuItem key={t} selected={api.types.has(t)} onClick={() => api.toggleType(t)}>{t}</MenuItem>)}
      </PortalMenu>

      <PortalMenu ariaLabel="Quick filters" minWidth={200} trigger={({ open }) => (
        <button style={triggerStyle(api.quickFilters.size > 0 || open)}>Quick filters{api.quickFilters.size > 0 ? ` (${api.quickFilters.size})` : ''}<TriggerChevron /></button>
      )}>
        {() => (
          <>
            {QUICK_FILTERS.map((qf) => <MenuItem key={qf.id} selected={api.quickFilters.has(qf.id)} onClick={() => api.toggleQuickFilter(qf.id)}>{qf.label}</MenuItem>)}
            {savedFilters.length > 0 && (
              <>
                <div style={{ padding: '6px 12px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: token('color.text.subtlest', '#626F86'), marginTop: 6 }}>My filters</div>
                {savedFilters.slice(0, 5).map((f) => <MenuItem key={f.id} selected={api.quickFilters.has(f.id)} onClick={() => api.toggleQuickFilter(f.id)}>{f.name}</MenuItem>)}
              </>
            )}
          </>
        )}
      </PortalMenu>

      <div style={{ flex: 1 }} />

      {/* Right cluster */}
      <PortalMenu ariaLabel={STRINGS.GROUP_BY} align="right" minWidth={180} trigger={({ open }) => (
        <button style={triggerStyle(api.groupBy !== 'none' || open)}>{api.groupBy === 'none' ? 'Group' : `Group: ${groupLabels[api.groupBy]}`}<TriggerChevron /></button>
      )}>
        {(close) => (Object.keys(groupLabels) as GroupByMode[]).map((g) => (
          <MenuItem key={g} variant="radio" selected={api.groupBy === g} onClick={() => { api.setGroupBy(g); close(); }}>{groupLabels[g]}</MenuItem>
        ))}
      </PortalMenu>

      {standupActive && (
        <button onClick={onEndStandup}
          style={{ height: 32, padding: '0 12px', borderRadius: 3, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 500, fontFamily: 'inherit', flexShrink: 0,
            background: token('color.background.selected', '#E9F2FF'), color: token('color.text.selected', '#0C66E4') }}>End standup</button>
      )}

      <PortalMenu ariaLabel="Board insights" align="right" minWidth={260} trigger={() => (
        <span role="button" aria-label="Board insights" style={{ display: 'inline-flex' }}>
          <IconButton icon={GraphLineIcon} label="Board insights" appearance="subtle" />
        </span>
      )}>
        {() => <InsightsBars issues={issues} />}
      </PortalMenu>

      <PortalMenu ariaLabel="View settings" align="right" minWidth={200} trigger={() => (
        <span role="button" aria-label="View settings" style={{ display: 'inline-flex' }}>
          <IconButton icon={SettingsIcon} label="View settings" appearance="subtle" />
        </span>
      )}>
        {() => (
          <>
            <div style={{ padding: '6px 12px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: token('color.text.subtlest', '#626F86') }}>Card fields</div>
            {FIELD_LABELS.map((f) => (
              <MenuItem key={f.key} selected={visibleFields[f.key]} onClick={() => onToggleField(f.key)}>{f.label}</MenuItem>
            ))}
          </>
        )}
      </PortalMenu>

      {/* Ask Caty — Board health (ported from the legacy /boards/:id surface) */}
      <span style={{ flexShrink: 0, display: 'inline-flex' }}>
        <CatyBoardInsight projectKey={projectKey ?? null} resourceId={projectKey ?? 'project'} />
      </span>

      <PortalMenu ariaLabel="More actions" align="right" minWidth={200} trigger={() => (
        <span role="button" aria-label="More actions" style={{ display: 'inline-flex' }}>
          <IconButton icon={MoreIcon} label="More actions" appearance="subtle" />
        </span>
      )}>
        {(close) => (
          <>
            <MenuItem variant="plain" onClick={() => { onStartStandup(); close(); }}>Start standup</MenuItem>
            <MenuItem variant="plain" onClick={() => { onOpenHistory(); close(); }}>Standup history</MenuItem>
            <MenuItem variant="plain" onClick={() => { onMapStatuses(); close(); }}>Map statuses</MenuItem>
            <MenuItem variant="plain" onClick={() => { onCopyBoardLink(); close(); }}>Copy board link</MenuItem>
            <MenuItem variant="plain" onClick={() => { window.print(); close(); }}>Print board</MenuItem>
          </>
        )}
      </PortalMenu>
    </div>
  );
};
