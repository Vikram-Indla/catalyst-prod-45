/**
 * WorkHubBulkBar — Floating bulk action bar at bottom center
 * Shows when selectedItems.size >= 1
 */
import { X, Trash2, ChevronDown } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface WorkHubBulkBarProps {
  selectedCount: number;
  onSetStatus: (status: string) => void;
  onSetPriority: (priority: string) => void;
  onDelete: () => void;
  onClear: () => void;
  statuses: string[];
  priorities: string[];
}

export default function WorkHubBulkBar({ selectedCount, onSetStatus, onSetPriority, onDelete, onClear, statuses, priorities }: WorkHubBulkBarProps) {
  if (selectedCount === 0) return null;

  const dropdownBtn = (label: string, options: string[], onSelect: (v: string) => void) => (
    <Popover>
      <PopoverTrigger asChild>
        <button style={{
          display: 'inline-flex', alignItems: 'center', gap: 4, padding: '0 12px', height: 32,
          background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: 4, color: 'white', fontSize: 12, fontWeight: 500, cursor: 'pointer',
        }}>
          {label} <ChevronDown size={12} />
        </button>
      </PopoverTrigger>
      <PopoverContent align="center" side="top" style={{ width: 200, padding: '4px 0', background: '#FFFFFF', border: '1px solid rgba(15,23,42,0.12)', borderRadius: 6, zIndex: 99999, maxHeight: 240, overflowY: 'auto' }}>
        {options.map(opt => (
          <button key={opt} onClick={() => onSelect(opt)} style={{
            width: '100%', padding: '6px 12px', fontSize: 13, border: 'none', background: 'transparent',
            color: '#0F172A', cursor: 'pointer', textAlign: 'left',
          }}>
            {opt}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );

  return (
    <div style={{
      position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
      display: 'flex', alignItems: 'center', gap: 8, height: 44, padding: '0 16px',
      background: '#0F172A', borderRadius: 8, color: 'white',
      boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
      zIndex: 9999, animation: 'slideUp 200ms ease-out',
    }}>
      <span style={{ fontSize: 13, fontWeight: 600, marginRight: 8 }}>
        ☑ {selectedCount} item{selectedCount !== 1 ? 's' : ''} selected
      </span>
      <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.2)' }} />
      {dropdownBtn('Set Status', statuses, onSetStatus)}
      {dropdownBtn('Priority', priorities, onSetPriority)}
      <button onClick={onDelete} style={{
        display: 'inline-flex', alignItems: 'center', gap: 4, padding: '0 12px', height: 32,
        background: 'transparent', border: 'none', color: '#F87171', fontSize: 12, fontWeight: 500, cursor: 'pointer',
      }}>
        <Trash2 size={14} /> Delete
      </button>
      <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.2)' }} />
      <button onClick={onClear} style={{
        display: 'inline-flex', alignItems: 'center', gap: 4, padding: '0 8px', height: 32,
        background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.7)', fontSize: 12, cursor: 'pointer',
      }}>
        <X size={14} /> Clear
      </button>
    </div>
  );
}
