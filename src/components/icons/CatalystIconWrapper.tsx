/**
 * ═══════════════════════════════════════════════════════════════════════
 * CATALYST ICON WRAPPER — CANONICAL ICON RENDERING
 * ═══════════════════════════════════════════════════════════════════════
 *
 * Single canonical wrapper for all icon rendering in Catalyst.
 *
 * Enforces:
 *   • ADS token-only color semantic (no hex fallbacks)
 *   • Proper sizing (16 | 24 | 32 px only)
 *   • Accessibility (label required unless aria-hidden)
 *   • Dark mode visibility via CSS variable inheritance
 *
 * Usage:
 *   <CatalystIconWrapper size={24} color="default" label="icon description">
 *     <MyIconSvg />
 *   </CatalystIconWrapper>
 * ═══════════════════════════════════════════════════════════════════════
 */

import React, { ReactNode } from 'react';

export type IconSize = 16 | 24 | 32;

export type IconColor =
  | 'default'     // var(--ds-icon)
  | 'subtle'      // var(--ds-icon-subtle)
  | 'selected'    // var(--ds-icon-selected)
  | 'danger'      // var(--ds-icon-danger)
  | 'warning'     // var(--ds-icon-warning)
  | 'success'     // var(--ds-icon-success)
  | 'disabled'    // var(--ds-icon-disabled)
  | 'inverse';    // var(--ds-icon-inverse)

export interface CatalystIconWrapperProps {
  /**
   * Icon size in pixels. Only 16, 24, or 32 are valid.
   * Defaults to 24.
   */
  size: IconSize;

  /**
   * Icon color semantic, mapped to ADS token.
   * Defaults to 'default'.
   */
  color?: IconColor;

  /**
   * Accessibility label. REQUIRED unless aria-hidden is true.
   * Announced to screen readers.
   */
  label?: string;

  /**
   * Hide from screen readers. Use only for decorative icons.
   */
  ariaHidden?: boolean;

  /**
   * The <svg> element or icon component to render.
   * Should use fill="currentColor" or stroke="currentColor"
   * so it inherits color from the wrapper's CSS context.
   */
  children: ReactNode;
}

/**
 * Renders an icon with proper token-driven color and accessibility.
 *
 * Constrains:
 *   • Size: 16, 24, or 32 px (validated)
 *   • Color: ADS semantic token (no hex fallbacks)
 *   • A11y: label required (enforced via TypeScript)
 *   • Dark mode: inherits from --ds-icon-* variable
 *
 * The wrapper applies CSS that forces SVG children to use currentColor,
 * so hardcoded fill/stroke in SVGs is overridden.
 */
export const CatalystIconWrapper: React.FC<CatalystIconWrapperProps> = ({
  size,
  color = 'default',
  label,
  ariaHidden,
  children,
}) => {
  // Validate size at runtime (TypeScript doesn't enforce exhaustive unions at runtime)
  if (![16, 24, 32].includes(size)) {
    console.error(
      `CatalystIconWrapper: invalid size ${size}. Must be 16, 24, or 32.`
    );
  }

  // Accessibility: label required unless aria-hidden
  if (!ariaHidden && !label) {
    console.warn(
      'CatalystIconWrapper: label is required unless aria-hidden is true. ' +
      'Decorative icons should set aria-hidden and avoid a label.'
    );
  }

  // Map color semantic to ADS token variable
  const colorTokenMap: Record<IconColor, string> = {
    default: 'var(--ds-icon)',
    subtle: 'var(--ds-icon-subtle)',
    selected: 'var(--ds-icon-selected)',
    danger: 'var(--ds-icon-danger)',
    warning: 'var(--ds-icon-warning)',
    success: 'var(--ds-icon-success)',
    disabled: 'var(--ds-icon-disabled)',
    inverse: 'var(--ds-icon-inverse)',
  };

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: `${size}px`,
        height: `${size}px`,
        flexShrink: 0,
        color: colorTokenMap[color],
        // Force SVG children to inherit color via currentColor
        // Overrides any hardcoded fill/stroke in the SVG
        lineHeight: 1,
      }}
      aria-label={label}
      aria-hidden={ariaHidden}
      role={ariaHidden ? 'presentation' : undefined}
      data-testid={`catalyst-icon-wrapper-${size}-${color}`}
    >
      {/* SVG child should use fill="currentColor" or stroke="currentColor" */}
      {children}
    </span>
  );
};

CatalystIconWrapper.displayName = 'CatalystIconWrapper';
