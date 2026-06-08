/**
 * NewChannelModal — admin-only inline modal for creating ad-hoc channels.
 *
 * RLS layer enforces admin-only INSERT on chat_conversations with kind='channel'
 * (migration `chat_channel_insert_admin_only`, 2026-06-08). This UI is the matching
 * admin affordance — anyone non-admin would get a 403 server-side anyway, so we
 * gate the button at the call site (DockDirectory) and don't render this modal
 * for non-admins.
 *
 * Project channels are auto-created by the ph_projects INSERT trigger
 * (migration `chat_auto_project_channel_v2`). This modal is for non-project
 * cross-cutting channels (announcements, ops, leadership, etc).
 */
import React, { useMemo, useState } from 'react';
import ModalDialog, { ModalBody, ModalFooter, ModalHeader, ModalTitle } from '@atlaskit/modal-dialog';
import Button from '@atlaskit/button/new';
import Textfield from '@atlaskit/textfield';
import { useChatPeople } from '@/hooks/chat/useChatPeople';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { Avatar } from '@/components/chat/main/avatar';
import { catalystToast } from '@/lib/catalystToast';

interface NewChannelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (conversationId: string) => void;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

export function NewChannelModal({ isOpen, onClose, onCreated }: NewChannelModalProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { groups } = useChatPeople();
  const [name, setName] = useState('');
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  const people = useMemo(() => groups.flatMap((g) => g.people), [groups]);

  const filteredPeople = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return people.slice(0, 50);
    return people.filter((p) => p.name.toLowerCase().includes(q) || (p.role ?? '').toLowerCase().includes(q)).slice(0, 50);
  }, [search, people]);

  if (!isOpen) return null;

  const togglePerson = (resourceId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(resourceId)) next.delete(resourceId);
      else next.add(resourceId);
      return next;
    });
  };

  const canSubmit = name.trim().length >= 2 && !submitting && !!user;

  const handleSubmit = async () => {
    if (!canSubmit || !user) return;
    setSubmitting(true);
    try {
      const title = slugify(name);
      const { data: conv, error: convErr } = await supabase
        .from('chat_conversations')
        .insert({ kind: 'channel', title, project_key: null, created_by: user.id })
        .select('id')
        .single();

      if (convErr || !conv) {
        catalystToast.error(convErr?.message ?? 'Failed to create channel');
        setSubmitting(false);
        return;
      }

      const conversationId = conv.id;

      // Resolve selected resource_ids → profile_ids, then add as members.
      if (selectedIds.size > 0) {
        const { data: resources } = await supabase
          .from('resource_inventory')
          .select('id, profile_id')
          .in('id', Array.from(selectedIds))
          .not('profile_id', 'is', null);

        const memberRows = (resources ?? [])
          .filter((r: any) => r.profile_id && r.profile_id !== user.id)
          .map((r: any) => ({
            conversation_id: conversationId,
            user_id: r.profile_id,
            role: 'member' as const,
          }));

        if (memberRows.length > 0) {
          await (supabase as any).from('chat_conversation_members').upsert(memberRows, {
            onConflict: 'conversation_id,user_id',
            ignoreDuplicates: true,
          });
        }
      }

      // Success toast REMOVED (2026-06-08 design-critique).
      // Channel-created confirmation is implicit: modal closes + the new
      // channel appears in the dock's Channels list. Mid-screen sonner
      // banner was disconnected from the action point. Errors still toast.
      queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] });
      queryClient.invalidateQueries({ queryKey: ['chat-list'] });
      onCreated?.(conversationId);
      setName('');
      setSearch('');
      setSelectedIds(new Set());
      onClose();
    } catch (e: any) {
      catalystToast.error(e?.message ?? 'Failed to create channel');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalDialog onClose={onClose} width="small">
      <ModalHeader>
        <ModalTitle>New channel</ModalTitle>
      </ModalHeader>
      <ModalBody>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label
              htmlFor="cc-new-channel-name"
              style={{
                display: 'block',
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--ds-text-subtle, #44546F)',
                marginBottom: 4,
              }}
            >
              Channel name
            </label>
            <Textfield
              id="cc-new-channel-name"
              placeholder="e.g. announcements"
              value={name}
              onChange={(e) => setName((e.target as HTMLInputElement).value)}
              autoFocus
            />
            {name.trim() && (
              <div style={{ fontSize: 11, color: 'var(--ds-text-subtle, #44546F)', marginTop: 4 }}>
                Will be created as <strong>#{slugify(name)}</strong>
              </div>
            )}
          </div>

          <div>
            <label
              style={{
                display: 'block',
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--ds-text-subtle, #44546F)',
                marginBottom: 4,
              }}
            >
              Add members ({selectedIds.size} selected)
            </label>
            <Textfield
              placeholder="Search people"
              value={search}
              onChange={(e) => setSearch((e.target as HTMLInputElement).value)}
            />
            <div
              style={{
                maxHeight: 220,
                overflowY: 'auto',
                marginTop: 8,
                border: '1px solid var(--ds-border, #DFE1E6)',
                borderRadius: 4,
              }}
            >
              {filteredPeople.length === 0 && (
                <div
                  style={{
                    padding: 12,
                    fontSize: 12,
                    color: 'var(--ds-text-subtle, #44546F)',
                    textAlign: 'center',
                  }}
                >
                  No people match "{search}".
                </div>
              )}
              {filteredPeople.map((p) => {
                const checked = selectedIds.has(p.id);
                return (
                  <label
                    key={p.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '6px 8px',
                      cursor: 'pointer',
                      background: checked ? 'var(--ds-background-selected, #E9F2FE)' : 'transparent',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => togglePerson(p.id)}
                      style={{ margin: 0 }}
                    />
                    <Avatar name={p.name} seed={p.id} />
                    <span style={{ fontSize: 13, color: 'var(--ds-text, #172B4D)', flex: 1 }}>
                      {p.name}
                    </span>
                    {p.role && (
                      <span style={{ fontSize: 11, color: 'var(--ds-text-subtle, #44546F)' }}>
                        {p.role}
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button appearance="subtle" onClick={onClose} isDisabled={submitting}>
          Cancel
        </Button>
        <Button appearance="primary" onClick={handleSubmit} isDisabled={!canSubmit} isLoading={submitting}>
          Create channel
        </Button>
      </ModalFooter>
    </ModalDialog>
  );
}

export default NewChannelModal;
