// Aqd¹⁰ Executive Dashboard Toolbar
import React from 'react';
import { Search, ChevronDown, List as ListIcon, LayoutGrid, ArrowUpDown } from 'lucide-react';

interface AqdDashboardToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  ownerFilter: string;
  onOwnerFilterChange: (value: string) => void;
  sortBy: string;
  onSortByChange: (value: string) => void;
  viewMode: 'list' | 'grid';
  onViewModeChange: (mode: 'list' | 'grid') => void;
}

export function AqdDashboardToolbar({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  ownerFilter,
  onOwnerFilterChange,
  sortBy,
  onSortByChange,
  viewMode,
  onViewModeChange,
}: AqdDashboardToolbarProps) {
  return (
    <div className="aqd-dash-toolbar">
      {/* Search */}
      <div className="aqd-dash-search">
        <Search size={16} style={{ color: 'var(--aqd-dash-slate-400)' }} />
        <input
          type="text"
          placeholder="Search lists..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      {/* Status Filter */}
      <button 
        className="aqd-dash-filter-btn"
        onClick={() => {
          const statuses = ['all', 'active', 'archived'];
          const currentIndex = statuses.indexOf(statusFilter);
          onStatusFilterChange(statuses[(currentIndex + 1) % statuses.length]);
        }}
      >
        <span>Status: {statusFilter === 'all' ? 'All' : statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}</span>
        <ChevronDown size={14} />
      </button>

      {/* Owner Filter */}
      <button 
        className="aqd-dash-filter-btn"
        onClick={() => {
          const owners = ['all', 'me'];
          const currentIndex = owners.indexOf(ownerFilter);
          onOwnerFilterChange(owners[(currentIndex + 1) % owners.length]);
        }}
      >
        <span>Owner: {ownerFilter === 'all' ? 'All' : 'Me'}</span>
        <ChevronDown size={14} />
      </button>

      {/* Sort */}
      <button 
        className="aqd-dash-filter-btn"
        onClick={() => {
          const sorts = ['updated', 'name', 'items'];
          const currentIndex = sorts.indexOf(sortBy);
          onSortByChange(sorts[(currentIndex + 1) % sorts.length]);
        }}
      >
        <ArrowUpDown size={14} />
        <span>Sort: {sortBy.charAt(0).toUpperCase() + sortBy.slice(1)}</span>
      </button>

      {/* Spacer */}
      <div className="aqd-dash-toolbar-spacer" />

      {/* View Toggle */}
      <div className="aqd-dash-view-toggle">
        <button 
          className={`aqd-dash-view-btn ${viewMode === 'list' ? 'active' : ''}`}
          onClick={() => onViewModeChange('list')}
          title="List View"
        >
          <ListIcon size={16} />
        </button>
        <button 
          className={`aqd-dash-view-btn ${viewMode === 'grid' ? 'active' : ''}`}
          onClick={() => onViewModeChange('grid')}
          title="Grid View"
        >
          <LayoutGrid size={16} />
        </button>
      </div>
    </div>
  );
}
