/**
 * Toolbar — matches Jira board 497 (live-probed):
 * [Search board input] [avatars] [Epic] [Type] [Quick filters] ...
 * [Group: X] [View settings] [More actions]
 * Dropdowns use PortalMenu (popper-free) to avoid the atlaskit (0,0) bug.
 */
import React from 'react';
import { token } from '@atlaskit/tokens';
import CatalystAvatar from '@/components/shared/CatalystAvatar';
import Textfield from '@atlaskit/textfield';
import { IconButton } from '@atlaskit/button/new';
import SearchIcon from '@atlaskit/icon/glyph/search';
import PreferencesIcon from '@atlaskit/icon/glyph/preferences';
import CrossIcon from '@atlaskit/icon/glyph/cross';
import Toggle from '@atlaskit/toggle';
import MoreIcon from '@atlaskit/icon/glyph/more';
import { PortalMenu, MenuItem, TriggerChevron } from './PortalMenu';
import { SIZES, STRINGS, QUICK_FILTERS } from '../constants';
import { useFiltersForProject } from '@/hooks/workhub/useSavedFilters';
import type { FilterApi } from '../hooks/useKanbanFilters';
import {
  CanonicalFilter,
  emptyCanonicalFilterValue,
  type CanonicalFilterValue,
  type CanonicalWorkTypeOption,
} from '@/components/filters/CanonicalFilter';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import type { GroupByMode, CardVisibleFields } from '../types';


const ALWAYS_FIELD_LABELS: { key: keyof CardVisibleFields; label: string }[] = [
  { key: 'workType', label: 'Work type' },
  { key: 'workItemKey', label: 'Work item key' },
  { key: 'priority', label: 'Priority' },
  { key: 'assignee', label: 'Assignee' },
];

const sectionStyle: React.CSSProperties = {
  padding: '8px 16px 4px', fontWeight: 600, fontSize: 'var(--ds-font-size-400)',
  color: token('color.text', 'var(--ds-text)'),
};

const actionRowStyle: React.CSSProperties = {
  width: '100%', padding: '8px 16px', border: 'none', background: 'none',
  cursor: 'pointer', textAlign: 'left', fontSize: 'var(--ds-font-size-400)',
  color: token('color.text', 'var(--ds-text)'), fontFamily: 'inherit',
};

const ToggleRow: React.FC<{ label: string; isChecked: boolean; onChange: () => void }> = ({ label, isChecked, onChange }) => (
  <div style={{ display: 'flex', alignItems: 'center', padding: '4px 16px', gap: 8 }}>
    <span style={{ flex: 1, fontSize: 'var(--ds-font-size-400)', color: token('color.text', 'var(--ds-text)') }}>{label}</span>
    <Toggle isChecked={isChecked} onChange={(_e) => onChange()} size="regular" />
  </div>
);

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
                boxShadow: active ? `0 0 0 2px ${token('color.border.selected', 'var(--ds-link)')}` : `0 0 0 2px ${token('elevation.surface', 'var(--ds-surface)')}`,
                filter: dim ? 'grayscale(1) opacity(0.5)' : 'none', transition: 'filter 150ms ease',
              }}
            >
              <CatalystAvatar size="small" src={avatars.get(name) ?? undefined} name={name} />
            </button>
          </span>
        );
      })}
      {overflow > 0 && <span style={{ marginLeft: 4, fontSize: 'var(--ds-font-size-200)', fontWeight: 600, color: token('color.text.subtlest', 'var(--ds-icon-subtle)') }}>+{overflow}</span>}
    </div>
  );
}

function triggerStyle(active: boolean): React.CSSProperties {
  return {
    height: 32, padding: '0 8px', borderRadius: 3, border: 'none', cursor: 'pointer',
    display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 'var(--ds-font-size-400)', fontWeight: 500,
    fontFamily: 'inherit', flexShrink: 0,
    background: active ? token('color.background.selected', 'var(--ds-background-selected)') : 'transparent',
    color: active ? token('color.text.selected', 'var(--ds-link)') : token('color.text.subtle', 'var(--ds-icon, var(--ds-icon))'),
  };
}

