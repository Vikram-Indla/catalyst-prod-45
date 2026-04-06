/* V12 — Summary/Title column: default td styles, min-width 200px */
interface SummaryCellProps {
  title: string;
}

export function SummaryCell({ title }: SummaryCellProps) {
  return (
    <div style={{ minWidth: 200, overflow: 'hidden' }}> {/* V12 */}
      <span 
        style={{
          fontFamily: "'Inter', -apple-system, system-ui, sans-serif", /* V12 */
          fontSize: 13, /* V12 */
          fontWeight: 400, /* V12 */
          color: 'var(--fg-1, rgba(237,237,237,0.93))', /* V12 */
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