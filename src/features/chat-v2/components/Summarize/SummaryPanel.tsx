/**
 * SummaryPanel — right-rail panel that shows the AI summary for a chosen
 * scope. Two scopes:
 *   - 'range'  : a date-range summary for a channel/DM (shows date strip)
 *   - 'thread' : a summary of a single thread (no date strip; title reads
 *                "Summary of thread")
 *
 * Visual states:
 *   1) Loading — title + skeleton bars
 *   2) Content — writer-style sections that STREAM in section-by-section.
 *      Each section's body types out, then the next section starts.
 *      Each section has a chevron toggle that reveals "More details"
 *      bullets with [N] reference markers.
 *
 * Clicking a [N] marker calls `onJumpToReference(ref)`. The parent
 * (ChatV2Shell) decides whether to highlight the message in the main chat
 * or open the ThreadPane in this same right column.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { PresenceAvatar } from '../shared/PresenceAvatar';
import { ChevronDownIcon, LockClosedIcon, SummarizeIcon, XIcon } from '../shared/Icon';
import { useTypewriter } from './useTypewriter';
import type { SummaryPayload, SummaryReference, SummarySection } from './summarize.types';
import { useAuth } from '@/hooks/useAuth';
import { renderSummaryInline } from '../../lib/markdown';

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function shortDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  return `${MONTH_SHORT[m - 1]} ${d}`;
}
function longDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  // "April 21st"
  const suffix = (n: number) => {
    if (n >= 11 && n <= 13) return 'th';
    const last = n % 10;
    if (last === 1) return 'st';
    if (last === 2) return 'nd';
    if (last === 3) return 'rd';
    return 'th';
  };
  return `${MONTH_SHORT[m - 1]} ${d}${suffix(d)}`;
}

export type SummaryPanelMode = 'range' | 'thread';

interface SummaryPanelProps {
  mode: SummaryPanelMode;
  loading: boolean;
  /** Required for `mode='range'`. Ignored for thread. */
  rangeStart?: string;
  rangeEnd?: string;
  conversationTitle: string;
  conversationIsPrivate: boolean;
  payload: SummaryPayload | null;
  onJumpToReference: (ref: SummaryReference) => void;
  onClose: () => void;
  /** True when the typewriter has already finished once — caller lifts this
   *  flag up so re-mounting the panel (e.g. after a thread jump+back) does
   *  NOT re-run the streaming animation from scratch. */
  alreadyStreamed?: boolean;
  /** Called once when the typewriter completes the last section. */
  onStreamingComplete?: () => void;
}

export function SummaryPanel({
  mode,
  loading,
  rangeStart,
  rangeEnd,
  conversationTitle,
  conversationIsPrivate,
  payload,
  onJumpToReference,
  onClose,
  alreadyStreamed = false,
  onStreamingComplete,
}: SummaryPanelProps) {
  return (
    <section
      aria-label="AI summary"
      style={{
        gridArea: 'thread',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--cv2-bg-panel)',
        borderLeft: '1px solid var(--cv2-border-strong)',
        minWidth: 0,
        overflow: 'hidden',
      }}
    >
      <header
        style={{
          height: 'var(--cv2-header-h, 56px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          padding: '0 16px',
          borderBottom: '1px solid var(--cv2-border)',
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 15,
            fontWeight: 800,
            color: 'var(--cv2-text-strong)',
          }}
        >
          <SummarizeIcon size={16} />
          AI summary
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close summary"
          style={{
            width: 32,
            height: 32,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'transparent',
            color: 'var(--cv2-text-subtle)',
            border: 'none',
            borderRadius: 'var(--cv2-radius-sm)',
            cursor: 'pointer',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.background = 'var(--cv2-bg-row-hover)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.background = 'transparent';
          }}
        >
          <XIcon size={16} />
        </button>
      </header>
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '24px 24px 32px' }}>
        {loading || !payload ? (
          <LoadingState
            mode={mode}
            rangeStart={rangeStart}
            rangeEnd={rangeEnd}
            conversationTitle={conversationTitle}
            conversationIsPrivate={conversationIsPrivate}
          />
        ) : (
          <SummaryContent
            mode={mode}
            payload={payload}
            onJumpToReference={onJumpToReference}
            skipAnimation={alreadyStreamed}
            onStreamingComplete={onStreamingComplete}
          />
        )}
      </div>
    </section>
  );
}

