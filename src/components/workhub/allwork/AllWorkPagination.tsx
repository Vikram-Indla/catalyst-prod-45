/**
 * AllWorkPagination — Showing X-Y of Z + pages + per page (no native select)
 */
import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown, Check } from 'lucide-react';

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
  const [sizeOpen, setSizeOpen] = useState(false);
  const sizeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sizeOpen) return;
    const handler = (e: MouseEvent) => { if (sizeRef.current && !sizeRef.current.contains(e.target as Node)) setSizeOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [sizeOpen]);

  // Page numbers
  const pages: number[] = [];
  const maxVisible = 7;
  if (totalPages <= maxVisible) {
    for (let i = 0; i < totalPages; i++) pages.push(i);
  } else if (currentPage < 3) {
    for (let i = 0; i < 5; i++) pages.push(i);
    pages.push(-1);
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
      style={{ borderTop: '1px solid var(--bd-subtle, #292929)', backgroundColor: 'var(--bg-app)' }}
    >
      {/* Left: count */}
      <span className="text-[12px]" style={{ color: 'var(--fg-3)', fontFamily: 'var(--ds-font-family-body)' }}>
        Showing <b style={{ color: 'var(--fg-1)' }}>{start}–{end}</b> of <b style={{ color: 'var(--fg-1)' }}>{totalCount.toLocaleString()}</b>
      </span>

      {/* Center: pages */}
      <div className="flex items-center gap-1" role="navigation" aria-label="Pagination">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 0}
          className="p-1.5 rounded border disabled:opacity-30 hover:bg-[var(--hover, #1F1F1F)] transition-colors duration-[80ms] focus-visible:outline-2 focus-visible:outline-[#2563EB]"
          style={{ borderColor: 'var(--bd-default, #2E2E2E)' }}
          aria-label="Previous page"
        >
          <ChevronLeft className="w-3.5 h-3.5" style={{ color: 'var(--fg-3)' }} />
        </button>

        {pages.map((p, i) => {
          if (p < 0) {
            return <span key={`e${i}`} className="text-[12px] px-1" style={{ color: 'var(--fg-3)' }}>…</span>;
          }
          return (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className="w-8 h-8 rounded text-[12px] font-medium transition-colors duration-[80ms] focus-visible:outline-2 focus-visible:outline-[#2563EB] focus-visible:outline-offset-2"
              style={{
                backgroundColor: p === currentPage ? 'var(--cp-blue)' : 'transparent',
                color: p === currentPage ? 'var(--bg-app)' : 'var(--fg-3)',
              }}
              aria-label={`Page ${p + 1}`}
              aria-current={p === currentPage ? 'page' : undefined}
            >
              {p + 1}
            </button>
          );
        })}

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages - 1}
          className="p-1.5 rounded border disabled:opacity-30 hover:bg-[var(--hover, #1F1F1F)] transition-colors duration-[80ms] focus-visible:outline-2 focus-visible:outline-[#2563EB]"
          style={{ borderColor: 'var(--bd-default, #2E2E2E)' }}
          aria-label="Next page"
        >
          <ChevronRight className="w-3.5 h-3.5" style={{ color: 'var(--fg-3)' }} />
        </button>
      </div>

      {/* Right: per page (custom dropdown, NO native select) */}
      <div className="relative flex items-center gap-2" ref={sizeRef}>
        <span className="text-[12px]" style={{ color: 'var(--fg-3)' }}>Per page:</span>
        <button
          onClick={() => setSizeOpen(!sizeOpen)}
          className="inline-flex items-center gap-1 px-2.5 h-8 text-[12px] rounded border hover:bg-[var(--hover, #1F1F1F)] transition-colors duration-[80ms] focus-visible:outline-2 focus-visible:outline-[#2563EB]"
          style={{ borderColor: 'var(--bd-default, #2E2E2E)', color: 'var(--fg-1)', fontFamily: 'var(--ds-font-family-monospaced)' }}
          aria-haspopup="listbox"
          aria-expanded={sizeOpen}
        >
          {pageSize}
          <ChevronDown className="w-3 h-3" style={{ color: 'var(--fg-3)' }} />
        </button>
        {sizeOpen && (
          <div
            className="absolute bottom-full right-0 mb-1 w-24 rounded border shadow-lg z-50 py-1"
            style={{ borderColor: 'var(--bd-default, #2E2E2E)', backgroundColor: 'var(--bg-app)' }}
            role="listbox"
          >
            {PAGE_SIZES.map(s => (
              <button
                key={s}
                onClick={() => { onPageSizeChange(s); setSizeOpen(false); }}
                className="w-full flex items-center justify-between px-3 py-1.5 text-[12px] hover:bg-[var(--hover, #1F1F1F)] transition-colors duration-[80ms]"
                style={{ color: 'var(--fg-1)', fontFamily: 'var(--ds-font-family-monospaced)' }}
                role="option"
                aria-selected={s === pageSize}
              >
                {s}
                {s === pageSize && <Check className="w-3 h-3" style={{ color: 'var(--cp-blue)' }} />}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
