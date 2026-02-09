import { useRef, useEffect } from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';

interface SortState {
  column: string;
  direction: 'asc' | 'desc';
}

interface SortDropdownProps {
  sort: SortState;
  onSortChange: (sort: SortState) => void;
  onClose: () => void;
}

const SORT_OPTIONS = [
  { value: 'case_key', label: 'ID (Case Key)' },
  { value: 'title', label: 'Title' },
  { value: 'priority', label: 'Priority' },
  { value: 'status', label: 'Status' },
  { value: 'updated_at', label: 'Updated' },
  { value: 'created_at', label: 'Created' },
];

export function SortDropdown({ sort, onSortChange, onClose }: SortDropdownProps) {
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

  return (
    <div
      ref={dropdownRef}
      style={{
        position: 'absolute',
        top: '100%',
        left: 0,
        marginTop: 4,
        width: 240,
        backgroundColor: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: 12,
        boxShadow: '0 10px 40px rgba(0,0,0,0.12)',
        padding: 8,
        zIndex: 100,
      }}
    >
      {/* Header */}
      <div style={{
        padding: '8px 12px',
        fontSize: 12,
        fontWeight: 600,
        color: '#64748B',
        borderBottom: '1px solid #F1F5F9',
      }}>
        Sort by
      </div>

      {/* Options */}
      {SORT_OPTIONS.map(opt => (
        <div
          key={opt.value}
          onClick={() => onSortChange({ ...sort, column: opt.value })}
          style={{
            height: 40,
            padding: '0 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderRadius: 8,
            backgroundColor: sort.column === opt.value ? '#EFF6FF' : 'transparent',
            cursor: 'pointer',
            transition: 'background-color 0.1s',
          }}
          onMouseEnter={(e) => {
            if (sort.column !== opt.value) {
              e.currentTarget.style.backgroundColor = '#F8FAFC';
            }
          }}
          onMouseLeave={(e) => {
            if (sort.column !== opt.value) {
              e.currentTarget.style.backgroundColor = 'transparent';
            }
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="radio"
              checked={sort.column === opt.value}
              readOnly
              style={{ width: 16, height: 16, accentColor: '#2563EB' }}
            />
            <span style={{ fontSize: 13, color: '#334155' }}>{opt.label}</span>
          </div>

          {sort.column === opt.value && (
            <div style={{ display: 'flex', gap: 2 }}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSortChange({ ...sort, direction: 'asc' });
                }}
                style={{
                  width: 24,
                  height: 24,
                  padding: 0,
                  border: 'none',
                  borderRadius: 4,
                  backgroundColor: sort.direction === 'asc' ? '#2563EB' : 'transparent',
                  color: sort.direction === 'asc' ? '#FFFFFF' : '#94A3B8',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ArrowUp size={14} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSortChange({ ...sort, direction: 'desc' });
                }}
                style={{
                  width: 24,
                  height: 24,
                  padding: 0,
                  border: 'none',
                  borderRadius: 4,
                  backgroundColor: sort.direction === 'desc' ? '#2563EB' : 'transparent',
                  color: sort.direction === 'desc' ? '#FFFFFF' : '#94A3B8',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ArrowDown size={14} />
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default SortDropdown;
