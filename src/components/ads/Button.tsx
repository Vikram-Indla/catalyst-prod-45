/**
 * Button — Catalyst wrapper over @atlaskit/button.
 *
 * Stable API surface. If Atlaskit's ButtonAppearance set changes, we remap
 * inside this file; product code continues to use ButtonAppearance values
 * below unchanged.
 *
 * Variants
 * ────────
 *   primary   +Create CTA and first-class commit actions ONLY (CLAUDE.md §8).
 *             Routes to Atlaskit's `primary`.
 *   default   the common case — secondary action.
 *   subtle    low-emphasis action inside a card or row (prefer over default
 *             for everything that isn't the main column).
 *   link      action styled as a text link.
 *   warning   destructive-adjacent (e.g. "Archive") — amber.
 *   danger    destructive (e.g. "Delete") — red.
 *
 * Notes
 * ─────
 * - Loading state shows Atlaskit's spinner and disables the button. The
 *   click handler is not fired while loading (Atlaskit handles this).
 * - iconBefore / iconAfter accept any ReactNode — always pass Lucide for
 *   UI chrome, never an Atlaskit icon (see CLAUDE.md §11).
 * - `testId` forwards to the rendered <button>.
 */
import { type MouseEvent, type ReactNode } from 'react';
import AkButton, { IconButton as AkIconButton } from '@atlaskit/button/new';
import { forwardTestId } from './internal/forwardTestId';

export type ButtonAppearance =
  | 'primary'
  | 'default'
  | 'subtle'
  | 'link'
  | 'warning'
  | 'danger';

export type ButtonSpacing = 'default' | 'compact' | 'none';

export interface ButtonProps {
  /** Variant. Default: 'default'. */
  appearance?: ButtonAppearance;
  /** Disables the button — does not fire onClick, greyed out. */
  isDisabled?: boolean;
  /** Shows a spinner and prevents clicks. */
  isLoading?: boolean;
  /** Icon rendered left of the label. Lucide only for UI chrome. */
  iconBefore?: ReactNode;
  /** Icon rendered right of the label. Lucide only for UI chrome. */
  iconAfter?: ReactNode;
  /** Button spacing variant. 'compact' for row-scoped actions. */
  spacing?: ButtonSpacing;
  /** Fills the parent width. */
  isFullWidth?: boolean;
  /** Click handler. Not fired while disabled or loading. */
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
  /** Accessible label — required when children is an icon-only node. */
  'aria-label'?: string;
  /** Catalyst test selector. Forwarded to the underlying <button>. */
  testId?: string;
  /** Button content. Required. */
  children: ReactNode;
  /** Optional type attribute. Default 'button'. */
  type?: 'button' | 'submit' | 'reset';
}

export function Button({
  appearance = 'default',
  isDisabled,
  isLoading,
  iconBefore,
  iconAfter,
  spacing = 'default',
  isFullWidth,
  onClick,
  children,
  type = 'button',
  testId,
  ...rest
}: ButtonProps) {
  return (
    <AkButton
      appearance={appearance}
      isDisabled={isDisabled}
      isLoading={isLoading}
      iconBefore={iconBefore ? () => <>{iconBefore}</> : undefined}
      iconAfter={iconAfter ? () => <>{iconAfter}</> : undefined}
      spacing={spacing}
      shouldFitContainer={isFullWidth}
      onClick={onClick}
      type={type}
      aria-label={rest['aria-label']}
      {...forwardTestId(testId)}
    >
      {children}
    </AkButton>
  );
}

export interface IconButtonProps {
  /** Icon node — always rendered. aria-label is required. */
  icon: ReactNode;
  appearance?: ButtonAppearance;
  isDisabled?: boolean;
  isLoading?: boolean;
  spacing?: ButtonSpacing;
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
  'aria-label': string;
  testId?: string;
  type?: 'button' | 'submit' | 'reset';
}

/**
 * IconButton — icon-only variant. aria-label is mandatory (a11y).
 */
export function IconButton({
  icon,
  appearance = 'subtle',
  isDisabled,
  isLoading,
  spacing = 'default',
  onClick,
  type = 'button',
  testId,
  ...rest
}: IconButtonProps) {
  return (
    <AkIconButton
      icon={() => <>{icon}</>}
      appearance={appearance}
      isDisabled={isDisabled}
      isLoading={isLoading}
      spacing={spacing}
      onClick={onClick}
      type={type}
      label={rest['aria-label']}
      {...forwardTestId(testId)}
    />
  );
}
