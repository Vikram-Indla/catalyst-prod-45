/**
 * ticket-refs — ticket-key detection in chat message text.
 * Mirrors the server-side extraction trigger on chat_messages
 * (migration 20260610100000_chat_ticket_conversation_rpc.sql).
 */

export const TICKET_KEY_RE = /\b[A-Z][A-Z0-9]{1,9}-\d+\b/g;

export function extractTicketKeys(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const m of text.matchAll(TICKET_KEY_RE)) {
    // Reject mid-word matches like "xBAU-12" (\b matches after lowercase x..no,
    // \b won't fire between x and B since both are word chars — but guard anyway).
    if (!seen.has(m[0])) {
      seen.add(m[0]);
      out.push(m[0]);
    }
  }
  return out;
}

export type TicketSegment = { type: 'text' | 'key'; value: string };

export function splitByTicketKeys(text: string): TicketSegment[] {
  const segments: TicketSegment[] = [];
  let last = 0;
  for (const m of text.matchAll(TICKET_KEY_RE)) {
    const idx = m.index ?? 0;
    if (idx > last) segments.push({ type: 'text', value: text.slice(last, idx) });
    segments.push({ type: 'key', value: m[0] });
    last = idx + m[0].length;
  }
  if (last < text.length || segments.length === 0) {
    segments.push({ type: 'text', value: text.slice(last) });
  }
  return segments;
}

export function isFullTicketKey(query: string): boolean {
  const q = query.trim().toUpperCase();
  const m = q.match(TICKET_KEY_RE);
  return m !== null && m.length === 1 && m[0] === q;
}