function LoadingState({
  mode,
  rangeStart,
  rangeEnd,
  conversationTitle,
  conversationIsPrivate,
}: {
  mode: SummaryPanelMode;
  rangeStart?: string;
  rangeEnd?: string;
  conversationTitle: string;
  conversationIsPrivate: boolean;
}) {
  const title =
    mode === 'thread'
      ? (
        <>Summarizing this thread in <ConvoLabel title={conversationTitle} isPrivate={conversationIsPrivate} /></>
      ) : (
        <>Summarizing {longDate(rangeStart ?? '')} - {longDate(rangeEnd ?? '')} in <ConvoLabel title={conversationTitle} isPrivate={conversationIsPrivate} /></>
      );
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div
        style={{
          fontSize: 18,
          fontWeight: 800,
          color: 'var(--cv2-text-strong)',
          lineHeight: 1.35,
        }}
      >
        {title}
      </div>
      <div style={{ fontSize: 13, color: 'var(--cv2-text-muted)' }}>Sifting through messages…</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
        <Shimmer width="92%" />
        <Shimmer width="96%" />
        <Shimmer width="48%" />
      </div>
    </div>
  );
}

function Shimmer({ width }: { width: string }) {
  return (
    <div
      style={{
        width,
        height: 12,
        borderRadius: 6,
        background:
          'linear-gradient(90deg, var(--ds-surface, rgba(255,255,255,0.04)) 0%, var(--ds-surface, rgba(255,255,255,0.10)) 50%, var(--ds-surface, rgba(255,255,255,0.04)) 100%)',
        backgroundSize: '200% 100%',
        animation: 'cv2-summary-shimmer 1.6s ease-in-out infinite',
      }}
    />
  );
}

function SummaryContent({
  mode,
  payload,
  onJumpToReference,
  skipAnimation,
  onStreamingComplete,
}: {
  mode: SummaryPanelMode;
  payload: SummaryPayload;
  onJumpToReference: (ref: SummaryReference) => void;
  skipAnimation?: boolean;
  onStreamingComplete?: () => void;
}) {
  const refLookup = new Map(payload.references.map(r => [r.index, r]));
  // Self full name comes from the auth profile. Used by renderSummaryInline
  // to colour the caller's own mention pill differently from others.
  const { user } = useAuth();
  const selfFullName = useMemo(() => {
    const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;
    return typeof meta.full_name === 'string' ? meta.full_name : '';
  }, [user?.user_metadata]);
  // The LLM emits "@First Last" but the chat regex only matches one word.
  // Pass the full participant name list so the renderer can tokenise the
  // long forms first.
  const participantNames = useMemo(
    () => payload.participants.map(p => p.name).filter(n => !!n),
    [payload.participants],
  );
  // Section-by-section reveal: keep track of which sections have finished
  // streaming. activeSectionIdx is the index currently animating. When the
  // caller says streaming already finished once, jump straight to "all done"
  // so re-mounts (e.g. after a thread jump+back) don't re-run the typewriter.
  const totalSections = payload.sections.length;
  const [activeSectionIdx, setActiveSectionIdx] = useState(
    skipAnimation ? totalSections : 0,
  );
  // Reset whenever a fresh payload arrives.
  useEffect(() => {
    setActiveSectionIdx(skipAnimation ? totalSections : 0);
  }, [payload, skipAnimation, totalSections]);
  // Once we have run past the last section, tell the caller exactly once so
  // the lifted "alreadyStreamed" flag can flip.
  useEffect(() => {
    if (!skipAnimation && activeSectionIdx >= totalSections && totalSections > 0) {
      onStreamingComplete?.();
    }
  }, [activeSectionIdx, totalSections, skipAnimation, onStreamingComplete]);
  const handleSectionDone = (idx: number) => {
    setActiveSectionIdx(prev => Math.max(prev, idx + 1));
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <SummaryHeader mode={mode} payload={payload} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {payload.sections.map((sec, i) => {
          if (i > activeSectionIdx) {
            // Not yet — render only the title to suggest forthcoming content.
            return <SectionTitleOnly key={sec.id} title={sec.title} />;
          }
          const animate = !skipAnimation && i === activeSectionIdx;
          return (
            <SectionCard
              key={sec.id}
              section={sec}
              refLookup={refLookup}
              onJump={onJumpToReference}
              animate={animate}
              onDone={animate ? () => handleSectionDone(i) : undefined}
              participantNames={participantNames}
              selfFullName={selfFullName}
            />
          );
        })}
      </div>
    </div>
  );
}

function SummaryHeader({ mode, payload }: { mode: SummaryPanelMode; payload: SummaryPayload }) {
  const titleText = mode === 'thread' ? 'Summary of thread' : `Summary of ${payload.conversationTitle}`;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div
        style={{
          fontSize: 22,
          fontWeight: 800,
          color: 'var(--cv2-text-strong)',
          lineHeight: 1.25,
        }}
      >
        {titleText}
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          fontSize: 13,
          color: 'var(--cv2-text-muted)',
        }}
      >
        <div>
          {mode === 'thread'
            ? <ConvoLabel title={payload.conversationTitle} isPrivate={payload.conversationIsPrivate} />
            : `${shortDate(payload.rangeStart)} - ${shortDate(payload.rangeEnd)}`}
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <span aria-hidden="true">💬</span>
            {payload.messageCount}
          </span>
          <AvatarStack people={payload.participants} />
          <span>{payload.participants.length}</span>
        </div>
      </div>
    </div>
  );
}

