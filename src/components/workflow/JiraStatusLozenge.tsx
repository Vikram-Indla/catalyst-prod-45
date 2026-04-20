/**
 * JiraStatusLozenge — Atlaskit Lozenge wrapper that maps our
 * `StatusCategory` to Atlaskit's `appearance` prop.
 *
 * Sizes and colors match Jira exactly: bold appearance renders a 16px
 * tall pill with 14px text, colors per @atlaskit/tokens.
 */
import React from 'react';
import Lozenge from '@atlaskit/lozenge';
import type { StatusCategory, WorkflowState } from '../../lib/workflows/types';

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
  return (
    <Lozenge
      appearance={APPEARANCE_MAP[category]}
      isBold={variant === 'bold'}
      maxWidth={maxWidth}
    >
      {name}
    </Lozenge>
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
