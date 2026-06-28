import React from 'react';
import './caty-button.css';
import { CatyPulseIcon } from '@/components/ui/CatyPulseIcon';

/** Caty mark — the magenta pulse glyph. Was a cat head; unified to the pulse
 *  signature across all surfaces (2026-06-18). Keeps the {size,title} API so
 *  every call site (cards, search pill, reply composer, CatyIconCTA) is unchanged. */
export function CatyHead({ size = 24, title }: { size?: number; title?: string }) {
  return <CatyPulseIcon size={size} title={title} />;
}

/**
 * @param {string}  label     The action, e.g. "Board health", "Summarize 5". NOT "Ask Caty - ...".
 * @param {boolean} loading   While Caty is generating — shows "Thinking" + animated dots.
 * @param {fn}      onClick   Keep the existing handler from the CTA you're replacing.
 * @param {string}  size      'compact' (32px, inline reply), 'default' (40px, feed/rail), 'large' (48px, headers)
 */
export function CatyButton({
  label,
  loading = false,
  onClick,
  size = 'default',
  className = '',
  badge,
  trailing,
  disabled = false,
  'aria-label': ariaLabelProp,
  ...rest
}: {
  label: string;
  loading?: boolean;
  onClick?: () => void;
  size?: 'compact' | 'default' | 'large';
  className?: string;
  badge?: number | string;
  /** Inline node rendered after the label (e.g. a hover-revealed quota counter). Hidden while loading. */
  trailing?: React.ReactNode;
  /** Disable the button (e.g. daily quota exhausted). Pass a `title` via rest for the reason tooltip. */
  disabled?: boolean;
  'aria-label'?: string;
  [key: string]: any;
}) {
  const iconSize = size === 'compact' ? 16 : size === 'large' ? 28 : 24;
  const heightPx = size === 'compact' ? 28 : size === 'large' ? 48 : 40;
  const paddingPx = size === 'compact' ? '4px 8px' : size === 'large' ? '8px 12px' : '6px 12px';
  const fontSizePx = size === 'compact' ? 12 : size === 'large' ? 16 : 14;

  // The cat mascot IS the "Ask Caty" signifier — never render those words as
  // visible button text. Strip any leading "Ask Caty" prefix a caller passed,
  // but preserve it in the accessible name so screen-reader users still hear it.
  const action = (label || '').replace(/^\s*ask\s*caty\s*[-–—:]?\s*/i, '').trim();
  const ariaLabel = ariaLabelProp || (action ? `Ask Caty — ${action}` : 'Ask Caty');
  const visibleLabel = loading ? 'Thinking' : action;

  return (
    <div style={{ position: 'relative', display: 'inline-flex' }}>
      <button
        type="button"
        onClick={disabled || loading ? undefined : onClick}
        disabled={disabled}
        className={`caty-btn ${className}`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: size === 'compact' ? 4 : 6,
          height: heightPx,
          padding: paddingPx,
          background: 'var(--ds-surface-overlay, #FFFFFF)',
          border: '1px solid var(--ds-border, #DFE1E6)',
          borderRadius: 99,
          fontSize: fontSizePx,
          fontWeight: 500,
          color: 'var(--ds-text, #172B4D)',
          cursor: 'pointer',
          transition: 'background-color 150ms, border-color 150ms',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--ds-background-neutral-subtle-hovered, rgba(9,30,66,0.06))';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--ds-surface-overlay, #FFFFFF)';
        }}
        data-loading={loading || undefined}
        aria-busy={loading || undefined}
        aria-label={ariaLabel}
        {...rest}
      >
        <CatyPulseIcon size={iconSize} />
        {visibleLabel && <span className="caty-btn__label">{visibleLabel}</span>}
        {!loading && trailing}
        {loading && (
          <span className="caty-btn__dots" style={{ display: 'inline-flex', gap: 2 }} aria-hidden="true">
            <i style={{ width: 2, height: 2, borderRadius: '50%', background: 'currentColor' }} />
            <i style={{ width: 2, height: 2, borderRadius: '50%', background: 'currentColor' }} />
            <i style={{ width: 2, height: 2, borderRadius: '50%', background: 'currentColor' }} />
          </span>
        )}
      </button>
      {badge && (
        <span
          style={{
            position: 'absolute',
            top: '-6px',
            right: '-6px',
            background: 'var(--ds-background-danger-bold, #AE2A19)',
            color: 'var(--ds-text-inverse, #FFFFFF)',
            borderRadius: '50%',
            width: '20px',
            height: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 'var(--ds-font-size-100)',
            fontWeight: 700,
            lineHeight: '1',
          }}
          aria-label={`${badge} new items`}
        >
          {badge}
        </span>
      )}
    </div>
  );
}

export default CatyButton;
