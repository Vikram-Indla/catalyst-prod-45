/**
 * EditorSkeleton — canonical loading placeholder for EpicDescriptionEditor.
 *
 * Renders a sized, shimmering box that matches the editor's final visual
 * shape (toolbar slot + content area + border + radius). Used as the
 * Suspense fallback while @atlaskit/editor-core lazy-loads.
 *
 * Why this matters:
 *   - The editor's lazy chunk is heavy (~2 MB across editor-core +
 *     editor-plugin-* + ProseMirror tree). Cold load takes >10s in Vite
 *     dev (mitigated by adding to optimizeDeps), ~200ms in production.
 *   - The previous fallback was an unstyled "Loading editor…" string in
 *     a 60px box. When the editor finally mounted, the surrounding form
 *     re-flowed by ~140-200px (toolbar appears, content area expands,
 *     border + radius appear). That layout shift is jarring.
 *   - This skeleton is sized to match the FINAL editor: ~40px toolbar
 *     row + 120-160px content area + border + border-radius. The editor
 *     "fills in" rather than "pops in".
 *
 * Sizing per appearance:
 *   - 'comment': 200px total (40 toolbar + 160 content) — used in
 *     Catalyst's Create modal and most embed surfaces
 *   - 'chromeless': 160px total (no toolbar) — Create dialogs that
 *     hide the editor's built-in Save/Cancel buttons
 *   - 'full-page': 280px total (taller content for multi-paragraph
 *     descriptions) — full-page issue views
 *
 * a11y:
 *   - aria-busy + aria-label so screen readers announce the load state
 *   - Shimmer animation respects prefers-reduced-motion
 *
 * No new dependency: shimmer is pure CSS via a one-time keyframes
 * injection (idempotent guard pattern from CatalystTitleEditor).
 *
 * 2026-04-30 — design-critique "make it canonical" remediation.
 */
import { useMemo } from 'react';

const SHIMMER_ID = 'cat-editor-skeleton-shimmer';
if (typeof document !== 'undefined' && !document.getElementById(SHIMMER_ID)) {
  const s = document.createElement('style');
  s.id = SHIMMER_ID;
  s.textContent = `
    @keyframes cat-editor-skel-shimmer {
      0% { background-position: -800px 0; }
      100% { background-position: 800px 0; }
    }
    .cat-editor-skel-bar {
      background: linear-gradient(90deg,
        var(--ds-skeleton, rgba(9,30,66,0.06)) 0%,
        var(--ds-skeleton-subtle, rgba(9,30,66,0.10)) 50%,
        var(--ds-skeleton, rgba(9,30,66,0.06)) 100%);
      background-size: 800px 100%;
      animation: cat-editor-skel-shimmer 1.6s linear infinite;
      border-radius: 3px;
    }
    .dark .cat-editor-skel-bar {
      background: linear-gradient(90deg,
        rgba(255,255,255,0.04) 0%,
        rgba(255,255,255,0.08) 50%,
        rgba(255,255,255,0.04) 100%);
      background-size: 800px 100%;
    }
    @media (prefers-reduced-motion: reduce) {
      .cat-editor-skel-bar { animation: none; }
    }
  `;
  document.head.appendChild(s);
}

interface Props {
  appearance?: 'comment' | 'chromeless' | 'full-page';
}

export function EditorSkeleton({ appearance = 'comment' }: Props) {
  const dims = useMemo(() => {
    switch (appearance) {
      case 'chromeless':
        return { totalMin: 160, hasToolbar: false };
      case 'full-page':
        return { totalMin: 280, hasToolbar: true };
      case 'comment':
      default:
        return { totalMin: 200, hasToolbar: true };
    }
  }, [appearance]);

  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading description editor"
      style={{
        minHeight: dims.totalMin,
        borderRadius: 3,
        border: '1px solid var(--ds-border, #DFE1E6)',
        background: 'var(--ds-surface, #FFFFFF)',
        padding: 12,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        fontFamily: 'var(--cp-font-body)',
      }}
    >
      {dims.hasToolbar && (
        <div
          aria-hidden="true"
          style={{
            display: 'flex',
            gap: 6,
            paddingBottom: 8,
            borderBottom: '1px solid var(--ds-border, #DFE1E6)',
          }}
        >
          {/* Toolbar slot — 7 button placeholders matching Atlaskit toolbar shape */}
          <div className="cat-editor-skel-bar" style={{ width: 60, height: 24 }} />
          <div className="cat-editor-skel-bar" style={{ width: 28, height: 24 }} />
          <div className="cat-editor-skel-bar" style={{ width: 28, height: 24 }} />
          <div className="cat-editor-skel-bar" style={{ width: 28, height: 24 }} />
          <div className="cat-editor-skel-bar" style={{ width: 28, height: 24 }} />
          <div className="cat-editor-skel-bar" style={{ width: 28, height: 24 }} />
          <div className="cat-editor-skel-bar" style={{ width: 28, height: 24 }} />
        </div>
      )}
      {/* Content slot — 3 text-line placeholders */}
      <div className="cat-editor-skel-bar" style={{ width: '100%', height: 14 }} />
      <div className="cat-editor-skel-bar" style={{ width: '85%', height: 14 }} />
      <div className="cat-editor-skel-bar" style={{ width: '60%', height: 14 }} />
    </div>
  );
}

export default EditorSkeleton;
