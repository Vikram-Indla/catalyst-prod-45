import React from 'react';

/** The compact, brand-faithful Caty head: gradient ears + dark inner strokes,
 *  signature sleepy eyes, whiskers. Legible down to ~20px. Use the FULL lockup
 *  at >=40px (FAB, headers, empty states) instead. */
export function CatyHead({ size = 24, title }: { size?: number; title?: string }) {
  const gid = React.useId();
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      role={title ? 'img' : 'presentation'}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <defs>
        <linearGradient id={gid} x1="6" y1="6" x2="74" y2="78" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FBA56A" />
          <stop offset=".42" stopColor="#F53F68" />
          <stop offset=".72" stopColor="#C0177A" />
          <stop offset="1" stopColor="#8E2A9C" />
        </linearGradient>
      </defs>
      <path d="M20 30 L25 5 L42 22 Z" fill={`url(#${gid})`} />
      <path d="M60 30 L55 5 L38 22 Z" fill={`url(#${gid})`} />
      <path d="M25.5 11 L28 23 L35.5 19 Z" fill="#23222B" opacity="0.30" />
      <path d="M54.5 11 L52 23 L44.5 19 Z" fill="#23222B" opacity="0.30" />
      <circle cx="40" cy="44" r="30" fill={`url(#${gid})`} />
      <g transform="translate(40 43) scale(0.235) translate(-348 -150)">
        <g stroke="#fff" strokeWidth="10" strokeLinecap="round" fill="none">
          <path d="M300 172 Q244 168 226 178" />
          <path d="M300 182 Q240 185 222 198" />
          <path d="M398 172 Q454 168 472 178" />
          <path d="M398 182 Q458 185 476 198" />
        </g>
        <path d="M340 178 L356 178 Q348 190 340 178 Z" fill="#fff" />
        <g fill="none" stroke="#fff" strokeWidth="14" strokeLinecap="round">
          <path d="M303 150 Q322 171 341 150" />
          <path d="M355 150 Q374 171 393 150" />
        </g>
      </g>
    </svg>
  );
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
  ...rest
}: {
  label: string;
  loading?: boolean;
  onClick?: () => void;
  size?: 'compact' | 'default' | 'large';
  className?: string;
  badge?: number | string;
  [key: string]: any;
}) {
  const iconSize = size === 'compact' ? 16 : size === 'large' ? 28 : 24;
  const heightPx = size === 'compact' ? 28 : size === 'large' ? 48 : 40;
  const paddingPx = size === 'compact' ? '4px 8px' : size === 'large' ? '8px 12px' : '6px 12px';
  const fontSizePx = size === 'compact' ? 12 : size === 'large' ? 16 : 14;

  return (
    <div style={{ position: 'relative', display: 'inline-flex' }}>
      <button
        type="button"
        onClick={onClick}
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
        {...rest}
      >
        <CatyHead size={iconSize} />
        <span className="caty-btn__label">{loading ? 'Thinking' : label}</span>
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
            color: '#FFFFFF',
            borderRadius: '50%',
            width: '20px',
            height: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '11px',
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
