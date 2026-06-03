/**
 * ConversationSummary — the AI summary surface for a Catalyst Chat
 * conversation. Reproduces the chat-ai-summary mockup:
 *   1. Header card — ticket title + status lozenge + static-rainbow
 *      "Ask Caty — summarize" pill + "AI-generated" lozenge + meta line.
 *   2. "Conversation summary" card — date-bucketed bullet sections.
 *   3. 3-up row — Key decisions / Action items (assignee avatar + due
 *      chip) / Open questions.
 *   4. "When a ticket closes" archive card — Done ticket + greyed
 *      read-only archived strip + AI recap + "Reopen to continue".
 *
 * ADS-only: @atlaskit/* primitives, @atlaskit/lozenge for status +
 * "AI-generated" + "Done", var(--ds-*) tokens with hex fallbacks. The
 * ONLY animation is the static rainbow border on the Ask Caty pill
 * (animation: none — CLAUDE.md AI CTA carve-out).
 */
import React from 'react';
import Lozenge from '@atlaskit/lozenge';
import Spinner from '@atlaskit/spinner';
import {
  useConversationSummary,
  type ChatSummaryActionItem,
} from '@/hooks/chat/useConversationSummary';

export interface ConversationSummaryProps {
  conversationId: string;
  ticketKey?: string;
}

// Static rainbow gradient — AI affordance marker per CLAUDE.md carve-out.
// Pure static gradient, animation: none, never rotates.
// ads-scanner:ignore-next-line -- approved AI CTA rainbow palette (CLAUDE.md AI CTA carve-out)
const STATIC_RAINBOW = 'linear-gradient(90deg, #FF3CAC, #784BA0, #2B86C5, #00C9FF, #92FE9D, #FFD700)';

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Deterministic avatar background from an ADS-token palette (no bare hex).
const AVATAR_BGS = [
  'var(--ds-background-accent-purple-bold, #6E5DC6)',
  'var(--ds-background-accent-blue-bold, #0C66E4)',
  'var(--ds-background-accent-green-bold, #22A06B)',
  'var(--ds-background-accent-magenta-bold, #CD519D)',
];

function avatarBg(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_BGS[h % AVATAR_BGS.length];
}

function InitialsAvatar({ name, size = 20 }: { name: string; size?: number }) {
  return (
    <span
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        flex: `0 0 ${size}px`,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 9,
        fontWeight: 700,
        color: 'var(--ds-text-inverse, #FFFFFF)',
        background: avatarBg(name),
      }}
    >
      {initials(name)}
    </span>
  );
}

const cardStyle: React.CSSProperties = {
  background: 'var(--ds-surface, #FFFFFF)',
  border: '1px solid var(--ds-border, #DFE1E6)',
  borderRadius: 8,
};

