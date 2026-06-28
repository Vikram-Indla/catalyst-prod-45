/**
 * CatalystMdtRefField — Inline-editable MDT Ref text field.
 *
 * jira-compare Round 4 (2026-04-28): canonical universal field shown in
 * every CatalystView*'s Details rail. Mirrors Jira's "MDT Ref" custom
 * field. Reads/writes ph_issues.mdt_ref (TEXT, nullable). Renders an
 * "Add text" affordance when null, matching Jira's empty-state.
 *
 * Click to edit; Enter or blur saves; Esc cancels.
 */
import React, { useState, useRef, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { catalystToast } from '@/lib/catalystToast';
import type { PhIssue } from '../types';

interface Props {
  issue: PhIssue | null;
  onUpdate?: () => void;
}

export function CatalystMdtRefField({ issue, onUpdate }: Props) {
  const current = ((issue as any)?.mdt_ref ?? null) as string | null;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(current ?? '');
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Keep draft synced when the issue changes (navigation between rows).
  useEffect(() => { setDraft(current ?? ''); }, [current]);

  const updateMutation = useMutation({
    mutationFn: async (value: string | null) => {
      if (!issue?.issue_key) throw new Error('No issue key');
      const { error } = await supabase
        .from('ph_issues')
        .update({ mdt_ref: value } as any)
        .eq('issue_key', issue.issue_key);
      if (error) throw error;
    },
    onSuccess: () => {
      catalystToast.success('MDT Ref updated');
      onUpdate?.();
    },
    onError: (e: any) => {
      // If the column doesn't exist yet (migration not applied), surface
      // a friendly message instead of a 400 toast spam.
      const msg = e?.message ?? '';
      if (msg.includes("mdt_ref") || msg.includes("column")) {
        catalystToast.info(
          'MDT Ref column not yet in database. Run the migration ' +
          'outputs/20260428140000_mdt_ref_field.sql in Supabase Studio.',
        );
      } else {
        catalystToast.error(`Failed to save MDT Ref: ${msg}`);
      }
    },
  });

  const commit = () => {
    const next = draft.trim();
    setEditing(false);
    if ((next || null) !== (current || null)) {
      updateMutation.mutate(next || null);
    }
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="text"
        autoFocus
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => {
          if (e.key === 'Enter') { e.preventDefault(); commit(); }
          if (e.key === 'Escape') { setDraft(current ?? ''); setEditing(false); }
        }}
        placeholder="Add text"
        style={{
          fontSize: 'var(--ds-font-size-400)', color: 'var(--ds-text)', fontFamily: 'inherit',
          border: '1px solid var(--ds-border-focused)', borderRadius: 3,
          padding: '4px 6px', width: '100%', outline: 'none',
          background: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated)))',
        }}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      style={{
        background: 'transparent', border: 'none', padding: '4px 6px',
        margin: 0, font: 'inherit', cursor: 'pointer', textAlign: 'left',
        width: '100%', borderRadius: 3, transition: 'background 0.15s',
        color: current ? 'var(--ds-text)' : 'var(--ds-text-disabled)',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--ds-surface-sunken, var(--cp-bg-sunken))')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
      aria-label={current ? `MDT Ref: ${current}. Click to edit.` : 'Add MDT Ref'}
    >
      {current || 'Add text'}
    </button>
  );
}

export default CatalystMdtRefField;
