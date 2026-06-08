/**
 * PaginationFooter — "1-10 of 47" Jira-parity pagination for dashboard gadgets.
 */
import { token } from '@atlaskit/tokens';
import { ChevronLeft, ChevronRight } from '@/lib/atlaskit-icons';

interface Props {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}

export default function PaginationFooter({ page, pageSize, total, onPageChange }: Props) {
  if (total === 0) return null;

  const totalPages = Math.ceil(total / pageSize);
  const start = page * pageSize + 1;
  const end = Math.min((page + 1) * pageSize, total);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 8,
        padding: '8px 16px',
        fontSize: 12,
        color: token('color.text.subtle', '#44546F'),
      }}
    >
      <span>
        {start}–{end} of {total}
      </span>
      <button
        type="button"
        disabled={page === 0}
        onClick={() => onPageChange(page - 1)}
        aria-label="Previous page"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 24,
          height: 24,
          border: 0,
          borderRadius: 3,
          background: 'transparent',
          cursor: page === 0 ? 'not-allowed' : 'pointer',
          opacity: page === 0 ? 0.4 : 1,
          color: token('color.text.subtle', '#44546F'),
        }}
      >
        <ChevronLeft size={16} />
      </button>
      <button
        type="button"
        disabled={page >= totalPages - 1}
        onClick={() => onPageChange(page + 1)}
        aria-label="Next page"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 24,
          height: 24,
          border: 0,
          borderRadius: 3,
          background: 'transparent',
          cursor: page >= totalPages - 1 ? 'not-allowed' : 'pointer',
          opacity: page >= totalPages - 1 ? 0.4 : 1,
          color: token('color.text.subtle', '#44546F'),
        }}
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}
