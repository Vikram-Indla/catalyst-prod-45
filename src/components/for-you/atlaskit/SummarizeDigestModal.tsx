/**
 * SummarizeDigestModal — "Ask Caty digest" outlier feature.
 *
 * Marketing positioning (from council 2026-05-31):
 *   1. "From N mentions to N actions in 30 seconds" — quantified time savings
 *   2. "Never miss the @cc that mattered" — risk reduction via cross-thread surface
 *   3. "Action, not anxiety" — interactive triage, not just a wall of text
 *
 * Differentiator vs Jira AI / ChatGPT: output is NOT prose. Each summarized
 * mention is its own triage row with inline Reply / Dismiss / Open ticket
 * actions, so the user clears their inbox DURING the summary, not after.
 *
 * Implementation notes:
 *   - Parallel summarization via existing ai-improve-comment edge function,
 *     concurrency capped at 5 to avoid hammering the backend.
 *   - Each row tracks its own phase: 'loading' | 'done' | 'error'.
 *   - Reply action delegates to the parent so reply happens in the original
 *     feed card (single source of truth — no duplicate composer state).
 */
import React, { useEffect, useMemo, useState } from 'react';
import ModalDialog, { ModalBody, ModalFooter, ModalHeader } from '@atlaskit/modal-dialog';
import Button from '@atlaskit/button/new';
import Spinner from '@atlaskit/spinner';
import Avatar from '@atlaskit/avatar';
import { token } from '@atlaskit/tokens';
import { fetchFunction } from '@/integrations/supabase/functionsRouter';

const ASK_CATY_RAINBOW = `conic-gradient(
  from 0deg,
  #FF3CAC 0deg,
  #784BA0 60deg,
  #2B86C5 120deg,
  #00C9FF 180deg,
  #92FE9D 240deg,
  #FFD700 300deg,
  #FF3CAC 360deg
)`;

export interface DigestMention {
  commentId: string;
  mentionerName: string;
  mentionerAvatarUrl?: string;
  issueKey: string;
  issueSummary: string;
  commentBody: string;
}

interface DigestRowState {
  phase: 'loading' | 'done' | 'error';
  summary: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  mentions: DigestMention[];
  onReply: (commentId: string) => void;
  onDismiss: (commentId: string) => void;
  onOpenTicket: (issueKey: string) => void;
  /** Render as an in-page bordered panel instead of a modal overlay. */
  inline?: boolean;
}

async function summarizeMention(m: DigestMention, signal?: AbortSignal): Promise<string> {
  const res = await fetchFunction('ai-improve-comment', {
    method: 'POST',
    body: JSON.stringify({
      current_comment: m.commentBody,
      issue_summary: m.issueSummary,
    }),
    headers: { 'Content-Type': 'application/json' },
    signal,
  });
  if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = '';
  let fullText = '';
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let nl;
    while ((nl = buf.indexOf('\n')) !== -1) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line) continue;
      try {
        const ev = JSON.parse(line);
        if (ev.type === 'text' && typeof ev.delta === 'string') {
          fullText += ev.delta;
        } else if (ev.type === 'done') {
          if (ev.full_text) fullText = ev.full_text;
          return fullText;
        } else if (ev.type === 'error') {
          throw new Error(ev.message ?? 'AI error');
        }
      } catch (parseErr) {
        if (parseErr instanceof SyntaxError) continue;
        throw parseErr;
      }
    }
  }
  return fullText;
}

