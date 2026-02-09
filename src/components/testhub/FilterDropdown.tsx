import { useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';

interface FilterState {
  priorities: string[];
  statuses: string[];
  types: string[];
  automations: string[];
}

interface FilterDropdownProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  onClose: () => void;
}

const PRIORITY_OPTIONS = ['critical', 'high', 'medium', 'low'];
const STATUS_OPTIONS = ['draft', 'ready', 'approved', 'deprecated'];
const TYPE_OPTIONS = ['functional', 'security', 'integration', 'api', 'regression'];
const AUTOMATION_OPTIONS = ['manual', 'automated', 'planned'];

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
    setLocalFilters({ priorities: [], statuses: [], types: [], automations: [] });
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
          color: '#334155',
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
        backgroundColor: '#FFFFFF',
        border: '1px solid #E2E8F0',
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
        <span style={{ fontSize: 14, fontWeight: 600, color: '#0F172A' }}>Filters</span>
        <button
          onClick={clearAll}
          style={{
            background: 'none',
            border: 'none',
            fontSize: 13,
            color: '#64748B',
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#2563EB'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = '#64748B'; }}
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
          color: '#64748B',
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
          color: '#64748B',
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
          color: '#64748B',
          marginBottom: 8,
        }}>
          Type
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
          {TYPE_OPTIONS.map(t => renderCheckbox('types', t, t.charAt(0).toUpperCase() + t.slice(1)))}
        </div>
      </div>

      {/* Automation */}
      <div style={{ marginBottom: 16 }}>
        <div style={{
          fontSize: 10,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          color: '#64748B',
          marginBottom: 8,
        }}>
          Automation
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
          {AUTOMATION_OPTIONS.map(a => renderCheckbox('automations', a, a.charAt(0).toUpperCase() + a.slice(1)))}
        </div>
      </div>

      {/* Apply Button */}
      <button
        onClick={applyFilters}
        style={{
          width: '100%',
          height: 36,
          background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
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
