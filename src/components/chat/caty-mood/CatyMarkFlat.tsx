/**
 * CatyMarkFlat — Caty cat mark for chrome (dock header, empty-state hero).
 *
 * tone="flat" (default): single-tone, theme-adaptive. Ink (body + ears + tail) =
 *   var(--ds-text); paper (whiskers, nose, eye-whites) = var(--ds-surface). Both are
 *   theme tokens, so the mark auto-inverts: dark cat on light surfaces, light cat on
 *   dark — one asset, both modes.
 * tone="gradient": body + ears + tail filled with the Caty brand gradient
// TODO: ads-unmapped — #F79357 context unclear
 *   (#F79357→#CC1E9A), matching the FAB / AI avatar / header accent. Gradient reads on
 *   both light and dark backgrounds, so the dock-header mark belongs to the CATY brand
 *   instead of reading as a foreign black blob.
 *
 *  - variant="face" (default): cropped head — compact chrome (dock header).
 *  - variant="full": complete brand cat with the "ask" wordmark — hero / empty states.
 */
const INK = 'var(--ds-text, #172B4D)';
const PAPER = 'var(--ds-surface, #FFFFFF)';

export function CatyMarkFlat({
  size = 28,
  variant = 'face',
  tone = 'flat',
  title = 'Caty',
}: {
  size?: number;
  variant?: 'face' | 'full';
  tone?: 'flat' | 'gradient';
  title?: string;
}) {
  const full = variant === 'full';
  const body = tone === 'gradient' ? 'url(#cmf-grad)' : INK;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={full ? '0 0 512 512' : '120 60 360 380'}
      width={size}
      height={size}
      role="img"
      aria-label={title}
    >
      <defs>
        {/* ads-scanner:ignore-next-line — Caty brand gradient, no ADS token equivalent */}
        <linearGradient id="cmf-grad" x1="256" y1="40" x2="256" y2="470" gradientUnits="userSpaceOnUse">
          {/* ads-scanner:ignore-next-line */}
// TODO: ads-unmapped — #F79357 context unclear
          <stop stopColor="#F79357" />
          {/* ads-scanner:ignore-next-line */}
          <stop offset=".5" stopColor="var(--ds-background-danger-bold, #C9372C)" />
          {/* ads-scanner:ignore-next-line */}
// TODO: ads-unmapped — #B41572 context unclear
          <stop offset=".75" stopColor="#B41572" />
          {/* ads-scanner:ignore-next-line */}
// TODO: ads-unmapped — #CC1E9A context unclear
          <stop offset="1" stopColor="#CC1E9A" />
        </linearGradient>
      </defs>
      <g>
        {/* tail — same ink/gradient as body; visible in both face + full crops */}
        <path d="M404 392 Q462 392 456 336" fill="none" stroke={body} strokeWidth="26" strokeLinecap="round" />
        {/* body swoosh */}
        <path
          d="M421.802 200.297V93.9736H259.279L233.457 127.39L210.674 93.9736H154.474C39.037 223.992 106.375 363.833 154.474 417.501H421.802V309.659H279.025L236.495 374.972C170.878 271.686 209.155 173.97 236.495 138.022L279.025 200.297H421.802Z"
          fill={body}
        />
        {full && (
          <text
            x="350"
            y="293"
            textAnchor="middle"
            fontFamily="var(--ds-font-family-body)"
            fontSize="84"
            fontWeight="800"
            fontStyle="italic"
            fill={PAPER}
          >
            ask
          </text>
        )}
        {/* ears */}
        <path d="M270 100 Q300 26 322 100 Z" fill={body} />
        <path d="M358 100 Q388 24 408 100 Z" fill={body} />
        {/* whiskers + nose — paper so they read on the body */}
        <g stroke={PAPER} strokeWidth="9.5" strokeLinecap="round" fill="none">
          {full ? (
            <>
              <path d="M300 172 Q244 168 226 178" />
              <path d="M300 182 Q240 185 222 198" />
              <path d="M302 192 Q248 201 232 214" />
              <path d="M398 172 Q454 168 472 178" />
              <path d="M398 182 Q458 185 476 198" />
              <path d="M396 192 Q452 201 468 214" />
            </>
          ) : (
            <>
              <path d="M300 172 Q244 168 226 178" />
              <path d="M398 172 Q454 168 472 178" />
            </>
          )}
        </g>
        <path d="M340 176 L356 176 Q348 188 340 176 Z" fill={PAPER} />
        {/* eyes — paper whites with ink pupils (content/calm) */}
        <circle cx="322" cy="150" r="19" fill={PAPER} />
        <circle cx="374" cy="150" r="19" fill={PAPER} />
        <circle cx="324" cy="152" r="8" fill={INK} />
        <circle cx="376" cy="152" r="8" fill={INK} />
      </g>
    </svg>
  );
}
