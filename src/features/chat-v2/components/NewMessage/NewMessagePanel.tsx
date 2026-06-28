/**
 * NewMessagePanel — Slack-style "New message" composer that mounts in the
 * main panel grid area. Lets the user multi-select recipients (chips +
 * autocomplete dropdown), type a message in the standard Composer, and
 * send. The send resolves to either a 1:1 DM (one recipient) or a group DM
 * (2-7 other recipients) via the chat_get_or_create_{dm,group_dm} RPCs,
 * then routes the parent to the new conversation.
 *
 * Triggered by the + icon on the "Direct messages" sidebar section.
 */
import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { resolveAvatarUrl } from '@/lib/avatars';
import { useAuth } from '@/hooks/useAuth';
import { useStartDm } from '@/hooks/chat/useStartDm';
import { useStartGroupDm } from '@/hooks/chat/useStartGroupDm';
import { useWorkspacePeopleSearch, type PeopleHit } from '../../hooks/useWorkspacePeopleSearch';
import { Composer } from '../Composer/Composer';
import { XIcon, MoreDotsIcon } from '../shared/Icon';

const db = supabase as unknown as { from: (t: string) => any };

interface Recipient {
  id: string;
  name: string;
  avatarUrl: string | null;
  isSelf?: boolean;
}

interface NewMessagePanelProps {
  selfId: string | null;
  selfName: string;
  selfAvatarUrl: string | null;
  onClose: () => void;
  /** Called after the message lands. Passes the resolved conversation id. */
  onConversationStarted: (conversationId: string) => void;
}

export function NewMessagePanel({
  selfId,
  selfName,
  selfAvatarUrl,
  onClose,
  onConversationStarted,
}: NewMessagePanelProps) {
  const { user } = useAuth();
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const { hits, isLoading } = useWorkspacePeopleSearch(query);
  const startDm = useStartDm();
  const startGroupDm = useStartGroupDm();

  const myId = selfId ?? user?.id ?? null;

  // Filter the autocomplete: hide already-selected people. Show self as
  // selectable so Slack-style "Sikander (you), Zulqarnain, …" works.
  const dropdownHits = hits.filter(h => !recipients.some(r => r.id === h.id));

  const handleAdd = (hit: PeopleHit) => {
    setRecipients(prev => [
      ...prev,
      {
        id: hit.id,
        name: hit.name,
        avatarUrl: hit.avatarUrl,
        isSelf: hit.id === myId,
      },
    ]);
    setQuery('');
    setError(null);
  };

  const handleRemove = (id: string) => {
    setRecipients(prev => prev.filter(r => r.id !== id));
  };

  // Other-user-ids: drop self from the set sent to the RPC. Server adds
  // the caller automatically.
  const otherIds = recipients.filter(r => !r.isSelf && r.id !== myId).map(r => r.id);

  const handleSend = async (markdown: string) => {
    if (!myId) {
      setError('Not signed in.');
      return;
    }
    if (otherIds.length === 0) {
      setError('Add at least one recipient.');
      return;
    }
    setSending(true);
    setError(null);
    try {
      let convId: string;
      if (otherIds.length === 1) {
        convId = await startDm.mutateAsync(otherIds[0]);
      } else {
        convId = await startGroupDm.mutateAsync(otherIds);
      }
      // Direct insert — we don't want to mount useMessages just to send one
      // row. Mirrors the row shape used by useMessages.sendMessage.
      const { error: insertErr } = await db.from('chat_messages').insert({
        conversation_id: convId,
        parent_id: null,
        author_id: myId,
        body_text: markdown,
        body_adf: null,
      });
      if (insertErr) throw insertErr;
      onConversationStarted(convId);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not start the conversation.');
      setSending(false);
    }
  };

  // Placeholder mirrors Slack: "Message {Name, Name, Name}" once any
  // recipients are added; defaults to a neutral prompt otherwise.
  const placeholder = recipients.length === 0
    ? 'Start a new message'
    : `Message ${recipients.map(r => r.isSelf ? selfName : r.name).join(', ')}`;

  return (
    <section
      aria-label="New message"
      style={{
        gridArea: 'panel',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--cv2-bg-panel)',
        minWidth: 0,
        overflow: 'hidden',
      }}
    >
      <Header onClose={onClose} />
      <RecipientPicker
        recipients={recipients}
        selfName={selfName}
        query={query}
        onQueryChange={setQuery}
        onAdd={handleAdd}
        onRemove={handleRemove}
        hits={dropdownHits}
        isLoading={isLoading}
      />
      {/* Empty body — Slack shows a blank canvas above the composer. */}
      <div style={{ flex: 1, minHeight: 0 }} />
      {error && (
        <div
          role="alert"
          style={{
            padding: '8px 16px',
            fontFamily: 'var(--cv2-font)',
            fontSize: 'var(--ds-font-size-200)',
            color: 'var(--ds-text-danger)',
            background: 'var(--cv2-bg-panel)',
          }}
        >
          {error}
        </div>
      )}
      <div style={{ position: 'relative', opacity: sending ? 0.6 : 1, pointerEvents: sending ? 'none' : 'auto' }}>
        <Composer
          placeholder={placeholder}
          onSend={handleSend}
          conversationId={null}
        />
      </div>
    </section>
  );
}

