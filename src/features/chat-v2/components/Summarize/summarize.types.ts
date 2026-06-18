/**
 * Shared types for the AI Summarize feature.
 *
 * A SummarySection is one block in the writer-style summary (paragraph + optional
 * "more details" bullets). References ([1], [2]) point back to specific
 * messages in the conversation, so clicking a marker jumps the user to that
 * exact message — either in the main chat (highlight) or in its thread
 * (open ThreadPane in the same right column).
 */
import type { ChatMessage } from '@/types/chat';

export interface SummaryReference {
  /** 1-based marker shown to the user. */
  index: number;
  /** chat_messages.id — required so the jump can resolve a real row. */
  messageId: string;
  /**
   * If the target message is a thread reply, this is the parent message id
   * (so we can open the ThreadPane). Null for top-level chat messages.
   */
  parentMessageId: string | null;
  /** Short author + snippet for the bullet under "More details". */
  authorName: string;
  snippet: string;
}

export interface SummaryDetail {
  /** Bullet text; may contain @-mentions rendered by the markdown lib. */
  text: string;
  /** 1-based marker index this bullet cites. */
  refIndex: number;
}

export interface SummarySection {
  id: string;
  title: string;
  /** Writer-style paragraph rendered first. */
  body: string;
  /** Expanded "More details" bullets, each tied to a reference. */
  details: SummaryDetail[];
}

export interface SummaryPayload {
  /** Date range used to query messages (inclusive on both ends). */
  rangeStart: string; // ISO date
  rangeEnd: string;   // ISO date
  /** Conversation title at generation time. */
  conversationTitle: string;
  /** True for #private channels, drives the lock icon in the header. */
  conversationIsPrivate: boolean;
  /** Total raw messages analysed — drives the "39 messages" stat. */
  messageCount: number;
  /** Up to 6 participating member avatars for the header strip. */
  participants: Array<{ id: string; name: string; avatarUrl: string | null }>;
  /** Writer-style summary, top-to-bottom. */
  sections: SummarySection[];
  /** Lookup table for ref jumps. */
  references: SummaryReference[];
}

/**
 * Mock summary generator. Replace with a real LLM call when ready.
 *
 * Pulls a few message ids from the supplied range so the [1]/[2] jumps land
 * on something real in the user's history. Returns 3-5 sections.
 */
export function generateMockSummary(input: {
  conversationTitle: string;
  conversationIsPrivate: boolean;
  rangeStart: string;
  rangeEnd: string;
  messages: ChatMessage[];
  participants: Array<{ id: string; name: string; avatarUrl: string | null }>;
}): SummaryPayload {
  const { messages, participants, conversationTitle, conversationIsPrivate, rangeStart, rangeEnd } = input;
  // Pick the 6-10 most substantive messages (longest body) as reference anchors.
  const candidates = [...messages]
    .filter(m => !!m.bodyText && m.bodyText.trim().length > 0 && !m.deletedAt)
    .sort((a, b) => b.bodyText.length - a.bodyText.length)
    .slice(0, 10);

  const refs: SummaryReference[] = candidates.map((m, i) => ({
    index: i + 1,
    messageId: m.id,
    parentMessageId: m.parentId,
    authorName: m.authorName || 'Unknown',
    snippet: m.bodyText.slice(0, 120),
  }));

  // Bucket refs across mock sections.
  const sec = (ids: number[], title: string, body: string, bullets: string[]): SummarySection => ({
    id: title.toLowerCase().replace(/\s+/g, '-'),
    title,
    body,
    details: ids.map((refIndex, i) => ({
      refIndex,
      text: bullets[i] ?? refs.find(r => r.index === refIndex)?.snippet ?? '',
    })),
  });

  const sections: SummarySection[] = [];
  if (refs.length >= 1) {
    const ids = refs.slice(0, 2).map(r => r.index);
    sections.push(
      sec(
        ids,
        'Recent activity',
        `${refs[0]?.authorName ?? 'Someone'} kicked off the conversation, and the team aligned on the next steps. Tasks were assigned with a timeline set for the end of the week.`,
        refs.slice(0, 2).map(r => `${r.authorName} — ${r.snippet}`),
      ),
    );
  }
  if (refs.length >= 3) {
    const ids = refs.slice(2, 4).map(r => r.index);
    sections.push(
      sec(
        ids,
        'Decisions and follow-ups',
        `The team agreed on the high-level approach, with specific follow-ups owned by named members. Pending items will be revisited in the next sync.`,
        refs.slice(2, 4).map(r => `${r.authorName} — ${r.snippet}`),
      ),
    );
  }
  if (refs.length >= 5) {
    const ids = refs.slice(4, 6).map(r => r.index);
    sections.push(
      sec(
        ids,
        'Open questions',
        `A few open questions surfaced near the end of the window. They are tracked in this conversation and pending input from the relevant owners.`,
        refs.slice(4, 6).map(r => `${r.authorName} — ${r.snippet}`),
      ),
    );
  }
  if (sections.length === 0) {
    sections.push({
      id: 'empty',
      title: 'No activity',
      body: 'There were no messages in the selected window. Try widening the range.',
      details: [],
    });
  }

  return {
    rangeStart,
    rangeEnd,
    conversationTitle,
    conversationIsPrivate,
    messageCount: messages.length,
    participants: participants.slice(0, 6),
    sections,
    references: refs,
  };
}
