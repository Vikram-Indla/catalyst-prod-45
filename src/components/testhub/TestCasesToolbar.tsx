import { Search, Filter, ArrowUpDown, List, LayoutGrid } from 'lucide-react';

interface TestCasesToolbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  testCaseCount: number;
  viewMode: 'list' | 'grid';
  onViewModeChange: (mode: 'list' | 'grid') => void;
  hasActiveFilters: boolean;
  onFilterClick: () => void;
  onSortClick?: () => void;
}

export function TestCasesToolbar({
  searchQuery,
  onSearchChange,
  testCaseCount,
  viewMode,
  onViewModeChange,
  hasActiveFilters,
  onFilterClick,
  onSortClick,
}: TestCasesToolbarProps) {
  return (
    <div style={{
      height: 56,
      padding: '0 20px',
      backgroundColor: '#FFFFFF',
      borderBottom: '1px solid #E2E8F0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    }}>
      {/* Left side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Search */}
        <div style={{ position: 'relative', width: 280 }}>
          <input
            type="text"
            placeholder="Search test cases..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            style={{
              width: '100%',
              height: 40,
              padding: '0 12px 0 40px',
              fontSize: 14,
              fontFamily: 'Inter, sans-serif',
              color: '#0F172A',
              backgroundColor: '#FFFFFF',
              border: '1.5px solid #E2E8F0',
              borderRadius: 8,
              outline: 'none',
              transition: 'border-color 0.15s, box-shadow 0.15s',
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#2563EB';
              e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.12)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#E2E8F0';
              e.target.style.boxShadow = 'none';
            }}
          />
          <Search style={{
            position: 'absolute',
            left: 12,
            top: '50%',
            transform: 'translateY(-50%)',
            width: 17,
            height: 17,
            color: '#94A3B8',
            pointerEvents: 'none',
          }} />
        </div>

        {/* Filter button */}
        <button
          onClick={onFilterClick}
          style={{
            height: 40,
            padding: '0 16px',
            backgroundColor: hasActiveFilters ? '#EFF6FF' : '#FFFFFF',
            border: `1.5px solid ${hasActiveFilters ? '#2563EB' : '#E2E8F0'}`,
            borderRadius: 8,
            fontSize: 14,
            fontFamily: 'Inter, sans-serif',
            fontWeight: 500,
            color: hasActiveFilters ? '#2563EB' : '#334155',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            transition: 'all 0.15s',
          }}
          onMouseEnter={(e) => {
            if (!hasActiveFilters) {
              e.currentTarget.style.backgroundColor = '#F8FAFC';
              e.currentTarget.style.borderColor = '#CBD5E1';
            }
          }}
          onMouseLeave={(e) => {
            if (!hasActiveFilters) {
              e.currentTarget.style.backgroundColor = '#FFFFFF';
              e.currentTarget.style.borderColor = '#E2E8F0';
            }
          }}
        >
          <Filter style={{ width: 16, height: 16, color: hasActiveFilters ? '#2563EB' : '#64748B' }} />
          Filter
        </button>

        {/* Sort button */}
        <button
          onClick={onSortClick}
          style={{
            height: 40,
            padding: '0 16px',
            backgroundColor: '#FFFFFF',
            border: '1.5px solid #E2E8F0',
            borderRadius: 8,
            fontSize: 14,
            fontFamily: 'Inter, sans-serif',
            fontWeight: 500,
            color: '#334155',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            transition: 'all 0.15s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#F8FAFC';
            e.currentTarget.style.borderColor = '#CBD5E1';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#FFFFFF';
            e.currentTarget.style.borderColor = '#E2E8F0';
          }}
        >
          <ArrowUpDown style={{ width: 16, height: 16, color: '#64748B' }} />
          Sort
        </button>
      </div>

      {/* Right side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {/* Test count */}
        <span style={{ fontSize: 13, color: '#64748B', fontFamily: 'Inter, sans-serif' }}>
          <strong style={{ color: '#0F172A', fontWeight: 600 }}>{testCaseCount}</strong> test cases
        </span>

        {/* View toggle */}
        <div style={{
          display: 'flex',
          backgroundColor: '#F1F5F9',
          borderRadius: 8,
          padding: 4,
        }}>
          <button
            onClick={() => onViewModeChange('list')}
            style={{
              width: 32,
              height: 32,
              padding: 0,
              border: 'none',
              borderRadius: 6,
              backgroundColor: viewMode === 'list' ? '#FFFFFF' : 'transparent',
              color: viewMode === 'list' ? '#2563EB' : '#64748B',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: viewMode === 'list' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.15s',
            }}
          >
            <List style={{ width: 18, height: 18 }} />
          </button>
          <button
            onClick={() => onViewModeChange('grid')}
            style={{
              width: 32,
              height: 32,
              padding: 0,
              border: 'none',
              borderRadius: 6,
              backgroundColor: viewMode === 'grid' ? '#FFFFFF' : 'transparent',
              color: viewMode === 'grid' ? '#2563EB' : '#64748B',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: viewMode === 'grid' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.15s',
            }}
          >
            <LayoutGrid style={{ width: 18, height: 18 }} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default TestCasesToolbar;