export function SummarizeDigestModal({
  open, onClose, mentions, onReply, onDismiss, onOpenTicket, inline = false,
}: Props) {
  const [states, setStates] = useState<Record<string, DigestRowState>>({});

  // When the modal opens, fire summarization in parallel (cap 5 concurrent).
  useEffect(() => {
    if (!open || mentions.length === 0) return;
    const ctrl = new AbortController();
    setStates(Object.fromEntries(mentions.map(m => [m.commentId, { phase: 'loading' as const, summary: '' }])));

    // Concurrency lowered 5 → 2 (2026-05-31) to avoid backend overload that
    // caused mid-batch failures in production. The digest can take a few
    // extra seconds — the trade is worth it for reliable summaries.
    const CONCURRENCY = 2;
    let cursor = 0;
    const runNext = async (): Promise<void> => {
      const idx = cursor++;
      if (idx >= mentions.length) return;
      const m = mentions[idx];
      try {
        const summary = await summarizeMention(m, ctrl.signal);
        setStates(prev => ({ ...prev, [m.commentId]: { phase: 'done', summary } }));
      } catch {
        setStates(prev => ({ ...prev, [m.commentId]: { phase: 'error', summary: '' } }));
      }
      return runNext();
    };
    const workers = Array.from({ length: Math.min(CONCURRENCY, mentions.length) }, () => runNext());
    Promise.all(workers).catch(() => {/* ignored — per-row errors handled above */});

    return () => ctrl.abort();
  }, [open, mentions]);

  const stats = useMemo(() => {
    const total = mentions.length;
    const done = Object.values(states).filter(s => s.phase === 'done').length;
    const errors = Object.values(states).filter(s => s.phase === 'error').length;
    return { total, done, errors };
  }, [mentions, states]);

  if (!open) return null;

  // Shared content — identical in modal and inline modes; only the chrome differs.
  const titleRow = (
    /* Rainbow border around the title row — keeps the AI affordance visible. */
    <div style={{
      display: 'inline-flex',
      padding: 1.8,
      borderRadius: 20,
      background: ASK_CATY_RAINBOW,
    }}>
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '0 12px',
        borderRadius: 17,
        background: '#FFFFFF',
      }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: token('color.text', '#172B4D') }}>
          ✦ Caty's digest
        </span>
        <span style={{ fontSize: 13, color: token('color.text.subtle', '#44546F') }}>
          {stats.done} of {stats.total} mentions summarized
        </span>
      </div>
    </div>
  );

  const body = mentions.length === 0 ? (
    <div style={{ padding: 24, textAlign: 'center', color: token('color.text.subtle', '#44546F') }}>
      Nothing to summarize. Caty needs at least one mention to triage.
    </div>
  ) : (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {mentions.map(m => {
        const state = states[m.commentId] ?? { phase: 'loading' as const, summary: '' };
        return (
          <DigestRow
            key={m.commentId}
            mention={m}
            state={state}
            onReply={() => { onReply(m.commentId); onClose(); }}
            onDismiss={() => onDismiss(m.commentId)}
            onOpenTicket={() => { onOpenTicket(m.issueKey); onClose(); }}
          />
        );
      })}
    </div>
  );

  const footerNote = (
    <span style={{ fontSize: 12, color: token('color.text.subtlest', '#626F86'), marginInlineEnd: 'auto' }}>
      Powered by Caty
      {stats.errors > 0 && ` · ${stats.errors} shown as original (AI unavailable)`}
    </span>
  );

  // Inline mode — an in-page bordered panel mounted at the top of the feed,
  // NOT a modal overlay. Pushes the feed cards down; × / Close collapses it.
  if (inline) {
    return (
      <div
        role="region"
        aria-label="Caty's digest"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          border: `1px solid ${token('color.border', 'rgba(11,18,14,0.14)')}`,
          borderRadius: 8,
          padding: 12,
          background: token('elevation.surface', '#FFFFFF'),
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          {titleRow}
          <button
            type="button"
            aria-label="Close digest"
            onClick={onClose}
            style={{
              all: 'unset',
              cursor: 'pointer',
              padding: '2px 8px',
              borderRadius: 3,
              fontSize: 18,
              lineHeight: 1,
              color: token('color.text.subtle', '#44546F'),
            }}
          >
            ×
          </button>
        </div>
        {body}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {footerNote}
          <Button appearance="subtle" onClick={onClose}>Close</Button>
        </div>
      </div>
    );
  }

  return (
    <ModalDialog onClose={onClose} width="large">
      <ModalHeader>{titleRow}</ModalHeader>
      <ModalBody>{body}</ModalBody>
      <ModalFooter>
        {footerNote}
        <Button appearance="subtle" onClick={onClose}>Close</Button>
      </ModalFooter>
    </ModalDialog>
  );
}

function DigestRow({
  mention, state, onReply, onDismiss, onOpenTicket,
}: {
  mention: DigestMention;
  state: DigestRowState;
  onReply: () => void;
  onDismiss: () => void;
  onOpenTicket: () => void;
}) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        padding: 12,
        borderRadius: 6,
        border: `1px solid ${token('color.border', '#DFE1E6')}`,
        background: hover
          ? token('elevation.surface.hovered', '#F0F1F2')
          : token('elevation.surface', '#FFFFFF'),
        transition: 'background-color 120ms ease',
      }}
    >
      <Avatar size="medium" name={mention.mentionerName} src={mention.mentionerAvatarUrl} />

      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Header line: author + ticket */}
        <div style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 6,
          fontSize: 13,
          marginBlockEnd: 6,
        }}>
          <span style={{ fontWeight: 600, color: token('color.text', '#172B4D') }}>{mention.mentionerName}</span>
          <span style={{ color: token('color.text.subtle', '#44546F') }}>on</span>
          <button
            type="button"
            onClick={onOpenTicket}
            style={{
              all: 'unset',
              cursor: 'pointer',
              color: token('color.text.brand', '#0052CC'),
              fontWeight: 600,
              fontFamily: 'var(--cp-font-mono, ui-monospace, "SF Mono", Menlo, Consolas, monospace)',
              fontSize: 12,
            }}
          >
            {mention.issueKey}
          </button>
          <span style={{ color: token('color.text.subtle', '#44546F'), overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
            — {mention.issueSummary}
          </span>
        </div>

        {/* Summary — skeleton while loading, prose when done, error message on failure */}
        <div style={{
          fontSize: 14,
          lineHeight: '20px',
          color: token('color.text', '#172B4D'),
          marginBlockEnd: 10,
          minHeight: 20,
        }}>
          {state.phase === 'loading' && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: token('color.text.subtle', '#44546F') }}>
              <Spinner size="xsmall" />
              Caty is reading…
            </div>
          )}
          {state.phase === 'done' && (state.summary || mention.commentBody.slice(0, 200))}
          {state.phase === 'error' && (
            <>
              {/* Graceful fallback — show the original comment without alarming the user.
                  AI failure is a backend issue, not something the user did wrong. */}
              <span style={{ color: token('color.text', '#172B4D') }}>
                {mention.commentBody.length > 240
                  ? `${mention.commentBody.slice(0, 240).trim()}…`
                  : mention.commentBody}
              </span>
              <span style={{
                display: 'block',
                marginBlockStart: 4,
                fontSize: 11,
                color: token('color.text.subtlest', '#626F86'),
              }}>
                AI summary unavailable — showing original
              </span>
            </>
          )}
        </div>

        {/* Triage actions — the outlier. Inline so the user actions DURING summary. */}
        <div style={{ display: 'flex', gap: 8 }}>
          <Button appearance="primary" spacing="compact" onClick={onReply}>Reply</Button>
          <Button appearance="subtle" spacing="compact" onClick={onDismiss}>Dismiss</Button>
          <Button appearance="subtle" spacing="compact" onClick={onOpenTicket}>Open ticket</Button>
        </div>
      </div>
    </div>
  );
}