interface ToolbarProps {
  api: FilterApi;
  avatars: Map<string, string | null>;
  visibleFields: CardVisibleFields;
  onToggleField: (f: keyof CardVisibleFields) => void;
  onCopyBoardLink: () => void;
  onStartStandup: () => void;
  standupActive: boolean;
  onEndStandup: () => void;
  onOpenHistory: () => void;
  onMapStatuses: () => void;
  projectKey?: string;
  filterContext?: 'business-request' | 'product' | 'project' | 'testhub' | 'incident' | 'tasks';
  hasSwimlanes?: boolean;
  onExpandAll?: () => void;
  onCollapseAll?: () => void;
  showEpic?: boolean;
  showDueDate?: boolean;
}

export const Toolbar: React.FC<ToolbarProps> = ({ api, avatars, visibleFields, onToggleField, onCopyBoardLink, onStartStandup, standupActive, onEndStandup, onOpenHistory, onMapStatuses, projectKey, filterContext = 'project', hasSwimlanes = false, onExpandAll, onCollapseAll, showEpic = false, showDueDate = false }) => {
  const groupLabels: Partial<Record<GroupByMode, string>> = {
    none: STRINGS.GROUP_NONE, assignee: STRINGS.GROUP_ASSIGNEE,
    ...(showEpic ? { epic: STRINGS.GROUP_EPIC } : {}),
    priority: STRINGS.GROUP_PRIORITY,
  };

  const { data: savedFilters = [] } = useFiltersForProject(projectKey, 'project');

  // 2026-06-22 — CanonicalFilter migration. Bridge the kanban FilterApi
  // Set<string> state ↔ CanonicalFilterValue string[] arrays. Epics map
  // to canonical `parent`, types → `workType`, assignees + priorities map
  // directly. Status / labels / severity stay unsupported on kanban (no
  // data exposed by BoardIssue) — users can Remove those rail items.
  const canonicalValue: CanonicalFilterValue = React.useMemo(() => ({
    ...emptyCanonicalFilterValue,
    parent: Array.from(api.epics),
    workType: Array.from(api.types),
    assignee: Array.from(api.assignees),
    priority: Array.from(api.priorities),
  }), [api.epics, api.types, api.assignees, api.priorities]);

  const handleCanonicalChange = React.useCallback((next: CanonicalFilterValue) => {
    const applyDiff = (current: Set<string>, target: string[], toggleFn: (v: string) => void) => {
      const targetSet = new Set(target);
      current.forEach((v) => { if (!targetSet.has(v)) toggleFn(v); });
      targetSet.forEach((v) => { if (!current.has(v)) toggleFn(v); });
    };
    applyDiff(api.epics,      next.parent,   api.toggleEpic);
    applyDiff(api.types,      next.workType, api.toggleType);
    applyDiff(api.assignees,  next.assignee, api.toggleAssignee);
    applyDiff(api.priorities, next.priority, api.togglePriority);
  }, [api]);

  const kanbanWorkTypeOptions: CanonicalWorkTypeOption[] = React.useMemo(
    () => api.allTypes.map((t) => ({ id: t, label: t, icon: <JiraIssueTypeIcon type={t} size={14} /> })),
    [api.allTypes],
  );
  const kanbanAssigneeOptions = React.useMemo(
    () => api.allAssignees.map((name) => ({ id: name, label: name })),
    [api.allAssignees],
  );

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
          elemBeforeInput={<span style={{ paddingLeft: 4, display: 'inline-flex' }}><SearchIcon label="" size="small" primaryColor={token('color.icon.subtle', 'var(--ds-icon-subtle)')} /></span>}
        />
      </div>

      <AvatarFilter api={api} avatars={avatars} />

      <CanonicalFilter
        value={canonicalValue}
        onChange={handleCanonicalChange}
        scopeType="project"
        scopeKey={projectKey}
        filterContext={filterContext}
        workTypeOptions={kanbanWorkTypeOptions}
        assigneeOptions={kanbanAssigneeOptions}
        myFilters={savedFilters.map((f) => ({ id: f.id, name: f.name }))}
      />

      <div style={{ flex: 1 }} />

      {/* Right cluster */}
      <PortalMenu ariaLabel={STRINGS.GROUP_BY} align="right" minWidth={180} trigger={({ open }) => (
        <button style={triggerStyle(api.groupBy !== 'none' || open)}>{api.groupBy === 'none' || !groupLabels[api.groupBy] ? 'Group' : `Group: ${groupLabels[api.groupBy]}`}<TriggerChevron /></button>
      )}>
        {(close) => (Object.keys(groupLabels) as GroupByMode[]).filter(g => groupLabels[g] !== undefined).map((g) => (
          <MenuItem key={g} variant="radio" selected={api.groupBy === g} onClick={() => { api.setGroupBy(g); close(); }}>{groupLabels[g]}</MenuItem>
        ))}
      </PortalMenu>

      {standupActive && (
        <button onClick={onEndStandup}
          style={{ height: 32, padding: '0 12px', borderRadius: 3, border: 'none', cursor: 'pointer', fontSize: 'var(--ds-font-size-400)', fontWeight: 500, fontFamily: 'inherit', flexShrink: 0,
            background: token('color.background.selected', 'var(--ds-background-selected)'), color: token('color.text.selected', 'var(--ds-link, var(--ds-link))') }}>End standup</button>
      )}

      <PortalMenu ariaLabel="View settings" align="right" minWidth={280} trigger={() => (
        <span role="button" aria-label="View settings" style={{ display: 'inline-flex' }}>
          <IconButton icon={PreferencesIcon} label="View settings" appearance="subtle" />
        </span>
      )}>
        {(close) => (
          <>
            {/* Panel header */}
            <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px 8px', borderBottom: `1px solid ${token('color.border', 'var(--ds-border)')}` }}>
              <span style={{ flex: 1, fontSize: 'var(--ds-font-size-400)', fontWeight: 600, color: token('color.text', 'var(--ds-text)') }}>View settings</span>
              <button aria-label="Close" onClick={close} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 4, display: 'inline-flex', color: token('color.icon', 'var(--ds-icon)'), borderRadius: 3 }}>
                <CrossIcon label="" size="small" primaryColor={token('color.icon', 'var(--ds-icon)')} />
              </button>
            </div>
            {/* Fields section */}
            <div style={{ padding: '4px 0' }}>
              <div style={sectionStyle}>Fields</div>
              {ALWAYS_FIELD_LABELS.map((f) => (
                <ToggleRow key={f.key} label={f.label} isChecked={visibleFields[f.key]} onChange={() => onToggleField(f.key)} />
              ))}
              {showEpic && <ToggleRow label="Epic" isChecked={visibleFields.epic} onChange={() => onToggleField('epic')} />}
              {showDueDate && <ToggleRow label="Due date" isChecked={visibleFields.dueDate} onChange={() => onToggleField('dueDate')} />}
            </div>
            {/* Swimlanes section */}
            {hasSwimlanes && (
              <>
                <div role="separator" style={{ height: 1, background: token('color.border', 'var(--ds-border)'), margin: '4px 0' }} />
                <div style={{ padding: '4px 0' }}>
                  <div style={sectionStyle}>Swimlanes</div>
                  <button style={actionRowStyle} onClick={() => { onExpandAll?.(); close(); }}>Expand all</button>
                  <button style={actionRowStyle} onClick={() => { onCollapseAll?.(); close(); }}>Collapse all</button>
                </div>
              </>
            )}
          </>
        )}
      </PortalMenu>

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
