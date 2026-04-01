/**
 * Pagination — LINEAR PRECISION Design with pb-* classes
 */

interface Props {
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

const PAGE_SIZES = [25, 50, 100];

export function Pagination({ total, page, pageSize, onPageChange, onPageSizeChange }: Props) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div className="pb-pagination" style={{ height: 44, flexShrink: 0 }}>
      {/* Left: Rows per page */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--pb-ink-muted)' }}>
        <span>Rows per page:</span>
        <select
          value={pageSize}
          onChange={(e) => { onPageSizeChange(Number(e.target.value)); onPageChange(1); }}
          className="pb-pagination"
          style={{ height: 28, padding: '0 8px', fontSize: 12, border: '1px solid var(--pb-border)', borderRadius: 'var(--pb-r-sm)', color: 'var(--pb-ink)', outline: 'none', background: 'var(--pb-surface)' }}
        >
          {PAGE_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Center: Page buttons */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--pb-r-sm)', fontSize: 14, color: 'var(--pb-ink-tertiary)', background: 'none', border: 'none', cursor: page <= 1 ? 'default' : 'pointer', opacity: page <= 1 ? 0.3 : 1 }}
          >
            ‹
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p)}
              style={{
                width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: 'var(--pb-r-sm)', fontSize: 12, fontWeight: 500,
                fontVariantNumeric: 'tabular-nums', border: 'none', cursor: 'pointer',
                background: p === page ? 'var(--pb-primary)' : 'none',
                color: p === page ? 'var(--bg-app)' : 'var(--pb-ink-tertiary)',
              }}
            >
              {p}
            </button>
          ))}
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--pb-r-sm)', fontSize: 14, color: 'var(--pb-ink-tertiary)', background: 'none', border: 'none', cursor: page >= totalPages ? 'default' : 'pointer', opacity: page >= totalPages ? 0.3 : 1 }}
          >
            ›
          </button>
        </div>
      )}

      {/* Right: Showing count */}
      <span className="pb-pagination-label">
        Showing {start}–{end} of {total}
      </span>
    </div>
  );
}
