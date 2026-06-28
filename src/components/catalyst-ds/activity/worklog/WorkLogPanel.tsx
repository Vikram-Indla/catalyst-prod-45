import * as React from 'react';
import { useState } from 'react';
import { Avatar } from '@/components/ads';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useWorkLogs, type WorkLogRow } from './useWorkLogs';
import { parseJiraTime, formatJiraTime } from './parseJiraTime';
import { HistoryPill } from '../JiraActivityRow';
import { CommentEditor } from '../../comments/CommentEditor';
import { renderContent } from '../../comments/Comment';
import { Edit2, Trash2 } from '@/lib/atlaskit-icons';
import Tooltip from '@atlaskit/tooltip';
import { useChatPeople } from '@/hooks/chat/useChatPeople';
import type { MentionRosterEntry } from '@/lib/mentions/parseMentions';

function formatAbsoluteDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

interface LogFormState {
  timeInput: string;
  workDate: string;
  timeError: string | null;
}

const todayIso = () => new Date().toISOString().slice(0, 10);

function LogWorkForm({
  initial,
  onSubmit,
  onCancel,
}: {
  initial?: { time_spent_minutes: number; work_date: string; description: string | null };
  onSubmit: (input: { time_spent_minutes: number; work_date: string; description: string | null }) => Promise<void>;
  onCancel: () => void;
}) {
  const [state, setState] = useState<LogFormState>({
    timeInput: initial ? formatJiraTime(initial.time_spent_minutes) : '',
    workDate: initial?.work_date ?? todayIso(),
    timeError: null,
  });

  // The editor owns the description value + the Save/Cancel buttons.
  // Its onSubmit fires when the user clicks the editor's Save — at
  // that point we validate time + date and commit the whole work log
  // in one shot. onCancel dismisses the form.
  const handleEditorSubmit = async (description: string) => {
    const minutes = parseJiraTime(state.timeInput);
    if (minutes === null) {
      setState((s) => ({ ...s, timeError: 'Use Jira format — e.g. 2h 30m, 1d, 45m' }));
      // Throw so the editor doesn't auto-clear / collapse on error.
      throw new Error('Invalid time format');
    }
    await onSubmit({
      time_spent_minutes: minutes,
      work_date: state.workDate,
      description: description.trim() || null,
    });
  };

  return (
    <div
      style={{
        border: '1px solid var(--ds-border)',
        borderRadius: 4,
        padding: 12,
        background: 'var(--ds-surface)',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        marginBottom: 12,
      }}
    >
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 200px', minWidth: 200 }}>
          <label style={labelStyle}>Time spent</label>
          <input
            type="text"
            value={state.timeInput}
            placeholder="2h 30m"
            onChange={(e) => setState((s) => ({ ...s, timeInput: e.target.value, timeError: null }))}
            style={inputStyle}
          />
          {state.timeError ? (
            <div style={{ color: 'var(--ds-text-danger)', fontSize: 'var(--ds-font-size-200)', marginTop: 4 }}>{state.timeError}</div>
          ) : (
            <div style={hintStyle}>Use w, d, h, m — e.g. <code>1d 4h</code></div>
          )}
        </div>
        <div style={{ flex: '1 1 150px', minWidth: 150 }}>
          <label style={labelStyle}>Date worked</label>
          <input
            type="date"
            value={state.workDate}
            onChange={(e) => setState((s) => ({ ...s, workDate: e.target.value }))}
            style={inputStyle}
          />
        </div>
      </div>
      <div>
        <label style={labelStyle}>Work description</label>
        <CommentEditor
          defaultValue={initial?.description ?? ''}
          placeholder="What was done?"
          autoFocus
          onSubmit={handleEditorSubmit}
          onCancel={onCancel}
        />
      </div>
    </div>
  );
}

