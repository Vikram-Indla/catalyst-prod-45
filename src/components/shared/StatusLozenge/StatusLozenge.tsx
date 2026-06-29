/**
 * StatusLozenge — CANONICAL status pill.
 *
 * Single source of truth for work-item status pills across every Catalyst
 * surface (For You rows, detail headers, dropdowns, tables, cards).
 *
 * Lifted verbatim from JiraForYouLozenge (For You row, /for-you/assigned)
 * 2026-06-29 — see CAT-ADS-STATUSPILL-UNIFY-20260629-001.
 *
 * Colors come from statusPalette.ts (ADS *-bold tokens + --ds-text-inverse).
 * Zero hex. Both light and dark mode safe. WCAG AA paired bg/fg.
 *
 * Sizes
 * ─────
 *  sm (default)  — 20px tall, padding 0 4px, weight 653, ls 0.165px.
 *                  Matches Jira's For You row pill (DOM-probed 2026-04).
 *  md            — 32px tall, padding 0 8px, weight 700, ls 0.04em.
 *                  Matches Jira's issue-field-status.ui.status-view.status-button.
 */
import React from 'react';
import { statusBg, statusFg, type StatusAppearance } from '@/components/catalyst-detail-views/shared/sections/statusPalette';
import { statusToLozenge } from '@/modules/project-work-hub/utils/statusToLozenge';

export type StatusLozengeSize = 'sm' | 'md';
export type LozengeAppearance = StatusAppearance;

/**
 * Map status name + optional ph_issues.status_category to a canonical
 * appearance. Delegates to the canonical `statusToLozenge` table — single
 * source of truth for status → color. Do NOT duplicate the lookup table here.
 */
export function statusToAppearance(status: string, category?: string): LozengeAppearance {
  // Normalize snake_case (e.g. "ready_for_development") to spaces so the
  // canonical lookup table matches. Status values arrive in either form
  // depending on data source — DB enums are snake_case, ph_issues.status is
  // Title Case. One renderer must accept both.
  const normalized = (status ?? '').replace(/_/g, ' ');
  return statusToLozenge(normalized, category);
}

/**
 * Humanize a snake_case or already-display-ready status string into Title Case.
 * Pass-through for strings that already contain no underscores.
 */
export function humanizeStatus(status: string): string {
  if (!status) return '';
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

const SIZE_SPECS: Record<StatusLozengeSize, {
  height: string;
  padding: string;
  fontWeight: number;
  letterSpacing: string;
}> = {
  sm: {
    height: 'var(--ds-space-250, 20px)',
    padding: '0 var(--ds-space-050, 4px)',
    fontWeight: 653,
    letterSpacing: '0.165px',
  },
  md: {
    height: 'var(--ds-space-400, 32px)',
    padding: '0 var(--ds-space-100, 8px)',
    fontWeight: 700,
    letterSpacing: '0.04em',
  },
};

export interface StatusLozengeProps {
  status: string;
  statusCategory?: string | null;
  size?: StatusLozengeSize;
  /** Optional element rendered inside the colored pill, after the status text.
   *  Used by StatusLozengeDropdown to put the chevron INSIDE the bg. */
  trailing?: React.ReactNode;
  /** Direct appearance override — bypasses statusToLozenge lookup. Use for
   *  non-status domains (environment, health, deploy outcome) that need the
   *  same visual contract but their own color choice. */
  appearance?: LozengeAppearance;
  /** Display override — what gets rendered inside the pill. Use when the
   *  status value is snake_case or otherwise not display-ready. */
  label?: string;
  /** Truncate display label with ellipsis beyond this width (px). */
  maxWidth?: number;
}

export function StatusLozenge({ status, statusCategory, size = 'sm', trailing, appearance, label, maxWidth }: StatusLozengeProps) {
  const ap = appearance ?? statusToAppearance(status, statusCategory ?? undefined);
  const spec = SIZE_SPECS[size];
  // Auto-humanize snake_case status when no explicit label is provided.
  // Pass-through for Title Case strings (no underscores).
  const display = label ?? (status.includes('_') ? humanizeStatus(status) : status);

  return (
    <span style={{
      flexShrink: 0,
      display: 'inline-flex',
      alignItems: 'center',
      gap: trailing ? 'var(--ds-space-025, 2px)' : 0,
      backgroundColor: statusBg(ap),
      padding: spec.padding,
      borderRadius: 'var(--ds-border-radius, 3px)',
      height: spec.height,
      color: statusFg(ap),
      maxWidth: maxWidth ?? undefined,
    }}>
      <span style={{
        font: `${spec.fontWeight} var(--ds-font-size-075, 11px)/var(--ds-space-200, 16px) var(--ds-font-family-body, "Atlassian Sans"), ui-sans-serif, sans-serif`,
        color: statusFg(ap),
        textTransform: 'uppercase',
        letterSpacing: spec.letterSpacing,
        overflow: maxWidth ? 'hidden' : undefined,
        textOverflow: maxWidth ? 'ellipsis' : undefined,
        whiteSpace: maxWidth ? 'nowrap' : undefined,
      }}>
        {display}
      </span>
      {trailing}
    </span>
  );
}

export default StatusLozenge;