function Header({ onClose }: { onClose: () => void }) {
  return (
    <div
      style={{
        height: 'var(--cv2-header-h, 56px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        borderBottom: '1px solid var(--cv2-border)',
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontFamily: 'var(--cv2-font)',
            fontSize: 'var(--ds-font-size-400)',
            fontWeight: 800,
            color: 'var(--cv2-text-strong)',
          }}
        >
          New message
        </div>
        <div
          style={{
            fontFamily: 'var(--cv2-font)',
            fontSize: 'var(--ds-font-size-200)',
            color: 'var(--cv2-text-muted)',
          }}
        >
          Saved a moment ago
        </div>
      </div>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        <IconBtn label="More options" onClick={() => {}}>
          <MoreDotsIcon size={16} />
        </IconBtn>
        <IconBtn label="Close" onClick={onClose}>
          <XIcon size={16} />
        </IconBtn>
      </div>
    </div>
  );
}

interface RecipientPickerProps {
  recipients: Recipient[];
  selfName: string;
  query: string;
  onQueryChange: (q: string) => void;
  onAdd: (hit: PeopleHit) => void;
  onRemove: (id: string) => void;
  hits: PeopleHit[];
  isLoading: boolean;
}

function RecipientPicker({
  recipients,
  selfName,
  query,
  onQueryChange,
  onAdd,
  onRemove,
  hits,
  isLoading,
}: RecipientPickerProps) {
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  return (
    <div
      style={{
        position: 'relative',
        padding: '12px 16px',
        borderBottom: '1px solid var(--cv2-border)',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 6,
        background: 'var(--cv2-bg-panel)',
      }}
      onClick={() => inputRef.current?.focus()}
    >
      <span
        style={{
          fontFamily: 'var(--cv2-font)',
          fontSize: 'var(--ds-font-size-400)',
          fontWeight: 600,
          color: 'var(--cv2-text-subtle)',
          marginRight: 4,
        }}
      >
        To:
      </span>
      {recipients.map(r => (
        <RecipientChip
          key={r.id}
          label={r.isSelf ? `${selfName} (you)` : r.name}
          onRemove={() => onRemove(r.id)}
        />
      ))}
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={e => onQueryChange(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Backspace' && query.length === 0 && recipients.length > 0) {
            onRemove(recipients[recipients.length - 1].id);
          }
        }}
        placeholder={recipients.length === 0 ? '#a-channel, @somebody, or somebody@example.com' : ''}
        style={{
          flex: 1,
          minWidth: 200,
          border: 'none',
          outline: 'none',
          background: 'transparent',
          color: 'var(--cv2-text)',
          fontFamily: 'var(--cv2-font)',
          fontSize: 'var(--ds-font-size-400)',
          padding: '4px 0',
        }}
      />
      {query.trim().length > 0 && (
        <Dropdown hits={hits} isLoading={isLoading} onPick={onAdd} />
      )}
    </div>
  );
}

