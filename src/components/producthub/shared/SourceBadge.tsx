/**
 * SourceBadge — Canonical lozenge distinguishing Catalyst-native vs Jira-imported requests.
 *
 * Source values from `ph_requests.source`:
 *   - 'catalyst' (DB default for new inserts via CreateRequestDrawer)
 *   - 'jira'     (set by useSyncMDTToRequests for MDT-* imports)
 *
 * Visual rules (per CLAUDE.md §6):
 *   - Catalyst → neutral grey #3F3F46 (structural, NOT semantic)
 *   - Jira-MDT → blue var(--ds-text-brand, var(--cp-workstream-catalyst-primary, #2563EB))
 *   - These are non-semantic structural identifiers and must NEVER be confused
 *     with the StatusLozenge 3-color guardrail.
 *
 * Heights/typography mirror the work-item tag (10px / 600 / mono key area).
 */
import React from 'react';

export type RequestSource = 'catalyst' | 'jira' | string | null | undefined;

export function normalizeSource(source: RequestSource): 'catalyst' | 'jira' {
  return source === 'jira' ? 'jira' : 'catalyst';
}

export function getSourceLabel(source: RequestSource): string {
  return normalizeSource(source) === 'jira' ? 'Jira-MDT' : 'Catalyst';
}

interface SourceBadgeProps {
  source: RequestSource;
  size?: 'xs' | 'sm';
  variant?: 'solid' | 'outline';
  className?: string;
  style?: React.CSSProperties;
}

const PALETTE: Record<'catalyst' | 'jira', { bg: string; bgSubtle: string; text: string; border: string }> = {
  catalyst: { bg: 'var(--ds-text-subtle, #44546F)', bgSubtle: 'var(--ds-surface-sunken, #F7F8F9)', text: 'var(--ds-text-subtle, #44546F)', border: 'var(--ds-border, #DFE1E6)' },
  jira:     { bg: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary, #2563EB))', bgSubtle: 'var(--ds-background-selected, #EFF6FF)', text: 'var(--ds-background-brand-bold-hovered, #1D4ED8)', border: 'var(--ds-background-information, #E9F2FF)' },
};

export const SourceBadge: React.FC<SourceBadgeProps> = ({
  source,
  size = 'xs',
  variant = 'outline',
  className,
  style,
}) => {
  const kind = normalizeSource(source);
  const p = PALETTE[kind];
  const label = getSourceLabel(source);

  const height = size === 'xs' ? 16 : 20;
  const fontSize = size === 'xs' ? 9.5 : 10.5;
  const padX = size === 'xs' ? 6 : 8;

  const isOutline = variant === 'outline';

  return (
    <span
      className={className}
      data-source={kind}
      title={kind === 'jira' ? 'Synced from Jira (MDT project)' : 'Created in Catalyst'}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        height,
        padding: `0 ${padX}px`,
        borderRadius: 3,
        fontFamily: 'var(--cp-font-body)',
        fontSize,
        fontWeight: 600,
        letterSpacing: '0.02em',
        lineHeight: 1,
        whiteSpace: 'nowrap',
        background: isOutline ? p.bgSubtle : p.bg,
        color: isOutline ? p.text : 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, #ffffff)))',
        border: isOutline ? `1px solid ${p.border}` : `1px solid ${p.bg}`,
        ...style,
      }}
    >
      <span
        aria-hidden
        style={{
          width: 6,
          height: 6,
          borderRadius: 999,
          background: p.bg,
          flexShrink: 0,
        }}
      />
      {label}
    </span>
  );
};

export default SourceBadge;
