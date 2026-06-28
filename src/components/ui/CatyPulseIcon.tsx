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

export function CatyPulseIcon({ size = 16, title }: { size?: number; title?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      style={{ flexShrink: 0 }}
    >
      {title ? <title>{title}</title> : null}
      <path
        d="M1 8h3l2-5 3 10 2-5h4"
// TODO: ads-unmapped — #CD519D context unclear
        stroke={token('color.icon.accent.magenta', '#CD519D')}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default CatyPulseIcon;
