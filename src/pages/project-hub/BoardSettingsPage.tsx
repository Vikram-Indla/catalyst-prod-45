/**
 * BoardSettingsPage — full-page board settings matching Jira layout.
 * Nav: Details | Working Days | Timeline | Layout▾(Columns, Swimlanes, Card colors, Card layout, Quick filters)
 * Route: /project-hub/:key/boards/:boardId/settings/:section?
 */
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { token } from '@atlaskit/tokens';
import { useBoard } from '@/hooks/useBoard';
import {
  useUpdateBoard,
  useAddColumn,
  useDeleteColumn,
  useAddQuickFilter,
  useDeleteQuickFilter,
} from '@/hooks/useBoardMutations';
import { typedQuery } from '@/integrations/supabase/client';
import { useFiltersForProject } from '@/hooks/workhub/useSavedFilters';
import type {
  BoardListItem,
  SwimlaneType,
  CardColorMethod,
  EpicDisplayMode,
  ColumnConstraintType,
  WorkingDaysConfig,
  BoardQuickFilter,
} from '@/types/board';

// ─── Nav ──────────────────────────────────────────────────────────────────────

type Section = 'details' | 'working-days' | 'timeline' | 'columns' | 'swimlanes' | 'card-colors' | 'card-layout' | 'quick-filters';

const NAV_TOP: { key: Section; label: string }[] = [
  { key: 'details',       label: 'Details'      },
  { key: 'working-days',  label: 'Working days' },
  { key: 'timeline',      label: 'Timeline'     },
];

const NAV_LAYOUT: { key: Section; label: string }[] = [
  { key: 'columns',       label: 'Columns and statuses' },
  { key: 'swimlanes',     label: 'Swimlanes'            },
  { key: 'card-colors',   label: 'Card colors'          },
  { key: 'card-layout',   label: 'Card layout'          },
  { key: 'quick-filters', label: 'Quick filters'        },
];

// ─── Completed-work presets (Jira parity) ────────────────────────────────────

const COMPLETED_CUTOFFS = [
  { value: '-1d',  label: 'For 1 day'    },
  { value: '-3d',  label: 'For 3 days'   },
  { value: '-1w',  label: 'For 1 week'   },
  { value: '-2w',  label: 'For 2 weeks'  },
  { value: '-4w',  label: 'For 4 weeks'  },
  { value: 'none', label: 'Always hide'  },
];

const SWIMLANE_OPTIONS: { value: SwimlaneType; label: string }[] = [
  { value: 'none',     label: 'None'          },
  { value: 'stories',  label: 'Stories'       },
  { value: 'assignee', label: 'Assignee'      },
  { value: 'epic',     label: 'Epics'         },
  { value: 'project',  label: 'Project'       },
  { value: 'jql',      label: 'Custom JQL'    },
];

const CARD_COLOR_METHODS: { value: CardColorMethod; label: string }[] = [
  { value: 'none',        label: 'None'        },
  { value: 'issue_type',  label: 'Issue type'  },
  { value: 'priorities',  label: 'Priorities'  },
  { value: 'assignees',   label: 'Assignees'   },
  { value: 'jql',         label: 'JQL'         },
];

// ads-scanner:ignore-next-line — input[type=color] data value, not CSS style
const DEFAULT_CARD_COLOR = 'var(--ds-link, #0052CC)';

const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// ─── Shared styles (ADS tokens) ───────────────────────────────────────────────

