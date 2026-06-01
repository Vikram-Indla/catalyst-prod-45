/**
 * BoardSettingsPage — full-page board settings matching Jira's layout:
 *   Left sidebar (240px) with vertical nav + content area (flex-1)
 *   Route: /project-hub/:key/boards/:boardId/settings/:section?
 *
 * Replaces the BoardSettingsDrawer side-panel (which was wrong — Jira uses a full page).
 */
import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { GripVertical, Trash2, Plus, AlertTriangle, ChevronLeft } from '@/lib/atlaskit-icons';
import { token } from '@atlaskit/tokens';
import { useBoard } from '@/hooks/useBoard';
import {
  useUpdateBoard,
  useDeleteBoard,
  useAddColumn,
  useDeleteColumn,
  useAddQuickFilter,
  useDeleteQuickFilter,
} from '@/hooks/useBoardMutations';
import { typedQuery } from '@/integrations/supabase/client';
import { useFiltersForProject } from '@/hooks/workhub/useSavedFilters';
import type { BoardListItem, BoardVisibility, SwimlaneType, BoardQuickFilter } from '@/types/board';

// ─── Nav sections ────────────────────────────────────────────────────────────

type Section = 'general' | 'filter' | 'columns' | 'swimlanes' | 'access';

const NAV_ITEMS: { key: Section; label: string }[] = [
  { key: 'general',   label: 'General'      },
  { key: 'filter',    label: 'Board filter' },
  { key: 'columns',   label: 'Columns'      },
  { key: 'swimlanes', label: 'Swimlanes'    },
  { key: 'access',    label: 'Access'       },
];

// ─── Constants (from BoardSettingsDrawer) ────────────────────────────────────

const COLOR_SWATCHES = [
  token('color.text.brand',    '#0052CC'),
  token('color.text.success',  '#216E4E'),
  'var(--ds-icon-accent-purple, #6E5DC6)',
  token('color.text.danger',   '#AE2A19'),
  token('color.text.warning',  '#974F0C'),
  'var(--ds-icon-accent.teal,  #206B74)',
  token('color.icon',          '#44546F'),
  token('color.background.information.bold', '#0055CC'),
];

const VISIBILITY_OPTIONS: { value: BoardVisibility; label: string; desc: string; warning?: boolean }[] = [
  { value: 'project', label: 'Project Board',       desc: 'Visible to all project members' },
  { value: 'private', label: '🔒 Private',          desc: 'Only you can see this board' },
  { value: 'global',  label: 'Organisation-wide',   desc: 'Visible to all users in the organisation. Use with caution.', warning: true },
];

const SWIMLANE_OPTIONS: { value: SwimlaneType; label: string; desc: string }[] = [
  { value: 'none',     label: 'No Swimlanes',        desc: 'All issues in a single flat list' },
  { value: 'release',  label: 'Group by Release',    desc: 'One swimlane per release / fix version' },
  { value: 'assignee', label: 'Group by Assignee',   desc: 'One swimlane per team member' },
  { value: 'epic',     label: 'Group by Epic',       desc: 'One swimlane per parent epic' },
];

const QUERY_PRESETS = [
  { label: 'All issues',    jql: (k?: string | null) => k ? `project = ${k} ORDER BY Rank ASC` : 'ORDER BY Rank ASC' },
  { label: 'Open sprints',  jql: (k?: string | null) => k ? `project = ${k} AND sprint in openSprints() ORDER BY Rank ASC` : 'sprint in openSprints() ORDER BY Rank ASC' },
  { label: 'My issues',     jql: (k?: string | null) => k ? `project = ${k} AND assignee = currentUser() ORDER BY Rank ASC` : 'assignee = currentUser() ORDER BY Rank ASC' },
  { label: 'Bugs only',     jql: (k?: string | null) => k ? `project = ${k} AND issuetype = "QA Bug" ORDER BY priority DESC` : 'issuetype = "QA Bug" ORDER BY priority DESC' },
];

// ads-scanner:ignore-next-line — data value for <input type="color">, not a CSS style
const DEFAULT_CARD_COLOR = '#0052CC';

// ─── Main page ────────────────────────────────────────────────────────────────

interface BoardSettingsPageProps {
  /** Board object passed from the manager page (avoids double fetch) */
  board: BoardListItem;
  /** Project key for filter picker + back-link */
  projectKey: string;
}