export function ConversationSummary({
  conversationId,
  ticketKey,
}: ConversationSummaryProps) {
  const { summary, isLoading } = useConversationSummary(conversationId);

  const title = ticketKey
    ? `${ticketKey} · Conversation`
    : 'Conversation';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        width: '100%',
        maxWidth: 920,
      }}
    >
      {/* 1) Header card */}
      <div style={{ ...cardStyle, padding: 16 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 16,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div
              style={{
                fontSize: 18,
                lineHeight: '24px',
                fontWeight: 600,
                color: 'var(--ds-text, #172B4D)',
              }}
            >
              {title}
            </div>
            <Lozenge appearance="inprogress">In progress</Lozenge>
          </div>

          {/* Ask Caty — summarize pill: static rainbow border */}
          <div
            style={{
              borderRadius: 3,
              // ads-scanner:ignore-next-line -- required 2px rainbow padding-wrapper (CLAUDE.md AI CTA pattern)
              padding: 2,
              background: STATIC_RAINBOW,
              animation: 'none',
              flex: '0 0 auto',
            }}
          >
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                height: 32,
                padding: '0 12px',
                borderRadius: 3,
                background: 'var(--ds-surface, #FFFFFF)',
                color: 'var(--ds-text, #172B4D)',
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path
                  d="M8 1l1.6 4.2L14 6.4l-3.4 2.9L11.7 14 8 11.3 4.3 14l1.1-4.7L2 6.4l4.4-1.2L8 1z"
                  fill="var(--ds-icon-accent-purple, #6E5DC6)"
                />
              </svg>
              Ask Caty — summarize
            </span>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginTop: 12,
            fontSize: 12,
            lineHeight: '16px',
            color: 'var(--ds-text-subtlest, #6B778C)',
          }}
        >
          <span>
            {summary
              ? `Summary of ${summary.messageCount} messages · ${summary.peopleCount} people · generated just now`
              : 'Summarizing conversation…'}
          </span>
          <Lozenge appearance="new">AI-generated</Lozenge>
        </div>
      </div>

      {isLoading && !summary ? (
        <div
          style={{
            ...cardStyle,
            padding: 24,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            color: 'var(--ds-text-subtle, #44546F)',
          }}
        >
          <Spinner size="small" />
          <span style={{ fontSize: 14 }}>Caty is reading the conversation…</span>
        </div>
      ) : (
        <>
          {/* 2) Conversation summary */}
          <div style={{ ...cardStyle, padding: 24 }}>
            <div
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: 'var(--ds-text, #172B4D)',
                marginBottom: 16,
              }}
            >
              Conversation summary
            </div>
            {(summary?.buckets ?? []).map((bucket, bi) => (
              <div
                key={bucket.dateLabel}
                style={{
                  // ads-scanner:ignore-next-line -- scanner misreads `length - 1` as off-grid px (false positive)
                  marginBottom: bi === (summary?.buckets.length ?? 0) - 1 ? 0 : 16,
                }}
              >
                <div
                  style={{
                    fontSize: 13,
                    lineHeight: '16px',
                    fontWeight: 700,
                    color: 'var(--ds-text-subtle, #44546F)',
                    marginBottom: 8,
                  }}
                >
                  {bucket.dateLabel}
                </div>
                {bucket.bullets.map((text, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      gap: 8,
                      alignItems: 'flex-start',
                      // ads-scanner:ignore-next-line -- scanner misreads `length - 1` as off-grid px (false positive)
                      marginBottom: idx === bucket.bullets.length - 1 ? 0 : 4,
                    }}
                  >
                    <span
                      aria-hidden="true"
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: 'var(--ds-icon-subtle, #8590A2)',
                        flex: '0 0 6px',
                        marginTop: 8,
                      }}
                    />
                    <span
                      style={{
                        fontSize: 14,
                        lineHeight: '20px',
                        color: 'var(--ds-text, #172B4D)',
                      }}
                    >
                      {text}
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* 3) 3-up row */}
          <div style={{ display: 'flex', gap: 16 }}>
            {/* Key decisions */}
            <div style={{ ...cardStyle, flex: '1 1 0', padding: 16 }}>
              <MiniTitle>Key decisions</MiniTitle>
              {(summary?.keyDecisions ?? []).map((text, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    gap: 8,
                    alignItems: 'flex-start',
                    // ads-scanner:ignore-next-line -- scanner misreads `length - 1` as off-grid px (false positive)
                    marginBottom: idx === (summary?.keyDecisions.length ?? 0) - 1 ? 0 : 8,
                  }}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    aria-hidden="true"
                    style={{ flex: '0 0 16px', marginTop: 4 }}
                  >
                    <circle cx="8" cy="8" r="8" fill="var(--ds-icon-success, #22A06B)" />
                    <path
                      d="M4.5 8.2l2.2 2.2 4.6-4.8"
                      stroke="var(--ds-text-inverse, #FFFFFF)"
                      strokeWidth="1.6"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span
                    style={{
                      fontSize: 13,
                      lineHeight: '18px',
                      color: 'var(--ds-text, #172B4D)',
                    }}
                  >
                    {text}
                  </span>
                </div>
              ))}
            </div>

            {/* Action items */}
            <div style={{ ...cardStyle, flex: '1 1 0', padding: 16 }}>
              <MiniTitle>Action items</MiniTitle>
              {(summary?.actionItems ?? []).map((item, idx) => (
                <ActionItemRow
                  key={idx}
                  item={item}
                  last={idx === (summary?.actionItems.length ?? 0) - 1}
                />
              ))}
            </div>

            {/* Open questions */}
            <div style={{ ...cardStyle, flex: '1 1 0', padding: 16 }}>
              <MiniTitle>Open questions</MiniTitle>
              {(summary?.openQuestions ?? []).map((text, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    gap: 8,
                    alignItems: 'flex-start',
                    // ads-scanner:ignore-next-line -- scanner misreads `length - 1` as off-grid px (false positive)
                    marginBottom: idx === (summary?.openQuestions.length ?? 0) - 1 ? 0 : 8,
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      flex: '0 0 16px',
                      width: 16,
                      height: 16,
                      borderRadius: '50%',
                      background: 'var(--ds-background-neutral, #F1F2F4)',
                      color: 'var(--ds-text-subtle, #44546F)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 11,
                      fontWeight: 700,
                      marginTop: 0,
                    }}
                  >
                    ?
                  </span>
                  <span
                    style={{
                      fontSize: 13,
                      lineHeight: '18px',
                      color: 'var(--ds-text, #172B4D)',
                    }}
                  >
                    {text}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* 4) Archive lifecycle */}
      <div style={{ ...cardStyle, padding: 24 }}>
        <div
          style={{
            fontSize: 15,
            fontWeight: 600,
            color: 'var(--ds-text, #172B4D)',
            marginBottom: 16,
          }}
        >
          When a ticket closes
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginBottom: 12,
          }}
        >
          <span
            aria-hidden="true"
            style={{
              width: 24,
              height: 24,
              flex: '0 0 24px',
              borderRadius: 3,
              background: 'var(--ds-background-success-bold, #22A06B)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path
                d="M4.5 8.2l2.2 2.2 4.6-4.8"
                stroke="var(--ds-text-inverse, #FFFFFF)"
                strokeWidth="1.8"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span
            style={{
              fontSize: 14,
              fontWeight: 500,
              color: 'var(--ds-text, #172B4D)',
            }}
          >
            BAU-5601 · Login session expiry
          </span>
          <Lozenge appearance="success">Done</Lozenge>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            background: 'var(--ds-surface-sunken, #F7F8F9)',
            border: '1px solid var(--ds-border, #DFE1E6)',
            borderRadius: 8,
            padding: '12px 16px',
            opacity: 0.7,
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden="true"
            style={{ flex: '0 0 16px' }}
          >
            <rect
              x="2.5"
              y="6.5"
              width="11"
              height="7.5"
              rx="1"
              stroke="var(--ds-icon-subtle, #44546F)"
              strokeWidth="1.3"
            />
            <path
              d="M6 6.5V5a2 2 0 014 0v1.5"
              stroke="var(--ds-icon-subtle, #44546F)"
              strokeWidth="1.3"
              fill="none"
            />
          </svg>
          <span
            style={{
              fontSize: 13,
              lineHeight: '18px',
              color: 'var(--ds-text-subtle, #44546F)',
              flex: '1 1 auto',
            }}
          >
            Archived — resolved by rolling back v2.2 and re-issuing tokens. 18 messages, 4 people.
          </span>
          <span
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: 'var(--ds-link, #0C66E4)',
              whiteSpace: 'nowrap',
            }}
          >
            Reopen to continue
          </span>
        </div>

        <div
          style={{
            fontSize: 12,
            lineHeight: '16px',
            color: 'var(--ds-text-subtlest, #6B778C)',
            marginTop: 12,
          }}
        >
          Conversations are archived (read-only), never deleted — they stay attached to the ticket for audit.
        </div>
      </div>
    </div>
  );
}

