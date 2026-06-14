/**
 * CatyMoodFace — the brand Caty mark with a mood-driven expression.
 *
 * The body swoosh, ears, whiskers, nose and "ask" wordmark are BYTE-IDENTICAL to
 * CatyFabIcon (the brand C-mark structure is never altered — Vikram, 2026-06-14).
 * Only the eyes / brows / mouth swap per state. Mood is read from the FACE; colour
 * accents live in the badge and Why card, so the brand cat is never recoloured
 * (enterprise-soft).
 */
import type { CatyState } from './catyMoodEngine';

const FG = 'var(--caty-fg, #23222B)';
const EYE_WHITE = 'var(--ds-surface, #FFFFFF)';
// "ask" wordmark uses the Atlassian Sans body family (ADS-only fonts, CLAUDE.md P0).
const ASK_FONT = 'var(--ds-font-family-body)';

function Brows({ state }: { state: CatyState }) {
  if (state === 'focused')
    return (
      <g stroke={FG} strokeWidth="9" strokeLinecap="round" fill="none">
        <path d="M300 128 L340 134" />
        <path d="M396 128 L356 134" />
      </g>
    );
  if (state === 'concerned')
    return (
      <g stroke={FG} strokeWidth="9" strokeLinecap="round" fill="none">
        <path d="M300 134 L340 126" />
        <path d="M396 134 L356 126" />
      </g>
    );
  if (state === 'alert')
    return (
      <g stroke={FG} strokeWidth="9" strokeLinecap="round" fill="none">
        <path d="M302 122 L342 122" />
        <path d="M356 122 L396 122" />
      </g>
    );
  return null;
}

function Eyes({ state }: { state: CatyState }) {
  switch (state) {
    case 'zen':
      return (
        <g fill="none" stroke={FG} strokeWidth="13" strokeLinecap="round">
          <path d="M304 150 Q322 134 340 150" />
          <path d="M356 150 Q374 134 392 150" />
        </g>
      );
    case 'content':
      return (
        <g>
          <circle cx="322" cy="150" r="20" fill={EYE_WHITE} stroke={FG} strokeWidth="4.5" />
          <circle cx="374" cy="150" r="20" fill={EYE_WHITE} stroke={FG} strokeWidth="4.5" />
          <circle cx="324" cy="153" r="8.5" fill={FG} />
          <circle cx="376" cy="153" r="8.5" fill={FG} />
        </g>
      );
    case 'focused':
      return (
        <g>
          <circle cx="322" cy="152" r="15" fill={EYE_WHITE} stroke={FG} strokeWidth="4.5" />
          <circle cx="374" cy="152" r="15" fill={EYE_WHITE} stroke={FG} strokeWidth="4.5" />
          <circle cx="322" cy="149" r="7" fill={FG} />
          <circle cx="374" cy="149" r="7" fill={FG} />
        </g>
      );
    case 'concerned':
      return (
        <g>
          <circle cx="322" cy="154" r="16" fill={EYE_WHITE} stroke={FG} strokeWidth="4.5" />
          <circle cx="374" cy="154" r="16" fill={EYE_WHITE} stroke={FG} strokeWidth="4.5" />
          <circle cx="322" cy="150" r="7.5" fill={FG} />
          <circle cx="374" cy="150" r="7.5" fill={FG} />
        </g>
      );
    case 'alert':
      return (
        <g>
          <circle cx="320" cy="151" r="26" fill={EYE_WHITE} stroke={FG} strokeWidth="5" />
          <circle cx="377" cy="151" r="26" fill={EYE_WHITE} stroke={FG} strokeWidth="5" />
          <circle cx="323" cy="158" r="13.5" fill={FG} />
          <circle cx="381" cy="158" r="13.5" fill={FG} />
        </g>
      );
    default:
      return null;
  }
}

function Mouth({ state }: { state: CatyState }) {
  if (state === 'zen')
    return <path d="M338 192 Q348 200 358 192" fill="none" stroke={FG} strokeWidth="8" strokeLinecap="round" />;
  if (state === 'concerned')
    return <path d="M340 198 Q348 191 356 198" fill="none" stroke={FG} strokeWidth="8" strokeLinecap="round" />;
  if (state === 'alert') return <ellipse cx="348" cy="196" rx="5.5" ry="7.5" fill={FG} />;
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
        viewBox="0 0 512 512"
        width={size}
        height={size}
        role="img"
        aria-label={title ?? `Ask Caty — ${state}`}
      >
        <defs>
          {/* ads-scanner:ignore-next-line — Caty brand gradient, no ADS token equivalent */}
          <linearGradient id="moodg" x1="256" y1="40" x2="256" y2="470" gradientUnits="userSpaceOnUse">
            {/* ads-scanner:ignore-next-line */}
            <stop stopColor="#F79357" />
            {/* ads-scanner:ignore-next-line */}
            <stop offset=".5" stopColor="#F53F68" />
            {/* ads-scanner:ignore-next-line */}
            <stop offset=".75" stopColor="#B41572" />
            {/* ads-scanner:ignore-next-line */}
            <stop offset="1" stopColor="#CC1E9A" />
          </linearGradient>
        </defs>

        <style>{`
          .cmf-body { transform-box: fill-box; transform-origin: 50% 55%;
                      animation: cmfB 3.6s ease-in-out infinite; }
          @keyframes cmfB { 0%,100%{transform:scale(.92)} 50%{transform:scale(.96)} }
          @media (prefers-reduced-motion: reduce) { .cmf-body { animation: none; transform: scale(.94) } }
        `}</style>

        <g className="cmf-body">
          <path d="M404 392 Q462 392 456 336" fill="none" stroke="url(#moodg)" strokeWidth="26" strokeLinecap="round" />
          <path
            d="M421.802 200.297V93.9736H259.279L233.457 127.39L210.674 93.9736H154.474C39.037 223.992 106.375 363.833 154.474 417.501H421.802V309.659H279.025L236.495 374.972C170.878 271.686 209.155 173.97 236.495 138.022L279.025 200.297H421.802Z"
            fill="url(#moodg)"
          />
          <text
            x="350"
            y="293"
            textAnchor="middle"
            fontFamily={ASK_FONT}
            fontSize="84"
            fontWeight="800"
            fontStyle="italic"
            fill={FG}
          >
            ask
          </text>
          <g>
            <path d="M270 100 Q300 26 322 100 Z" fill="url(#moodg)" />
            <path d="M358 100 Q388 24 408 100 Z" fill="url(#moodg)" />
            <path d="M288 96 Q301 56 312 94" fill="none" stroke={FG} strokeWidth="9" strokeLinecap="round" opacity=".55" />
            <path d="M374 96 Q387 54 398 94" fill="none" stroke={FG} strokeWidth="9" strokeLinecap="round" opacity=".55" />
          </g>
          <g stroke={FG} strokeWidth="9.5" strokeLinecap="round" fill="none">
            <path d="M300 172 Q244 168 226 178" /><path d="M300 182 Q240 185 222 198" /><path d="M302 192 Q248 201 232 214" />
            <path d="M398 172 Q454 168 472 178" /><path d="M398 182 Q458 185 476 198" /><path d="M396 192 Q452 201 468 214" />
          </g>
          <path d="M340 176 L356 176 Q348 188 340 176 Z" fill={FG} />
          <Brows state={state} />
          <Eyes state={state} />
          <Mouth state={state} />
        </g>
      </svg>
    </span>
  );
}