function WorkLogEntry({
  entry,
  canEdit,
  canDelete,
  onSaveEdit,
  onDelete,
  showPill = false,
}: {
  entry: WorkLogRow;
  canEdit: boolean;
  canDelete: boolean;
  onSaveEdit: (input: { id: string; time_spent_minutes: number; work_date: string; description: string | null }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  showPill?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const authorName = entry.author?.full_name || entry.author?.email || 'Unknown';
  const { user } = useAuth();
  const currentUserId = user?.id ?? null;
  const { groups: peopleGroups } = useChatPeople();
  const roster = React.useMemo<MentionRosterEntry[]>(
    () =>
      peopleGroups.flatMap((g) =>
        g.people.map((p) => ({ name: p.name, userId: p.profileId })),
      ),
    [peopleGroups],
  );

  if (editing) {
    return (
      <LogWorkForm
        initial={{
          time_spent_minutes: entry.time_spent_minutes,
          work_date: entry.work_date,
          description: entry.description,
        }}
        submitLabel="Update"
        onSubmit={async (input) => {
          await onSaveEdit({ id: entry.id, ...input });
          setEditing(false);
        }}
        onCancel={() => setEditing(false)}
      />
    );
  }

  return (
    <div style={{ display: 'flex', gap: 12, padding: '12px 0' }}>
      <span style={{ flexShrink: 0 }}>
        <Avatar src={entry.author?.avatar_url ?? undefined} name={authorName} size="small" />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 'var(--ds-font-size-300)', color: 'var(--ds-text)' }}>
          <strong style={{ fontWeight: 600 }}>{authorName}</strong>{' '}
          <span style={{ color: 'var(--ds-text-subtle)' }}>
            logged{' '}
            <strong style={{ fontWeight: 600 }}>{formatJiraTime(entry.time_spent_minutes)}</strong>
          </span>
        </div>
        <div style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-subtle)', marginTop: 2 }}>
          {formatAbsoluteDate(entry.work_date)}
        </div>
        {showPill && (
          <div style={{ marginTop: 6 }}>
            <HistoryPill label="WORKLOG" />
          </div>
        )}
        {entry.description && (
          <div style={{ marginTop: 8, fontSize: 'var(--ds-font-size-300)', color: 'var(--ds-text)' }}>
            {renderContent(entry.description, { roster, currentUserId })}
          </div>
        )}
        {(canEdit || canDelete) && (
          <div style={{ marginTop: 6, display: 'flex', gap: 4 }}>
            {canEdit && (
              <Tooltip content="Edit work log">
                <button
                  type="button"
                  aria-label="Edit work log"
                  style={iconBtn}
                  onClick={() => setEditing(true)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--ds-background-neutral-subtle-hovered)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <Edit2 className="h-4 w-4" />
                </button>
              </Tooltip>
            )}
            {canDelete && (
              <Tooltip content="Delete work log">
                <button
                  type="button"
                  aria-label="Delete work log"
                  style={iconBtn}
                  onClick={() => {
                    if (window.confirm('Delete this work log?')) void onDelete(entry.id);
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--ds-background-neutral-subtle-hovered)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </Tooltip>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export interface WorkLogPanelProps {
  workItemId: string | null | undefined;
}

export function WorkLogPanel({ workItemId }: WorkLogPanelProps) {
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  const { entries, isLoading, createEntry, updateEntry, deleteEntry } = useWorkLogs(workItemId);
  const [showForm, setShowForm] = useState(false);

  const totalMinutes = entries.reduce((sum, e) => sum + (e.time_spent_minutes ?? 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 12,
        }}
      >
        <div style={{ fontSize: 'var(--ds-font-size-300)', color: 'var(--ds-text-subtle)' }}>
          {entries.length > 0 ? (
            <>
              Total logged: <strong>{formatJiraTime(totalMinutes)}</strong> across {entries.length} entr
              {entries.length === 1 ? 'y' : 'ies'}
            </>
          ) : (
            'No work logged yet'
          )}
        </div>
        {!showForm && (
          <button type="button" onClick={() => setShowForm(true)} style={btnPrimary}>
            Log work
          </button>
        )}
      </div>

      {showForm && (
        <LogWorkForm
          onSubmit={async (input) => {
            await createEntry.mutateAsync(input);
            setShowForm(false);
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {isLoading ? (
        <div style={{ padding: '12px 0', fontSize: 'var(--ds-font-size-300)', color: 'var(--ds-text-subtle)' }}>
          Loading work logs…
        </div>
      ) : (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            divideY: '1px solid var(--ds-border)',
          } as React.CSSProperties}
        >
          {entries.map((entry) => {
            const isAuthor = user?.id === entry.author_id;
            return (
              <div key={entry.id} style={{ borderTop: '1px solid var(--ds-border)' }}>
                <WorkLogEntry
                  entry={entry}
                  canEdit={isAuthor || isAdmin}
                  canDelete={isAuthor || isAdmin}
                  onSaveEdit={(input) => updateEntry.mutateAsync(input)}
                  onDelete={(id) => deleteEntry.mutateAsync(id)}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Inline styles ───────────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 'var(--ds-font-size-200)',
  fontWeight: 600,
  color: 'var(--ds-text-subtle)',
  marginBottom: 4,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '6px 8px',
  border: '1px solid var(--ds-border)',
  borderRadius: 3,
  fontSize: 'var(--ds-font-size-300)',
  color: 'var(--ds-text)',
  background: 'var(--ds-surface)',
  outline: 'none',
};

const hintStyle: React.CSSProperties = {
  fontSize: 'var(--ds-font-size-100)',
  color: 'var(--ds-text-subtle)',
  marginTop: 4,
};

const btnPrimary: React.CSSProperties = {
  padding: '6px 12px',
  fontSize: 'var(--ds-font-size-300)',
  fontWeight: 500,
  background: 'var(--ds-link)',
  color: 'var(--ds-text-inverse)',
  border: 'none',
  borderRadius: 3,
  cursor: 'pointer',
};

const btnSubtle: React.CSSProperties = {
  padding: '6px 12px',
  fontSize: 'var(--ds-font-size-300)',
  fontWeight: 500,
  background: 'transparent',
  color: 'var(--ds-text-subtle)',
  border: '1px solid transparent',
  borderRadius: 3,
  cursor: 'pointer',
};

const linkBtn: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  padding: 0,
  fontSize: 'var(--ds-font-size-200)',
  fontWeight: 500,
  color: 'var(--ds-link)',
  cursor: 'pointer',
};

const iconBtn: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 28,
  height: 28,
  border: 'none',
  background: 'transparent',
  borderRadius: 3,
  cursor: 'pointer',
  color: 'var(--ds-text-subtle)',
  transition: 'background-color 120ms ease',
  padding: 0,
};

// Re-exported for the All-tab merge so we can render the same row
// component with the WORKLOG pill alongside comments + history.
export { WorkLogEntry };
