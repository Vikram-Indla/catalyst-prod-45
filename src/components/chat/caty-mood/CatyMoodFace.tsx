/**
 * CatyMoodFace — the brand Caty head with a mood-driven expression.
 *
 * Simple head design: ears, circular head with gradient fill, whiskers and nose.
 * Eyes, brows, and mouth change per state (zen, content, focused, concerned, alert).
 * Colour accents live in the badge and Why card; head itself is never recoloured.
 */
import type { CatyState } from './catyMoodEngine';

const FG = 'var(--caty-fg, #23222B)';
const EYE_WHITE = 'var(--ds-surface, #FFFFFF)';
// "ask" wordmark uses the Atlassian Sans body family (ADS-only fonts, CLAUDE.md P0).
const ASK_FONT = 'var(--ds-font-family-body)';

function Brows({ state }: { state: CatyState }) {
  if (state === 'focused')
    return (
      <g stroke={FG} strokeWidth="1.2" strokeLinecap="round" fill="none">
        <path d="M-8 -10 L4 -8" />
        <path d="M8 -10 L-4 -8" />
      </g>
    );
  if (state === 'concerned')
    return (
      <g stroke={FG} strokeWidth="1.2" strokeLinecap="round" fill="none">
        <path d="M-8 -8 L4 -12" />
        <path d="M8 -8 L-4 -12" />
      </g>
    );
  if (state === 'alert')
    return (
      <g stroke={FG} strokeWidth="1.2" strokeLinecap="round" fill="none">
        <path d="M-6 -12 L6 -12" />
        <path d="M-6 -12 L6 -12" />
      </g>
    );
  return null;
}

function Eyes({ state }: { state: CatyState }) {
  switch (state) {
    case 'zen':
      return (
        <g fill="none" stroke={FG} strokeWidth="1.8" strokeLinecap="round">
          <path d="M-6 -4 Q0 -8 6 -4" />
          <path d="M-6 -4 Q0 -8 6 -4" />
        </g>
      );
    case 'content':
      return (
        <g>
          <circle cx="-4" cy="-4" r="2.6" fill={EYE_WHITE} stroke={FG} strokeWidth="0.6" />
          <circle cx="4" cy="-4" r="2.6" fill={EYE_WHITE} stroke={FG} strokeWidth="0.6" />
          <circle cx="-3.8" cy="-2.8" r="1.1" fill={FG} />
          <circle cx="4.2" cy="-2.8" r="1.1" fill={FG} />
        </g>
      );
    case 'focused':
      return (
        <g>
          <circle cx="-4" cy="-3" r="2" fill={EYE_WHITE} stroke={FG} strokeWidth="0.6" />
          <circle cx="4" cy="-3" r="2" fill={EYE_WHITE} stroke={FG} strokeWidth="0.6" />
          <circle cx="-4" cy="-4" r="0.9" fill={FG} />
          <circle cx="4" cy="-4" r="0.9" fill={FG} />
        </g>
      );
    case 'concerned':
      return (
        <g>
          <circle cx="-4" cy="-2" r="2.1" fill={EYE_WHITE} stroke={FG} strokeWidth="0.6" />
          <circle cx="4" cy="-2" r="2.1" fill={EYE_WHITE} stroke={FG} strokeWidth="0.6" />
          <circle cx="-4" cy="-3.5" r="1" fill={FG} />
          <circle cx="4" cy="-3.5" r="1" fill={FG} />
        </g>
      );
    case 'alert':
      return (
        <g>
          <circle cx="-4.2" cy="-2.5" r="3.4" fill={EYE_WHITE} stroke={FG} strokeWidth="0.65" />
          <circle cx="4.2" cy="-2.5" r="3.4" fill={EYE_WHITE} stroke={FG} strokeWidth="0.65" />
          <circle cx="-3.8" cy="-0.5" r="1.8" fill={FG} />
          <circle cx="4.2" cy="-0.5" r="1.8" fill={FG} />
        </g>
      );
    default:
      return null;
  }
}

function Mouth({ state }: { state: CatyState }) {
  if (state === 'zen')
    return <path d="M-2 6 Q0 8 2 6" fill="none" stroke={FG} strokeWidth="1.1" strokeLinecap="round" />;
  if (state === 'concerned')
    return <path d="M-2 8 Q0 6.5 2 8" fill="none" stroke={FG} strokeWidth="1.1" strokeLinecap="round" />;
  if (state === 'alert') return <ellipse cx="0" cy="7" rx="0.72" ry="1" fill={FG} />;
  return null;
}

export function CatyMoodFace({
  state,
  size = 56,
  title,
}: {
  state: CatyState;
  size?: number;
  title?: string;
}) {
  return (
    <span className="cc-fab-icon" style={{ display: 'inline-block', width: size, height: size, flexShrink: 0 }}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 80 80"
        width={size}
        height={size}
        role="img"
        aria-label={title ?? `Ask Caty — ${state}`}
      >
        <defs>
          {/* ads-scanner:ignore-next-line — Caty brand gradient, no ADS token equivalent */}
          <linearGradient id="cg" x1="40" y1="4" x2="40" y2="76" gradientUnits="userSpaceOnUse">
            {/* ads-scanner:ignore-next-line */}
            <stop stopColor="#F79357" />
            {/* ads-scanner:ignore-next-line */}
            <stop offset=".5" stopColor="#F53F68" />
            {/* ads-scanner:ignore-next-line */}
            <stop offset=".78" stopColor="#B41572" />
            {/* ads-scanner:ignore-next-line */}
            <stop offset="1" stopColor="#CC1E9A" />
          </linearGradient>
        </defs>

        <style>{`
          .cmf-body { transform-box: fill-box; transform-origin: 50% 50%;
                      animation: cmfB 3.6s ease-in-out infinite; }
          @keyframes cmfB { 0%,100%{transform:scale(.92)} 50%{transform:scale(.96)} }
          @media (prefers-reduced-motion: reduce) { .cmf-body { animation: none; transform: scale(.94) } }
        `}</style>

        <g className="cmf-body">
          {/* Ears */}
          <path d="M20 30 L25 5 L42 22 Z" fill="url(#cg)" />
          <path d="M60 30 L55 5 L38 22 Z" fill="url(#cg)" />
          <path d="M25.5 11 L28 23 L35.5 19 Z" fill="#23222B" opacity="0.30" />
          <path d="M54.5 11 L52 23 L44.5 19 Z" fill="#23222B" opacity="0.30" />

          {/* Head circle */}
          <circle cx="40" cy="44" r="30" fill="url(#cg)" />

          {/* Face features - scaled group from original */}
          <g transform="translate(40 43) scale(0.235) translate(-348 -150)">
            {/* Whiskers */}
            <g stroke="#fff" strokeWidth="10" strokeLinecap="round" fill="none">
              <path d="M300 172 Q244 168 226 178" />
              <path d="M300 182 Q240 185 222 198" />
              <path d="M398 172 Q454 168 472 178" />
              <path d="M398 182 Q458 185 476 198" />
            </g>
            {/* Nose */}
            <path d="M340 178 L356 178 Q348 190 340 178 Z" fill="#fff" />
            {/* Eyes - state driven */}
            <g fill="none" stroke="#fff" strokeWidth="14" strokeLinecap="round">
              <path d="M303 150 Q322 171 341 150" />
              <path d="M355 150 Q374 171 393 150" />
            </g>
          </g>

          {/* State-driven expressions overlaid on head */}
          <g transform="translate(40 44)">
            <Brows state={state} />
            <Eyes state={state} />
            <Mouth state={state} />
          </g>
        </g>
      </svg>
    </span>
  );
}
