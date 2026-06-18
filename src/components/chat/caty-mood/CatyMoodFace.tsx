/**
 * CatyMoodFace — the Caty mark used in the dock titlebar badge.
 *
 * 2026-06-18 — Unified to the magenta pulse glyph (CatyPulseIcon), replacing the
 * mood-driven cat head across all surfaces. The `state` prop is retained for API
 * compatibility (and feeds the aria-label) but no longer drives a facial expression.
 */
import type { CatyState } from './catyMoodEngine';
import { CatyPulseIcon } from '@/components/ui/CatyPulseIcon';

export function CatyMoodFace({
  state,
  size = 56,
  title,
}: {
  state: CatyState;
  size?: number;
  title?: string;
}) {
  return (
    <span className="cc-fab-icon" style={{ display: 'inline-block', width: size, height: size, flexShrink: 0 }}>
      <CatyPulseIcon size={size} title={title ?? `Ask Caty — ${state}`} />
    </span>
  );
}
