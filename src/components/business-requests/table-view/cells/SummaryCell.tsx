/* V12 — Summary/Title column: default td styles, min-width 200px */
interface SummaryCellProps {
  title: string;
}

export function SummaryCell({ title }: SummaryCellProps) {
  return (
    <div style={{ minWidth: 200, overflow: 'hidden' }}> {/* V12 */}
      <span 
        style={{
          fontFamily: 'var(--ds-font-family-body)', /* V12 */
          fontSize: 13, /* V12 */
          fontWeight: 400, /* V12 */
          color: 'var(--fg-1, #0F172A)', /* V12 */
          display: 'block',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
        title={title || '—'}
      >
        {title || '—'}
      </span>
    </div>
  );
}