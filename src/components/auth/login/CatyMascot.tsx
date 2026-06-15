// ads-scanner:ignore-file — SVG illustration asset: all hex values are brand illustration colors, not UI surface tokens
/**
 * CATY mascot — round cat face.
 * variant:
 *   'light'    → #23222B body, white details  (for light/white backgrounds)
 *   'dark'     → #F4F1EA body, dark details   (for dark backgrounds)
 *   'default'  → inherits currentColor body
 */

interface CatyMascotProps {
  variant?: 'default' | 'light' | 'dark';
  className?: string;
  title?: string;
}

export function CatyMascot({
  variant = 'default',
  className = '',
  title = 'Caty',
}: CatyMascotProps) {
  // ads-scanner:ignore-next-line
  const body = variant === 'light' ? '#23222B' : variant === 'dark' ? '#F4F1EA' : 'currentColor';
  // ads-scanner:ignore-next-line
  const innerEar = variant === 'dark' ? '#23222B' : '#F4F1EA';
  // ads-scanner:ignore-next-line
  const face = variant === 'dark' ? '#23222B' : '#ffffff';

  return (
    <span className={`caty-mascot ${className}`.trim()} aria-hidden="true">
      <svg viewBox="0 0 80 80" fill="none" role="img" aria-label={title} xmlns="http://www.w3.org/2000/svg">
        {/* ears */}
        <path d="M20 30 L25 5 L42 22 Z" fill={body}/>
        <path d="M60 30 L55 5 L38 22 Z" fill={body}/>
        {/* inner ear marks */}
        <path d="M25.5 11 L28 23 L35.5 19 Z" fill={innerEar} opacity="0.30"/>
        <path d="M54.5 11 L52 23 L44.5 19 Z" fill={innerEar} opacity="0.30"/>
        {/* head */}
        <circle cx="40" cy="44" r="30" fill={body}/>
        {/* face details */}
        <g transform="translate(40 43) scale(0.235) translate(-348 -150)">
          <g stroke={face} strokeWidth="10" strokeLinecap="round" fill="none">
            <path d="M300 172 Q244 168 226 178"/>
            <path d="M300 182 Q240 185 222 198"/>
            <path d="M398 172 Q454 168 472 178"/>
            <path d="M398 182 Q458 185 476 198"/>
          </g>
          <path d="M340 178 L356 178 Q348 190 340 178 Z" fill={face}/>
          <g fill="none" stroke={face} strokeWidth="14" strokeLinecap="round">
            <path d="M303 150 Q322 171 341 150"/>
            <path d="M355 150 Q374 171 393 150"/>
          </g>
        </g>
      </svg>
    </span>
  );
}