function RecipientChip({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  const photo = resolveAvatarUrl(label);
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 4px 4px 4px',
        background: 'var(--cv2-bg-row-hover, rgba(255,255,255,0.08))',
        border: '1px solid var(--cv2-border-strong, rgba(255,255,255,0.16))',
        borderRadius: 4,
        fontFamily: 'var(--cv2-font)',
        fontSize: 'var(--ds-font-size-300)',
        color: 'var(--cv2-text)',
      }}
    >
      {photo ? (
        <img
          src={photo}
          alt=""
          style={{ width: 20, height: 20, borderRadius: 3, objectFit: 'cover' }}
        />
      ) : (
        <span
          aria-hidden="true"
          style={{
            width: 20,
            height: 20,
            borderRadius: 3,
            background: 'var(--cv2-accent-soft, rgba(99,102,241,0.2))',
            color: 'var(--cv2-text-strong)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 'var(--ds-font-size-100)',
            fontWeight: 700,
          }}
        >
          {label.charAt(0).toUpperCase()}
        </span>
      )}
      <span style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{label}</span>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
        aria-label={`Remove ${label}`}
        style={{
          width: 18,
          height: 18,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'transparent',
          color: 'var(--cv2-text-subtle)',
          border: 'none',
          borderRadius: 3,
          cursor: 'pointer',
          padding: 0,
          marginLeft: 0,
        }}
      >
        <XIcon size={12} />
      </button>
    </span>
  );
}

function Dropdown({
  hits,
  isLoading,
  onPick,
}: {
  hits: PeopleHit[];
  isLoading: boolean;
  onPick: (h: PeopleHit) => void;
}) {
  if (isLoading) {
    return (
      <div style={dropdownStyles}>
        <div style={emptyStyles}>Searching…</div>
      </div>
    );
  }
  if (hits.length === 0) {
    return (
      <div style={dropdownStyles}>
        <div style={emptyStyles}>No people found.</div>
      </div>
    );
  }
  return (
    <div style={dropdownStyles}>
      {hits.map(h => (
        <button
          key={h.id}
          type="button"
          onClick={(e) => { e.stopPropagation(); onPick(h); }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            width: '100%',
            padding: '8px 12px',
            border: 'none',
            background: 'transparent',
            color: 'var(--cv2-text)',
            fontFamily: 'var(--cv2-font)',
            fontSize: 'var(--ds-font-size-400)',
            textAlign: 'left',
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = 'var(--cv2-bg-row-hover)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = 'transparent';
          }}
        >
          {resolveAvatarUrl(h.name) ? (
            <img
              src={resolveAvatarUrl(h.name) as string}
              alt=""
              style={{ width: 28, height: 28, borderRadius: 4, objectFit: 'cover', flex: 'none' }}
            />
          ) : (
            <span
              aria-hidden="true"
              style={{
                width: 28,
                height: 28,
                borderRadius: 4,
                background: 'var(--cv2-accent-soft, rgba(99,102,241,0.2))',
                color: 'var(--cv2-text-strong)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 'var(--ds-font-size-300)',
                fontWeight: 700,
                flex: 'none',
              }}
            >
              {h.name.charAt(0).toUpperCase()}
            </span>
          )}
          <span style={{ fontWeight: 700 }}>{h.name}</span>
          <span style={{ color: 'var(--cv2-text-muted)', marginLeft: 4 }}>{h.subName ?? ''}</span>
        </button>
      ))}
    </div>
  );
}

const dropdownStyles: React.CSSProperties = {
  position: 'absolute',
  left: 16,
  right: 16,
  top: '100%',
  marginTop: 4,
  zIndex: 10,
  background: 'var(--cv2-bg-modal)',
  border: '1px solid var(--cv2-border-strong)',
  borderRadius: 'var(--cv2-radius-md)',
  boxShadow: 'var(--cv2-shadow-modal)',
  overflow: 'hidden',
  maxHeight: 320,
  overflowY: 'auto',
  color: 'var(--cv2-text)',
  fontFamily: 'var(--cv2-font)',
};

const emptyStyles: React.CSSProperties = {
  padding: '12px 16px',
  fontFamily: 'var(--cv2-font)',
  fontSize: 'var(--ds-font-size-300)',
  color: 'var(--cv2-text-muted)',
};

function IconBtn({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      style={{
        width: 32,
        height: 32,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'transparent',
        color: 'var(--cv2-text-subtle)',
        border: 'none',
        borderRadius: 'var(--cv2-radius-sm, 4px)',
        cursor: 'pointer',
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--cv2-bg-row-hover)'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
    >
      {children}
    </button>
  );
}