const S = {
  page: {
    display: 'flex',
    height: '100%',
    overflow: 'hidden',
    background: token('color.background.input', 'var(--ds-surface-sunken, #F7F8F9)'),
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  } as React.CSSProperties,

  sidebar: {
    width: 240,
    flexShrink: 0,
    borderRight: `1px solid ${token('color.border', 'var(--ds-border, #DFE1E6)')}`,
    padding: '24px 0',
    overflowY: 'auto' as const,
    background: token('color.background.input', 'var(--ds-surface, #FFFFFF)'),
  } as React.CSSProperties,

  content: {
    flex: 1,
    overflowY: 'auto' as const,
    padding: '32px 40px',
    background: token('color.background.input', 'var(--ds-surface, #FFFFFF)'),
  } as React.CSSProperties,

  sectionLabel: {
    fontSize: 12,
    fontWeight: 653,
    color: token('color.text.subtlest', 'var(--ds-text-subtlest, #6B778C)'),
    padding: '8px 16px 4px',
    display: 'block',
  } as React.CSSProperties,

  navItem: (active: boolean): React.CSSProperties => ({
    display: 'block',
    width: '100%',
    textAlign: 'left',
    border: 'none',
    background: active
      ? token('color.background.selected', 'var(--ds-background-selected, #E9F2FE)')
      : 'transparent',
    color: active
      ? token('color.text.selected', 'var(--ds-text-selected, #0052CC)')
      : token('color.text.subtle', 'var(--ds-text-subtle, #42526E)'),
    fontSize: 14,
    fontWeight: active ? 600 : 400,
    padding: '8px 16px',
    cursor: 'pointer',
    borderLeft: active ? `2px solid ${token('color.border.focused', 'var(--ds-border-focused, #0052CC)')}` : '2px solid transparent',
    boxSizing: 'border-box',
  }),

  h1: {
    fontSize: 24,
    fontWeight: 653,
    color: token('color.text', 'var(--ds-text, #172B4D)'),
    margin: '0 0 4px',
    lineHeight: '28px',
  } as React.CSSProperties,

  subtitle: {
    fontSize: 14,
    color: token('color.text.subtle', 'var(--ds-text-subtle, #42526E)'),
    margin: '0 0 24px',
  } as React.CSSProperties,

  fieldRow: {
    display: 'grid',
    gridTemplateColumns: '200px 1fr',
    gap: 16,
    alignItems: 'start',
    padding: '12px 0',
    borderBottom: `1px solid ${token('color.border', 'var(--ds-border, #DFE1E6)')}`,
  } as React.CSSProperties,

  fieldLabel: {
    fontSize: 14,
    fontWeight: 600,
    color: token('color.text', 'var(--ds-text, #172B4D)'),
    paddingTop: 4,
  } as React.CSSProperties,

  fieldHint: {
    fontSize: 12,
    color: token('color.text.subtlest', 'var(--ds-text-subtlest, #6B778C)'),
    marginTop: 4,
  } as React.CSSProperties,

  input: {
    width: '100%',
    height: 36,
    border: `2px solid ${token('color.border.input', 'var(--ds-border-input, #DFE1E6)')}`,
    borderRadius: 4,
    padding: '0 8px',
    fontSize: 14,
    color: token('color.text', 'var(--ds-text, #172B4D)'),
    background: token('color.background.input', 'var(--ds-background-input, #FAFBFC)'),
    boxSizing: 'border-box' as const,
    outline: 'none',
  } as React.CSSProperties,

  textarea: {
    width: '100%',
    minHeight: 80,
    border: `2px solid ${token('color.border.input', 'var(--ds-border-input, #DFE1E6)')}`,
    borderRadius: 4,
    padding: 8,
    fontSize: 14,
    color: token('color.text', 'var(--ds-text, #172B4D)'),
    background: token('color.background.input', 'var(--ds-background-input, #FAFBFC)'),
    boxSizing: 'border-box' as const,
    resize: 'vertical' as const,
    outline: 'none',
    fontFamily: 'inherit',
  } as React.CSSProperties,

  select: {
    height: 36,
    border: `2px solid ${token('color.border.input', 'var(--ds-border-input, #DFE1E6)')}`,
    borderRadius: 4,
    padding: '0 8px',
    fontSize: 14,
    color: token('color.text', 'var(--ds-text, #172B4D)'),
    background: token('color.background.input', 'var(--ds-background-input, #FAFBFC)'),
    cursor: 'pointer',
    outline: 'none',
  } as React.CSSProperties,

  btnPrimary: {
    height: 32,
    padding: '0 16px',
    background: token('color.background.brand.bold', 'var(--ds-background-brand-bold, #0052CC)'),
    color: token('color.text.inverse', 'var(--ds-text-inverse, #FFFFFF)'),
    border: 'none',
    borderRadius: 4,
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
  } as React.CSSProperties,

  btnSubtle: {
    height: 32,
    padding: '0 12px',
    background: 'transparent',
    color: token('color.text.subtle', 'var(--ds-text-subtle, #42526E)'),
    border: `1px solid ${token('color.border', 'var(--ds-border, #DFE1E6)')}`,
    borderRadius: 4,
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
  } as React.CSSProperties,

  btnLink: {
    background: 'none',
    border: 'none',
    color: token('color.link', 'var(--ds-link, #0052CC)'),
    fontSize: 14,
    cursor: 'pointer',
    padding: 0,
    textDecoration: 'underline',
  } as React.CSSProperties,

  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    fontSize: 14,
  } as React.CSSProperties,

  th: {
    textAlign: 'left' as const,
    fontSize: 12,
    fontWeight: 653,
    color: token('color.text.subtle', 'var(--ds-text-subtle, #42526E)'),
    padding: '4px 8px 4px 0',
    borderBottom: `1.67px solid ${token('color.border', 'var(--ds-border, #DFE1E6)')}`,
  } as React.CSSProperties,

  td: {
    padding: '8px 8px 8px 0',
    color: token('color.text', 'var(--ds-text, #172B4D)'),
    verticalAlign: 'top' as const,
    borderBottom: `1px solid ${token('color.border', 'var(--ds-border, #DFE1E6)')}`,
  } as React.CSSProperties,

  toggle: (on: boolean): React.CSSProperties => ({
    width: 40,
    height: 20,
    borderRadius: 10,
    background: on
      ? token('color.background.brand.bold', 'var(--ds-background-brand-bold, #0052CC)')
      : token('color.background.neutral', 'var(--ds-background-neutral, #DFE1E6)'),
    position: 'relative',
    cursor: 'pointer',
    border: 'none',
    flexShrink: 0,
    transition: 'background 0.15s',
  }),

  toggleThumb: (on: boolean): React.CSSProperties => ({
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: '50%',
    background: token('color.text.inverse', 'var(--ds-text-inverse, #FFFFFF)'),
    top: 2,
    left: on ? 22 : 2,
    transition: 'left 0.15s',
  }),
};

// ─── Reusable Toggle ──────────────────────────────────────────────────────────

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      style={S.toggle(on)}
      onClick={() => onChange(!on)}
    >
      <span style={S.toggleThumb(on)} />
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface BoardSettingsPageProps {
  board: BoardListItem;
  projectKey: string;
}

