/**
 * conversationContext — the last few visible messages around the dictation
 * target (CAT-DICTATION-INTELLIGENCE-20260708-001 S6).
 *
 * Fed to the AR→EN translation so pronouns resolve and tone matches the
 * thread ("قله إنه جاهز" → "Tell Sikander it's ready", not "tell him").
 * DOM-based on purpose: works identically for legacy chat (.cc-msg__text)
 * and chat-v2 ([data-msg-body]) with zero data-plumbing.
 */

const MESSAGE_SELECTOR = '[data-msg-body], .cc-msg__text';
const MAX_MESSAGES = 3;
const MAX_CHARS = 600;

export function getConversationContext(target: HTMLElement | null): string {
  if (!target?.isConnected) return '';
  // Walk up to a container that actually holds messages; fall back to body.
  let root: HTMLElement | Document | null = target.closest<HTMLElement>(
    '.cv2-chat-shell, [class*="chat-shell"], main',
  );
  if (!root || !(root instanceof HTMLElement) || !root.querySelector(MESSAGE_SELECTOR)) {
    root = document;
  }
  const nodes = Array.from(root.querySelectorAll<HTMLElement>(MESSAGE_SELECTOR));
  if (!nodes.length) return '';
  const texts = nodes
    .slice(-MAX_MESSAGES)
    .map((n) => (n.textContent ?? '').replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  if (!texts.length) return '';
  let out = texts.join('\n');
  if (out.length > MAX_CHARS) out = out.slice(-MAX_CHARS);
  return out;
}
