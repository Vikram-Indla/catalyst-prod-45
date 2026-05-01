/**
 * Atlaskit intent-based prefetcher — Layer 3 of the Atlassian loading pattern.
 *
 * Atlassian ships Jira with route-level intent prefetching: the moment the
 * user signals they're about to land on a heavy surface (hover over an issue
 * link, focus on the issue row, the app is idle after first paint), the
 * relevant Atlaskit chunks start downloading. By the time the click lands,
 * the bytes are already in the browser cache and mount is instant.
 *
 * We replicate the same shape for Catalyst:
 *
 *   prefetchEpicRenderer()   — warms vendor-atlaskit-renderer + primitives
 *                              + prosemirror. Cheap. Call on app idle or on
 *                              hover of any Epic link / issue-view link so
 *                              the first Epic-open is instant.
 *
 *   prefetchEpicEditor()     — warms vendor-atlaskit-editor (the heavy one,
 *                              116 editor-plugin-* chunks, ~2MB). Only call
 *                              on explicit edit intent — hover / focus on
 *                              the Edit pencil, or keyboard shortcut focus.
 *                              Never call on app idle; we don't want every
 *                              cold boot to pay for the editor.
 *
 *   prefetchLinkedWorkItems() — warms the Atlaskit-based LinkedWorkItems
 *                              molecule used by BAU-4771. Mostly the same
 *                              vendor-atlaskit-ui chunk the renderer also
 *                              touches, so effectively piggy-backs on the
 *                              renderer prefetch once chunks are cached.
 *
 * Each call is idempotent (native `import()` de-dupes module graph loads)
 * and fire-and-forget — errors are swallowed so a 403 on a chunk doesn't
 * surface to the user. We do NOT await the returned promise anywhere; the
 * only side effect we care about is the browser putting the chunk in its
 * HTTP cache.
 */

import { useEffect } from 'react';

type PrefetchFn = () => Promise<unknown>;

function fireAndForget(importer: PrefetchFn) {
  try {
    importer().catch(() => {
      /* swallow — prefetch is best-effort; real mount will surface errors */
    });
  } catch {
    /* also swallow — synchronous specifier errors shouldn't break anything */
  }
}

export function prefetchEpicRenderer(): void {
  fireAndForget(
    () => import('@/components/shared/rich-text/atlaskit/EpicDescriptionRenderer'),
  );
}

export function prefetchEpicEditor(): void {
  fireAndForget(
    () => import('@/components/shared/rich-text/atlaskit/EpicDescriptionEditor'),
  );
}

export function prefetchLinkedWorkItems(): void {
  fireAndForget(
    () => import('@/modules/project-work-hub/components/linked-work-items'),
  );
}

/**
 * Schedule a callback on browser idle, falling back to a short timeout on
 * Safari / older browsers that don't implement requestIdleCallback.
 *
 * The timeout option caps the wait so we never delay the prefetch beyond
 * 3s even if the main thread is permanently busy.
 */
function onIdle(cb: () => void, timeoutMs = 2000): void {
  if (typeof window === 'undefined') return;
  const w = window as Window & {
    requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
  };
  if (typeof w.requestIdleCallback === 'function') {
    w.requestIdleCallback(cb, { timeout: 3000 });
  } else {
    window.setTimeout(cb, timeoutMs);
  }
}

/**
 * App-level warm-up. Called once from main.tsx after the first real App
 * render commits, deferred until the browser is idle. Warms only the view
 * path — the editor is opt-in on intent, never on boot.
 */
export function warmAtlaskitViewOnIdle(): void {
  onIdle(() => {
    prefetchEpicRenderer();
  });
}

/**
 * React hook spread for intent-prefetch on a focusable element.
 *
 * Usage (list row linking to an Epic detail view):
 *
 *   const intent = usePrefetchOnIntent(prefetchEpicRenderer);
 *   return <a href={...} {...intent}>{key}</a>;
 *
 * Returns three props that wire into hover + focus + pointerdown:
 *   - onMouseEnter / onFocus fire on the earliest intent signal
 *   - onPointerDown fires as a last-chance prefetch if hover was skipped
 *     (e.g. touch users, keyboard users who tab+enter without hover)
 *
 * The hook intentionally does NOT unsubscribe / cancel — dynamic imports
 * cannot be aborted once triggered, and the chunk will sit harmlessly in
 * the HTTP cache if the click never happens.
 *
 * We don't memoise: the returned object is re-created each render, but
 * the prefetcher itself is idempotent, so a re-render that fires the
 * handler again is a no-op in network terms.
 */
export function usePrefetchOnIntent(prefetch: () => void) {
  return {
    onMouseEnter: prefetch,
    onFocus: prefetch,
    onPointerDown: prefetch,
  } as const;
}

/**
 * 🔒 CANONICAL: pre-warm @atlaskit/editor-core when a surface mounts that
 * MAY mount the editor on user interaction.
 *
 * Use this in EVERY modal / drawer / detail panel that contains an
 * EpicDescriptionEditor — even when the editor is collapsed-until-clicked.
 * The hook fires the dynamic import on requestIdleCallback so the chunk
 * lands in the browser HTTP cache during the user's "thinking time"
 * (typing the Summary, picking a Project, etc.) and the editor mount on
 * click is instant instead of a 5-15 second hang in Vite dev / 200-500ms
 * in production cold cache.
 *
 * Pattern (every consumer):
 *   import { usePrewarmEpicEditorOnOpen } from '@/lib/atlaskitPrefetch';
 *   ...
 *   usePrewarmEpicEditorOnOpen(open);   // `open` = the modal's open boolean
 *
 * The hook is idempotent — multiple calls to `import()` on the same module
 * de-dup at the JS engine level, and the prefetch swallows errors so a
 * 403 on a chunk doesn't surface to the user.
 *
 * DO NOT remove this hook from any consumer without explicit owner sign-off.
 * Removing it WILL re-introduce the "Loading editor…" hang Vikram reported
 * on 2026-04-30 (design-critique session).
 */
export function usePrewarmEpicEditorOnOpen(open: boolean): void {
  useEffect(() => {
    if (!open || typeof window === 'undefined') return;
    onIdle(() => prefetchEpicEditor(), 1500);
  }, [open]);
}
