/**
 * StatusBadge — V13: 3-colour guardrail sourced from the canonical statusPalette.
 * GREY  → appearance 'default'    (var(--ds-background-neutral) / var(--ds-text))
 * BLUE  → appearance 'inprogress' (var(--ds-background-information) / var(--ds-text-information))
 * GREEN → appearance 'success'    (var(--ds-background-success) / var(--ds-text-success))
 *
 * 2026-06-29 (CAT-ADS-STATUS-SWEEP-20260629-001): replaced the local light/dark
 * colour maps (which drifted — --ds-link-pressed text, raw-rgb dark fallbacks —
 * from the canonical pill) with statusPalette.ts. ADS tokens self-adapt to dark
 * mode, so the per-theme map + useTheme() are no longer needed. Colours now match
 * CatalystStatusPill exactly. Typography unchanged (out of this slice's scope).
 */

import React from 'react';
import { statusBgBold, statusFgBold } from '@/components/catalyst-detail-views/shared/sections/statusPalette';

type StatusCategory = 'grey' | 'blue' | 'green';

/** Map the badge's 3-colour bucket to a canonical statusPalette appearance. */
const CATEGORY_TO_APPEARANCE: Record<StatusCategory, string> = {
  grey:  'default',
  blue:  'inprogress',
  green: 'success',
};

const STATUS_CATEGORY_MAP: Record<string, StatusCategory> = {
  'Backlog': 'grey',
  'To Do': 'grey',
  'Todo': 'grey',
  'Ready for QA': 'grey',
  'Ready For QA': 'grey',
  'Awaiting Info': 'grey',
  'Awaiting Information': 'grey',
  'AWAITING INFO': 'grey',
  'Blocked': 'grey',
  'Deferred': 'grey',
  'Deferred for INT': 'grey',
  'Portfolio Review': 'grey',
  'In Requirements': 'grey',
  'On Hold': 'grey',
  'Reopened': 'grey',
  'New': 'grey',
  'Open': 'grey',
  'Cancelled': 'grey',

  'In Progress': 'blue',
  'In Development': 'blue',
  'In Review': 'blue',
  'In QA': 'blue',
  'In UAT': 'blue',
  'UAT Ready': 'blue',
  'UAT READY': 'blue',
  'In BETA': 'blue',
  'Beta Ready': 'blue',
  'In Testing': 'blue',
  'Code Review': 'blue',
  'In Analysis': 'blue',
  'In Design': 'blue',
  'Selected for Development': 'blue',
  'Active': 'blue',
  'Planning': 'blue',

  'Done': 'green',
  'Closed': 'green',
  'Resolved': 'green',
  'RESOLVED': 'green',
  'Ready for Production': 'green',
  'In Production': 'green',
  'Released': 'green',
  'Verified': 'green',
  'Accepted': 'green',
  'Deployed': 'green',
  'Completed': 'green',
  'Approved': 'green',
  'Merged': 'green',
};

const STATUS_DISPLAY_NAMES: Record<string, string> = {
  'Ready for Production': 'READY FOR PROD',
  'Ready For Production': 'READY FOR PROD',
  'Awaiting Information': 'AWAITING INFO',
  'Ready for QA': 'READY FOR QA',
};

export function getStatusCategory(status: string): StatusCategory {
  return STATUS_CATEGORY_MAP[status] || STATUS_CATEGORY_MAP[status.toUpperCase()] || 'grey';
}

/** Canonical status colours (statusPalette). `_dark` retained for call-site
 *  signature compat — ADS tokens self-adapt to theme, so it is ignored. */
export function getStatusStyle(status: string, _dark?: boolean) {
  const appearance = CATEGORY_TO_APPEARANCE[getStatusCategory(status)];
  return { background: statusBgBold(appearance), color: statusFgBold(appearance) };
}

export function getStatusDisplayName(status: string): string {
  return STATUS_DISPLAY_NAMES[status] || status.toUpperCase();
}

/** @deprecated Use getStatusStyle instead */
export const STATUS_COLORS: Record<string, string> = {};
/** @deprecated Use getStatusStyle instead */
export function getStatusColor(status: string, dark?: boolean): string {
  return getStatusStyle(status, dark).background;
}

interface StatusBadgeProps {
  status: string;
  onClick?: (e: React.MouseEvent) => void;
  mini?: boolean;
}

export function StatusBadge({ status, onClick, mini = false }: StatusBadgeProps) {
  const style = getStatusStyle(status);
  const displayName = getStatusDisplayName(status);

  return (
    <button
      onClick={onClick}
      className="status-badge"
      style={{
        height: 20,
        padding: '0 6px',
        borderRadius: 4,
        background: style.background,
        color: style.color,
        border: 'none',
        cursor: onClick ? 'pointer' : 'default',
        fontFamily: 'var(--cp-font-body)',
        fontSize: 'var(--ds-font-size-100)',
        fontWeight: 700,
        letterSpacing: '0.03em',
        textTransform: 'uppercase' as const,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        whiteSpace: 'nowrap' as const,
        lineHeight: '20px',
        flexShrink: 0,
        maxWidth: mini ? 120 : 140,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}
      title={status}
    >
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName}</span>
      {onClick && !mini && <span style={{ opacity: 0.6, fontSize: 'var(--ds-font-size-100)', color: style.color }}>▾</span>}
    </button>
  );
}
