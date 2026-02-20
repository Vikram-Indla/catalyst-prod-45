import React from 'react';
import { Search, Filter, SlidersHorizontal } from 'lucide-react';

interface WorkItemsToolbarProps {
  search: string;
  onSearchChange: (v: string) => void;
  totalCount: number;
  assignees: { name: string; color: string }[];
}

export function WorkItemsToolbar({ search, onSearchChange, totalCount, assignees }: WorkItemsToolbarProps) {
  const shown = assignees.slice(0, 3);
  const extra = assignees.length - 3;

  return (
    <div className="flex items-center justify-between gap-3 py-2">
      {/* Left cluster */}
      <div className="flex items-center gap-2">
        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
          <input
            type="text"
            placeholder="Search list"
            value={search}
            onChange={e => onSearchChange(e.target.value)}
            className="h-[30px] w-[160px] pl-8 pr-2 text-[11px] rounded-md border focus:outline-none focus:ring-1 focus:ring-[#2563EB] placeholder:text-[#94A3B8]"
            style={{ borderColor: '#E2E8F0', fontFamily: 'Inter, sans-serif' }}
          />
        </div>

        {/* Avatar stack */}
        <div className="flex items-center -space-x-1.5 ml-1">
          {shown.map((a, i) => (
            <div
              key={i}
              className="w-[22px] h-[22px] rounded-full border-2 border-white flex items-center justify-center text-[8px] font-semibold text-white"
              style={{ backgroundColor: a.color, zIndex: 3 - i }}
              title={a.name}
            >
              {a.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
            </div>
          ))}
          {extra > 0 && (
            <div
              className="w-[22px] h-[22px] rounded-full border-2 border-white flex items-center justify-center text-[8px] font-semibold"
              style={{ background: '#E2E8F0', color: '#64748B', zIndex: 0 }}
            >
              +{extra}
            </div>
          )}
        </div>

        {/* Filter button */}
        <button
          className="h-[30px] px-2.5 flex items-center gap-1.5 text-[11px] font-medium rounded-md border hover:bg-[#F1F5F9] transition-colors"
          style={{ borderColor: '#E2E8F0', color: '#475569', fontFamily: 'Inter, sans-serif' }}
        >
          <Filter size={13} />
          Filter
        </button>
      </div>

      {/* Right cluster */}
      <div className="flex items-center gap-2">
        <button
          className="h-[30px] px-2.5 flex items-center gap-1.5 text-[11px] font-medium rounded-md border hover:bg-[#F1F5F9] transition-colors"
          style={{ borderColor: '#E2E8F0', color: '#475569', fontFamily: 'Inter, sans-serif' }}
        >
          Group: None
          <span className="text-[9px] ml-0.5">▾</span>
        </button>
        <button
          className="h-[30px] w-[30px] flex items-center justify-center rounded-md border hover:bg-[#F1F5F9] transition-colors"
          style={{ borderColor: '#E2E8F0', color: '#64748B' }}
          title="Column settings"
        >
          <SlidersHorizontal size={14} />
        </button>
      </div>
    </div>
  );
}
