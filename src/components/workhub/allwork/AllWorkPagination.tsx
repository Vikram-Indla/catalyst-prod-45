/**
 * AllWorkPagination — Showing X-Y of Z + pages + per page
 */
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

const PAGE_SIZES = [25, 50, 100];

export function AllWorkPagination({ currentPage, totalPages, totalCount, pageSize, onPageChange, onPageSizeChange }: Props) {
  const start = currentPage * pageSize + 1;
  const end = Math.min((currentPage + 1) * pageSize, totalCount);

  // Page numbers to show
  const pages: number[] = [];
  const maxVisible = 7;
  if (totalPages <= maxVisible) {
    for (let i = 0; i < totalPages; i++) pages.push(i);
  } else if (currentPage < 3) {
    for (let i = 0; i < 5; i++) pages.push(i);
    pages.push(-1); // ellipsis
    pages.push(totalPages - 1);
  } else if (currentPage > totalPages - 4) {
    pages.push(0);
    pages.push(-1);
    for (let i = totalPages - 5; i < totalPages; i++) pages.push(i);
  } else {
    pages.push(0);
    pages.push(-1);
    for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
    pages.push(-2);
    pages.push(totalPages - 1);
  }

  return (
    <div
      className="flex items-center justify-between px-8 py-2.5"
      style={{ borderTop: '1px solid #E2E8F0', backgroundColor: '#fff' }}
    >
      {/* Left: count */}
      <span className="text-[12px]" style={{ color: '#6b6e76' }}>
        Showing <b style={{ color: '#1A1D23' }}>{start}–{end}</b> of <b style={{ color: '#1A1D23' }}>{totalCount.toLocaleString()}</b>
      </span>

      {/* Center: pages */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 0}
          className="p-1.5 rounded-md border disabled:opacity-30 hover:bg-[#f8f8f8] transition-colors"
          style={{ borderColor: '#DFE1E6' }}
        >
          <ChevronLeft className="w-3.5 h-3.5" style={{ color: '#6b6e76' }} />
        </button>

        {pages.map((p, i) => {
          if (p < 0) {
            return <span key={`e${i}`} className="text-[12px] px-1" style={{ color: '#8c8f96' }}>…</span>;
          }
          return (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className="w-8 h-8 rounded-md text-[12px] font-medium transition-colors"
              style={{
                backgroundColor: p === currentPage ? '#1868db' : 'transparent',
                color: p === currentPage ? '#fff' : '#6b6e76',
              }}
            >
              {p + 1}
            </button>
          );
        })}

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages - 1}
          className="p-1.5 rounded-md border disabled:opacity-30 hover:bg-[#f8f8f8] transition-colors"
          style={{ borderColor: '#DFE1E6' }}
        >
          <ChevronRight className="w-3.5 h-3.5" style={{ color: '#6b6e76' }} />
        </button>
      </div>

      {/* Right: per page */}
      <div className="flex items-center gap-2">
        <span className="text-[12px]" style={{ color: '#6b6e76' }}>Per page:</span>
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          className="text-[12px] rounded-md border px-2 py-1 bg-white cursor-pointer"
          style={{ borderColor: '#DFE1E6', color: '#1A1D23', appearance: 'auto' }}
        >
          {PAGE_SIZES.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
