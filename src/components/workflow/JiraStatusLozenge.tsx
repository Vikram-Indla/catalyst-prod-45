/**
 * JiraStatusLozenge — Atlaskit Lozenge wrapper that maps our
 * `StatusCategory` to Atlaskit's `appearance` prop.
 *
 * Sizes and colors match Jira exactly: bold appearance renders a 16px
 * tall pill with 14px text, colors per @atlaskit/tokens.
 */
import React from 'react';
import type { StatusCategory, WorkflowState } from '../../lib/workflows/types';
import { statusBg, statusFg } from '@/components/catalyst-detail-views/shared/sections/statusPalette';

const APPEARANCE_MAP: Record<StatusCategory, 'default' | 'inprogress' | 'success' | 'removed' | 'new' | 'moved'> = {
  default:    'default',
  inprogress: 'inprogress',
  success:    'success',
  removed:    'removed',
  new:        'new',
  moved:      'moved',
};

export interface JiraStatusLozengeProps {
  /** Category determines the color (maps to Atlaskit appearance) */
  category: StatusCategory;
  /** Label shown inside the pill */
  name: string;
  /** Bold = filled lozenge (Jira issue header default). Subtle = tinted. */
  variant?: 'bold' | 'subtle';
  /** Max width — truncate with ellipsis beyond this. */
  maxWidth?: number;
}

export function JiraStatusLozenge({
  category,
  name,
  variant = 'bold',
  maxWidth,
}: JiraStatusLozengeProps) {
  // Canonical status pill (statusPalette.ts). Was @atlaskit/lozenge whose bold
  // success rendered the dark var(--ds-background-success-bold, #1F845A)/white; unified 2026-06-17 to the canonical
  // #94C748 pastel shared by all work-item status pills.
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      backgroundColor: statusBg(APPEARANCE_MAP[category]),
      borderRadius: 3,
      padding: '0 6px',
      height: 20,
      maxWidth: maxWidth ?? undefined,
    }}>
      <span style={{
        font: `653 11px/16px var(--ds-font-family-body, "Atlassian Sans"), ui-sans-serif, sans-serif`,
        color: statusFg(APPEARANCE_MAP[category]),
        textTransform: 'uppercase',
        letterSpacing: '0.165px',
        padding: '2px',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>
        {name}
      </span>
    </span>
  );
}

export function JiraStatusLozengeForState({
  state,
  variant = 'bold',
  maxWidth,
}: { state: WorkflowState; variant?: 'bold' | 'subtle'; maxWidth?: number }) {
  return (
    <JiraStatusLozenge
      category={state.category}
      name={state.name}
      variant={variant}
      maxWidth={maxWidth}
    />
  );
}
