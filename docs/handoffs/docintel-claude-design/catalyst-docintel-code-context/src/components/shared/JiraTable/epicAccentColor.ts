import { token } from '@atlaskit/tokens';

// Canonical parent/epic identity color — shared by every "parent reference
// chip" renderer (makeParentCell, makeParentEditCell's ParentChip) so a given
// epic renders the same color everywhere in the app, not a bespoke shade per
// table implementation.
//
// Jira colors this chip by the PARENT'S OWN identity (the epic's assigned
// color — e.g. BAU-4466 is always orange, BAU-3990 is always mint green,
// same on every child row regardless of that row's own status). Probed live
// on digital-transformation.atlassian.net 2026-07-02: green chip =
// rgb(186,243,219)/rgb(33,110,78), an exact match for ADS
// `color.background.accent.green.subtler` / `color.text.accent.green`.
//
// ph_issues.epic_color exists but isn't populated by any sync yet (see
// CAT-KANBAN-EPIC-COLOR-20260702-001), so until that lands we deterministically
// hash the parent's identity into one of ADS's 8 accent families — same
// fallback approach already shipped for kanban (Board.tsx epicSwatchColor),
// just on clean accent tokens instead of raw hex.
const EPIC_ACCENT_COLORS = ['purple', 'blue', 'teal', 'green', 'yellow', 'orange', 'red', 'magenta'] as const;

export function accentColorForSeed(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash |= 0;
  }
  const name = EPIC_ACCENT_COLORS[Math.abs(hash) % EPIC_ACCENT_COLORS.length];
  return {
    bg: token(`color.background.accent.${name}.subtler` as any, `var(--ds-background-accent-${name}-subtler)`),
    text: token(`color.text.accent.${name}` as any, `var(--ds-text-accent-${name})`),
  };
}