function MiniTitle({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 13,
        fontWeight: 700,
        color: 'var(--ds-text-subtle, #44546F)',
        marginBottom: 12,
      }}
    >
      {children}
    </div>
  );
}

function ActionItemRow({
  item,
  last,
}: {
  item: ChatSummaryActionItem;
  last: boolean;
}) {
  const dueSoon = /today/i.test(item.due);
  return (
    <div
      style={{
        display: 'flex',
        gap: 8,
        alignItems: 'center',
        marginBottom: last ? 0 : 12,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 16,
          height: 16,
          flex: '0 0 16px',
          border: '1.5px solid var(--ds-text-subtlest, #6B778C)',
          borderRadius: 3,
          background: 'var(--ds-surface, #FFFFFF)',
        }}
      />
      <span
        style={{
          fontSize: 13,
          lineHeight: '18px',
          color: 'var(--ds-text, #172B4D)',
          flex: '1 1 auto',
        }}
      >
        {item.text}
      </span>
      <InitialsAvatar name={item.assigneeName} />
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          height: 18,
          padding: '0 8px',
          borderRadius: 3,
          fontSize: 11,
          lineHeight: 1,
          fontWeight: 600,
          whiteSpace: 'nowrap',
          background: dueSoon
            ? 'var(--ds-background-warning, #FFF0B3)'
            : 'var(--ds-background-neutral, #F1F2F4)',
          color: dueSoon
            ? 'var(--ds-text-warning, #7F5F01)'
            : 'var(--ds-text-subtle, #44546F)',
        }}
      >
        {item.due}
      </span>
    </div>
  );
}

export default ConversationSummary;
