/**
 * MentionPicker — inline @-trigger popover for composer. Watches an
 * input/textarea's current value + caret; when the user types `@`,
 * shows a list of matching profiles. Selecting one inserts
 * `@Full Name ` at the caret. The trigger T3 backend trigger
 * (chat_fanout_mentions) resolves @Name tokens to recipient profiles
 * and inserts notifications rows.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useChatPeople } from '@/hooks/chat/useChatPeople';
import { Avatar } from './avatar';

export interface MentionPickerProps {
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  value: string;
  onChange: (next: string) => void;
}

interface MentionState {
  open: boolean;
  query: string;
  triggerIndex: number;
}

const INITIAL: MentionState = { open: false, query: '', triggerIndex: -1 };

export function MentionPicker({ textareaRef, value, onChange }: MentionPickerProps) {
  const [state, setState] = useState<MentionState>(INITIAL);
  const { groups } = useChatPeople();

  // Recompute open-state whenever the value or caret changes.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    const onSelChange = () => {
      const caret = el.selectionStart ?? value.length;
      const upto = value.slice(0, caret);
      const lastAt = upto.lastIndexOf('@');
      if (lastAt < 0) {
        setState(INITIAL);
        return;
      }
      const sliceAfter = upto.slice(lastAt + 1);
      // Open only if the @-token has no whitespace yet and is reasonably short.
      if (/\s/.test(sliceAfter) || sliceAfter.length > 32) {
        setState(INITIAL);
        return;
      }
      // Trigger char must be at start or follow whitespace.
      if (lastAt > 0 && !/\s/.test(upto[lastAt - 1])) {
        setState(INITIAL);
        return;
      }
      setState({ open: true, query: sliceAfter, triggerIndex: lastAt });
    };
    el.addEventListener('input', onSelChange);
    el.addEventListener('keyup', onSelChange);
    el.addEventListener('click', onSelChange);
    return () => {
      el.removeEventListener('input', onSelChange);
      el.removeEventListener('keyup', onSelChange);
      el.removeEventListener('click', onSelChange);
    };
  }, [textareaRef, value]);

  const candidates = useMemo(() => {
    if (!state.open) return [];
    const all = groups.flatMap((g) => g.people);
    const q = state.query.trim().toLowerCase();
    const filtered = q
      ? all.filter((p) => p.name.toLowerCase().includes(q))
      : all;
    return filtered.slice(0, 6);
  }, [state, groups]);

  if (!state.open || candidates.length === 0) return null;

  const insertMention = (name: string) => {
    const before = value.slice(0, state.triggerIndex);
    const caret = textareaRef.current?.selectionStart ?? value.length;
    const after = value.slice(caret);
    const next = `${before}@${name} ${after}`;
    onChange(next);
    setState(INITIAL);
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (el) {
        const pos = before.length + name.length + 2; // +@ +space
        el.setSelectionRange(pos, pos);
        el.focus();
      }
    });
  };

  return (
    <div
      role="listbox"
      aria-label="Mention picker"
      style={{
        position: 'absolute',
        bottom: '100%',
        left: 8,
        marginBottom: 6,
        background: 'var(--ds-surface-overlay, #FFFFFF)',
        border: '1px solid var(--ds-border, #DFE1E6)',
        borderRadius: 6,
        boxShadow: '0 4px 8px rgba(9,30,66,0.15)',
        width: 260,
        maxHeight: 240,
        overflowY: 'auto',
        zIndex: 50,
      }}
    >
      {candidates.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => insertMention(p.name)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            width: '100%',
            padding: '6px 10px',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            textAlign: 'left',
            fontSize: 13,
          }}
        >
          <Avatar name={p.name} seed={p.id} />
          <span style={{ color: 'var(--ds-text, #172B4D)' }}>{p.name}</span>
        </button>
      ))}
    </div>
  );
}

export default MentionPicker;
