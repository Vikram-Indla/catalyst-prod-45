/* V12 — StatusLozenge guardrail: 3-color system (grey/blue/green) */
import { cn } from '@/lib/utils';

interface IdCellProps {
  requestKey: string;
  onClick: (e: React.MouseEvent) => void;
}

/* V12 — ID column: JetBrains Mono, #2563EB, underline on hover */
export function IdCell({ requestKey, onClick }: IdCellProps) {
  return (
    <button
      onClick={onClick}
      className="transition-colors cursor-pointer whitespace-nowrap"
      style={{
        fontFamily: "'JetBrains Mono', 'SF Mono', monospace", /* V12 */
        fontSize: 12, /* V12 */
        fontWeight: 500, /* V12 */
        fontVariantNumeric: 'tabular-nums', /* V12 */
        color: '#2563EB', /* V12 */
        background: 'none',
        border: 'none',
        padding: '2px 4px',
        borderRadius: 4,
      }}
      onMouseEnter={e => { e.currentTarget.style.textDecoration = 'underline'; }} /* V12 */
      onMouseLeave={e => { e.currentTarget.style.textDecoration = 'none'; }}
    >
      {requestKey}
    </button>
  );
}