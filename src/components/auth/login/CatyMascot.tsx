// ads-scanner:ignore-file — SVG illustration asset: all hex values are brand illustration colors, not UI surface tokens
/**
 * Ask CATY mascot — the Catalyst C-mark rendered as a cat.
 * Variant prop controls fill:
 *   'default'  → CSS custom props (--caty-body / --caty-accent) — adapts per surface
 *   'gradient' → #F79357→#CC1E9A gradient fill for dark navy band
 *   'light'    → #23222B fill for light/neutral backgrounds
 *   'dark'     → #F4F1EA cream fill for dark backgrounds
 * Font: 'Atlassian Sans', system-ui (Sora is banned per CLAUDE.md).
 */

interface CatyMascotProps {
  state?: 'sleep' | 'awake' | 'excited';
  variant?: 'default' | 'gradient' | 'light' | 'dark';
  className?: string;
  title?: string;
}

export function CatyMascot({
  state = 'sleep',
  variant = 'default',
  className = '',
  title = 'Ask CATY',
}: CatyMascotProps) {
  const stateClass = state === 'awake' ? ' is-awake' : state === 'excited' ? ' is-excited' : '';

  // Per-variant color resolution — SVG illustration asset colors, not UI surface colors
  // ads-scanner:ignore-next-line
  const isDefault = variant === 'default';
  // ads-scanner:ignore-next-line
  const body = isDefault ? 'currentColor' :
               variant === 'gradient' ? 'url(#caty-askdg)' :
               // ads-scanner:ignore-next-line
               variant === 'light'    ? '#23222B' : '#F4F1EA';
  // ads-scanner:ignore-next-line
  const accent = isDefault ? 'var(--caty-accent)' : variant === 'dark' ? '#23222B' : '#F4F1EA';
  // ads-scanner:ignore-next-line
  const eyeWhite = '#FFFFFF';
  // ads-scanner:ignore-next-line
  const eyeOutline = isDefault ? 'currentColor' : '#23222B';
  // ads-scanner:ignore-next-line
  const eyePupil  = isDefault ? 'currentColor' : '#23222B';

  return (
    <span className={`caty-mascot${stateClass} ${className}`.trim()} aria-hidden="true">
      <svg viewBox="0 0 512 512" fill="none" role="img" aria-label={title}>
        {variant === 'gradient' && (
          <defs>
            <linearGradient id="caty-askdg" x1="256" y1="40" x2="256" y2="470" gradientUnits="userSpaceOnUse">
              <stop stopColor="#F79357" />
              <stop offset=".5" stopColor="#F53F68" />
              <stop offset=".75" stopColor="#B41572" />
              <stop offset="1" stopColor="#CC1E9A" />
            </linearGradient>
          </defs>
        )}
        <g className="cf">
          <path
            className="cf-tail"
            d="M404 392 Q462 392 456 336"
            fill="none"
            stroke={body}
            strokeWidth="26"
            strokeLinecap="round"
          />
          <path
            d="M421.802 200.297V93.9736H259.279L233.457 127.39L210.674 93.9736H154.474C39.037 223.992 106.375 363.833 154.474 417.501H421.802V309.659H279.025L236.495 374.972C170.878 271.686 209.155 173.97 236.495 138.022L279.025 200.297H421.802Z"
            fill={body}
          />
          <text
            x="350"
            y="293"
            textAnchor="middle"
            fontFamily="'Atlassian Sans', system-ui, sans-serif"
            fontSize="84"
            fontWeight="800"
            fontStyle="italic"
            fill={accent}
          >
            ask
          </text>
          <g className="cf-ears">
            <path d="M270 100 Q300 26 322 100 Z" fill={body} />
            <path d="M358 100 Q388 24 408 100 Z" fill={body} />
            <path d="M288 96 Q301 56 312 94" fill="none" stroke={accent} strokeWidth="9" strokeLinecap="round" opacity=".55" />
            <path d="M374 96 Q387 54 398 94" fill="none" stroke={accent} strokeWidth="9" strokeLinecap="round" opacity=".55" />
          </g>
          <g stroke={accent} strokeWidth="9.5" strokeLinecap="round" fill="none">
            <path d="M300 172 Q244 168 226 178" /><path d="M300 182 Q240 185 222 198" /><path d="M302 192 Q248 201 232 214" />
            <path d="M398 172 Q454 168 472 178" /><path d="M398 182 Q458 185 476 198" /><path d="M396 192 Q452 201 468 214" />
          </g>
          <path d="M340 176 L356 176 Q348 188 340 176 Z" fill={accent} />
          {/* Sleep eyes (default visible) */}
          <g className="cf-eyes cf-sleep" fill="none" stroke={accent} strokeWidth="13" strokeLinecap="round">
            <path d="M304 150 Q322 170 340 150" /><path d="M356 150 Q374 170 392 150" />
          </g>
          {/* Awake eyes */}
          <g className="cf-eyes cf-awake" opacity="0">
            <circle cx="322" cy="150" r="20" fill={eyeWhite} stroke={eyeOutline} strokeWidth="4.5" />
            <circle cx="374" cy="150" r="20" fill={eyeWhite} stroke={eyeOutline} strokeWidth="4.5" />
            <circle cx="324" cy="153" r="8.5" fill={eyePupil} />
            <circle cx="376" cy="153" r="8.5" fill={eyePupil} />
            <circle cx="320" cy="147" r="3.2" fill={eyeWhite} />
            <circle cx="372" cy="147" r="3.2" fill={eyeWhite} />
          </g>
          {/* Excited eyes */}
          <g className="cf-eyes cf-excited" opacity="0">
            <circle cx="319" cy="151" r="26" fill={eyeWhite} stroke={eyeOutline} strokeWidth="5" />
            <circle cx="377" cy="151" r="26" fill={eyeWhite} stroke={eyeOutline} strokeWidth="5" />
            <circle cx="323" cy="158" r="13.5" fill={eyePupil} />
            <circle cx="381" cy="158" r="13.5" fill={eyePupil} />
            <circle cx="316" cy="145" r="4.5" fill={eyeWhite} />
            <circle cx="374" cy="145" r="4.5" fill={eyeWhite} />
          </g>
        </g>
      </svg>
    </span>
  );
}