export default function BoardSettingsPage({ board, projectKey }: BoardSettingsPageProps) {
  const { section = 'general' } = useParams<{ section?: Section }>();
  const navigate = useNavigate();
  const activeSection = (section as Section) || 'general';

  const backPath = `/project-hub/${projectKey}/boards`;

  // ── Form state (mirrors BoardSettingsDrawer) ──────────────────────────────
  const [name,              setName]              = useState(board.name);
  const [description,       setDescription]       = useState(board.description ?? '');
  const [color,             setColor]             = useState(board.color);
  const [visibility,        setVisibility]        = useState<BoardVisibility>(board.visibility);
  const [swimlane,          setSwimlane]          = useState<SwimlaneType>(board.swimlaneType);
  const [deleteConfirm,     setDeleteConfirm]     = useState('');
  const [showDelete,        setShowDelete]        = useState(false);
  const [newColName,        setNewColName]        = useState('');
  const [boardQuery,        setBoardQuery]        = useState(board.boardQuery ?? '');
  const [newFilterName,     setNewFilterName]     = useState('');
  const [newFilterJql,      setNewFilterJql]      = useState('');
  const [addingFilter,      setAddingFilter]      = useState(false);
  const [selectedFilterId,  setSelectedFilterId]  = useState<string>(board.filterId ?? '');
  const [cardLayout,        setCardLayout]        = useState<'default' | 'compact'>(board.cardLayout ?? 'default');
  const [cardColors,        setCardColors]        = useState<Array<{ id: string; label: string; jql: string; color: string }>>(board.cardColors ?? []);
  const [addingCardColor,   setAddingCardColor]   = useState(false);
  const [newCardColorLabel, setNewCardColorLabel] = useState('');
  const [newCardColorJql,   setNewCardColorJql]   = useState('');
  const [newCardColorHex,   setNewCardColorHex]   = useState(DEFAULT_CARD_COLOR);

  // ── Data ─────────────────────────────────────────────────────────────────
  const { data: boardData }           = useBoard(board.id);
  const { data: availableFilters = [] } = useFiltersForProject(projectKey, 'project');
  const updateBoard   = useUpdateBoard();
  const deleteBoard   = useDeleteBoard();
  const addColumn     = useAddColumn();
  const deleteCol     = useDeleteColumn();
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
        isSystem: f.is_system, sortOrder: f.sort_order, createdAt: f.created_at,
      }));
    },
  });

  const columns = boardData?.columns ?? [];

  const isDirty =
    name !== board.name ||
    description !== (board.description ?? '') ||
    color !== board.color ||
    visibility !== board.visibility ||
    swimlane !== board.swimlaneType ||
    boardQuery !== (board.boardQuery ?? '') ||
    selectedFilterId !== (board.filterId ?? '') ||
    cardLayout !== (board.cardLayout ?? 'default') ||
    JSON.stringify(cardColors) !== JSON.stringify(board.cardColors ?? []);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!isDirty) return;
    await updateBoard.mutateAsync({
      boardId: board.id,
      projectId: board.projectId ?? undefined,
      name:        name        !== board.name                        ? name        : undefined,
      description: description !== (board.description ?? '')        ? description : undefined,
      color:       color       !== board.color                      ? color       : undefined,
      visibility:  visibility  !== board.visibility                 ? visibility  : undefined,
      swimlane_type: swimlane  !== board.swimlaneType               ? swimlane    : undefined,
      board_query: boardQuery  !== (board.boardQuery ?? '')         ? boardQuery  : undefined,
      filter_id:   selectedFilterId !== (board.filterId ?? '')      ? (selectedFilterId || null) : undefined,
      card_layout: cardLayout  !== (board.cardLayout ?? 'default')  ? cardLayout  : undefined,
      card_colors: JSON.stringify(cardColors) !== JSON.stringify(board.cardColors ?? []) ? cardColors : undefined,
    });
  };

  const handleAddFilter = async () => {
    if (!newFilterName.trim() || !newFilterJql.trim()) return;
    await addQuickFilter.mutateAsync({ boardId: board.id, name: newFilterName.trim(), jql: newFilterJql.trim() });
    setNewFilterName(''); setNewFilterJql(''); setAddingFilter(false);
  };

  const handleDelete = async () => {
    if (deleteConfirm !== board.name) return;
    await deleteBoard.mutateAsync({ boardId: board.id, projectId: board.projectId ?? '' });
    navigate(backPath);
  };

  const handleAddColumn = async () => {
    if (!newColName.trim()) return;
    await addColumn.mutateAsync({ boardId: board.id, name: newColName.trim(), position: columns.length });
    setNewColName('');
  };

  const navTo = (s: Section) => navigate(`/project-hub/${projectKey}/boards/${board.id}/settings/${s}`);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', height: '100%', background: token('elevation.surface', '#FFFFFF') }}>

      {/* ── Left sidebar ── */}
      <div style={{
        width: 240, flexShrink: 0,
        borderRight: `1px solid ${token('color.border', '#DFE1E6')}`,
        padding: '16px 0',
        overflowY: 'auto',
      }}>
        {/* Sidebar header */}
        <div style={{
          padding: '0 16px 12px',
          borderBottom: `1px solid ${token('color.border', '#DFE1E6')}`,
          marginBottom: 8,
        }}>
          <h2 style={{
            margin: 0, fontSize: 16, fontWeight: 653,
            color: token('color.text', '#172B4D'),
            fontFamily: 'var(--ds-font-family-heading, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif)',
          }}>
            Board settings
          </h2>
        </div>

        {/* Nav items */}
        <nav aria-label="Board settings navigation">
          {NAV_ITEMS.map(item => {
            const active = activeSection === item.key;
            return (
              <button
                key={item.key}
                type="button"
                aria-current={active ? 'page' : undefined}
                onClick={() => navTo(item.key)}
                style={{
                  display: 'block', width: '100%',
                  padding: '8px 16px',
                  border: 'none', borderRadius: 3,
                  textAlign: 'left', cursor: 'pointer',
                  fontSize: 14, fontWeight: 400,
                  color: active ? token('color.link', '#0052CC') : token('color.text.subtle', '#42526E'),
                  background: active ? token('color.background.selected', '#E9F2FE') : 'transparent',
                  transition: 'background 80ms',
                }}
                onMouseEnter={e => {
                  if (!active) (e.currentTarget as HTMLButtonElement).style.background = token('color.background.neutral.subtle.hovered', '#F7F8F9');
                }}
                onMouseLeave={e => {
                  if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                }}
              >
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* ── Content area ── */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ maxWidth: 720, padding: '32px 40px' }}>

          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 8, fontSize: 14, color: token('color.text.subtle', '#42526E') }}>
            <Link to={backPath} style={{ color: token('color.text.subtle', '#42526E'), textDecoration: 'none' }}>
              Boards
            </Link>
            <span style={{ color: token('color.text.subtlest', '#6B778C') }}>/</span>
            <span style={{ color: token('color.text', '#172B4D') }}>{board.name}</span>
          </nav>

          {/* H1 row + Back to board */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
            <h1 style={{
              margin: 0, fontSize: 24, fontWeight: 653,
              color: token('color.text', '#172B4D'),
              fontFamily: 'var(--ds-font-family-heading, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif)',
            }}>
              Settings for {board.name}
            </h1>
            <Link
              to={backPath}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                fontSize: 14, color: token('color.text.subtle', '#42526E'),
                textDecoration: 'none', flexShrink: 0, marginTop: 4,
              }}
            >
              <ChevronLeft size={14} />
              Back to board
            </Link>
          </div>

          {/* ── Section content ── */}

          {activeSection === 'general' && (
            <GeneralSection
              name={name} setName={setName}
              description={description} setDescription={setDescription}
              color={color} setColor={setColor}
              visibility={visibility} setVisibility={setVisibility}
              showDelete={showDelete} setShowDelete={setShowDelete}
              deleteConfirm={deleteConfirm} setDeleteConfirm={setDeleteConfirm}
              boardName={board.name}
              onDelete={handleDelete}
              deleteBoard={deleteBoard}
            />
          )}

          {activeSection === 'filter' && (
            <FilterSection
              boardQuery={boardQuery} setBoardQuery={setBoardQuery}
              selectedFilterId={selectedFilterId} setSelectedFilterId={setSelectedFilterId}
              availableFilters={availableFilters}
              quickFilters={quickFilters}
              addingFilter={addingFilter} setAddingFilter={setAddingFilter}
              newFilterName={newFilterName} setNewFilterName={setNewFilterName}
              newFilterJql={newFilterJql} setNewFilterJql={setNewFilterJql}
              onAddFilter={handleAddFilter}
              onDeleteFilter={(filterId: string) => deleteQuickFilter.mutate({ filterId, boardId: board.id })}
              projectKey={projectKey}
            />
          )}

          {activeSection === 'columns' && (
            <ColumnsSection
              columns={columns}
              newColName={newColName} setNewColName={setNewColName}
              onAddColumn={handleAddColumn}
              onDeleteColumn={(columnId: string) => deleteCol.mutate({ columnId, boardId: board.id })}
              projectKey={projectKey}
              onNavigateMapStatuses={() => navigate(`/project-hub/${projectKey}/boards/map-statuses`)}
            />
          )}

          {activeSection === 'swimlanes' && (
            <SwimlanesSection
              swimlane={swimlane} setSwimlane={setSwimlane}
              cardLayout={cardLayout} setCardLayout={setCardLayout}
              cardColors={cardColors} setCardColors={setCardColors}
              addingCardColor={addingCardColor} setAddingCardColor={setAddingCardColor}
              newCardColorLabel={newCardColorLabel} setNewCardColorLabel={setNewCardColorLabel}
              newCardColorJql={newCardColorJql} setNewCardColorJql={setNewCardColorJql}
              newCardColorHex={newCardColorHex} setNewCardColorHex={setNewCardColorHex}
            />
          )}

          {activeSection === 'access' && (
            <AccessSection />
          )}

          {/* Save / Cancel footer */}
          {(activeSection !== 'columns' && activeSection !== 'access') && (
            <div style={{
              display: 'flex', gap: 8, marginTop: 32, paddingTop: 16,
              borderTop: `1px solid ${token('color.border', '#DFE1E6')}`,
            }}>
              <button
                type="button"
                onClick={handleSave}
                disabled={!isDirty || updateBoard.isPending}
                style={{
                  height: 32, padding: '0 16px', borderRadius: 3, border: 'none', cursor: isDirty ? 'pointer' : 'not-allowed',
                  background: isDirty ? token('color.background.brand.bold', '#0052CC') : token('color.background.neutral', '#F1F2F4'),
                  color: isDirty ? token('color.text.inverse', '#FFFFFF') : token('color.text.disabled', '#A5ADBA'),
                  fontSize: 14, fontWeight: 500,
                }}
              >
                {updateBoard.isPending ? 'Saving…' : 'Save'}
              </button>
              <button
                type="button"
                onClick={() => navigate(backPath)}
                style={{
                  height: 32, padding: '0 16px', borderRadius: 3,
                  border: `2px solid ${token('color.border', '#DFE1E6')}`,
                  background: 'transparent', cursor: 'pointer',
                  fontSize: 14, color: token('color.text', '#172B4D'),
                }}
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Section components ───────────────────────────────────────────────────────

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{
      margin: '0 0 16px', fontSize: 20, fontWeight: 653,
      color: token('color.text', '#172B4D'),
      fontFamily: 'var(--ds-font-family-heading, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif)',
    }}>
      {children}
    </h2>
  );
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 style={{
      margin: '24px 0 8px', fontSize: 16, fontWeight: 653,
      color: token('color.text', '#172B4D'),
    }}>
      {children}
    </h3>
  );
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label style={{
      display: 'block', fontSize: 12, fontWeight: 653,
      color: token('color.text.subtle', '#42526E'), marginBottom: 4,
    }}>
      {children}{required && <span style={{ color: token('color.text.danger', '#AE2A19') }}> *</span>}
    </label>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', height: 40, padding: '0 8px',
  boxSizing: 'border-box',
  border: `2px solid ${token('color.border', '#DFE1E6')}`,
  borderRadius: 3, fontSize: 14,
  color: token('color.text', '#172B4D'),
  background: token('elevation.surface.sunken', '#F7F8F9'),
  outline: 'none',
};

