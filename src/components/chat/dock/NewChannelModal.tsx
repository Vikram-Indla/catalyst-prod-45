/**
 * NewChannelModal — creates a user custom channel (kind='custom_channel').
 *
 * Available to ALL authenticated users. Max 5 channels per user enforced by
 * both RLS (migration 20260612000000_custom_channels.sql) and UI guard.
 *
 * Admin project channels (kind='channel') are a separate concept — auto-created
 * by the ph_projects INSERT trigger or by the admin via the Projects section.
 */
import React, { useMemo, useState } from 'react';
import ModalDialog, { ModalBody, ModalFooter, ModalHeader, ModalTitle } from '@atlaskit/modal-dialog';
import Button from '@atlaskit/button/new';
import Textfield from '@atlaskit/textfield';
import Flag, { FlagGroup } from '@atlaskit/flag';
import SuccessIcon from '@atlaskit/icon/glyph/check-circle';
import { useChatPeople } from '@/hooks/chat/useChatPeople';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { Avatar } from '@/components/chat/main/avatar';
import { catalystToast } from '@/lib/catalystToast';

const MAX_CHANNELS = 5;

interface NewChannelModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Current count of user's custom channels (before this creation). */
  existingCount: number;
  onCreated?: (conversationId: string, newCount: number) => void;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

export function NewChannelModal({ isOpen, onClose, existingCount, onCreated }: NewChannelModalProps) {
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
    return people
      .filter((p) => p.name.toLowerCase().includes(q) || (p.role ?? '').toLowerCase().includes(q))
      .slice(0, 50);
  }, [search, people]);

  if (!isOpen) return null;

  const atLimit = existingCount >= MAX_CHANNELS;
  const canSubmit = name.trim().length >= 2 && !submitting && !!user && !atLimit;

  const togglePerson = (resourceId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(resourceId)) next.delete(resourceId);
      else next.add(resourceId);
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!canSubmit || !user) return;
    setSubmitting(true);
    try {
      const title = slugify(name);
      const { data: conv, error: convErr } = await supabase
        .from('chat_conversations')
        .insert({ kind: 'custom_channel', title, project_key: null, created_by: user.id })
        .select('id')
        .single();

      if (convErr || !conv) {
        catalystToast.error(convErr?.message ?? 'Failed to create channel');
        setSubmitting(false);
        return;
      }

      const conversationId = conv.id;

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

      queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] });
      queryClient.invalidateQueries({ queryKey: ['chat-list'] });
      queryClient.invalidateQueries({ queryKey: ['chat', 'custom-channel-count'] });

      const newCount = existingCount + 1;
      onCreated?.(conversationId, newCount);
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
          {atLimit && (
            <div
              style={{
                padding: '8px 12px',
                background: 'var(--ds-background-warning, #FFF7D6)',
                border: '1px solid var(--ds-border-warning, #CF9F02)',
                borderRadius: 4,
                fontSize: 13,
                color: 'var(--ds-text-warning, #974F0C)',
              }}
            >
              Channel limit reached ({MAX_CHANNELS}/{MAX_CHANNELS}). Delete a channel to create a new one.
            </div>
          )}

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
            <div data-voice-zone="true" style={{ display: 'contents' }}>
            <Textfield
              id="cc-new-channel-name"
              placeholder="e.g. design-feedback"
              value={name}
              onChange={(e) => setName((e.target as HTMLInputElement).value)}
              autoFocus
              isDisabled={atLimit}
            />
            </div>
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
              isDisabled={atLimit}
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
                  {search ? `No people match "${search}".` : 'No people available.'}
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
                      cursor: atLimit ? 'default' : 'pointer',
                      background: checked ? 'var(--ds-background-selected, #E9F2FE)' : 'transparent',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => !atLimit && togglePerson(p.id)}
                      disabled={atLimit}
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
        <Button
          appearance="primary"
          onClick={handleSubmit}
          isDisabled={!canSubmit}
          isLoading={submitting}
        >
          Create channel
        </Button>
      </ModalFooter>
    </ModalDialog>
  );
}

/** Standalone flag shown in DockDirectory after a custom channel is created. */
export function ChannelCreatedFlag({
  count,
  onDismiss,
}: {
  count: number;
  onDismiss: () => void;
}) {
  return (
    <FlagGroup onDismissed={onDismiss}>
      <Flag
        id="channel-created"
        icon={
          <SuccessIcon
            label="success"
            primaryColor="var(--ds-icon-success, #22A06B)"
          />
        }
        title={`Channel created (${count}/${MAX_CHANNELS})`}
        description={
          count < MAX_CHANNELS
            ? `You can create ${MAX_CHANNELS - count} more channel${MAX_CHANNELS - count === 1 ? '' : 's'}.`
            : 'You have reached the channel limit.'
        }
        appearance="normal"
        isDismissAllowed
        onDismissed={onDismiss}
      />
    </FlagGroup>
  );
}

export default NewChannelModal;
