import React, { useEffect, useState } from 'react';
import ModalDialog, { ModalBody, ModalFooter, ModalHeader, ModalTitle } from '@atlaskit/modal-dialog';
import Button from '@atlaskit/button/new';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import CatalystAvatar from '@/components/shared/CatalystAvatar';
import { resolveAvatarUrl } from '@/lib/avatars';

const db = supabase as unknown as { from: (t: string) => any };

type Mode = 'dm' | 'channel';

interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  email: string | null;
}

interface Props {
  onClose: () => void;
  onCreated: (conversationId: string) => void;
}

export function NewConversationModal({ onClose, onCreated }: Props) {
  const { user } = useAuth();
  const [mode, setMode] = useState<Mode>('dm');
  const [search, setSearch] = useState('');
  const [channelName, setChannelName] = useState('');
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    db.from('profiles')
      .select('id, full_name, avatar_url, email')
      .neq('id', user.id)
      .limit(100)
      .then(({ data }: { data: Profile[] | null }) => setProfiles(data ?? []));
  }, [user?.id]);

  const filtered = profiles.filter(p => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (p.full_name ?? '').toLowerCase().includes(q) ||
      (p.email ?? '').toLowerCase().includes(q)
    );
  });

  async function handleCreate() {
    if (!user?.id) return;
    setIsCreating(true);
    setError(null);
    try {
      if (mode === 'dm') {
        if (!selectedUserId) { setError('Select a person first.'); setIsCreating(false); return; }

        // Check for existing DM between these two users
        const { data: existing } = await db
          .from('chat_conversation_members')
          .select('conversation_id, chat_conversations:conversation_id(id,kind)')
          .eq('user_id', user.id);

        let existingConvId: string | null = null;
        for (const row of (existing ?? []) as any[]) {
          const conv = Array.isArray(row.chat_conversations) ? row.chat_conversations[0] : row.chat_conversations;
          if (!conv || conv.kind !== 'dm') continue;
          // Check if the partner is also a member
          const { data: partner } = await db
            .from('chat_conversation_members')
            .select('conversation_id')
            .eq('conversation_id', conv.id)
            .eq('user_id', selectedUserId)
            .maybeSingle();
          if (partner) { existingConvId = conv.id; break; }
        }

        if (existingConvId) { onCreated(existingConvId); return; }

        const partnerName = profiles.find(p => p.id === selectedUserId)?.full_name ?? 'DM';
        const { data: newConv, error: convErr } = await db
          .from('chat_conversations')
          .insert({ kind: 'dm', title: partnerName })
          .select('id')
          .single();
        if (convErr || !newConv) throw new Error(convErr?.message ?? 'Failed to create conversation');

        await db.from('chat_conversation_members').insert([
          { conversation_id: (newConv as any).id, user_id: user.id },
          { conversation_id: (newConv as any).id, user_id: selectedUserId },
        ]);
        onCreated((newConv as any).id);
      } else {
        const name = channelName.trim();
        if (!name) { setError('Enter a channel name.'); setIsCreating(false); return; }
        const { data: newConv, error: convErr } = await db
          .from('chat_conversations')
          .insert({ kind: 'channel', title: name })
          .select('id')
          .single();
        if (convErr || !newConv) throw new Error(convErr?.message ?? 'Failed to create channel');
        await db.from('chat_conversation_members').insert({
          conversation_id: (newConv as any).id,
          user_id: user.id,
        });
        onCreated((newConv as any).id);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
      setIsCreating(false);
    }
  }

  return (
    <ModalDialog onClose={onClose} width="small">
      <ModalHeader>
        <ModalTitle>New conversation</ModalTitle>
      </ModalHeader>
      <ModalBody>
        {/* Mode toggle */}
        <div
          style={{
            display: 'flex',
            gap: 8,
            marginBottom: 16,
            borderBottom: '1px solid var(--ds-border, #DFE1E6)',
            paddingBottom: 12,
          }}
        >
          {(['dm', 'channel'] as Mode[]).map(m => (
            <button
              key={m}
              onClick={() => { setMode(m); setError(null); setSelectedUserId(null); }}
              style={{
                padding: '4px 12px',
                borderRadius: 4,
                border: mode === m ? '1px solid var(--ds-link, #0052CC)' : '1px solid var(--ds-border, #DFE1E6)',
                background: mode === m ? 'var(--ds-background-selected, #E9F2FE)' : 'transparent',
                color: mode === m ? 'var(--ds-link, #0052CC)' : 'var(--ds-text-subtle, #42526E)',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: mode === m ? 600 : 400,
              }}
            >
              {m === 'dm' ? 'Direct message' : 'Channel'}
            </button>
          ))}
        </div>

        {mode === 'dm' && (
          <>
            <input
              type="search"
              placeholder="Search people…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '8px 12px',
                border: '1px solid var(--ds-border, #DFE1E6)',
                borderRadius: 4,
                fontSize: 14,
                color: 'var(--ds-text, #172B4D)',
                background: 'var(--ds-surface, #FFFFFF)',
                marginBottom: 8,
                outline: 'none',
              }}
            />
            <div
              style={{
                maxHeight: 240,
                overflowY: 'auto',
                border: '1px solid var(--ds-border, #DFE1E6)',
                borderRadius: 4,
              }}
            >
              {filtered.length === 0 && (
                <div style={{ padding: '12px 16px', color: 'var(--ds-text-subtlest, #6B778C)', fontSize: 13 }}>
                  No people found.
                </div>
              )}
              {filtered.map(p => (
                <button
                  key={p.id}
                  onClick={() => setSelectedUserId(p.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    width: '100%',
                    padding: '8px 12px',
                    border: 'none',
                    borderBottom: '1px solid var(--ds-border, #DFE1E6)',
                    background: selectedUserId === p.id ? 'var(--ds-background-selected, #E9F2FE)' : 'transparent',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <div style={{ flex: 'none' }}>
                    <CatalystAvatar
                      size="small"
                      name={p.full_name || p.email || '?'}
                      src={resolveAvatarUrl(p.full_name) ?? undefined}
                    />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ds-text, #172B4D)' }}>
                      {p.full_name ?? p.email ?? 'Unknown'}
                    </div>
                    {p.email && (
                      <div style={{ fontSize: 11, color: 'var(--ds-text-subtlest, #6B778C)' }}>
                        {p.email}
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </>
        )}

        {mode === 'channel' && (
          <div>
            <label
              htmlFor="c-new-conv-name"
              style={{ fontSize: 12, fontWeight: 600, color: 'var(--ds-text-subtle, #42526E)', display: 'block', marginBottom: 4 }}
            >
              Channel name
            </label>
            <input
              id="c-new-conv-name"
              type="text"
              placeholder="e.g. design-feedback"
              value={channelName}
              onChange={e => setChannelName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleCreate(); }}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '8px 12px',
                border: '1px solid var(--ds-border, #DFE1E6)',
                borderRadius: 4,
                fontSize: 14,
                color: 'var(--ds-text, #172B4D)',
                background: 'var(--ds-surface, #FFFFFF)',
                outline: 'none',
              }}
            />
          </div>
        )}

        {error && (
          <p style={{ marginTop: 8, fontSize: 12, color: 'var(--ds-text-danger, #AE2A19)' }}>
            {error}
          </p>
        )}
      </ModalBody>
      <ModalFooter>
        <Button appearance="subtle" onClick={onClose}>
          Cancel
        </Button>
        <Button
          appearance="primary"
          isDisabled={isCreating || (mode === 'dm' ? !selectedUserId : !channelName.trim())}
          onClick={handleCreate}
        >
          {isCreating ? 'Creating…' : mode === 'dm' ? 'Start DM' : 'Create channel'}
        </Button>
      </ModalFooter>
    </ModalDialog>
  );
}
