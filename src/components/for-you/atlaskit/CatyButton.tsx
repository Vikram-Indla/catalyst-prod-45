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
 */
export function CatyButton({
  label,
  loading = false,
  onClick,
  className = '',
  ...rest
}: {
  label: string;
  loading?: boolean;
  onClick?: () => void;
  className?: string;
  [key: string]: any;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`caty-btn ${className}`}
      data-loading={loading || undefined}
      aria-busy={loading || undefined}
      {...rest}
    >
      <CatyHead size={24} />
      <span className="caty-btn__label">{loading ? 'Thinking' : label}</span>
      {loading && (
        <span className="caty-btn__dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
      )}
    </button>
  );
}

export default CatyButton;
