/**
 * mentionStyles — shared utility for the two-tone mention chip styling
 * (current-user vs other-user) used across every surface that renders
 * mentions: the Tiptap editor (edit mode), DisplayView / AdfLight /
 * EpicDescriptionRenderer (read mode), and Comment.tsx (legacy
 * token-based renderer).
 *
 * The contract is simple:
 *   - Every rendered mention chip carries `data-mention-id="<USER_ID>"`.
 *   - A single `<style>` rule, injected once into <head>, paints all
 *     such elements with the "other-user" look (gray bg + subtle text)
 *     by default, and overrides to "current-user" (brand bg + white
 *     text) when the element also has `data-mention-self="true"`.
 *   - A small walker (`markMentionsSelfStatus`) is invoked from each
 *     mention-bearing container's MutationObserver — it compares the
 *     element's data-mention-id to the current user's id and stamps /
 *     unstamps the `data-mention-self` attribute.
 *
 * Atlaskit's renderer emits mentions with `data-id` (no `mention`
 * suffix). The walker covers BOTH `[data-mention-id]` and
 * `.atlaskit-mention[data-id]` selectors so EpicDescriptionRenderer
 * mentions get the same treatment without modifying Atlaskit itself.
 */

export const MENTION_STYLE_ID = 'catalyst-mention-self-styles';

/**
 * Inject the global mention chip CSS into <head> exactly once.
 * Idempotent via the element id check, so it's safe to call from
 * every consumer's mount effect.
 */
export function injectMentionStyles(): void {
  if (typeof document === 'undefined') return;
  if (document.getElementById(MENTION_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = MENTION_STYLE_ID;
  style.textContent = `
    /* ── Shared chip layout ─────────────────────────────────────────
       inline-flex with explicit height + align-items: center forces
       byte-identical sizing in read mode and edit mode regardless of
       what font-size / line-height Atlaskit's nested children apply.
       Without this the chip would grow taller in read mode because
       Atlaskit's inner span injects its own line-height that
       overflows our padding box. */
    span[data-mention-id],
    span.atlaskit-mention[data-id] {
      display: inline !important;
      box-sizing: border-box !important;
      border-radius: 3px !important;
      padding: 0 4px !important;
      margin: 0 !important;
      font-size: inherit !important;
      font-weight: 500 !important;
      line-height: inherit !important;
      vertical-align: baseline !important;
      text-decoration: none !important;
      border: none !important;
      box-shadow: none !important;
      outline: none !important;
      white-space: nowrap !important;
    }

    /* ── Flatten EVERY descendant ───────────────────────────────────
       Atlaskit's mention chip nests an inner highlight span with its
       own background + font-size + line-height + padding. All four
       affect the chip's rendered height. Resetting everything to
       inherit / 0 collapses the descendants to plain text inside our
       chip. */
    span[data-mention-id] *,
    span.atlaskit-mention[data-id] * {
      display: inline !important;
      background: transparent !important;
      background-color: transparent !important;
      color: inherit !important;
      font-size: inherit !important;
      font-weight: inherit !important;
      line-height: inherit !important;
      text-decoration: none !important;
      border: none !important;
      box-shadow: none !important;
      outline: none !important;
      padding: 0 !important;
      margin: 0 !important;
      height: auto !important;
    }

    /* ── Read-mode tweaks ───────────────────────────────────────────
       Atlaskit's renderer outputs only the user's name (no "@") and
       attaches JS hover / click handlers that can paint over our
       background. Scoping by .atlaskit-renderer-wrapper targets only
       the rendered-doc context, which covers Description and
       Comment read modes that use EpicDescriptionRenderer. Edit-mode
       chips (and the legacy Comment.tsx token renderer) already
       include the "@" in their text so they are not affected. */
    .atlaskit-renderer-wrapper span[data-mention-id],
    .atlaskit-renderer-wrapper span.atlaskit-mention[data-id] {
      pointer-events: none !important;
    }
    .atlaskit-renderer-wrapper span[data-mention-id]::before,
    .atlaskit-renderer-wrapper span.atlaskit-mention[data-id]::before {
      content: "@";
    }

    /* ── OTHER-user — Atlassian inline mention: link-blue text on a
       faint neutral tint (NOT a solid grey pill). Matches @atlaskit/mention
       read-mode rendering. */
    span[data-mention-id]:not([data-mention-self="true"]),
    span.atlaskit-mention[data-id]:not([data-mention-self="true"]) {
      background: var(--ds-background-neutral-subtle, #F7F8F9) !important;
      color: var(--ds-link, #0052CC) !important;
    }

    /* ── CURRENT-user — bold brand blue + white text ───────────────── */
    span[data-mention-id][data-mention-self="true"],
    span.atlaskit-mention[data-id][data-mention-self="true"] {
      background: var(--ds-background-brand-bold, #0C66E4) !important;
      color: var(--ds-text-inverse, #FFFFFF) !important;
    }
  `;
  document.head.appendChild(style);
}

/**
 * Walk every mention chip inside `root` and stamp / unstamp the
 * `data-mention-self` attribute based on whether its id matches the
 * current user's id. Covers both the editor's `data-mention-id`
 * convention and Atlaskit's `data-id` convention.
 *
 * Safe to call inside a MutationObserver — does not mutate the tree's
 * shape, only attributes.
 */
export function markMentionsSelfStatus(
  root: HTMLElement | null,
  currentUserId: string | null | undefined,
): void {
  if (!root) return;
  const els = root.querySelectorAll<HTMLElement>(
    'span[data-mention-id], span.atlaskit-mention[data-id]',
  );
  els.forEach((el) => {
    const id =
      el.getAttribute('data-mention-id') ||
      el.getAttribute('data-id') ||
      '';
    const isSelf = !!currentUserId && id === currentUserId;
    if (isSelf) {
      el.setAttribute('data-mention-self', 'true');
    } else {
      el.removeAttribute('data-mention-self');
    }
  });
}
