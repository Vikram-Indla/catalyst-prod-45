/**
 * AddPeopleModal — multi-select people picker for adding members to a channel.
 * Slack parity: chip-style multi-select, type-ahead search, Add button.
 * On submit: inserts each profile into chat_conversation_members via
 * chat_add_member RPC, then emits one system message announcing the joiners.
 */
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { useChatAddMember } from '@/hooks/chat/useChatActions';
import { resolveAvatarUrl } from '@/lib/avatars';
import { useWorkspacePeopleSearch, type PeopleHit } from '../../hooks/useWorkspacePeopleSearch';
import { XIcon } from '../shared/Icon';

interface AddPeopleModalProps {
  conversationId: string;
  channelTitle: string;
  workspaceName: string;
  existingMemberIds: Set<string>;
  onClose: () => void;
  onAdded: () => void;
}

const db = supabase as unknown as { from: (t: string) => any };

export function AddPeopleModal({
  conversationId,
  channelTitle,
  workspaceName,
  existingMemberIds,
  onClose,
  onAdded,
}: AddPeopleModalProps) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const addMember = useChatAddMember();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<PeopleHit[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { hits } = useWorkspacePeopleSearch(query);

  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose(); }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [onClose]);

  const selectedIds = new Set(selected.map(s => s.id));
  const filteredHits = hits.filter(h => !selectedIds.has(h.id) && !existingMemberIds.has(h.id));

  const pick = (hit: PeopleHit) => {
    setSelected(prev => [...prev, hit]);
    setQuery('');
    inputRef.current?.focus();
  };

  const remove = (id: string) => {
    setSelected(prev => prev.filter(s => s.id !== id));
  };

  const onKeyDownInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && query === '' && selected.length > 0) {
      remove(selected[selected.length - 1].id);
    }
  };

  const handleAdd = async () => {
    if (selected.length === 0 || submitting) return;
    setSubmitting(true);
    try {
      for (const p of selected) {
        await addMember.mutateAsync({ convId: conversationId, userId: p.id });
      }
      // Emit system join message matching Slack phrasing.
      const names = selected.map(s => s.name);
      let body = `joined ${channelTitle}.`;
      if (names.length === 1) body += ` Also, ${names[0]} joined via invite.`;
      else if (names.length === 2) body += ` Also, ${names[0]} and ${names[1]} joined via invite.`;
      else if (names.length > 2) {
        const last = names[names.length - 1];
        body += ` Also, ${names.slice(0, -1).join(', ')}, and ${last} joined via invite.`;
      }
      const { error: msgErr } = await db.from('chat_messages').insert({
        conversation_id: conversationId,
        body_text: body,
      });
      if (msgErr) throw msgErr;
      await qc.invalidateQueries({ queryKey: ['chat', 'messages', conversationId] });
      await qc.invalidateQueries({ queryKey: ['chat', 'members', conversationId] });
      toast({ title: `Added ${selected.length} ${selected.length === 1 ? 'person' : 'people'}` });
      onAdded();
      onClose();
    } catch (e) {
      toast({ title: 'Could not add people', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Add people to channel"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--cv2-bg-overlay)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '14vh',
        zIndex: 'var(--cv2-modal-z, 1000)' as any,
      }}
    >
      <div
        style={{
          width: 560,
          maxWidth: '90vw',
          background: 'var(--cv2-bg-modal)',
          border: '1px solid var(--cv2-border-strong)',
          borderRadius: 'var(--cv2-radius-lg)',
          boxShadow: 'var(--cv2-shadow-modal)',
          padding: 22,
          fontFamily: 'var(--cv2-font)',
          color: 'var(--cv2-text)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--cv2-text-strong)' }}>
              Add people to <span style={{ color: 'var(--cv2-text-subtle)' }}>#</span>{channelTitle}
            </div>
            <div style={{ marginTop: 4, fontSize: 13, color: 'var(--cv2-text-subtle)' }}>
              You can also add email addresses of people who aren't members of{' '}
              <strong style={{ color: 'var(--cv2-text-strong)' }}>{workspaceName}</strong>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={closeBtnStyle()}
          >
            <XIcon size={16} />
          </button>
        </div>

        <div
          onClick={() => inputRef.current?.focus()}
          style={{
            marginTop: 16,
            display: 'flex',
            flexWrap: 'wrap',
            gap: 6,
            padding: 10,
            background: 'var(--cv2-bg-input)',
            border: '1px solid var(--cv2-accent)',
            borderRadius: 'var(--cv2-radius-sm)',
            cursor: 'text',
            minHeight: 48,
          }}
        >
          {selected.map(p => (
            <Chip key={p.id} person={p} onRemove={() => remove(p.id)} />
          ))}
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={onKeyDownInput}
            placeholder={selected.length === 0 ? 'Enter a name or email' : ''}
            style={{
              flex: 1,
              minWidth: 120,
              background: 'transparent',
              color: 'var(--cv2-text)',
              border: 'none',
              outline: 'none',
              fontFamily: 'inherit',
              fontSize: 14,
              padding: '6px 4px',
            }}
          />
        </div>

        {query.trim().length > 0 && filteredHits.length > 0 && (
          <div
            role="listbox"
            style={{
              marginTop: 8,
              background: 'var(--cv2-bg-modal)',
              border: '1px solid var(--cv2-border-strong)',
              borderRadius: 'var(--cv2-radius-sm)',
              maxHeight: 220,
              overflowY: 'auto',
              padding: '4px 0',
            }}
          >
            {filteredHits.map(h => (
              <PersonRow key={h.id} hit={h} onPick={() => pick(h)} />
            ))}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
          <PrimaryBtn onClick={handleAdd} disabled={selected.length === 0 || submitting}>
            {submitting ? 'Adding…' : 'Add'}
          </PrimaryBtn>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function Chip({ person, onRemove }: { person: PeopleHit; onRemove: () => void }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 6px 4px 4px',
        background: 'var(--cv2-bg-row-selected)',
        borderRadius: 6,
        fontSize: 13,
        fontWeight: 700,
        color: 'var(--cv2-text-strong)',
      }}
    >
      <Avatar name={person.name} size={20} />
      <span>{person.name}</span>
      <button
        type="button"
        onClick={e => { e.stopPropagation(); onRemove(); }}
        aria-label={`Remove ${person.name}`}
        style={{
          width: 18,
          height: 18,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'transparent',
          color: 'var(--cv2-text-subtle)',
          border: 'none',
          borderRadius: 'var(--cv2-radius-sm)',
          cursor: 'pointer',
        }}
      >
        <XIcon size={12} />
      </button>
    </span>
  );
}

function PersonRow({ hit, onPick }: { hit: PeopleHit; onPick: () => void }) {
  return (
    <button
      type="button"
      onClick={onPick}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--cv2-bg-row-hover)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        width: '100%',
        padding: '8px 12px',
        background: 'transparent',
        color: 'var(--cv2-text)',
        border: 'none',
        cursor: 'pointer',
        textAlign: 'left',
        fontFamily: 'inherit',
        fontSize: 14,
      }}
    >
      <Avatar name={hit.name} size={28} />
      <span style={{ fontWeight: 600 }}>{hit.name}</span>
    </button>
  );
}

