/**
 * GoalsToolbar — View switcher, search, filter chips, expand toggle
 */
import { Search, ChevronDown, ChevronsUpDown, List, Network, Grid3X3 } from 'lucide-react';

interface GoalsToolbarProps {
  currentView: 'tree' | 'list' | 'heatmap';
  onViewChange: (view: 'tree' | 'list' | 'heatmap') => void;
  searchQuery: string;
  onSearch: (q: string) => void;
  onExpandAll: () => void;
  isAllExpanded: boolean;
}

const viewButtons: { key: 'tree' | 'list' | 'heatmap'; label: string; icon: typeof List }[] = [
  { key: 'tree', label: 'Tree', icon: Network },
  { key: 'list', label: 'List', icon: List },
  { key: 'heatmap', label: 'Heatmap', icon: Grid3X3 },
];

const filterChips = ['Status', 'Theme', 'Owner', 'Quarter'];

export function GoalsToolbar({
  currentView,
  onViewChange,
  searchQuery,
  onSearch,
  onExpandAll,
  isAllExpanded,
}: GoalsToolbarProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        marginBottom: 12,
        flexWrap: 'wrap',
      }}
    >
      {/* View Switcher */}
      <div
        style={{
          display: 'inline-flex',
          background: '#F1F5F9',
          borderRadius: 8,
          padding: 3,
          gap: 2,
        }}
      >
        {viewButtons.map(vb => {
          const active = currentView === vb.key;
          return (
            <button
              key={vb.key}
              onClick={() => onViewChange(vb.key)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '5px 12px',
                fontSize: 12,
                fontWeight: active ? 600 : 500,
                color: active ? '#0F172A' : '#64748B',
                background: active ? '#FFFFFF' : 'transparent',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
                boxShadow: active ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 150ms',
              }}
            >
              <vb.icon size={13} />
              {vb.label}
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: 8,
          padding: '5px 10px',
          minWidth: 220,
        }}
      >
        <Search size={14} color="#94A3B8" />
        <input
          type="text"
          placeholder="Search goals or KRs..."
          value={searchQuery}
          onChange={e => onSearch(e.target.value)}
          style={{
            border: 'none',
            outline: 'none',
            fontSize: 12,
            color: '#0F172A',
            background: 'transparent',
            width: '100%',
          }}
        />
      </div>

      {/* Filter Chips */}
      {filterChips.map(chip => (
        <button
          key={chip}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            padding: '5px 10px',
            fontSize: 12,
            fontWeight: 500,
            color: '#64748B',
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: 8,
            cursor: 'pointer',
          }}
        >
          {chip}
          <ChevronDown size={12} />
        </button>
      ))}

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Expand All */}
      {currentView === 'tree' && (
        <button
          onClick={onExpandAll}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            padding: '5px 12px',
            fontSize: 12,
            fontWeight: 500,
            color: '#64748B',
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: 8,
            cursor: 'pointer',
          }}
        >
          <ChevronsUpDown size={13} />
          {isAllExpanded ? 'Collapse All' : 'Expand All'}
        </button>
      )}
    </div>
  );
}
