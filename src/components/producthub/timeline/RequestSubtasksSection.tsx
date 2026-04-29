/**
 * RequestSubtasksSection — Catalyst-canonical sub-tasks list for an
 * request. Reads/writes `ph_request_subtasks` (cycle-5 schema).
 *
 * UX shape mirrors Jira's Subtasks panel:
 *   - Header row: "Subtasks" label + done/total counter.
 *   - List of rows: checkbox | title | hover-reveal delete.
 *   - Inline create at the bottom: text input + Enter to commit.
 *
 * Atlaskit-only primitives (Checkbox / Textfield / Button via shadcn-free
 * lucide icons). No DnD reorder yet — sort is created_at ASC.
 */
import React, { useState, useCallback, useMemo } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { typedQuery, supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SubtaskRow {
  id: string;
  request_id: string;
  title: string;
  is_done: boolean;
  assignee_id: string | null;
  created_at: string;
  updated_at: string;
  sort_order: number;
}

interface Props {
  requestId: string;
}

const QK = (id: string) => ['ph-request-subtasks', id] as const;

export function RequestSubtasksSection({ requestId }: Props) {
  const qc = useQueryClient();
  const [draftTitle, setDraftTitle] = useState('');

  // ── Read ──
  const { data, isLoading } = useQuery({
    queryKey: QK(requestId),
    queryFn: async () => {
      const { data, error } = await typedQuery('ph_request_subtasks')
        .select('id, request_id, title, is_done, assignee_id, created_at, updated_at, sort_order')
        .eq('request_id', requestId)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as SubtaskRow[];
    },
    staleTime: 30_000,
  });

  const rows = useMemo(() => data ?? [], [data]);
  const doneCount = rows.filter(r => r.is_done).length;

  // ── Insert ──
  const insertMutation = useMutation({
    mutationFn: async (title: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id ?? null;
      const nextOrder = (rows[rows.length - 1]?.sort_order ?? 0) + 10;
      const { error } = await typedQuery('ph_request_subtasks').insert({
        request_id: requestId,
        title: title.trim(),
        is_done: false,
        sort_order: nextOrder,
        created_by: userId,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QK(requestId) }),
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Could not add subtask'),
  });

  // ── Toggle done ──
  const toggleMutation = useMutation({
    mutationFn: async ({ id, next }: { id: string; next: boolean }) => {
      const { error } = await typedQuery('ph_request_subtasks')
        .update({ is_done: next, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QK(requestId) }),
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Could not update subtask'),
  });

  // ── Delete ──
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await typedQuery('ph_request_subtasks')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QK(requestId) }),
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Could not delete subtask'),
  });

  const handleSubmitDraft = useCallback(() => {
    const t = draftTitle.trim();
    if (!t) return;
    insertMutation.mutate(t, {
      onSuccess: () => setDraftTitle(''),
    });
  }, [draftTitle, insertMutation]);

  return (
    <section
      data-testid="request-subtasks-section"
      style={{
        display: 'flex', flexDirection: 'column', gap: 8,
        padding: '12px 0',
        borderTop: '1px solid var(--cp-bd, #E5E7EB)',
        marginTop: 12,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <h3 style={{
          fontSize: 12, fontWeight: 700, letterSpacing: '0.04em',
          textTransform: 'uppercase',
          color: 'var(--cp-text-secondary, #6B6E76)',
          margin: 0,
        }}>Subtasks</h3>
        <span style={{
          fontSize: 12, fontWeight: 500,
          color: 'var(--cp-text-secondary, #6B6E76)',
        }}>
          {doneCount}/{rows.length}
        </span>
      </div>

      {/* Rows */}
      {isLoading && (
        <div style={{ fontSize: 12, color: 'var(--cp-text-secondary, #6B6E76)' }}>
          Loading…
        </div>
      )}
      {!isLoading && rows.length === 0 && (
        <div style={{
          fontSize: 12, color: 'var(--cp-text-secondary, #6B6E76)',
          fontStyle: 'italic', padding: '4px 0',
        }}>
          No subtasks yet.
        </div>
      )}
      {rows.map((r) => (
        <div
          key={r.id}
          className="request-subtask-row"
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '6px 8px',
            borderRadius: 4,
            background: 'transparent',
            transition: 'background 120ms',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLDivElement).style.background = 'var(--cp-bg-inset, #F7F8F9)';
            const del = e.currentTarget.querySelector<HTMLButtonElement>('[data-role="subtask-delete"]');
            if (del) del.style.opacity = '1';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLDivElement).style.background = 'transparent';
            const del = e.currentTarget.querySelector<HTMLButtonElement>('[data-role="subtask-delete"]');
            if (del) del.style.opacity = '0';
          }}
        >
          <input
            type="checkbox"
            checked={r.is_done}
            disabled={toggleMutation.isPending}
            onChange={() => toggleMutation.mutate({ id: r.id, next: !r.is_done })}
            aria-label={r.is_done ? 'Mark as not done' : 'Mark as done'}
            style={{ cursor: 'pointer', width: 14, height: 14, accentColor: '#0C66E4' }}
          />
          <span style={{
            flex: 1,
            fontSize: 13,
            color: r.is_done ? 'var(--cp-text-secondary, #6B6E76)' : 'var(--cp-text-primary, #292A2E)',
            textDecoration: r.is_done ? 'line-through' : 'none',
            wordBreak: 'break-word',
          }}>
            {r.title}
          </span>
          <button
            data-role="subtask-delete"
            onClick={() => deleteMutation.mutate(r.id)}
            disabled={deleteMutation.isPending}
            aria-label="Delete subtask"
            title="Delete"
            style={{
              opacity: 0, transition: 'opacity 120ms',
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: 'var(--cp-text-secondary, #6B6E76)',
              padding: 4, borderRadius: 3, display: 'inline-flex',
            }}
          >
            <Trash2 size={14} />
          </button>
        </div>
      ))}

      {/* Inline create */}
      <form
        onSubmit={(e) => { e.preventDefault(); handleSubmitDraft(); }}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          marginTop: 6,
        }}
      >
        <Plus size={14} style={{ color: 'var(--cp-text-secondary, #6B6E76)', flexShrink: 0 }} />
        <input
          type="text"
          value={draftTitle}
          onChange={(e) => setDraftTitle(e.target.value)}
          placeholder="Add a subtask"
          aria-label="Add a subtask"
          style={{
            flex: 1, height: 28, padding: '0 8px',
            border: '1px solid var(--cp-bd, #E5E7EB)',
            borderRadius: 4,
            fontSize: 13,
            background: 'var(--cp-bg, #FFFFFF)',
            color: 'var(--cp-text-primary, #292A2E)',
            outline: 'none',
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = '#0C66E4'; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--cp-bd, #E5E7EB)'; }}
        />
        <button
          type="submit"
          disabled={!draftTitle.trim() || insertMutation.isPending}
          style={{
            height: 28, padding: '0 12px',
            border: 'none', borderRadius: 4,
            background: !draftTitle.trim() ? 'var(--cp-bg-inset, #F7F8F9)' : '#0C66E4',
            color: !draftTitle.trim() ? 'var(--cp-text-secondary, #6B6E76)' : '#FFFFFF',
            fontSize: 12, fontWeight: 600,
            cursor: !draftTitle.trim() ? 'not-allowed' : 'pointer',
            transition: 'background 120ms',
          }}
        >
          Add
        </button>
      </form>
    </section>
  );
}

export default RequestSubtasksSection;
