import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PresenceAvatar } from '../shared/PresenceAvatar';
import { ChevronDownIcon, CopyLinkIcon, XIcon } from '../shared/Icon';
import { ScheduleSendMenu } from '../Schedule/ScheduleSendMenu';
import { renderMarkdownInline } from '../../lib/markdown';
import type { ChatMessage } from '@/types/chat';

interface ForwardModalProps {
  message: ChatMessage;
  onClose: () => void;
  /** Called with selected recipient ids + optional comment. */
  onForward: (recipients: ForwardRecipient[], comment: string, whenIso?: string) => void;
}

export interface ForwardRecipient {
  id: string;
  name: string;
  avatarUrl: string | null;
  type: 'person' | 'channel';
}

const db = supabase as unknown as { from: (table: string) => any };

function useForwardCandidates(query: string) {
  return useQuery({
    queryKey: ['chat-v2', 'forward-candidates', query],
    queryFn: async () => {
      const out: ForwardRecipient[] = [];
      const { data: profiles } = await db
        .from('profiles')
        .select('id, full_name, avatar_url, email')
        .order('full_name', { ascending: true })
        .limit(40);
      for (const p of (profiles ?? []) as any[]) {
        out.push({
          id: `person:${p.id}`,
          name: p.full_name || p.email || 'Unknown',
          avatarUrl: p.avatar_url ?? null,
          type: 'person',
        });
      }
      const { data: channels } = await db
        .from('chat_conversations')
        .select('id, kind, title')
        .in('kind', ['channel', 'project_channel'])
        .order('title', { ascending: true })
        .limit(20);
      for (const c of (channels ?? []) as any[]) {
        out.push({
          id: `channel:${c.id}`,
          name: c.title || 'Channel',
          avatarUrl: null,
          type: 'channel',
        });
      }
      const q = query.trim().toLowerCase();
      return q
        ? out.filter(r => r.name.toLowerCase().includes(q))
        : out;
    },
    staleTime: 60_000,
  });
}