// ── General ──

function GeneralSection({ name, setName, description, setDescription, color, setColor, visibility, setVisibility, showDelete, setShowDelete, deleteConfirm, setDeleteConfirm, boardName, onDelete, deleteBoard }: any) {
  return (
    <>
      <SectionHeading>General settings</SectionHeading>
      <p style={{ margin: '0 0 24px', fontSize: 14, color: token('color.text.subtle', '#42526E') }}>
        Required fields are marked with an asterisk *
      </p>

      <SubHeading>Board identity</SubHeading>
      <div style={{ marginBottom: 16 }}>
        <FieldLabel required>Board name</FieldLabel>
        <input value={name} onChange={e => setName(e.target.value)} style={inputStyle} />
      </div>
      <div style={{ marginBottom: 24 }}>
        <FieldLabel>Description</FieldLabel>
        <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
          style={{ ...inputStyle, height: 'auto', padding: '8px', resize: 'vertical' }} />
      </div>

      <SubHeading>Board color</SubHeading>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
        {COLOR_SWATCHES.map(c => (
          <button key={c} type="button" onClick={() => setColor(c)} style={{
            width: 28, height: 28, borderRadius: 4, border: 'none',
            background: c, cursor: 'pointer',
            outline: color === c ? `2px solid ${token('color.link', '#0052CC')}` : 'none',
            outlineOffset: color === c ? 2 : 0,
          }} />
        ))}
      </div>

      <SubHeading>Visibility</SubHeading>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
        {VISIBILITY_OPTIONS.map(opt => (
          <button key={opt.value} type="button" onClick={() => setVisibility(opt.value)} style={{
            display: 'flex', alignItems: 'flex-start', gap: 12, padding: 12,
            borderRadius: 3, cursor: 'pointer', textAlign: 'left',
            border: `2px solid ${visibility === opt.value ? token('color.link', '#0052CC') : token('color.border', '#DFE1E6')}`,
            background: visibility === opt.value ? token('color.background.selected', '#E9F2FE') : token('elevation.surface', '#FFFFFF'),
          }}>
            <RadioCircle selected={visibility === opt.value} />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 14, fontWeight: 500, color: token('color.text', '#172B4D') }}>{opt.label}</span>
                {opt.warning && <AlertTriangle size={14} color={token('color.icon.warning', '#974F0C')} />}
              </div>
              <div style={{ fontSize: 12, color: token('color.text.subtle', '#42526E'), marginTop: 4 }}>{opt.desc}</div>
            </div>
          </button>
        ))}
      </div>

      <SubHeading>Danger zone</SubHeading>
      {!showDelete ? (
        <button type="button" onClick={() => setShowDelete(true)} style={{
          display: 'inline-flex', alignItems: 'center', gap: 8, height: 32, padding: '0 12px',
          background: token('color.background.danger', '#FFEDEB'),
          border: `2px solid ${token('color.border.danger', '#FF5630')}`,
          borderRadius: 3, cursor: 'pointer', fontSize: 14, fontWeight: 500,
          color: token('color.text.danger', '#AE2A19'),
        }}>
          <Trash2 size={14} /> Delete board
        </button>
      ) : (
        <div style={{ padding: 16, background: token('color.background.danger', '#FFEDEB'), borderRadius: 3, border: `2px solid ${token('color.border.danger', '#FF5630')}` }}>
          <p style={{ fontSize: 14, color: token('color.text.danger', '#AE2A19'), margin: '0 0 8px' }}>
            Type <strong>{boardName}</strong> to confirm deletion:
          </p>
          <input value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)}
            placeholder={boardName} style={{ ...inputStyle, marginBottom: 8 }} />
          <button type="button" onClick={onDelete}
            disabled={deleteConfirm !== boardName || deleteBoard.isPending}
            style={{
              height: 32, padding: '0 12px', borderRadius: 3, border: 'none',
              background: deleteConfirm === boardName ? token('color.background.danger.bold', '#AE2A19') : token('color.background.neutral', '#F1F2F4'),
              color: deleteConfirm === boardName ? token('color.text.inverse', '#FFFFFF') : token('color.text.disabled', '#A5ADBA'),
              fontSize: 14, fontWeight: 500, cursor: deleteConfirm === boardName ? 'pointer' : 'not-allowed',
            }}>
            {deleteBoard.isPending ? 'Deleting…' : 'Delete board'}
          </button>
        </div>
      )}
    </>
  );
}

