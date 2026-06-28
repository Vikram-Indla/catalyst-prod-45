/**
 * CatyFabIcon — inline Ask Caty gradient SVG.
 * Inline (not <img>) so CSS breathing + hover/active animations work.
 * Gradient fills (#F79357→#CC1E9A) are visible on both light and dark backgrounds.
 * Dark detail fills use var(--caty-fg) so they adapt if dark mode is ever enabled.
 */

export function CatyFabIcon({ size = 56, isDragging = false }: { size?: number; isDragging?: boolean }) {
  return (
    <span
      className="cc-fab-icon"
      style={{ display: 'inline-block', width: size, height: size, flexShrink: 0 }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 512 512"
        width={size}
        height={size}
        role="img"
        aria-label="Ask Caty"
        className={isDragging ? 'is-dragging' : undefined}
      >
        <defs>
          {/* ads-scanner:ignore-next-line — Caty brand gradient, no ADS token equivalent */}
          <linearGradient id="askdg" x1="256" y1="40" x2="256" y2="470" gradientUnits="userSpaceOnUse">
            {/* ads-scanner:ignore-next-line */}
            <stop stopColor="#F79357" />
            {/* ads-scanner:ignore-next-line */}
            <stop offset=".5" stopColor="var(--ds-background-danger-bold)" />
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
          .cf-tail { transform-box: fill-box; transform-origin: 8% 96%;
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
          @media (prefers-reduced-motion: reduce) { .cf { animation: none; transform: scale(1) } }
          svg.is-dragging .cf-ears { transform: scaleY(0.45) }
          svg.is-dragging .cf-tail { animation: cfTailFlail .25s ease-in-out infinite alternate }
          @keyframes cfTailFlail { from { transform: rotate(-50deg) } to { transform: rotate(50deg) } }
          svg.is-dragging .cf-sleep, svg.is-dragging .cf-awake { opacity: 0 }
          svg.is-dragging .cf-excited { opacity: 1 }
        `}</style>

        <g className="cf">
          <path
            className="cf-tail"
            d="M404 392 Q462 392 456 336"
            fill="none"
            stroke="url(#askdg)"
            strokeWidth="26"
            strokeLinecap="round"
          />
          <path
            d="M421.802 200.297V93.9736H259.279L233.457 127.39L210.674 93.9736H154.474C39.037 223.992 106.375 363.833 154.474 417.501H421.802V309.659H279.025L236.495 374.972C170.878 271.686 209.155 173.97 236.495 138.022L279.025 200.297H421.802Z"
            fill="url(#askdg)"
          />
          <text
            x="350"
            y="293"
            textAnchor="middle"
            fontFamily="var(--ds-font-family-body)"
            fontSize="84"
            fontWeight="800"
            fontStyle="italic"
            fill="var(--caty-fg)"
          >
            ask
          </text>
          <g className="cf-ears">
            <path d="M270 100 Q300 26 322 100 Z" fill="url(#askdg)" />
            <path d="M358 100 Q388 24 408 100 Z" fill="url(#askdg)" />
            <path d="M288 96 Q301 56 312 94" fill="none" stroke="var(--caty-fg)" strokeWidth="9" strokeLinecap="round" opacity=".55" />
            <path d="M374 96 Q387 54 398 94" fill="none" stroke="var(--caty-fg)" strokeWidth="9" strokeLinecap="round" opacity=".55" />
          </g>
          <g stroke="var(--caty-fg)" strokeWidth="9.5" strokeLinecap="round" fill="none">
            <path d="M300 172 Q244 168 226 178" /><path d="M300 182 Q240 185 222 198" /><path d="M302 192 Q248 201 232 214" />
            <path d="M398 172 Q454 168 472 178" /><path d="M398 182 Q458 185 476 198" /><path d="M396 192 Q452 201 468 214" />
          </g>
          <path d="M340 176 L356 176 Q348 188 340 176 Z" fill="var(--caty-fg)" />
          <g className="cf-eyes cf-sleep" fill="none" stroke="var(--caty-fg)" strokeWidth="13" strokeLinecap="round">
            <path d="M304 150 Q322 170 340 150" /><path d="M356 150 Q374 170 392 150" />
          </g>
          <g className="cf-eyes cf-awake" opacity="0">
            <circle cx="322" cy="150" r="20" fill="var(--ds-surface)" stroke="var(--caty-fg)" strokeWidth="4.5" />
            <circle cx="374" cy="150" r="20" fill="var(--ds-surface)" stroke="var(--caty-fg)" strokeWidth="4.5" />
            <circle cx="324" cy="153" r="8.5" fill="var(--caty-fg)" /><circle cx="376" cy="153" r="8.5" fill="var(--caty-fg)" />
            <circle cx="320" cy="147" r="3.2" fill="var(--ds-surface)" /><circle cx="372" cy="147" r="3.2" fill="var(--ds-surface)" />
          </g>
          <g className="cf-eyes cf-excited" opacity="0">
            <circle cx="319" cy="151" r="26" fill="var(--ds-surface)" stroke="var(--caty-fg)" strokeWidth="5" />
            <circle cx="377" cy="151" r="26" fill="var(--ds-surface)" stroke="var(--caty-fg)" strokeWidth="5" />
            <circle cx="323" cy="158" r="13.5" fill="var(--caty-fg)" /><circle cx="381" cy="158" r="13.5" fill="var(--caty-fg)" />
            <circle cx="316" cy="145" r="4.5" fill="var(--ds-surface)" /><circle cx="374" cy="145" r="4.5" fill="var(--ds-surface)" />
          </g>
        </g>
      </svg>
    </span>
  );
}