export function ForwardModal({ message, onClose, onForward }: ForwardModalProps) {
  const [query, setQuery] = useState('');
  const [recipients, setRecipients] = useState<ForwardRecipient[]>([]);
  const [comment, setComment] = useState('');
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const scheduleAnchorRef = useRef<HTMLButtonElement>(null);
  const [showSuggest, setShowSuggest] = useState(true);

  const candidates = useForwardCandidates(query);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose(); }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [onClose]);

  const handleAdd = (r: ForwardRecipient) => {
    setRecipients(prev => (prev.some(p => p.id === r.id) ? prev : [...prev, r]));
    setQuery('');
  };
  const handleRemove = (id: string) => {
    setRecipients(prev => prev.filter(r => r.id !== id));
  };

  const filtered = useMemo(
    () => (candidates.data ?? []).filter(c => !recipients.some(r => r.id === c.id)),
    [candidates.data, recipients],
  );

  const canForward = recipients.length > 0;
  const handleForward = (whenIso?: string) => {
    if (!canForward) return;
    onForward(recipients, comment, whenIso);
  };
  const handleCopyLink = () => {
    void navigator.clipboard?.writeText(`message:${message.id}`);
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Forward message"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--cv2-bg-overlay)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '8vh',
        zIndex: 'var(--cv2-modal-z, 1000)' as any,
      }}
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          width: 560,
          maxHeight: '84vh',
          overflowY: 'auto',
          background: 'var(--cv2-bg-modal)',
          border: '1px solid var(--cv2-border-strong)',
          borderRadius: 'var(--cv2-radius-lg)',
          boxShadow: 'var(--cv2-shadow-modal)',
          fontFamily: 'var(--cv2-font)',
          color: 'var(--cv2-text)',
          padding: 20,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--cv2-text-strong)' }}>
            Forward this private message
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              width: 28, height: 28,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              background: 'transparent', color: 'var(--cv2-text-subtle)',
              border: 'none', borderRadius: 'var(--cv2-radius-sm)', cursor: 'pointer',
            }}
          >
            <XIcon size={16} />
          </button>
        </div>

        <RecipientField
          recipients={recipients}
          query={query}
          onQuery={v => { setQuery(v); setShowSuggest(true); }}
          onRemove={handleRemove}
          onFocus={() => setShowSuggest(true)}
        />

        {showSuggest && (
          <div
            style={{
              marginTop: 6,
              maxHeight: 260,
              overflowY: 'auto',
              border: '1px solid var(--cv2-border-strong)',
              borderRadius: 'var(--cv2-radius-md)',
              background: 'var(--cv2-bg-modal)',
            }}
          >
            {filtered.slice(0, 8).map(c => (
              <SuggestRow key={c.id} recipient={c} onAdd={() => handleAdd(c)} />
            ))}
            {filtered.length === 0 && (
              <div style={{ padding: 14, fontSize: 13, color: 'var(--cv2-text-muted)' }}>
                No matches.
              </div>
            )}
          </div>
        )}

        <div style={{ marginTop: 14 }}>
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder="Add a message, if you'd like."
            rows={3}
            style={{
              width: '100%',
              minHeight: 72,
              padding: '10px 12px',
              background: 'var(--cv2-bg-input)',
              color: 'var(--cv2-text)',
              border: '1px solid var(--cv2-border-strong)',
              borderRadius: 'var(--cv2-radius-sm)',
              fontFamily: 'var(--cv2-font)',
              fontSize: 14,
              resize: 'vertical',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <SourceMessagePreview message={message} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 }}>
          <button
            type="button"
            onClick={handleCopyLink}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              height: 36, padding: '0 14px',
              background: 'transparent', color: 'var(--cv2-text)',
              border: '1px solid var(--cv2-border-strong)',
              borderRadius: 'var(--cv2-radius-sm)',
              fontFamily: 'inherit', fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}
          >
            <CopyLinkIcon size={14} />
            Copy Link
          </button>
          <div
            style={{
              display: 'inline-flex', alignItems: 'stretch',
              background: canForward ? 'var(--cv2-success)' : 'transparent',
              color: canForward ? 'var(--ds-text-inverse, #FFFFFF)' : 'var(--cv2-text-muted)',
              border: canForward
                ? '1px solid var(--cv2-success)'
                : '1px solid var(--cv2-border-strong)',
              borderRadius: 'var(--cv2-radius-sm)',
              overflow: 'hidden',
            }}
          >
            <button
              type="button"
              disabled={!canForward}
              onClick={() => handleForward()}
              style={{
                padding: '0 16px', height: 36,
                background: 'transparent', color: 'inherit', border: 'none',
                fontFamily: 'inherit', fontSize: 14, fontWeight: 700,
                cursor: canForward ? 'pointer' : 'not-allowed',
              }}
            >
              Forward
            </button>
            <span aria-hidden="true" style={{ width: 1, background: canForward ? 'var(--ds-surface, rgba(255,255,255,0.25))' : 'var(--cv2-border-strong)' }} />
            <button
              ref={scheduleAnchorRef}
              type="button"
              disabled={!canForward}
              onClick={() => setScheduleOpen(true)}
              aria-label="Schedule forward"
              style={{
                width: 30, height: 36,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                background: 'transparent', color: 'inherit', border: 'none',
                cursor: canForward ? 'pointer' : 'not-allowed',
              }}
            >
              <ChevronDownIcon size={12} />
            </button>
          </div>
        </div>
        {scheduleOpen && (
          <ScheduleSendMenu
            anchorRef={scheduleAnchorRef}
            onPick={iso => {
              setScheduleOpen(false);
              handleForward(iso);
            }}
            onClose={() => setScheduleOpen(false)}
          />
        )}
      </div>
    </div>,
    document.body,
  );
}