// ── Filter ──

function FilterSection({ boardQuery, setBoardQuery, selectedFilterId, setSelectedFilterId, availableFilters, quickFilters, addingFilter, setAddingFilter, newFilterName, setNewFilterName, newFilterJql, setNewFilterJql, onAddFilter, onDeleteFilter, projectKey }: any) {
  return (
    <>
      <SectionHeading>Board filter</SectionHeading>
      <p style={{ margin: '0 0 24px', fontSize: 14, color: token('color.text.subtle', '#42526E'), lineHeight: '1.5' }}>
        The board filter determines the work items that appear on your board. It is based on JQL and can include issues from one or more projects.
      </p>

      <SubHeading>Linked filter</SubHeading>
      <p style={{ margin: '0 0 8px', fontSize: 14, color: token('color.text.subtle', '#42526E'), lineHeight: 1.5 }}>
        The board shows issues matching this saved filter. The filter owner is displayed as the board lead.
      </p>
      <select value={selectedFilterId} onChange={e => setSelectedFilterId(e.target.value)}
        style={{ ...inputStyle, height: 40, appearance: 'auto', marginBottom: 24 }}>
        <option value="">— None —</option>
        {availableFilters.map((f: any) => <option key={f.id} value={f.id}>{f.name}</option>)}
      </select>

      <SubHeading>Board query (JQL)</SubHeading>
      <p style={{ margin: '0 0 8px', fontSize: 14, color: token('color.text.subtle', '#42526E') }}>
        Issues matching this query will appear on the board.
      </p>
      <textarea value={boardQuery} onChange={e => setBoardQuery(e.target.value)} rows={3}
        style={{ ...inputStyle, height: 'auto', padding: 8, resize: 'vertical', fontFamily: 'ui-monospace, SFMono-Regular, monospace', fontSize: 12, background: token('elevation.surface.sunken', '#F7F8F9'), marginBottom: 8 }} />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 24 }}>
        {QUERY_PRESETS.map(p => (
          <button key={p.label} type="button" onClick={() => setBoardQuery(p.jql(projectKey))} style={{
            fontSize: 12, padding: '4px 8px', borderRadius: 12,
            border: `1px solid ${token('color.border', '#DFE1E6')}`,
            background: token('elevation.surface', '#FFFFFF'),
            color: token('color.link', '#0052CC'), cursor: 'pointer',
          }}>
            {p.label}
          </button>
        ))}
      </div>

      <SubHeading>Quick filters</SubHeading>
      <p style={{ margin: '0 0 8px', fontSize: 14, color: token('color.text.subtle', '#42526E') }}>
        Filter chips shown in the board toolbar.
      </p>
      {quickFilters.map((f: any) => (
        <div key={f.id} style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
          borderRadius: 3, marginBottom: 8,
          border: `1px solid ${token('color.border', '#DFE1E6')}`,
          background: token('elevation.surface', '#FFFFFF'),
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: token('color.text', '#172B4D') }}>
              {f.name}
              {f.isSystem && <span style={{ marginLeft: 8, fontSize: 11, color: token('color.text.subtlest', '#6B778C') }}>system</span>}
            </div>
            {f.filterType === 'jql' && (
              <div style={{ fontSize: 11, color: token('color.text.subtlest', '#6B778C'), fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {String((f.filterValue as any).jql ?? '')}
              </div>
            )}
          </div>
          {!f.isSystem && (
            <button type="button" onClick={() => onDeleteFilter(f.id)} style={{ width: 24, height: 24, borderRadius: 3, border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Trash2 size={14} color={token('color.icon.subtle', '#626F86')} />
            </button>
          )}
        </div>
      ))}
      {addingFilter ? (
        <div style={{ padding: 12, border: `1px solid ${token('color.border', '#DFE1E6')}`, borderRadius: 3, background: token('elevation.surface.sunken', '#F7F8F9'), marginTop: 8 }}>
          <FieldLabel>Filter label</FieldLabel>
          <input value={newFilterName} onChange={e => setNewFilterName(e.target.value)} placeholder="e.g. My Issues…"
            style={{ ...inputStyle, marginBottom: 8 }} />
          <FieldLabel>JQL clause</FieldLabel>
          <input value={newFilterJql} onChange={e => setNewFilterJql(e.target.value)} placeholder="assignee = currentUser()"
            onKeyDown={e => e.key === 'Enter' && onAddFilter()}
            style={{ ...inputStyle, fontFamily: 'monospace', fontSize: 12, marginBottom: 8 }} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={() => setAddingFilter(false)} style={{ height: 32, padding: '0 12px', borderRadius: 3, border: `2px solid ${token('color.border', '#DFE1E6')}`, background: 'transparent', fontSize: 14, cursor: 'pointer', color: token('color.text', '#172B4D') }}>Cancel</button>
            <button type="button" onClick={onAddFilter} disabled={!newFilterName.trim() || !newFilterJql.trim()} style={{
              height: 32, padding: '0 12px', borderRadius: 3, border: 'none', fontSize: 14, fontWeight: 500,
              background: newFilterName.trim() && newFilterJql.trim() ? token('color.background.brand.bold', '#0052CC') : token('color.background.neutral', '#F1F2F4'),
              color: newFilterName.trim() && newFilterJql.trim() ? token('color.text.inverse', '#FFFFFF') : token('color.text.disabled', '#A5ADBA'),
              cursor: newFilterName.trim() && newFilterJql.trim() ? 'pointer' : 'not-allowed',
            }}>Add filter</button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setAddingFilter(true)} style={{
          display: 'inline-flex', alignItems: 'center', gap: 4, height: 32, padding: '0 12px',
          border: `1px dashed ${token('color.border', '#DFE1E6')}`, borderRadius: 3,
          background: 'transparent', cursor: 'pointer',
          fontSize: 14, color: token('color.text.subtle', '#42526E'), marginTop: 8,
        }}>
          <Plus size={14} /> Add quick filter
        </button>
      )}
    </>
  );
}

