/**
 * RosterPanel — full member list for a conversation, opened from the
 * ConversationHeader avatar stack. Shows admins first, then members,
 * each row with name + email + role chip + (admin-only) remove button.
 *
 * Admin removal calls chat_remove_member. The current user can also remove
 * themselves (server R6 routes self-removal to a leave).
 *
 * Mounts inside an @atlaskit/modal-dialog (width "small") to keep the UI
 * unobtrusive over the conversation pane.
 */
import React from 'react';
import Modal, {
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalTitle,
  ModalTransition,
} from '@atlaskit/modal-dialog';
import Button from '@atlaskit/button/new';
import { useConversationMembers } from '@/hooks/chat/useConversationMembers';
import { useChatRemoveMember } from '@/hooks/chat/useChatActions';
import { useAuth } from '@/hooks/useAuth';
import { Avatar } from './avatar';

export interface RosterPanelProps {
  conversationId: string;
  isOpen: boolean;
  onClose: () => void;
  onInvite?: () => void;
}

function timeAgo(iso: string | null): string {
  if (!iso) return '';
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '';
  const m = Math.floor((Date.now() - t) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function RosterPanel({ conversationId, isOpen, onClose, onInvite }: RosterPanelProps) {
  const { user } = useAuth();
  const { data: members = [], isLoading } = useConversationMembers(isOpen ? conversationId : null);
  const removeMember = useChatRemoveMember();

  const myRole = members.find((m) => user && m.userId === user.id)?.role ?? 'member';
  const canRemove = myRole === 'admin';

  return (
    <ModalTransition>
      {isOpen && (
        <Modal onClose={onClose} width="small">
          <ModalHeader>
            <ModalTitle>People ({members.length})</ModalTitle>
          </ModalHeader>
          <ModalBody>
            {isLoading && (
              <div style={{ padding: 16, color: 'var(--ds-text-subtle)', fontSize: 'var(--ds-font-size-100)' }}>
                Loading…
              </div>
            )}
            {!isLoading && members.length === 0 && (
              <div style={{ padding: 16, color: 'var(--ds-text-subtle)', fontSize: 'var(--ds-font-size-100)' }}>
                No members yet.
              </div>
            )}
            <div style={{ maxHeight: 360, overflowY: 'auto' }}>
              {members.map((m) => {
                const isSelf = user && m.userId === user.id;
                const canActOnRow = canRemove || isSelf;
                return (
                  <div
                    key={m.userId}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '8px 4px',
                      borderBottom: '1px solid var(--ds-border)',
                    }}
                  >
                    <Avatar name={m.name} seed={m.userId} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          fontSize: 'var(--ds-font-size-100)',
                          fontWeight: 600,
                          color: 'var(--ds-text)',
                        }}
                      >
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {m.name || m.email || m.userId.slice(0, 8)}
                        </span>
                        {m.role === 'admin' && (
                          <span
                            style={{
                              fontSize: 'var(--ds-font-size-50)',
                              fontWeight: 500,
                              textTransform: 'none',
                              padding: '0px 6px',
                              borderRadius: 3,
                              background: 'var(--ds-background-accent-purple-subtler)',
                              color: 'var(--ds-text-accent-purple)',
                            }}
                          >
                            Admin
                          </span>
                        )}
                        {isSelf && (
                          <span style={{ fontSize: 'var(--ds-font-size-100)', color: 'var(--ds-text-subtle)' }}>(you)</span>
                        )}
                      </div>
                      {m.email && (
                        <div style={{ fontSize: 'var(--ds-font-size-075)', color: 'var(--ds-text-subtle)' }}>{m.email}</div>
                      )}
                      <div style={{ fontSize: 'var(--ds-font-size-100)', color: 'var(--ds-text-subtlest)' }}>
                        joined {timeAgo(m.joinedAt)}
                      </div>
                    </div>
                    {canActOnRow && (
                      <Button
                        appearance="subtle"
                        spacing="compact"
                        onClick={() => {
                          removeMember.mutate({
                            convId: conversationId,
                            userId: m.userId,
                          });
                        }}
                      >
                        {isSelf ? 'Leave' : 'Remove'}
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </ModalBody>
          <ModalFooter>
            {onInvite && (
              <Button appearance="primary" onClick={onInvite}>
                Add people
              </Button>
            )}
            <Button appearance="subtle" onClick={onClose}>
              Close
            </Button>
          </ModalFooter>
        </Modal>
      )}
    </ModalTransition>
  );
}

export default RosterPanel;
