/**
 * WorkHubBulkBar — Floating bulk action bar (Stage E: polished)
 * Hidden when 0 selected, singular/plural text, accessible
 */
import { X, Trash2, ChevronDown } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import WorkHubStatusLozenge from './WorkHubStatusLozenge';
import WorkHubPriorityIcon from './WorkHubPriorityIcon';
import { deriveStatusCategory } from '@/services/workhub-service';

interface WorkHubBulkBarProps {
  selectedCount: number;
  onSetStatus: (status: string) => void;
  onSetPriority: (priority: string) => void;
  onDelete: () => void;
  onClear: () => void;
  statuses: string[];
  priorities: string[];
}

const STATUS_GROUPS = [
  { label: 'TO DO', category: 'To Do', statuses: ['Backlog', 'In Requirements', 'To Do', 'Open'] },
  { label: 'IN PROGRESS', category: 'In Progress', statuses: ['In Progress', 'In Review', 'In Development', 'In Beta', 'In UAT', 'In QA', 'Ready for QA'] },
  { label: 'DONE', category: 'Done', statuses: ['Done', 'Closed', 'In Production', 'Released'] },
];
const PRIORITY_OPTIONS = ['Highest', 'High', 'Medium', 'Low', 'Lowest'];

export default function WorkHubBulkBar({ selectedCount, onSetStatus, onSetPriority, onDelete, onClear, statuses, priorities }: WorkHubBulkBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div role="toolbar" aria-label="Bulk actions" style={{
      position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
      display: 'flex', alignItems: 'center', gap: 8, height: 44, padding: '0 16px',
      background: 'var(--fg-1)', borderRadius: 8, color: 'var(--bg-app)',
      boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
      zIndex: 9990, animation: 'slideUp 200ms ease-out',
    }}>
      <span style={{ fontSize: 13, fontWeight: 600, marginRight: 8 }}>
        ☑ {selectedCount} item{selectedCount !== 1 ? 's' : ''} selected
      </span>
      <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.2)' }} />

      {/* Status dropdown with grouped statuses */}
      <Popover>
        <PopoverTrigger asChild>
          <button style={{
            display: 'inline-flex', alignItems: 'center', gap: 4, padding: '8px 12px', height: 32,
            background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: 4, color: 'var(--bg-app)', fontSize: 12, fontWeight: 500, cursor: 'pointer',
          }}>
            Set Status <ChevronDown size={12} />
          </button>
        </PopoverTrigger>
        <PopoverContent align="center" side="top" style={{ width: 220, padding: '4px 0', background: 'var(--bg-app)', border: '1px solid var(--bd-default, rgba(255,255,255,0.08))', borderRadius: 6, zIndex: 99999, maxHeight: 320, overflowY: 'auto' }}>
          {STATUS_GROUPS.map(group => (
            <div key={group.label}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--fg-4)', padding: '6px 12px 2px' }}>{group.label}</div>
              {group.statuses.map(s => (
                <button key={s} onClick={() => onSetStatus(s)} style={{
                  width: '100%', padding: '5px 12px', fontSize: 13, border: 'none', textAlign: 'left',
                  background: 'transparent', color: 'var(--fg-1)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <WorkHubStatusLozenge status={s} statusCategory={group.category} />
                </button>
              ))}
            </div>
          ))}
        </PopoverContent>
      </Popover>

      {/* Priority dropdown */}
      <Popover>
        <PopoverTrigger asChild>
          <button style={{
            display: 'inline-flex', alignItems: 'center', gap: 4, padding: '8px 12px', height: 32,
            background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: 4, color: 'var(--bg-app)', fontSize: 12, fontWeight: 500, cursor: 'pointer',
          }}>
            Priority <ChevronDown size={12} />
          </button>
        </PopoverTrigger>
        <PopoverContent align="center" side="top" style={{ width: 160, padding: '4px 0', background: 'var(--bg-app)', border: '1px solid var(--bd-default, rgba(255,255,255,0.08))', borderRadius: 6, zIndex: 99999 }}>
          {PRIORITY_OPTIONS.map(p => (
            <button key={p} onClick={() => onSetPriority(p)} style={{
              width: '100%', padding: '5px 12px', fontSize: 13, border: 'none', textAlign: 'left',
              background: 'transparent', color: 'var(--fg-1)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <WorkHubPriorityIcon priority={p} size={14} showLabel />
            </button>
          ))}
        </PopoverContent>
      </Popover>

      <button onClick={onDelete} style={{
        display: 'inline-flex', alignItems: 'center', gap: 4, padding: '8px 12px', height: 32,
        background: 'transparent', border: 'none', color: '#F87171', fontSize: 12, fontWeight: 500, cursor: 'pointer',
      }}>
        <Trash2 size={14} /> Delete
      </button>
      <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.2)' }} />
      <button onClick={onClear} aria-label="Clear selection" style={{
        display: 'inline-flex', alignItems: 'center', gap: 4, padding: '0 8px', height: 32,
        background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.7)', fontSize: 12, cursor: 'pointer',
      }}>
        <X size={14} /> Clear
      </button>
    </div>
  );
}
