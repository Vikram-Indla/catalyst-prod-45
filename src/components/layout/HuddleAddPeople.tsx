// src/components/layout/HuddleAddPeople.tsx
/**
 * HuddleAddPeople — lean, self-contained "add people to the call" picker.
 *
 * The chat-v2 AddPeopleModal depends on cv2 theme tokens (body[data-cv2-theme]),
 * which aren't set while the huddle window is open standalone — so it renders
 * transparent there. This modal uses ADS tokens only, so it styles correctly in
 * the CatalystShell context. Adding a person to the conversation makes the
 * active (conversation-scoped) huddle ring on their client.
 */
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { useChatAddMember } from '@/hooks/chat/useChatActions';
import { useStartGroupDm } from '@/hooks/chat/useStartGroupDm';
import { useWorkspacePeopleSearch, type PeopleHit } from '@/features/chat-v2/hooks/useWorkspacePeopleSearch';
import { Avatar } from '@/components/ads';

const db = supabase as unknown as { from: (t: string) => any };

interface ConvInfo { kind: string; otherMemberIds: string[] }

interface Props {
  conversationId: string;
  conversationName: string;
  currentUserId: string;
  existingMemberIds: Set<string>;
  remainingSlots: number;
  onClose: () => void;
  onAdded: () => void;
  /** Called after a 1:1 DM was expanded into a NEW group — switch the huddle. */
  onMovedToGroup: (newConversationId: string, groupTitle: string) => void;
}

export function HuddleAddPeople({ conversationId, conversationName, currentUserId, existingMemberIds, remainingSlots, onClose, onAdded, onMovedToGroup }: Props) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const addMember = useChatAddMember();
  const startGroupDm = useStartGroupDm();
  const [query, setQuery] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [conv, setConv] = useState<ConvInfo | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { hits, isLoading } = useWorkspacePeopleSearch(query);

  useEffect(() => { inputRef.current?.focus(); }, []);

  // Fetch conversation kind + members so we know whether adding people should
  // grow the conversation (channel / group) or spin up a NEW group (1:1 DM).
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [{ data: c }, { data: members }] = await Promise.all([
        db.from('chat_conversations').select('kind').eq('id', conversationId).maybeSingle(),
        db.from('chat_conversation_members').select('user_id').eq('conversation_id', conversationId),
      ]);
      if (cancelled) return;
      const otherMemberIds = ((members ?? []) as { user_id: string }[])
        .map((m) => m.user_id).filter((id) => id !== currentUserId);
      setConv({ kind: (c as { kind: string } | null)?.kind ?? 'dm', otherMemberIds });
    })();
    return () => { cancelled = true; };
  }, [conversationId, currentUserId]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [onClose]);

  const results = hits.filter((h) => !existingMemberIds.has(h.id));

  // A true 1:1 DM = kind 'dm' with exactly one other member. Adding to it must
  // NOT pollute the DM — create a fresh group and move the call there.
  const isOneToOneDm = !!conv && conv.kind === 'dm' && conv.otherMemberIds.length === 1;

  const add = async (p: PeopleHit) => {
    if (busyId || !conv) return;
    setBusyId(p.id);
    try {
      if (isOneToOneDm) {
        // New group = me + the existing DM peer + the new person. The huddle
        // moves there (caller switches); everyone else gets rung in the group.
        const otherIds = Array.from(new Set([...conv.otherMemberIds, p.id]));
        const newConvId = await startGroupDm.mutateAsync(otherIds);
        const title = `Group call`;
        toast({ title: `Moving to a group call with ${p.name}` });
        onMovedToGroup(newConvId, title);
        onClose();
        return;
      }
      // Channel / existing group — grow it in place.
      await addMember.mutateAsync({ convId: conversationId, userId: p.id });
      await db.from('chat_messages').insert({
        conversation_id: conversationId,
        body_text: `Added ${p.name} to the call.`,
      });
      await qc.invalidateQueries({ queryKey: ['chat', 'members', conversationId] });
      await qc.invalidateQueries({ queryKey: ['chat', 'messages', conversationId] });
      toast({ title: `${p.name} added — ringing them now` });
      onAdded();
      onClose();
    } catch (e) {
      toast({ title: 'Could not add', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setBusyId(null);
    }
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Add people to the call"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, background: 'var(--ds-blanket)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '14vh', zIndex: 200,
      }}
    >
      <div style={{
        width: 420, maxWidth: '92vw', background: 'var(--ds-surface-overlay)',
        border: '1px solid var(--ds-border)', borderRadius: 12, boxShadow: 'var(--ds-shadow-overlay)',
        padding: 20, display: 'flex', flexDirection: 'column', gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div style={{ font: 'var(--ds-font-heading-small)', fontWeight: 700, color: 'var(--ds-text)' }}>
              Add people to the call
            </div>
            <div style={{ marginTop: 2, font: 'var(--ds-font-body-small)', color: 'var(--ds-text-subtle)' }}>
              {conversationName} · {remainingSlots} {remainingSlots === 1 ? 'slot' : 'slots'} left
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close"
            style={{ width: 28, height: 28, borderRadius: 6, border: 'none', cursor: 'pointer',
              background: 'var(--ds-background-neutral-subtle)', color: 'var(--ds-text)', fontSize: 16, lineHeight: 1 }}>
            ×
          </button>
        </div>

        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search people by name"
          style={{
            padding: '10px 12px', borderRadius: 8, border: '1px solid var(--ds-border)',
            background: 'var(--ds-surface)', color: 'var(--ds-text)', font: 'var(--ds-font-body)', outline: 'none',
          }}
        />

        <div style={{ maxHeight: 300, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {query.trim() === '' ? (
            <div style={{ padding: 16, textAlign: 'center', color: 'var(--ds-text-subtlest)', font: 'var(--ds-font-body-small)' }}>
              Type a name to find someone.
            </div>
          ) : isLoading ? (
            <div style={{ padding: 16, textAlign: 'center', color: 'var(--ds-text-subtlest)', font: 'var(--ds-font-body-small)' }}>
              Searching…
            </div>
          ) : results.length === 0 ? (
            <div style={{ padding: 16, textAlign: 'center', color: 'var(--ds-text-subtlest)', font: 'var(--ds-font-body-small)' }}>
              No matches.
            </div>
          ) : (
            results.map((p) => (
              <button key={p.id} type="button" onClick={() => void add(p)} disabled={!!busyId}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8,
                  border: 'none', background: 'transparent', cursor: busyId ? 'default' : 'pointer',
                  textAlign: 'left', width: '100%', opacity: busyId && busyId !== p.id ? 0.5 : 1,
                }}
                onMouseEnter={(e) => { if (!busyId) e.currentTarget.style.background = 'var(--ds-background-neutral-subtle-hovered)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                <Avatar size="small" name={p.name} src={p.avatarUrl ?? undefined} />
                <span style={{ flex: 1, minWidth: 0, color: 'var(--ds-text)', font: 'var(--ds-font-body)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {p.name}
                </span>
                <span style={{ font: 'var(--ds-font-body-small)', fontWeight: 600, color: 'var(--ds-text-brand)' }}>
                  {busyId === p.id ? 'Adding…' : 'Add'}
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default HuddleAddPeople;
