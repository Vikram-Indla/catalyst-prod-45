/**
 * CatalystAiSearch — DEPRECATED (2026-06-17).
 *
 * The combined search box with an embedded trailing "Ask" pill was retired in
 * favour of the backlog pattern: a standalone CatyIconCTA beside a plain
 * search field (QuickSearchInput / Textfield), with AskCatyInlineBar replacing
 * the toolbar when Ask Caty opens. Its last consumer (R360 BoardView) was
 * migrated. Do NOT add new usages — adopt the backlog pattern instead.
 *
 * Original docstring follows.
 *
 * CatalystAiSearch — the canonical work-item search control.
 *
 * One affordance, two states:
 *   - Idle  → a text-search field with the Caty cat embedded as a leading
 *             button. Typing filters via the surface's own plain search;
 *             clicking the cat opens Ask Caty.
 *   - Open  → the shared AskCatyInlineBar takes over (rainbow NL search).
 *             The PARENT hides its other toolbar controls while open so
 *             there is one focused AI row (no stacking, no two-cat clash).
 *
 * This component owns ONLY the search-bar UI. Each surface keeps its own
 * Caty result application (applyCatyFilter for WorkItem lists,
 * applyCatyFilterBacklog for flatter/cross-project lists) by subscribing to
 * useCatySearch — that logic is intentionally NOT centralised here so every
 * context filters against its own loaded data.
 *
 * Parent contract:
 *   const [open, setOpen] = useState(false);
 *   {open ? (
 *     <CatalystAiSearch open onOpenChange={setOpen} projectKey={key} />
 *   ) : (
 *     <Toolbar>
 *       <CatalystAiSearch open={false} onOpenChange={setOpen} projectKey={key}
 *         value={q} onValueChange={setQ} placeholder="Search work" />
 *       … other toolbar controls …
 *     </Toolbar>
 *   )}
 *
 * `projectKey` is the real project key for single-project surfaces, or a
 * fixed sentinel (e.g. "my board") for cross-project surfaces that apply the
 * returned project-agnostic CatyFilter client-side.
 */
import React from 'react';
import { token } from '@atlaskit/tokens';
import { CatyHead } from '@/components/for-you/atlaskit/CatyButton';
import { AskCatyInlineBar } from '@/components/caty/AskCatyInlineBar';
import SearchIconCore from '@atlaskit/icon/core/search';

/* Focus model — injected once. The whole control owns the focus ring via
 * :focus-within; the bare input's own ring (a global ADS input box-shadow)
 * is hard-suppressed so the control highlights as one unit. Injected rather
 * than a .css import to keep the file ADS-audit clean (tokens only). */
const CAS_STYLE_ID = 'catalyst-ai-search-styles-v2';
function ensureCasStyles() {
  if (typeof document === 'undefined' || document.getElementById(CAS_STYLE_ID)) return;
  const el = document.createElement('style');
  el.id = CAS_STYLE_ID;
  el.textContent =
    '.cas-field:focus-within{border-color:var(--ds-border-focused);box-shadow:0 0 0 1px var(--ds-border-focused);}' +
    // Descendant selector beats a global `input:focus` rule; kills the inner
    // ring so only the container highlights. Covers box-shadow AND outline.
    '.cas-field input.cas-input:focus,.cas-field input.cas-input:focus-visible{outline: 2px solid var(--ds-border-focused)!important;box-shadow:none!important;border-color:transparent!important;}';
  document.head.appendChild(el);
}

export interface CatalystAiSearchProps {
  /** Whether Ask Caty is open (controlled by the parent). */
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Real project key, or a sentinel for cross-project client-side surfaces. */
  projectKey: string | null;
  /** Plain text-search value (idle state only). */
  value?: string;
  onValueChange?: (v: string) => void;
  placeholder?: string;
  /** Idle field width cap. Defaults to 320 to match existing toolbars. */
  maxWidth?: number;
  /** Called when CATY produces a JQL result (forwarded to AskCatyInlineBar). */
  onJqlGenerated?: (jql: string) => void;
}

export function CatalystAiSearch({
  open,
  onOpenChange,
  projectKey,
  value = '',
  onValueChange,
  placeholder = 'Search',
  maxWidth = 320,
  onJqlGenerated,
}: CatalystAiSearchProps) {
  ensureCasStyles();
  if (open) {
    return (
      <AskCatyInlineBar
        projectKey={projectKey}
        onClose={() => onOpenChange(false)}
        onJqlGenerated={onJqlGenerated}
      />
    );
  }

  return (
    <div
      className="cas-field"
      style={{
        flex: 1,
        maxWidth,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        height: 36,
        padding: '0 4px 0 8px',
        background: token('elevation.surface', 'var(--ds-surface)'),
        border: `1px solid ${token('color.border', 'var(--ds-border)')}`,
        borderRadius: 6,
        boxSizing: 'border-box',
        transition: 'border-color 150ms ease, box-shadow 150ms ease',
      }}
    >
      {/* Leading magnifier — this is unambiguously a text search. */}
      <span
        aria-hidden
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          flexShrink: 0,
          color: token('color.text.subtle', 'var(--ds-text-subtle)'),
        }}
      >
        <SearchIconCore label="" color="currentColor" />
      </span>
      <input
        className="cas-input"
        value={value}
        onChange={(e) => onValueChange?.(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        autoComplete="off"
        spellCheck={false}
        style={{
          flex: 1,
          minWidth: 0,
          height: '100%',
          margin: 0,
          padding: 0,
          border: 0,
          outline: 2px solid var(--ds-border-focused),
          background: 'transparent',
          boxShadow: 'none',
          font: 'inherit',
          fontSize: 'var(--ds-font-size-400)',
          color: token('color.text', 'var(--ds-text)'),
          appearance: 'none',
          WebkitAppearance: 'none',
        }}
      />
      {/* Trailing Ask Caty pill — the AI affordance, distinct from search.
          The cat is the only Caty mark on the surface (Board health is
          de-catted to a neutral analytics icon). */}
      <button
        type="button"
        onClick={() => onOpenChange(true)}
        aria-label="Ask Caty"
        title="Ask Caty"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          height: 26,
          padding: '0 8px 0 4px',
          flexShrink: 0,
          // Defined-but-secondary: a hairline-bordered chip so it's clearly a
          // button (not invisible) yet visually subordinate to the primary
          // magnifier + input search. AI is opt-in, not co-equal.
          border: `0.5px solid ${token('color.border', 'var(--ds-border)')}`,
          borderRadius: 999,
          background: token('elevation.surface', 'var(--ds-surface)'),
          cursor: 'pointer',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = token('color.background.neutral.subtle.hovered', 'var(--ds-background-neutral-subtle-hovered, rgba(9,30,66,0.06))');
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = token('elevation.surface', 'var(--ds-surface)');
        }}
      >
        <CatyHead size={16} title="Ask Caty" />
        <span style={{ fontSize: 'var(--ds-font-size-200)', fontWeight: 500, color: token('color.text.subtle', 'var(--ds-text-subtle)') }}>Ask</span>
      </button>
    </div>
  );
}

export default CatalystAiSearch;