function RecipientField({
  recipients,
  query,
  onQuery,
  onRemove,
  onFocus,
}: {
  recipients: ForwardRecipient[];
  query: string;
  onQuery: (v: string) => void;
  onRemove: (id: string) => void;
  onFocus: () => void;
}) {
  return (
    <label
      style={{
        display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap',
        minHeight: 40, padding: '6px 10px',
        background: 'var(--cv2-bg-input)',
        border: '1px solid var(--cv2-accent)',
        borderRadius: 'var(--cv2-radius-sm)',
      }}
    >
      {recipients.length > 1 && (
        <span
          style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 22, height: 22, fontSize: 11, fontWeight: 700,
            background: 'var(--cv2-accent)', color: 'var(--ds-surface, #FFFFFF)',
            borderRadius: 11,
          }}
        >
          {recipients.length}
        </span>
      )}
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', flex: 1 }}>
        {recipients.map(r => (
          <Chip key={r.id} recipient={r} onRemove={() => onRemove(r.id)} />
        ))}
        <input
          type="text"
          value={query}
          onFocus={onFocus}
          onChange={e => onQuery(e.target.value)}
          placeholder={recipients.length === 0 ? 'Search for channel or person' : ''}
          style={{
            flex: 1,
            minWidth: 120,
            background: 'transparent',
            color: 'var(--cv2-text)',
            border: 'none',
            outline: 'none',
            fontFamily: 'var(--cv2-font)',
            fontSize: 14,
          }}
        />
      </span>
    </label>
  );
}

function Chip({ recipient, onRemove }: { recipient: ForwardRecipient; onRemove: () => void }) {
  return (
    <span
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        height: 24, padding: '0 6px',
        background: 'var(--cv2-bg-row-active)',
        color: 'var(--cv2-text-strong)',
        borderRadius: 4,
        fontSize: 13,
      }}
    >
      <span>{recipient.name}</span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${recipient.name}`}
        style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 16, height: 16, marginLeft: 2,
          background: 'transparent', color: 'var(--cv2-text-subtle)',
          border: 'none', borderRadius: 8, cursor: 'pointer',
        }}
      >
        <XIcon size={10} />
      </button>
    </span>
  );
}

function SuggestRow({
  recipient,
  onAdd,
}: {
  recipient: ForwardRecipient;
  onAdd: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onAdd}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        width: '100%', padding: '8px 12px',
        background: 'transparent', color: 'var(--cv2-text)',
        border: 'none', cursor: 'pointer',
        fontFamily: 'inherit', fontSize: 14, textAlign: 'left',
        transition: 'background var(--cv2-transition-fast)',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--cv2-bg-row-hover)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
    >
      <PresenceAvatar name={recipient.name} size={24} />
      <span style={{ fontWeight: 600, color: 'var(--cv2-text-strong)' }}>{recipient.name}</span>
      <span aria-hidden="true" style={{ opacity: 0.5 }}>›</span>
      <span style={{ color: 'var(--cv2-text-muted)' }}>{recipient.name}</span>
    </button>
  );
}

function SourceMessagePreview({ message }: { message: ChatMessage }) {
  return (
    <div
      style={{
        marginTop: 14,
        display: 'flex',
        gap: 8,
        padding: '10px 12px',
        borderLeft: '3px solid var(--cv2-border-strong)',
        background: 'transparent',
      }}
    >
      <PresenceAvatar name={message.authorName} size={28} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, color: 'var(--cv2-text-strong)', fontSize: 13 }}>
          {message.authorName}
        </div>
        <div
          style={{
            fontSize: 13,
            color: 'var(--cv2-text)',
            wordBreak: 'break-word',
            whiteSpace: 'pre-wrap',
          }}
          dangerouslySetInnerHTML={{ __html: renderMarkdownInline(message.bodyText) }}
        />
      </div>
    </div>
  );
}
