import { useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';

interface FilterState {
  priorities: string[];
  statuses: string[];
  types: string[];
}

interface FilterDropdownProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  onClose: () => void;
}

const PRIORITY_OPTIONS = ['critical', 'high', 'medium', 'low'];
const STATUS_OPTIONS = ['draft', 'ready', 'approved', 'deprecated'];
const TYPE_OPTIONS = ['functional', 'security', 'integration', 'api', 'regression'];

export function FilterDropdown({ filters, onChange, onClose }: FilterDropdownProps) {
  const [localFilters, setLocalFilters] = useState<FilterState>(filters);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const toggleFilter = (category: keyof FilterState, value: string) => {
    setLocalFilters(prev => {
      const arr = prev[category];
      if (arr.includes(value)) {
        return { ...prev, [category]: arr.filter(v => v !== value) };
      } else {
        return { ...prev, [category]: [...arr, value] };
      }
    });
  };

  const clearAll = () => {
    setLocalFilters({ priorities: [], statuses: [], types: [] });
  };

  const applyFilters = () => {
    onChange(localFilters);
    onClose();
  };

  const renderCheckbox = (category: keyof FilterState, value: string, label: string) => {
    const checked = localFilters[category].includes(value);
    return (
      <label
        key={value}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          height: 32,
          cursor: 'pointer',
          fontSize: 13,
          color: 'var(--fg-2)',
        }}
      >
        <input
          type="checkbox"
          checked={checked}
          onChange={() => toggleFilter(category, value)}
          style={{ width: 16, height: 16, cursor: 'pointer' }}
        />
        {label}
      </label>
    );
  };

  return (
    <div
      ref={dropdownRef}
      style={{
        position: 'absolute',
        top: '100%',
        left: 0,
        marginTop: 4,
        width: 320,
        backgroundColor: 'var(--cp-float)',
        border: '1px solid var(--divider)',
        borderRadius: 12,
        boxShadow: '0 10px 40px rgba(0,0,0,0.12)',
        padding: 16,
        zIndex: 100,
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
      }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg-1)' }}>Filters</span>
        <button
          onClick={clearAll}
          style={{
            background: 'none',
            border: 'none',
            fontSize: 13,
            color: 'var(--fg-3)',
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--cp-blue)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--fg-3)'; }}
        >
          Clear
        </button>
      </div>

      {/* Priority */}
      <div style={{ marginBottom: 16 }}>
        <div style={{
          fontSize: 10,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          color: 'var(--fg-3)',
          marginBottom: 8,
        }}>
          Priority
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
          {PRIORITY_OPTIONS.map(p => renderCheckbox('priorities', p, p.charAt(0).toUpperCase() + p.slice(1)))}
        </div>
      </div>

      {/* Status */}
      <div style={{ marginBottom: 16 }}>
        <div style={{
          fontSize: 10,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          color: 'var(--fg-3)',
          marginBottom: 8,
        }}>
          Status
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
          {STATUS_OPTIONS.map(s => renderCheckbox('statuses', s, s.charAt(0).toUpperCase() + s.slice(1)))}
        </div>
      </div>

      {/* Type */}
      <div style={{ marginBottom: 16 }}>
        <div style={{
          fontSize: 10,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          color: 'var(--fg-3)',
          marginBottom: 8,
        }}>
          Type
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
          {TYPE_OPTIONS.map(t => renderCheckbox('types', t, t.charAt(0).toUpperCase() + t.slice(1)))}
        </div>
      </div>

      {/* Apply Button */}
      <button
        onClick={applyFilters}
        style={{
          width: '100%',
          height: 50,
          background: 'linear-gradient(135deg, var(--cp-blue) 0%, var(--cp-primary-70) 100%)',
          border: 'none',
          borderRadius: 8,
          fontSize: 13,
          fontWeight: 600,
          color: '#FFFFFF',
          cursor: 'pointer',
        }}
      >
        Apply Filters
      </button>
    </div>
  );
}

export default FilterDropdown;