function Avatar({ name, size }: { name: string; size: number }) {
  const photo = resolveAvatarUrl(name);
  if (photo) {
    return <img src={photo} alt="" width={size} height={size} style={{ borderRadius: 4, objectFit: 'cover' }} />;
  }
  return (
    <div
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        borderRadius: 4,
        background: 'var(--cv2-bg-row-hover)',
        color: 'var(--cv2-text)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: Math.max(10, Math.floor(size * 0.4)),
        fontWeight: 700,
      }}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

function PrimaryBtn({ onClick, disabled, children }: { onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        height: 36,
        padding: '0 18px',
        background: disabled ? 'var(--cv2-bg-row-hover)' : 'var(--cv2-success, #007A5A)',
        color: disabled ? 'var(--cv2-text-muted)' : 'var(--ds-text-inverse, #FFFFFF)',
        border: 'none',
        borderRadius: 'var(--cv2-radius-sm)',
        fontFamily: 'inherit',
        fontSize: 14,
        fontWeight: 700,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      {children}
    </button>
  );
}

function closeBtnStyle(): React.CSSProperties {
  return {
    width: 28,
    height: 28,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'transparent',
    color: 'var(--cv2-text-subtle)',
    border: 'none',
    borderRadius: 'var(--cv2-radius-sm)',
    cursor: 'pointer',
  };
}
