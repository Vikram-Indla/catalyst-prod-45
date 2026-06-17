/**
 * CatyPulseIcon — the magenta pulse-line glyph used by labelled AI/Caty CTAs.
 *
 * 2026-06-17 — Adopted as the canonical AI-CTA mark, replacing the cat-head
 * glyph on pill+label buttons (CatyButton family, ImproveIssueDropdown).
 * Mirrors the "Board health" affordance (CatyBoardInsight). The bare cat icon
 * (CatyIconCTA) and the floating Caty (CatyFAB) intentionally KEEP CatyHead.
 */
import React from 'react';
import { token } from '@atlaskit/tokens';

export function CatyPulseIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
      <path
        d="M1 8h3l2-5 3 10 2-5h4"
        stroke={token('color.icon.accent.magenta', '#CD519D')}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default CatyPulseIcon;