export default function BoardSettingsPage({ board, projectKey }: BoardSettingsPageProps) {
  const { section = 'details' } = useParams<{ section?: string }>();
  const navigate = useNavigate();
  const activeSection = section as Section;

  const backPath = `/project-hub/${projectKey}/boards`;

  // ── Form state ───────────────────────────────────────────────────────────

  // Details
  const [name,              setName]              = useState(board.name);
  const [boardQuery,        setBoardQuery]        = useState(board.boardQuery ?? '');
  const [subFilterQuery,    setSubFilterQuery]    = useState(board.subFilterQuery ?? '');
  const [completedCutoff,   setCompletedCutoff]   = useState(board.completedIssuesCutoff ?? '-2w');
  const [selectedFilterId,  setSelectedFilterId]  = useState<string>(board.filterId ?? '');

  // Working days
  const [workingDays, setWorkingDays] = useState<WorkingDaysConfig>(
    board.workingDaysConfig ?? {
      region: 'System default',
      timezone: '',
      workdays: [true, true, true, true, true, false, false],
      nonWorkingDates: [],
    }
  );

  // Timeline
  const [timelineEnabled,         setTimelineEnabled]         = useState(board.timelineEnabled ?? false);
  const [timelineIncludeChildren, setTimelineIncludeChildren] = useState(board.timelineIncludeChildren ?? false);

  // Columns
  const [newColName,          setNewColName]          = useState('');
  const [columnConstraint,    setColumnConstraint]    = useState<ColumnConstraintType>(board.columnConstraintType ?? 'none');
  const [epicDisplayMode,     setEpicDisplayMode]     = useState<EpicDisplayMode>(board.epicDisplayMode ?? 'board');
  const [kanbanBacklog,       setKanbanBacklog]       = useState(board.kanbanBacklogEnabled ?? false);

  // Swimlanes
  const [swimlane,     setSwimlane]     = useState<SwimlaneType>(board.swimlaneType ?? 'none');
  const [swimlaneJql,  setSwimlaneJql]  = useState(board.swimlaneJql ?? '');

  // Card colors
  const [cardColorMethod, setCardColorMethod] = useState<CardColorMethod>(board.cardColorMethod ?? 'none');
  const [cardColors,      setCardColors]      = useState<Array<{ id: string; label: string; jql: string; color: string }>>(board.cardColors ?? []);
  const [addingCardColor,   setAddingCardColor]   = useState(false);
  const [newCardColorLabel, setNewCardColorLabel] = useState('');
  const [newCardColorJql,   setNewCardColorJql]   = useState('');
  const [newCardColorHex,   setNewCardColorHex]   = useState(DEFAULT_CARD_COLOR);

  // Card layout
  const [cardLayout,          setCardLayout]          = useState<'default' | 'compact'>(board.cardLayout ?? 'default');
  const [cardExtraFields,     setCardExtraFields]     = useState<string[]>(board.cardExtraFields ?? []);
  const [daysInColumn,        setDaysInColumn]        = useState(board.daysInColumnEnabled ?? false);
  const [newExtraField,       setNewExtraField]       = useState('');
  const [addingExtraField,    setAddingExtraField]    = useState(false);

  // Quick filters
  const [newFilterName,     setNewFilterName]     = useState('');
  const [newFilterJql,      setNewFilterJql]      = useState('');
  const [newFilterDesc,     setNewFilterDesc]     = useState('');
  const [addingFilter,      setAddingFilter]      = useState(false);

  // ── Data fetching ─────────────────────────────────────────────────────────

  const { data: boardData }             = useBoard(board.id);
  const { data: availableFilters = [] } = useFiltersForProject(projectKey, 'project');
  const updateBoard       = useUpdateBoard();
  const addColumn         = useAddColumn();
  const deleteCol         = useDeleteColumn();
  const addQuickFilter    = useAddQuickFilter();
  const deleteQuickFilter = useDeleteQuickFilter();
  const qc = useQueryClient();

  const { data: quickFilters = [] } = useQuery<BoardQuickFilter[]>({
    queryKey: ['board-quick-filters', board.id],
    queryFn: async () => {
      const { data, error } = await typedQuery('board_quick_filters' as any)
        .select('*')
        .eq('board_id', board.id)
        .order('sort_order');
      if (error) throw error;
      return (data ?? []).map((f: any) => ({
        id: f.id, boardId: f.board_id, name: f.name,
        filterType: f.filter_type, filterValue: f.filter_value ?? {},
        jqlQuery: f.jql_query ?? null,
        description: f.description ?? null,
        isSystem: f.is_system, sortOrder: f.sort_order, createdAt: f.created_at,
      }));
    },
  });

  const columns = boardData?.columns ?? [];

  // ── Save helpers ──────────────────────────────────────────────────────────

  const saveField = (patch: Record<string, unknown>) =>
    updateBoard.mutateAsync({ boardId: board.id, projectId: board.projectId ?? undefined, ...patch });

  const saveDetails = () =>
    saveField({
      name:                     name              !== board.name              ? name              : undefined,
      board_query:              boardQuery        !== (board.boardQuery ?? '') ? boardQuery        : undefined,
      sub_filter_query:         subFilterQuery    !== (board.subFilterQuery ?? '') ? subFilterQuery : undefined,
      completed_issues_cutoff:  completedCutoff   !== (board.completedIssuesCutoff ?? '-2w') ? completedCutoff : undefined,
      filter_id:                selectedFilterId  !== (board.filterId ?? '')  ? (selectedFilterId || null) : undefined,
    });

  const saveWorkingDays = () =>
    saveField({ working_days_config: workingDays });

  const saveTimeline = () =>
    saveField({ timeline_enabled: timelineEnabled, timeline_include_children: timelineIncludeChildren });

  const saveColumns = () =>
    saveField({
      column_constraint_type: columnConstraint,
      epic_display_mode:      epicDisplayMode,
      kanban_backlog_enabled: kanbanBacklog,
    });

  const saveSwimlanes = () =>
    saveField({ swimlane_type: swimlane, swimlane_jql: swimlaneJql || null });

  const saveCardColors = () =>
    saveField({ card_color_method: cardColorMethod, card_colors: cardColors });

  const saveCardLayout = () =>
    saveField({ card_layout: cardLayout, card_extra_fields: cardExtraFields, days_in_column_enabled: daysInColumn });

  // ── Section content ───────────────────────────────────────────────────────

  const renderDetails = () => (
    <div>
      {/* ads-scanner:ignore-next-line */}
      <h1 style={S.h1}>Details</h1>
      <p style={S.subtitle}>Configure the name, filter, and query for this board.</p>

      {/* Name */}
      <div style={S.fieldRow}>
        <div>
          <div style={S.fieldLabel}>Name <span style={{ color: token('color.text.danger', 'var(--ds-text-danger, #AE2A19)') }}>*</span></div>
        </div>
        <div>
          <input
            style={S.input}
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Board name"
          />
        </div>
      </div>

      {/* Location (read-only) */}
      <div style={S.fieldRow}>
        <div>
          <div style={S.fieldLabel}>Location</div>
          <div style={S.fieldHint}>Read-only</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 4 }}>
          <span style={{ fontSize: 14, color: token('color.text', 'var(--ds-text, #172B4D)') }}>
            {projectKey} project
          </span>
        </div>
      </div>

      {/* Board filter */}
      <div style={S.fieldRow}>
        <div>
          <div style={S.fieldLabel}>Board filter <span style={{ color: token('color.text.danger', 'var(--ds-text-danger, #AE2A19)') }}>*</span></div>
          <div style={S.fieldHint}>Issues shown on the board are controlled by the linked filter</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <select
            style={{ ...S.select, width: '100%' }}
            value={selectedFilterId}
            onChange={e => setSelectedFilterId(e.target.value)}
          >
            <option value="">— Select a filter —</option>
            {availableFilters.map((f: any) => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
          {selectedFilterId && (
            <button style={S.btnLink}>Edit filter query</button>
          )}
        </div>
      </div>

      {/* Filter query */}
      <div style={S.fieldRow}>
        <div>
          <div style={S.fieldLabel}>Filter query</div>
          <div style={S.fieldHint}>JQL query used to populate this board</div>
        </div>
        <textarea
          style={S.textarea}
          value={boardQuery}
          onChange={e => setBoardQuery(e.target.value)}
          placeholder="project = BAU ORDER BY Rank ASC"
          rows={3}
        />
      </div>

      {/* Sub-filter */}
      <div style={S.fieldRow}>
        <div>
          <div style={S.fieldLabel}>Board sub-filter</div>
          <div style={S.fieldHint}>Additional JQL to further limit the board, without modifying the saved filter</div>
        </div>
        <textarea
          style={S.textarea}
          value={subFilterQuery}
          onChange={e => setSubFilterQuery(e.target.value)}
          placeholder="e.g. assignee = currentUser()"
          rows={2}
        />
      </div>

      {/* Completed items */}
      <div style={S.fieldRow}>
        <div>
          <div style={S.fieldLabel}>Completed work items</div>
          <div style={S.fieldHint}>How long to keep completed issues visible before hiding them</div>
        </div>
        <select
          style={{ ...S.select, width: 200 }}
          value={completedCutoff}
          onChange={e => setCompletedCutoff(e.target.value)}
        >
          {COMPLETED_CUTOFFS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      <div style={{ display: 'flex', gap: 8, paddingTop: 16 }}>
        <button style={S.btnPrimary} onClick={saveDetails} disabled={updateBoard.isPending}>
          {updateBoard.isPending ? 'Saving…' : 'Save changes'}
        </button>
        <button style={S.btnSubtle} onClick={() => navigate(backPath)}>Cancel</button>
      </div>
    </div>
  );

  const renderWorkingDays = () => (
    <div>
      {/* ads-scanner:ignore-next-line */}
      <h1 style={S.h1}>Working days</h1>
      <p style={S.subtitle}>Configure the working week for this board. Used in time-based reports and planning.</p>

      {/* Region */}
      <div style={S.fieldRow}>
        <div style={S.fieldLabel}>Region</div>
        <input
          style={S.input}
          value={workingDays.region}
          onChange={e => setWorkingDays(prev => ({ ...prev, region: e.target.value }))}
          placeholder="System default"
        />
      </div>

      {/* Timezone */}
      <div style={S.fieldRow}>
        <div style={S.fieldLabel}>Timezone</div>
        <input
          style={S.input}
          value={workingDays.timezone}
          onChange={e => setWorkingDays(prev => ({ ...prev, timezone: e.target.value }))}
          placeholder="e.g. Asia/Riyadh"
        />
      </div>

      {/* Working days checkboxes */}
      <div style={S.fieldRow}>
        <div>
          <div style={S.fieldLabel}>Work days</div>
          <div style={S.fieldHint}>Select the days that count as working days</div>
        </div>
        <div style={{ display: 'flex', gap: 16 }}>
          {DAYS_OF_WEEK.map((day, idx) => (
            <label key={day} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, fontSize: 12, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={workingDays.workdays[idx]}
                onChange={e => {
                  const next = [...workingDays.workdays] as WorkingDaysConfig['workdays'];
                  next[idx] = e.target.checked;
                  setWorkingDays(prev => ({ ...prev, workdays: next }));
                }}
              />
              {day}
            </label>
          ))}
        </div>
      </div>

      {/* Non-working dates */}
      <div style={S.fieldRow}>
        <div>
          <div style={S.fieldLabel}>Non-working dates</div>
          <div style={S.fieldHint}>Public holidays or planned shutdowns (YYYY-MM-DD)</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {workingDays.nonWorkingDates.map((d, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                style={{ ...S.input, width: 160 }}
                type="date"
                value={d}
                onChange={e => {
                  const next = [...workingDays.nonWorkingDates];
                  next[i] = e.target.value;
                  setWorkingDays(prev => ({ ...prev, nonWorkingDates: next }));
                }}
              />
              <button
                style={S.btnSubtle}
                onClick={() => setWorkingDays(prev => ({ ...prev, nonWorkingDates: prev.nonWorkingDates.filter((_, j) => j !== i) }))}
              >Remove</button>
            </div>
          ))}
          <button
            style={S.btnSubtle}
            onClick={() => setWorkingDays(prev => ({ ...prev, nonWorkingDates: [...prev.nonWorkingDates, ''] }))}
          >+ Add date</button>
        </div>
      </div>

      <div style={{ paddingTop: 16 }}>
        <button style={S.btnPrimary} onClick={saveWorkingDays} disabled={updateBoard.isPending}>
          {updateBoard.isPending ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </div>
  );

  const renderTimeline = () => (
    <div>
      {/* ads-scanner:ignore-next-line */}
      <h1 style={S.h1}>Timeline</h1>
      <p style={S.subtitle}>Configure the timeline (roadmap) view for this board.</p>

      <div style={S.fieldRow}>
        <div>
          <div style={S.fieldLabel}>Enable timeline</div>
          <div style={S.fieldHint}>Show a timeline view for this board</div>
        </div>
        <Toggle on={timelineEnabled} onChange={v => { setTimelineEnabled(v); if (!v) setTimelineIncludeChildren(false); }} />
      </div>

      {timelineEnabled && (
        <div style={S.fieldRow}>
          <div>
            <div style={S.fieldLabel}>Include child-level work items</div>
            <div style={S.fieldHint}>Show sub-tasks and child issues on the timeline</div>
          </div>
          <Toggle on={timelineIncludeChildren} onChange={setTimelineIncludeChildren} />
        </div>
      )}

      <div style={{ paddingTop: 16 }}>
        <button style={S.btnPrimary} onClick={saveTimeline} disabled={updateBoard.isPending}>
          {updateBoard.isPending ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </div>
  );

  const renderColumns = () => (
    <div>
      {/* ads-scanner:ignore-next-line */}
      <h1 style={S.h1}>Columns and statuses</h1>
      <p style={S.subtitle}>Manage board columns and map issue statuses to them.</p>

      {/* Workflow type (read-only) */}
      <div style={S.fieldRow}>
        <div style={S.fieldLabel}>Workflow type</div>
        <span style={{ fontSize: 14, color: token('color.text', 'var(--ds-text, #172B4D)'), paddingTop: 4 }}>
          {board.boardType === 'scrum' ? 'Scrum' : 'Kanban'}
        </span>
      </div>

      {/* Column constraints */}
      <div style={S.fieldRow}>
        <div>
          <div style={S.fieldLabel}>Column constraint</div>
          <div style={S.fieldHint}>Limit the number of issues that can be in each column</div>
        </div>
        <select
          style={{ ...S.select, width: 200 }}
          value={columnConstraint}
          onChange={e => setColumnConstraint(e.target.value as ColumnConstraintType)}
        >
          <option value="none">None</option>
          <option value="issue_count">Issue count</option>
        </select>
      </div>

      {/* Epic work items */}
      <div style={S.fieldRow}>
        <div>
          <div style={S.fieldLabel}>Epic work items</div>
          <div style={S.fieldHint}>How epics are displayed on the board</div>
        </div>
        <select
          style={{ ...S.select, width: 200 }}
          value={epicDisplayMode}
          onChange={e => setEpicDisplayMode(e.target.value as EpicDisplayMode)}
        >
          <option value="board">Show epics on board</option>
          <option value="panel">Show epics in panel</option>
        </select>
      </div>

      {/* Kanban backlog */}
      <div style={S.fieldRow}>
        <div>
          <div style={S.fieldLabel}>Kanban backlog</div>
          <div style={S.fieldHint}>Enable a separate backlog column for unstarted issues</div>
        </div>
        <Toggle on={kanbanBacklog} onChange={setKanbanBacklog} />
      </div>

      <div style={{ paddingTop: 16, paddingBottom: 24 }}>
        <button style={S.btnPrimary} onClick={saveColumns} disabled={updateBoard.isPending}>
          {updateBoard.isPending ? 'Saving…' : 'Save changes'}
        </button>
      </div>

      {/* Column list */}
      <h2 style={{ fontSize: 16, fontWeight: 653, color: token('color.text', 'var(--ds-text, #172B4D)'), margin: '24px 0 12px' }}>
        Board columns
      </h2>
      <table style={S.table}>
        <thead>
          <tr>
            <th style={S.th}>Column name</th>
            <th style={S.th}>Mapped statuses</th>
            <th style={S.th}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {columns.map((col: any) => (
            <tr key={col.id}>
              <td style={S.td}>{col.name}{col.isBacklog ? ' (Backlog)' : ''}{col.isDone ? ' (Done)' : ''}</td>
              <td style={S.td}>
                {(col.statusIds ?? []).length > 0
                  ? <span style={{ fontSize: 12, color: token('color.text.subtle', 'var(--ds-text-subtle, #42526E)') }}>{col.statusIds.length} status(es)</span>
                  : <span style={{ fontSize: 12, color: token('color.text.subtlest', 'var(--ds-text-subtlest, #6B778C)'), fontStyle: 'italic' }}>No statuses mapped</span>
                }
              </td>
              <td style={S.td}>
                {!col.isBacklog && !col.isDone && (
                  <button
                    style={{ ...S.btnSubtle, color: token('color.text.danger', 'var(--ds-text-danger, #AE2A19)') }}
                    onClick={() => deleteCol.mutateAsync({ columnId: col.id, boardId: board.id })}
                  >Delete</button>
                )}
              </td>
            </tr>
          ))}
          {columns.length === 0 && (
            <tr>
              <td style={{ ...S.td, color: token('color.text.subtlest', 'var(--ds-text-subtlest, #6B778C)') }} colSpan={3}>
                No columns defined
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Add column */}
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <input
          style={{ ...S.input, width: 200 }}
          placeholder="New column name"
          value={newColName}
          onChange={e => setNewColName(e.target.value)}
        />
        <button
          style={S.btnPrimary}
          disabled={!newColName.trim() || addColumn.isPending}
          onClick={async () => {
            if (!newColName.trim()) return;
            await addColumn.mutateAsync({ boardId: board.id, name: newColName.trim(), position: columns.length });
            setNewColName('');
          }}
        >Add column</button>
      </div>
    </div>
  );

  const renderSwimlanes = () => (
    <div>
      {/* ads-scanner:ignore-next-line */}
      <h1 style={S.h1}>Swimlanes</h1>
      <p style={S.subtitle}>Group issues into horizontal swimlanes.</p>

      <div style={S.fieldRow}>
        <div>
          <div style={S.fieldLabel}>Swimlane method</div>
          <div style={S.fieldHint}>How to group issues into swimlanes</div>
        </div>
        <select
          style={{ ...S.select, width: 220 }}
          value={swimlane}
          onChange={e => setSwimlane(e.target.value as SwimlaneType)}
        >
          {SWIMLANE_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {swimlane === 'jql' && (
        <div style={S.fieldRow}>
          <div>
            <div style={S.fieldLabel}>JQL query</div>
            <div style={S.fieldHint}>One swimlane per matching result</div>
          </div>
          <textarea
            style={S.textarea}
            value={swimlaneJql}
            onChange={e => setSwimlaneJql(e.target.value)}
            placeholder="e.g. assignee in (user1, user2)"
            rows={3}
          />
        </div>
      )}

      <div style={{ paddingTop: 16 }}>
        <button style={S.btnPrimary} onClick={saveSwimlanes} disabled={updateBoard.isPending}>
          {updateBoard.isPending ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </div>
  );

  const renderCardColors = () => (
    <div>
      {/* ads-scanner:ignore-next-line */}
      <h1 style={S.h1}>Card colors</h1>
      <p style={S.subtitle}>Colour-code cards on the board to highlight patterns.</p>

      <div style={S.fieldRow}>
        <div>
          <div style={S.fieldLabel}>Colour method</div>
          <div style={S.fieldHint}>How card colours are assigned</div>
        </div>
        <select
          style={{ ...S.select, width: 220 }}
          value={cardColorMethod}
          onChange={e => setCardColorMethod(e.target.value as CardColorMethod)}
        >
          {CARD_COLOR_METHODS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {cardColorMethod === 'jql' && (
        <>
          <div style={{ marginTop: 24, marginBottom: 12 }}>
            <h2 style={{ fontSize: 16, fontWeight: 653, color: token('color.text', 'var(--ds-text, #172B4D)'), margin: '0 0 4px' }}>
              Colour rules
            </h2>
            <p style={{ fontSize: 14, color: token('color.text.subtle', 'var(--ds-text-subtle, #42526E)'), margin: 0 }}>
              Issues matching the first applicable JQL rule will use that colour.
            </p>
          </div>

          <table style={S.table}>
            <thead>
              <tr>
                <th style={{ ...S.th, width: 32 }}></th>
                <th style={S.th}>Label</th>
                <th style={S.th}>JQL</th>
                <th style={S.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {cardColors.map((cc, idx) => (
                <tr key={cc.id}>
                  <td style={S.td}>
                    <span style={{ display: 'inline-block', width: 16, height: 16, borderRadius: 2, background: cc.color }} />
                  </td>
                  <td style={S.td}>{cc.label}</td>
                  <td style={{ ...S.td, fontFamily: 'monospace', fontSize: 12 }}>{cc.jql}</td>
                  <td style={S.td}>
                    <button
                      style={{ ...S.btnSubtle, color: token('color.text.danger', 'var(--ds-text-danger, #AE2A19)') }}
                      onClick={() => setCardColors(prev => prev.filter((_, i) => i !== idx))}
                    >Delete</button>
                  </td>
                </tr>
              ))}
              {cardColors.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ ...S.td, color: token('color.text.subtlest', 'var(--ds-text-subtlest, #6B778C)') }}>
                    No colour rules defined
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {addingCardColor ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {/* ads-scanner:ignore-next-line */}
                <input type="color" value={newCardColorHex} onChange={e => setNewCardColorHex(e.target.value)} style={{ width: 36, height: 36, border: 'none', cursor: 'pointer' }} />
                <input style={{ ...S.input, width: 160 }} placeholder="Label" value={newCardColorLabel} onChange={e => setNewCardColorLabel(e.target.value)} />
                <input style={{ ...S.input, flex: 1 }} placeholder="JQL e.g. priority = High" value={newCardColorJql} onChange={e => setNewCardColorJql(e.target.value)} />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  style={S.btnPrimary}
                  disabled={!newCardColorLabel.trim() || !newCardColorJql.trim()}
                  onClick={() => {
                    setCardColors(prev => [...prev, { id: crypto.randomUUID(), label: newCardColorLabel.trim(), jql: newCardColorJql.trim(), color: newCardColorHex }]);
                    setAddingCardColor(false); setNewCardColorLabel(''); setNewCardColorJql(''); setNewCardColorHex(DEFAULT_CARD_COLOR);
                  }}
                >Add</button>
                <button style={S.btnSubtle} onClick={() => setAddingCardColor(false)}>Cancel</button>
              </div>
            </div>
          ) : (
            <button style={{ ...S.btnSubtle, marginTop: 12 }} onClick={() => setAddingCardColor(true)}>
              + Add colour rule
            </button>
          )}
        </>
      )}

      <div style={{ paddingTop: 16 }}>
        <button style={S.btnPrimary} onClick={saveCardColors} disabled={updateBoard.isPending}>
          {updateBoard.isPending ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </div>
  );

  const renderCardLayout = () => (
    <div>
      {/* ads-scanner:ignore-next-line */}
      <h1 style={S.h1}>Card layout</h1>
      <p style={S.subtitle}>Configure which fields appear on board cards.</p>

      {/* Card display density */}
      <div style={S.fieldRow}>
        <div>
          <div style={S.fieldLabel}>Card display</div>
          <div style={S.fieldHint}>Default or compact card height</div>
        </div>
        <div style={{ display: 'flex', gap: 24 }}>
          {(['default', 'compact'] as const).map(v => (
            <label key={v} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14 }}>
              <input type="radio" name="cardLayout" checked={cardLayout === v} onChange={() => setCardLayout(v)} />
              {v === 'default' ? 'Default' : 'Compact'}
            </label>
          ))}
        </div>
      </div>

      {/* Days in column */}
      <div style={S.fieldRow}>
        <div>
          <div style={S.fieldLabel}>Days in column</div>
          <div style={S.fieldHint}>Show how many days each issue has been in its current column</div>
        </div>
        <Toggle on={daysInColumn} onChange={setDaysInColumn} />
      </div>

      {/* Extra fields */}
      <div style={{ marginTop: 24, marginBottom: 12 }}>
        <h2 style={{ fontSize: 16, fontWeight: 653, color: token('color.text', 'var(--ds-text, #172B4D)'), margin: '0 0 4px' }}>
          Extra fields
        </h2>
        <p style={{ fontSize: 14, color: token('color.text.subtle', 'var(--ds-text-subtle, #42526E)'), margin: 0 }}>
          Show up to 3 additional fields on each card.
        </p>
      </div>

      <table style={S.table}>
        <thead>
          <tr>
            <th style={S.th}>Field</th>
            <th style={S.th}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {cardExtraFields.map((f, idx) => (
            <tr key={idx}>
              <td style={S.td}>{f}</td>
              <td style={S.td}>
                <button
                  style={{ ...S.btnSubtle, color: token('color.text.danger', 'var(--ds-text-danger, #AE2A19)') }}
                  onClick={() => setCardExtraFields(prev => prev.filter((_, i) => i !== idx))}
                >Delete</button>
              </td>
            </tr>
          ))}
          {cardExtraFields.length === 0 && (
            <tr>
              <td colSpan={2} style={{ ...S.td, color: token('color.text.subtlest', 'var(--ds-text-subtlest, #6B778C)') }}>
                No extra fields added
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {cardExtraFields.length < 3 && (
        addingExtraField ? (
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <input
              style={{ ...S.input, width: 220 }}
              placeholder="Field name (e.g. Priority)"
              value={newExtraField}
              onChange={e => setNewExtraField(e.target.value)}
            />
            <button
              style={S.btnPrimary}
              disabled={!newExtraField.trim()}
              onClick={() => {
                if (newExtraField.trim()) {
                  setCardExtraFields(prev => [...prev, newExtraField.trim()]);
                  setNewExtraField(''); setAddingExtraField(false);
                }
              }}
            >Add</button>
            <button style={S.btnSubtle} onClick={() => setAddingExtraField(false)}>Cancel</button>
          </div>
        ) : (
          <button style={{ ...S.btnSubtle, marginTop: 12 }} onClick={() => setAddingExtraField(true)}>
            + Add field
          </button>
        )
      )}

      <div style={{ paddingTop: 16 }}>
        <button style={S.btnPrimary} onClick={saveCardLayout} disabled={updateBoard.isPending}>
          {updateBoard.isPending ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </div>
  );

  const renderQuickFilters = () => (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          {/* ads-scanner:ignore-next-line */}
      <h1 style={S.h1}>Quick filters</h1>
          <p style={{ ...S.subtitle, marginBottom: 0 }}>Shortcut filters shown on the board toolbar.</p>
        </div>
        <button style={S.btnPrimary} onClick={() => setAddingFilter(true)}>
          Create quick filter
        </button>
      </div>

      <table style={S.table}>
        <thead>
          <tr>
            <th style={S.th}>Name</th>
            <th style={S.th}>JQL</th>
            <th style={S.th}>Description</th>
            <th style={S.th}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {quickFilters.map((qf: BoardQuickFilter) => (
            <tr key={qf.id}>
              <td style={S.td}>{qf.name}</td>
              <td style={{ ...S.td, fontFamily: 'monospace', fontSize: 12 }}>{qf.jqlQuery ?? qf.filterValue?.jql as string ?? ''}</td>
              <td style={{ ...S.td, color: token('color.text.subtle', 'var(--ds-text-subtle, #42526E)') }}>{qf.description ?? ''}</td>
              <td style={S.td}>
                {!qf.isSystem && (
                  <button
                    style={{ ...S.btnSubtle, color: token('color.text.danger', 'var(--ds-text-danger, #AE2A19)') }}
                    onClick={() => deleteQuickFilter.mutateAsync({ filterId: qf.id, boardId: board.id })}
                  >Delete</button>
                )}
              </td>
            </tr>
          ))}
          {quickFilters.length === 0 && (
            <tr>
              <td colSpan={4} style={{ ...S.td, color: token('color.text.subtlest', 'var(--ds-text-subtlest, #6B778C)') }}>
                No quick filters defined
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {addingFilter && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16, padding: 16, border: `1px solid ${token('color.border', 'var(--ds-border, #DFE1E6)')}`, borderRadius: 4 }}>
          <h3 style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 600, color: token('color.text', 'var(--ds-text, #172B4D)') }}>
            New quick filter
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <input style={S.input} placeholder="Name *" value={newFilterName} onChange={e => setNewFilterName(e.target.value)} />
            <input style={S.input} placeholder="JQL query *" value={newFilterJql} onChange={e => setNewFilterJql(e.target.value)} />
            <input style={S.input} placeholder="Description (optional)" value={newFilterDesc} onChange={e => setNewFilterDesc(e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button
              style={S.btnPrimary}
              disabled={!newFilterName.trim() || !newFilterJql.trim() || addQuickFilter.isPending}
              onClick={async () => {
                await addQuickFilter.mutateAsync({ boardId: board.id, name: newFilterName.trim(), jql: newFilterJql.trim(), description: newFilterDesc.trim() || undefined });
                setNewFilterName(''); setNewFilterJql(''); setNewFilterDesc(''); setAddingFilter(false);
                qc.invalidateQueries({ queryKey: ['board-quick-filters', board.id] });
              }}
            >
              {addQuickFilter.isPending ? 'Saving…' : 'Create'}
            </button>
            <button style={S.btnSubtle} onClick={() => { setAddingFilter(false); setNewFilterName(''); setNewFilterJql(''); setNewFilterDesc(''); }}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );

  // ── Section renderer ──────────────────────────────────────────────────────

  const renderSection = () => {
    switch (activeSection) {
      case 'details':       return renderDetails();
      case 'working-days':  return renderWorkingDays();
      case 'timeline':      return renderTimeline();
      case 'columns':       return renderColumns();
      case 'swimlanes':     return renderSwimlanes();
      case 'card-colors':   return renderCardColors();
      case 'card-layout':   return renderCardLayout();
      case 'quick-filters': return renderQuickFilters();
      default:              return renderDetails();
    }
  };

  // ── Layout ────────────────────────────────────────────────────────────────

  const boardSettingsPath = `/project-hub/${projectKey}/boards/${board.id}/settings`;

  const navTo = (s: Section) => navigate(`${boardSettingsPath}/${s}`);

  return (
    <div style={S.page}>
      {/* Left nav */}
      <nav style={S.sidebar} aria-label="Board settings navigation">
        <div style={{ padding: '0 16px 16px', borderBottom: `1px solid ${token('color.border', 'var(--ds-border, #DFE1E6)')}`, marginBottom: 8 }}>
          <button
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: token('color.link', 'var(--ds-link, #0052CC)'), fontSize: 14, display: 'flex', alignItems: 'center', gap: 4 }}
            onClick={() => navigate(backPath)}
          >
            ← Back to boards
          </button>
          <div style={{ fontSize: 16, fontWeight: 600, color: token('color.text', 'var(--ds-text, #172B4D)'), marginTop: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {board.name}
          </div>
        </div>

        {NAV_TOP.map(item => (
          <button
            key={item.key}
            style={S.navItem(activeSection === item.key)}
            onClick={() => navTo(item.key)}
          >
            {item.label}
          </button>
        ))}

        <span style={S.sectionLabel}>Layout</span>
        {NAV_LAYOUT.map(item => (
          <button
            key={item.key}
            style={S.navItem(activeSection === item.key)}
            onClick={() => navTo(item.key)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {/* Content */}
      <main style={S.content}>
        {renderSection()}
      </main>
    </div>
  );
}
