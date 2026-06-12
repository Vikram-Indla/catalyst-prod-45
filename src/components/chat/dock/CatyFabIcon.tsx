/**
 * CatyFabIcon — inline Ask Caty gradient SVG.
 * Inline (not <img>) so CSS breathing + hover/active animations work.
 * Gradient fills (#F79357→#CC1E9A) are visible on both light and dark backgrounds.
 * Dark detail fills use var(--caty-fg) so they adapt if dark mode is ever enabled.
 */

export function CatyFabIcon({
  size = 56,
  isDragging = false,
}: {
  size?: number;
  isDragging?: boolean;
}) {
  return (
    <span
      className="cc-fab-icon"
      style={{ display: 'inline-block', width: size, height: size, flexShrink: 0 }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="130 70 270 370"
        width={size}
        height={size}
        role="img"
        aria-label="Ask Caty"
        className={isDragging ? 'is-dragging' : undefined}
      >
        <defs>
          {/* ads-scanner:ignore-next-line — Caty brand gradient, no ADS token equivalent */}
          <linearGradient id="cdg" x1="256" y1="40" x2="256" y2="470" gradientUnits="userSpaceOnUse">
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
          .cf { transform-box: fill-box; transform-origin: 50% 55%;
                animation: cfB 3.6s ease-in-out infinite;
                transition: transform .4s cubic-bezier(.3,1.7,.4,1) }
          @keyframes cfB { 0%,100%{transform:scale(.9)} 50%{transform:scale(.95)} }
          .cf-eyes { transition: opacity .15s ease }
          .cf-ears { transform-box: fill-box; transform-origin: 50% 100%;
                     transition: transform .22s cubic-bezier(.34,1.6,.4,1) }
          .cf-tail { transform-box: fill-box; transform-origin: 0% 100%;
                     transition: transform .24s cubic-bezier(.34,1.7,.4,1) }
          svg:hover .cf, svg.is-awake .cf, svg.is-excited .cf {
            animation: none; transform: scale(1.05) }
          svg:hover .cf-sleep, svg.is-awake .cf-sleep, svg.is-excited .cf-sleep { opacity: 0 }
          svg:hover .cf-awake, svg.is-awake .cf-awake { opacity: 1 }
          svg:hover .cf-ears, svg.is-awake .cf-ears, svg.is-excited .cf-ears { transform: scaleY(1.28) }
          svg:hover .cf-tail, svg.is-awake .cf-tail, svg.is-excited .cf-tail { transform: rotate(-20deg) }
          svg:active .cf, svg.is-excited .cf { transform: scale(1.12) }
          svg:active .cf-sleep, svg:active .cf-awake,
          svg.is-excited .cf-sleep, svg.is-excited .cf-awake { opacity: 0 }
          svg:active .cf-excited, svg.is-excited .cf-excited { opacity: 1 }

          /* ── Drag / strangled state ─────────────────────────────────
             Body squishes sideways (pulled), ears flatten back,
             tail thrashes, eyes pop open wide.
             Overrides hover/active states while dragging. */
          svg.is-dragging .cf {
            animation: none !important;
            transform: scaleX(1.35) scaleY(0.72) !important;
            transition: transform 0.06s ease !important;
          }
          svg.is-dragging .cf-ears {
            transform: scaleY(0.45) rotate(-18deg) !important;
            transition: transform 0.06s ease !important;
          }
          svg.is-dragging .cf-tail {
            animation: cfTailFlail 0.22s ease-in-out infinite !important;
            transition: none !important;
          }
          svg.is-dragging .cf-sleep { opacity: 0 !important; }
          svg.is-dragging .cf-awake { opacity: 0 !important; }
          svg.is-dragging .cf-excited { opacity: 1 !important; }
          @keyframes cfTailFlail {
            0%,100% { transform: rotate(35deg); }
            50%     { transform: rotate(75deg); }
          }

          @media (prefers-reduced-motion: reduce) { .cf { animation: none; transform: scale(1) } }
        `}</style>

        <g className="cf">
          <path
            className="cf-tail"
            d="M404 392 Q462 392 456 336"
            fill="none"
            stroke="url(#cdg)"
            strokeWidth="26"
            strokeLinecap="round"
          />
          <g className="cf-ears">
            <path d="M270 100 Q300 26 322 100 Z" fill="url(#cdg)" />
            <path d="M358 100 Q388 24 408 100 Z" fill="url(#cdg)" />
            <path d="M288 96 Q301 56 312 94" fill="none" stroke="var(--caty-fg, #2A2832)" strokeWidth="9" strokeLinecap="round" opacity=".6" />
            <path d="M374 96 Q387 54 398 94" fill="none" stroke="var(--caty-fg, #2A2832)" strokeWidth="9" strokeLinecap="round" opacity=".6" />
          </g>
          <path
            d="M421.802 200.297V93.9736H259.279L233.457 127.39L210.674 93.9736H154.474C39.037 223.992 106.375 363.833 154.474 417.501H421.802V309.659H279.025L236.495 374.972C170.878 271.686 209.155 173.97 236.495 138.022L279.025 200.297H421.802Z"
            fill="url(#cdg)"
          />
          <text
            x="350" y="293"
            textAnchor="middle"
            fontFamily="'Atlassian Sans', system-ui, sans-serif"
            fontSize="82"
            fontWeight="800"
            fontStyle="italic"
            fill="var(--caty-fg, #2A2832)"
          >
            ask
          </text>
          <g fill="none" stroke="var(--caty-fg, #2A2832)" strokeWidth="10" strokeLinecap="round">
            <path d="M300 176 Q238 174 224 190" />
            <path d="M398 176 Q462 174 476 190" />
            <path d="M400 192 Q458 198 470 214" />
          </g>
          <path d="M340 178 L356 178 Q348 190 340 178 Z" fill="var(--caty-fg, #2A2832)" />

          {/* Eyes — sleep (default) */}
          <g className="cf-eyes cf-sleep" fill="none" stroke="var(--caty-fg, #2A2832)" strokeWidth="12" strokeLinecap="round">
            <path d="M306 150 Q322 168 338 150" />
            <path d="M358 150 Q374 168 390 150" />
          </g>
          {/* Eyes — awake */}
          <g className="cf-eyes cf-awake" opacity="0">
            <circle cx="322" cy="150" r="20" fill="var(--ds-surface, #FFFFFF)" stroke="var(--caty-fg, #2A2832)" strokeWidth="4" />
            <circle cx="374" cy="150" r="20" fill="var(--ds-surface, #FFFFFF)" stroke="var(--caty-fg, #2A2832)" strokeWidth="4" />
            <circle cx="324" cy="153" r="8.5" fill="var(--caty-fg, #2A2832)" />
            <circle cx="376" cy="153" r="8.5" fill="var(--caty-fg, #2A2832)" />
            <circle cx="320" cy="148" r="3" fill="var(--ds-surface, #FFFFFF)" />
            <circle cx="372" cy="148" r="3" fill="var(--ds-surface, #FFFFFF)" />
          </g>
          {/* Eyes — excited */}
          <g className="cf-eyes cf-excited" opacity="0">
            <circle cx="322" cy="148" r="23" fill="var(--ds-surface, #FFFFFF)" stroke="var(--caty-fg, #2A2832)" strokeWidth="4" />
            <circle cx="374" cy="148" r="23" fill="var(--ds-surface, #FFFFFF)" stroke="var(--caty-fg, #2A2832)" strokeWidth="4" />
            <circle cx="324" cy="151" r="10" fill="var(--caty-fg, #2A2832)" />
            <circle cx="376" cy="151" r="10" fill="var(--caty-fg, #2A2832)" />
            <circle cx="319" cy="145" r="4" fill="var(--ds-surface, #FFFFFF)" />
            <circle cx="371" cy="145" r="4" fill="var(--ds-surface, #FFFFFF)" />
          </g>
        </g>
      </svg>
    </span>
  );
}
