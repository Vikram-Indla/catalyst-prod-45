import React, { useState } from 'react';
import { Search, Tag, User, Calendar, Clock, ChevronDown } from 'lucide-react';

interface T10SearchBarProps {
  onSearch: (query: string) => void;
  onFilterChange: (filters: Record<string, boolean>) => void;
}

export function T10SearchBar({ onSearch, onFilterChange }: T10SearchBarProps) {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<Record<string, boolean>>({
    label: false,
    assignee: false,
    date: false,
    status: false,
  });

  const handleSearch = (value: string) => {
    setQuery(value);
    onSearch(value);
  };

  const toggleFilter = (key: string) => {
    const newFilters = { ...filters, [key]: !filters[key] };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const clearFilters = () => {
    const clearedFilters = { label: false, assignee: false, date: false, status: false };
    setFilters(clearedFilters);
    onFilterChange(clearedFilters);
  };

  const hasActiveFilters = Object.values(filters).some(Boolean);

  return (
    <div className="t10-search-section">
      <div className="t10-search-bar">
        <Search size={20} />
        <input
          type="text"
          placeholder="Search lists and items by label, assignee, or keyword..."
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
        />
      </div>
      <div className="t10-search-filters">
        <button
          className={`t10-filter-btn ${filters.label ? 'active' : ''}`}
          onClick={() => toggleFilter('label')}
        >
          <Tag size={16} />
          Label
          <ChevronDown size={16} />
        </button>
        <button
          className={`t10-filter-btn ${filters.assignee ? 'active' : ''}`}
          onClick={() => toggleFilter('assignee')}
        >
          <User size={16} />
          Assigned To
          <ChevronDown size={16} />
        </button>
        <button
          className={`t10-filter-btn ${filters.date ? 'active' : ''}`}
          onClick={() => toggleFilter('date')}
        >
          <Calendar size={16} />
          Date Range
          <ChevronDown size={16} />
        </button>
        <button
          className={`t10-filter-btn ${filters.status ? 'active' : ''}`}
          onClick={() => toggleFilter('status')}
        >
          <Clock size={16} />
          Status
          <ChevronDown size={16} />
        </button>
        {hasActiveFilters && (
          <button className="t10-clear-filters" onClick={clearFilters}>
            Clear all
          </button>
        )}
      </div>
    </div>
  );
}
