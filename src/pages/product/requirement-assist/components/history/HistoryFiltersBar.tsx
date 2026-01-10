import React from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatusFilter, SortOption } from './types';

interface HistoryFiltersBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  dateFrom: string;
  onDateFromChange: (date: string) => void;
  dateTo: string;
  onDateToChange: (date: string) => void;
  statusFilter: StatusFilter;
  onStatusFilterChange: (status: StatusFilter) => void;
  sortOption: SortOption;
  onSortChange: (sort: SortOption) => void;
  onClearFilters: () => void;
}

export function HistoryFiltersBar({
  searchQuery,
  onSearchChange,
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
  statusFilter,
  onStatusFilterChange,
  sortOption,
  onSortChange,
  onClearFilters,
}: HistoryFiltersBarProps) {
  return (
    <div className="flex items-center gap-3 px-5 pb-4 flex-wrap">
      {/* Search */}
      <div className="relative flex-1 min-w-[280px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#94a3b8]" />
        <Input
          type="text"
          placeholder="Search by title, ID, or author..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 h-10 border-[#e2e8f0] bg-white focus:border-[#2563eb] focus:ring-0"
        />
      </div>

      {/* Date From */}
      <Input
        type="date"
        value={dateFrom}
        onChange={(e) => onDateFromChange(e.target.value)}
        className="w-auto h-10 border-[#e2e8f0] bg-white focus:border-[#2563eb] focus:ring-0"
      />

      {/* Date To */}
      <Input
        type="date"
        value={dateTo}
        onChange={(e) => onDateToChange(e.target.value)}
        className="w-auto h-10 border-[#e2e8f0] bg-white focus:border-[#2563eb] focus:ring-0"
      />

      {/* Status Filter */}
      <Select value={statusFilter} onValueChange={(val) => onStatusFilterChange(val as StatusFilter)}>
        <SelectTrigger className="w-[140px] h-10 border-[#e2e8f0] bg-white">
          <SelectValue placeholder="All Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Status</SelectItem>
          <SelectItem value="published">Published</SelectItem>
          <SelectItem value="draft">Draft</SelectItem>
          <SelectItem value="failed">Failed</SelectItem>
        </SelectContent>
      </Select>

      {/* Sort */}
      <Select value={sortOption} onValueChange={(val) => onSortChange(val as SortOption)}>
        <SelectTrigger className="w-[140px] h-10 border-[#e2e8f0] bg-white">
          <SelectValue placeholder="Newest" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="newest">Newest</SelectItem>
          <SelectItem value="oldest">Oldest</SelectItem>
          <SelectItem value="items">Most Items</SelectItem>
          <SelectItem value="title">Title A-Z</SelectItem>
        </SelectContent>
      </Select>

      {/* Clear Filters */}
      <button
        onClick={onClearFilters}
        className="text-[13px] text-[#64748b] px-3 py-2 rounded-md hover:bg-[#f1f5f9] hover:text-[#0f172a] transition-colors"
      >
        Clear Filters
      </button>
    </div>
  );
}