function AvatarStack({ people }: { people: SummaryPayload['participants'] }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center' }}>
      {people.map((p, i) => (
        <div
          key={p.id}
          style={{
            marginLeft: i === 0 ? 0 : -8,
            borderRadius: '50%',
            border: '2px solid var(--cv2-bg-panel)',
            display: 'inline-flex',
          }}
        >
          <PresenceAvatar name={p.name || 'Member'} size={20} />
        </div>
      ))}
    </div>
  );
}

function SectionTitleOnly({ title }: { title: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, opacity: 0.55 }}>
      <div
        style={{
          fontSize: 15,
          fontWeight: 800,
          color: 'var(--cv2-text-strong)',
          lineHeight: 1.35,
        }}
      >
        {title}
      </div>
      <Shimmer width="80%" />
    </div>
  );
}

function SectionCard({
  section,
  refLookup,
  onJump,
  animate,
  onDone,
  participantNames,
  selfFullName,
}: {
  section: SummarySection;
  refLookup: Map<number, SummaryReference>;
  onJump: (ref: SummaryReference) => void;
  animate: boolean;
  onDone?: () => void;
  participantNames: string[];
  selfFullName: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const { visible, done } = useTypewriter(section.body, { enabled: animate });
  // Notify the parent the moment streaming finishes so the next section can
  // start. After the first run `done` stays true and the effect no-ops.
  useEffect(() => {
    if (animate && done) onDone?.();
  }, [animate, done, onDone]);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div
          style={{
            fontSize: 15,
            fontWeight: 800,
            color: 'var(--cv2-text-strong)',
            lineHeight: 1.35,
          }}
        >
          {section.title}
        </div>
        {section.details.length > 0 && (
          <button
            type="button"
            onClick={() => setExpanded(v => !v)}
            aria-expanded={expanded}
            aria-label={expanded ? 'Hide details' : 'Show details'}
            style={{
              width: 28,
              height: 28,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'transparent',
              border: 'none',
              borderRadius: 'var(--cv2-radius-sm)',
              color: 'var(--cv2-text-subtle)',
              cursor: 'pointer',
              transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 160ms ease, background 120ms ease',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.background = 'var(--cv2-bg-row-hover)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = 'transparent';
            }}
          >
            <ChevronDownIcon size={16} />
          </button>
        )}
      </div>
      {/* During streaming we render plain text + caret to keep the typewriter
          intact. Once done, swap to the rich HTML pass so @mention pills,
          bold/italic/code render properly. */}
      {animate && !done ? (
        <div style={{ fontSize: 14, lineHeight: 1.55, color: 'var(--cv2-text)' }}>
          {visible}
          <Caret />
        </div>
      ) : (
        <div
          style={{ fontSize: 14, lineHeight: 1.55, color: 'var(--cv2-text)' }}
          dangerouslySetInnerHTML={{ __html: renderSummaryInline(section.body, participantNames, selfFullName) }}
        />
      )}
      {done && expanded && section.details.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--cv2-text-muted)' }}>
            More details
          </div>
          <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {section.details.map((d, i) => {
              const ref = refLookup.get(d.refIndex);
              return (
                <li
                  key={`${section.id}-${i}`}
                  style={{ fontSize: 13, lineHeight: 1.55, color: 'var(--cv2-text)' }}
                >
                  <span
                    dangerouslySetInnerHTML={{
                      __html: renderSummaryInline(d.text, participantNames, selfFullName),
                    }}
                  />{' '}
                  {ref && (
                    <ReferenceMarker
                      index={ref.index}
                      onClick={() => onJump(ref)}
                    />
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

function Caret() {
  return (
    <span
      aria-hidden="true"
      style={{
        display: 'inline-block',
        width: 7,
        height: 14,
        marginLeft: 2,
        verticalAlign: 'text-bottom',
        background: 'var(--cv2-text-muted)',
        opacity: 0.65,
        borderRadius: 1,
        animation: 'cv2-summary-caret 1s steps(1, end) infinite',
      }}
    />
  );
}

function ReferenceMarker({ index, onClick }: { index: number; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Jump to reference ${index}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 18,
        height: 18,
        padding: '0 5px',
        background: 'rgba(29, 155, 209, 0.18)',
        color: 'var(--ds-link, #0C66E4)',
        border: 'none',
        borderRadius: 4,
        fontSize: 11,
        fontWeight: 700,
        cursor: 'pointer',
        verticalAlign: 'middle',
      }}
    >
      [{index}]
    </button>
  );
}

function ConvoLabel({ title, isPrivate }: { title: string; isPrivate: boolean }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      {isPrivate && <LockClosedIcon size={14} />}
      {title}
    </span>
  );
}
