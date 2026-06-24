/**
 * PaginationFooter — "1-10 of 47" Jira-parity pagination for dashboard gadgets.
 *
 * Adds (Session 4):
 *  - Inline page-size selector when onPageSizeChange is provided
 *  - First / Last «» buttons when totalPages > 5
 *  - Native buttons → Enter/Space handled by the browser; Tab cycles between
 *    controls. ArrowLeft / ArrowRight scoped to the nav cluster move focus
 *    + page.
 */
import { token } from '@atlaskit/tokens';
import { ChevronLeft, ChevronRight } from '@/lib/atlaskit-icons';

interface Props {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  /** When provided, renders an inline page-size selector. */
  onPageSizeChange?: (size: number) => void;
  /** Override default size options. */
  pageSizeOptions?: number[];
}

const DEFAULT_SIZE_OPTIONS = [10, 25, 50, 100];
const BTN_BASE: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 24,
  height: 24,
  border: 0,
  borderRadius: 3,
  background: 'transparent',
};

export default function PaginationFooter({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = DEFAULT_SIZE_OPTIONS,
}: Props) {
  if (total === 0) return null;

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = page * pageSize + 1;
  const end = Math.min((page + 1) * pageSize, total);
  const atFirst = page === 0;
  const atLast = page >= totalPages - 1;
  const showEnds = totalPages > 5;

  const subtle = token('color.text.subtle', 'var(--ds-icon, #44546F)');

  const onKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // Arrow nav scoped to nav cluster only — does not steal global hotkeys.
    if (e.key === 'ArrowLeft' && !atFirst) {
      e.preventDefault();
      onPageChange(page - 1);
    } else if (e.key === 'ArrowRight' && !atLast) {
      e.preventDefault();
      onPageChange(page + 1);
    } else if (e.key === 'Home' && !atFirst) {
      e.preventDefault();
      onPageChange(0);
    } else if (e.key === 'End' && !atLast) {
      e.preventDefault();
      onPageChange(totalPages - 1);
    }
  };

  const navBtn = (
    label: string,
    disabled: boolean,
    onClick: () => void,
    children: React.ReactNode,
  ) => (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-label={label}
      style={{
        ...BTN_BASE,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        color: subtle,
        fontSize: 14,
        fontWeight: 500,
      }}
    >
      {children}
    </button>
  );

  return (
    <div
      role="navigation"
      aria-label="Pagination"
      onKeyDown={onKey}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 8,
        padding: '8px 16px',
        fontSize: 12,
        color: subtle,
      }}
    >
      {onPageSizeChange && (
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <span>Rows</span>
          <select
            value={pageSize}
            onChange={(e) => {
              const next = Number(e.target.value) || 10;
              onPageSizeChange(next);
              onPageChange(0);
            }}
            style={{
              fontSize: 12,
              height: 24,
              border: `1px solid ${token('color.border', 'var(--ds-border, #DFE1E6)')}`,
              borderRadius: 3,
              background: token('elevation.surface', 'var(--ds-surface, #FFFFFF)'),
              color: subtle,
              padding: '0 4px',
              cursor: 'pointer',
            }}
          >
            {pageSizeOptions.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </label>
      )}
      <span>
        {start}–{end} of {total}
      </span>
      {showEnds && navBtn('First page', atFirst, () => onPageChange(0), '«')}
      {navBtn('Previous page', atFirst, () => onPageChange(page - 1), <ChevronLeft size={16} />)}
      {navBtn('Next page', atLast, () => onPageChange(page + 1), <ChevronRight size={16} />)}
      {showEnds && navBtn('Last page', atLast, () => onPageChange(totalPages - 1), '»')}
    </div>
  );
}
