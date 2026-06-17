/**
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
      style={{
        flex: 1,
        maxWidth,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        height: 36,
        padding: '0 10px',
        background: token('elevation.surface', '#FFFFFF'),
        border: `0.5px solid ${token('color.border', '#DFE1E6')}`,
        borderRadius: 6,
        boxSizing: 'border-box',
      }}
    >
      {/* Embedded Caty cat — the single AI affordance for this surface. */}
      <button
        type="button"
        onClick={() => onOpenChange(true)}
        aria-label="Ask Caty"
        title="Ask Caty"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 22,
          height: 22,
          flexShrink: 0,
          border: 'none',
          background: 'transparent',
          padding: 0,
          cursor: 'pointer',
        }}
      >
        <CatyHead size={18} title="Ask Caty" />
      </button>
      <span
        aria-hidden
        style={{
          width: 1,
          height: 18,
          flexShrink: 0,
          background: token('color.border', '#DFE1E6'),
        }}
      />
      <input
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
          outline: 0,
          background: 'transparent',
          boxShadow: 'none',
          font: 'inherit',
          fontSize: 14,
          color: token('color.text', '#292A2E'),
          appearance: 'none',
          WebkitAppearance: 'none',
        }}
      />
    </div>
  );
}

export default CatalystAiSearch;