// ── Columns ──

function ColumnsSection({ columns, newColName, setNewColName, onAddColumn, onDeleteColumn, projectKey, onNavigateMapStatuses }: any) {
  return (
    <>
      <SectionHeading>Columns</SectionHeading>
      <p style={{ margin: '0 0 16px', fontSize: 14, color: token('color.text.subtle', '#42526E') }}>
        Manage the columns that appear on this board. Drag to reorder.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
        {columns.map((col: any) => (
          <div key={col.id} style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
            border: `1px solid ${col.statusIds?.length === 0 ? token('color.border.warning', '#FFB900') : token('color.border', '#DFE1E6')}`,
            borderRadius: 3, background: token('elevation.surface', '#FFFFFF'),
            borderLeftWidth: col.statusIds?.length === 0 ? 4 : 1,
          }}>
            <GripVertical size={14} color={token('color.icon.subtle', '#626F86')} style={{ cursor: 'grab', flexShrink: 0 }} />
            <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: token('color.text', '#172B4D'), overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {col.name}
            </span>
            {col.isBacklog && <ColumnBadge bg={token('color.background.brand.subtlest', '#E9F2FE')} color={token('color.link', '#0052CC')}>Backlog</ColumnBadge>}
            {col.isDone   && <ColumnBadge bg={token('color.background.success', '#DCFFF1')} color={token('color.text.success', '#216E4E')}>Done</ColumnBadge>}
            <button type="button" onClick={() => onDeleteColumn(col.id)} style={{ width: 24, height: 24, borderRadius: 3, border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Trash2 size={14} color={token('color.icon.subtle', '#626F86')} />
            </button>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        <input value={newColName} onChange={e => setNewColName(e.target.value)}
          placeholder="New column name…"
          onKeyDown={e => e.key === 'Enter' && onAddColumn()}
          style={{ ...inputStyle, flex: 1 }} />
        <button type="button" onClick={onAddColumn} disabled={!newColName.trim()} style={{
          height: 40, padding: '0 16px', borderRadius: 3, border: 'none',
          background: newColName.trim() ? token('color.background.brand.bold', '#0052CC') : token('color.background.neutral', '#F1F2F4'),
          color: newColName.trim() ? token('color.text.inverse', '#FFFFFF') : token('color.text.disabled', '#A5ADBA'),
          fontSize: 14, fontWeight: 500, cursor: newColName.trim() ? 'pointer' : 'not-allowed',
        }}>
          Add
        </button>
      </div>
      {projectKey && (
        <div style={{ paddingTop: 16, borderTop: `1px solid ${token('color.border', '#DFE1E6')}` }}>
          <p style={{ margin: '0 0 8px', fontSize: 14, color: token('color.text.subtle', '#42526E'), lineHeight: 1.5 }}>
            Map workflow statuses to columns to control which issues appear in each column.
          </p>
          <button type="button" onClick={onNavigateMapStatuses} style={{
            display: 'inline-flex', alignItems: 'center', gap: 4, height: 32, padding: '0 12px',
            background: token('color.background.neutral', '#F1F2F4'), border: `2px solid transparent`,
            borderRadius: 3, cursor: 'pointer', fontSize: 14, fontWeight: 500,
            color: token('color.text', '#172B4D'),
          }}>
            Configure status mapping →
          </button>
        </div>
      )}
    </>
  );
}

// ── Swimlanes ──

function SwimlanesSection({ swimlane, setSwimlane, cardLayout, setCardLayout, cardColors, setCardColors, addingCardColor, setAddingCardColor, newCardColorLabel, setNewCardColorLabel, newCardColorJql, setNewCardColorJql, newCardColorHex, setNewCardColorHex }: any) {
  return (
    <>
      <SectionHeading>Swimlanes</SectionHeading>

      <SubHeading>Swimlane type</SubHeading>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
        {SWIMLANE_OPTIONS.map(opt => (
          <button key={opt.value} type="button" onClick={() => setSwimlane(opt.value)} style={{
            display: 'flex', alignItems: 'flex-start', gap: 12, padding: 12,
            borderRadius: 3, cursor: 'pointer', textAlign: 'left',
            border: `2px solid ${swimlane === opt.value ? token('color.link', '#0052CC') : token('color.border', '#DFE1E6')}`,
            background: swimlane === opt.value ? token('color.background.selected', '#E9F2FE') : token('elevation.surface', '#FFFFFF'),
          }}>
            <RadioCircle selected={swimlane === opt.value} />
            <div>
              <div style={{ fontSize: 14, fontWeight: 500, color: token('color.text', '#172B4D') }}>{opt.label}</div>
              <div style={{ fontSize: 12, color: token('color.text.subtle', '#42526E'), marginTop: 4 }}>{opt.desc}</div>
            </div>
          </button>
        ))}
      </div>

      <SubHeading>Card layout</SubHeading>
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {(['default', 'compact'] as const).map(layout => (
          <button key={layout} type="button" onClick={() => setCardLayout(layout)} style={{
            flex: 1, padding: 12, borderRadius: 3, cursor: 'pointer', textAlign: 'center',
            border: `2px solid ${cardLayout === layout ? token('color.link', '#0052CC') : token('color.border', '#DFE1E6')}`,
            background: cardLayout === layout ? token('color.background.selected', '#E9F2FE') : token('elevation.surface', '#FFFFFF'),
            fontSize: 14, fontWeight: 500, color: token('color.text', '#172B4D'),
          }}>
            {layout === 'default' ? 'Default' : 'Compact'}
          </button>
        ))}
      </div>
      <p style={{ margin: '-16px 0 24px', fontSize: 12, color: token('color.text.subtle', '#42526E') }}>
        {cardLayout === 'compact' ? 'Show only the issue key and summary.' : 'Show assignee, priority, and labels on each card.'}
      </p>

      <SubHeading>Card colors</SubHeading>
      <p style={{ margin: '0 0 8px', fontSize: 14, color: token('color.text.subtle', '#42526E') }}>
        Highlight cards matching a JQL clause with a left-border color.
      </p>
      {cardColors.map((rule: any) => (
        <div key={rule.id} style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
          border: `1px solid ${token('color.border', '#DFE1E6')}`, borderRadius: 3, marginBottom: 8,
          borderLeft: `4px solid ${rule.color}`,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: token('color.text', '#172B4D'), overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{rule.label}</div>
            <div style={{ fontSize: 11, color: token('color.text.subtle', '#42526E'), fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{rule.jql}</div>
          </div>
          <button type="button" onClick={() => setCardColors((prev: any[]) => prev.filter(r => r.id !== rule.id))} style={{ width: 24, height: 24, border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Trash2 size={14} color={token('color.icon.subtle', '#626F86')} />
          </button>
        </div>
      ))}
      {addingCardColor ? (
        <div style={{ padding: 12, border: `1px solid ${token('color.border', '#DFE1E6')}`, borderRadius: 3, marginBottom: 8 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <input value={newCardColorLabel} onChange={e => setNewCardColorLabel(e.target.value)}
              placeholder="Label (e.g. Blocked)" style={{ ...inputStyle, flex: 1 }} />
            <input type="color" value={newCardColorHex} onChange={e => setNewCardColorHex(e.target.value)}
              style={{ width: 40, height: 40, padding: 0, border: `2px solid ${token('color.border', '#DFE1E6')}`, borderRadius: 3, cursor: 'pointer' }} />
          </div>
          <input value={newCardColorJql} onChange={e => setNewCardColorJql(e.target.value)}
            placeholder="JQL: priority = Critical"
            style={{ ...inputStyle, fontFamily: 'monospace', fontSize: 12, marginBottom: 8 }} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={() => { setAddingCardColor(false); setNewCardColorLabel(''); setNewCardColorJql(''); setNewCardColorHex(DEFAULT_CARD_COLOR); }} style={{ height: 32, padding: '0 12px', border: `2px solid ${token('color.border', '#DFE1E6')}`, borderRadius: 3, background: 'transparent', cursor: 'pointer', fontSize: 14, color: token('color.text', '#172B4D') }}>Cancel</button>
            <button type="button" disabled={!newCardColorLabel.trim() || !newCardColorJql.trim()} onClick={() => {
              if (!newCardColorLabel.trim() || !newCardColorJql.trim()) return;
              setCardColors((prev: any[]) => [...prev, { id: crypto.randomUUID(), label: newCardColorLabel.trim(), jql: newCardColorJql.trim(), color: newCardColorHex }]);
              setAddingCardColor(false); setNewCardColorLabel(''); setNewCardColorJql(''); setNewCardColorHex(DEFAULT_CARD_COLOR);
            }} style={{
              height: 32, padding: '0 12px', border: 'none', borderRadius: 3, cursor: 'pointer', fontSize: 14, fontWeight: 500,
              background: token('color.background.brand.bold', '#0052CC'), color: token('color.text.inverse', '#FFFFFF'),
            }}>Add</button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setAddingCardColor(true)} style={{
          display: 'inline-flex', alignItems: 'center', gap: 4, height: 32, padding: '0 12px',
          border: `1px dashed ${token('color.border', '#DFE1E6')}`, borderRadius: 3,
          background: 'transparent', cursor: 'pointer', fontSize: 14, color: token('color.text.subtle', '#42526E'),
        }}>
          <Plus size={14} /> Add color rule
        </button>
      )}
    </>
  );
}

// ── Access ──

function AccessSection() {
  return (
    <>
      <SectionHeading>Access</SectionHeading>
      <p style={{ margin: '0 0 16px', fontSize: 14, color: token('color.text.subtle', '#42526E') }}>
        Manage who has access to this board and their roles.
      </p>
      <button type="button" style={{
        display: 'inline-flex', alignItems: 'center', gap: 4, height: 32, padding: '0 12px',
        background: token('color.background.brand.bold', '#0052CC'), border: 'none',
        borderRadius: 3, cursor: 'pointer', fontSize: 14, fontWeight: 500,
        color: token('color.text.inverse', '#FFFFFF'),
      }}>
        <Plus size={14} /> Add member
      </button>
    </>
  );
}

// ── Shared primitives ──

function RadioCircle({ selected }: { selected: boolean }) {
  return (
    <div style={{
      width: 16, height: 16, borderRadius: '50%', flexShrink: 0, marginTop: 4,
      border: `2px solid ${selected ? token('color.link', '#0052CC') : token('color.border', '#DFE1E6')}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: selected ? token('color.background.brand.bold', '#0052CC') : 'transparent',
    }}>
      {selected && <div style={{ width: 6, height: 6, borderRadius: '50%', background: token('color.text.inverse', '#FFFFFF') }} />}
    </div>
  );
}

function ColumnBadge({ children, bg, color }: { children: React.ReactNode; bg: string; color: string }) {
  return (
    <span style={{
      display: 'inline-flex', height: 16, padding: '0 4px', borderRadius: 2,
      fontSize: 11, fontWeight: 700, background: bg, color, alignItems: 'center', flexShrink: 0,
    }}>{children}</span>
  );
}
