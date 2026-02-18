/**
 * Pagination — Bottom bar with rows-per-page, page numbers, showing count
 */

import { useCallback } from 'react';

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

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <div className="h-11 flex items-center justify-between px-6 border-t shrink-0" style={{ borderColor: '#e4e4e7', background: '#ffffff' }}>
      {/* Left: Rows per page */}
      <div className="flex items-center gap-2 text-[12px]" style={{ color: '#71717a' }}>
        <span>Rows per page:</span>
        <select
          value={pageSize}
          onChange={(e) => { onPageSizeChange(Number(e.target.value)); onPageChange(1); }}
          className="h-6 px-1.5 rounded border text-[12px] outline-none focus:ring-2 focus:ring-blue-500/20"
          style={{ borderColor: '#e4e4e7', color: '#18181b' }}
        >
          {PAGE_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Center: Page buttons */}
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className="w-7 h-7 flex items-center justify-center rounded text-[12px] disabled:opacity-30 hover:bg-zinc-100 transition-colors"
            style={{ color: '#52525b' }}
          >
            ‹
          </button>
          {pages.map(p => (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p)}
              className="w-7 h-7 flex items-center justify-center rounded text-[12px] font-medium tabular-nums transition-colors"
              style={p === page
                ? { background: '#2563eb', color: '#ffffff' }
                : { color: '#52525b' }
              }
            >
              {p}
            </button>
          ))}
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            className="w-7 h-7 flex items-center justify-center rounded text-[12px] disabled:opacity-30 hover:bg-zinc-100 transition-colors"
            style={{ color: '#52525b' }}
          >
            ›
          </button>
        </div>
      )}

      {/* Right: Showing */}
      <span className="text-[12px] tabular-nums" style={{ color: '#71717a' }}>
        Showing {start}–{end} of {total}
      </span>
    </div>
  );
}
