/**
 * ToolbarIconButton — shared primitive for all toolbar buttons.
 *
 * Renders a 28px square button with:
 *   - @atlaskit/tooltip wrapper (2026-06-17 — portals to
 *     atlaskit-portal-container at document.body, so the tooltip can
 *     never be clipped by the description editor shell's overflow:hidden
 *     or any other ancestor with overflow != visible/clip).
 *   - active-state background using ADS selected-bold token
 *   - hover-state background using ADS neutral-subtle-hovered
 *   - disabled-state with reduced opacity
 *
 * Tooltip text should include the keyboard shortcut where applicable,
 * e.g. "Bold Ctrl+B". The active prop reflects current mark/node state.
 */
import type { CSSProperties, ReactNode, MouseEvent } from 'react';
import Tooltip from '@atlaskit/tooltip';

export interface ToolbarIconButtonProps {
  label: string;
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
  active?: boolean;
  disabled?: boolean;
  children: ReactNode;
  width?: number;
  testId?: string;
}

export function ToolbarIconButton({
  label,
  onClick,
  active = false,
  disabled = false,
  children,
  width = 28,
  testId,
}: ToolbarIconButtonProps) {
  const base: CSSProperties = {
    height: 28,
    minWidth: width,
    padding: '0 4px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 0,
    border: 'none',
    borderRadius: 3,
    background: active
      ? 'var(--ds-background-selected)'
      : 'transparent',
    color: active
      ? 'var(--ds-text-selected)'
      : 'var(--ds-text-subtle)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.4 : 1,
    transition: 'background 100ms ease, color 100ms ease',
    fontSize: 'var(--ds-font-size-400)',
    fontWeight: 500,
    fontFamily:
      '"Atlassian Sans", ui-sans-serif, -apple-system, system-ui, sans-serif',
  };

  return (
    <Tooltip content={label} position="top">
      <button
        type="button"
        aria-label={label}
        aria-pressed={active}
        disabled={disabled}
        onMouseDown={(e) => {
          // Keep editor focus when clicking the toolbar.
          e.preventDefault();
        }}
        onClick={onClick}
        style={base}
        data-testid={testId}
        onMouseEnter={(e) => {
          if (disabled || active) return;
          e.currentTarget.style.background =
            'var(--ds-background-neutral-subtle-hovered, rgba(9,30,66,0.06))';
        }}
        onMouseLeave={(e) => {
          if (disabled || active) return;
          e.currentTarget.style.background = 'transparent';
        }}
      >
        {children}
      </button>
    </Tooltip>
  );
}

/** Vertical separator between toolbar groups. */
export function ToolbarSeparator() {
  return (
    <span
      aria-hidden
      style={{
        display: 'inline-block',
        width: 1,
        height: 18,
        margin: '0 4px',
        background: 'var(--ds-border)',
      }}
    />
  );
}
