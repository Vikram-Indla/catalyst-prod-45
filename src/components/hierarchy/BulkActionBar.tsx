/**
 * BulkActionBar — Sticky toolbar for bulk operations on selected work items
 * F5: Bulk status/assignee/priority/delete  F6: Bulk move parent
 */

import { useState } from 'react';
import { X, ArrowRightLeft, Users, Flag, Trash2, FolderInput } from 'lucide-react';
import { StatusDropdown } from './StatusDropdown';
import { PriorityDropdown } from './PriorityDropdown';
import { AssigneeDropdown, type AssigneeOption } from './AssigneeDropdown';

interface BulkActionBarProps {
  selectedCount: number;
  allStatuses: string[];
  allAssignees: AssigneeOption[];
  onClear: () => void;
  onBulkStatusChange: (status: string) => void;
  onBulkAssigneeChange: (assignee: AssigneeOption | null) => void;
  onBulkPriorityChange: (priority: string) => void;
  onBulkDelete: () => void;
  onBulkMove: () => void;
}

type ActiveDropdown = 'status' | 'priority' | 'assignee' | null;

export function BulkActionBar({
  selectedCount, allStatuses, allAssignees,
  onClear, onBulkStatusChange, onBulkAssigneeChange, onBulkPriorityChange,
  onBulkDelete, onBulkMove,
}: BulkActionBarProps) {
  const [activeDropdown, setActiveDropdown] = useState<ActiveDropdown>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (selectedCount === 0) return null;

  return (
    <div style={{
      height: 48, background: '#1E293B', display: 'flex', alignItems: 'center', gap: 8,
      padding: '0 16px', fontFamily: "'Inter', sans-serif", position: 'sticky', top: 0, zIndex: 50,
      borderRadius: '8px 8px 0 0',
    }}>
      <span style={{ fontSize: 13, fontWeight: 600, color: '#FFFFFF' }}>
        {selectedCount} item{selectedCount > 1 ? 's' : ''} selected
      </span>

      <button onClick={onClear} style={{
        background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px',
        display: 'flex', alignItems: 'center', gap: 4, color: '#94A3B8', fontSize: 12,
      }}>
        <X size={14} /> Clear
      </button>

      <div style={{ width: 1, height: 20, background: '#334155', margin: '0 4px' }} />

      {/* Status */}
      <div style={{ position: 'relative' }}>
        <BulkBtn icon={ArrowRightLeft} label="Status" onClick={() => setActiveDropdown(activeDropdown === 'status' ? null : 'status')} />
        {activeDropdown === 'status' && (
          <StatusDropdown
            currentStatus=""
            availableStatuses={allStatuses}
            onSelect={(s) => { onBulkStatusChange(s); setActiveDropdown(null); }}
            onClose={() => setActiveDropdown(null)}
          />
        )}
      </div>

      {/* Assignee */}
      <div style={{ position: 'relative' }}>
        <BulkBtn icon={Users} label="Assignee" onClick={() => setActiveDropdown(activeDropdown === 'assignee' ? null : 'assignee')} />
        {activeDropdown === 'assignee' && (
          <AssigneeDropdown
            currentAssignee=""
            availableAssignees={allAssignees}
            onSelect={(a) => { onBulkAssigneeChange(a); setActiveDropdown(null); }}
            onClose={() => setActiveDropdown(null)}
          />
        )}
      </div>

      {/* Priority */}
      <div style={{ position: 'relative' }}>
        <BulkBtn icon={Flag} label="Priority" onClick={() => setActiveDropdown(activeDropdown === 'priority' ? null : 'priority')} />
        {activeDropdown === 'priority' && (
          <PriorityDropdown
            currentPriority=""
            onSelect={(p) => { onBulkPriorityChange(p); setActiveDropdown(null); }}
            onClose={() => setActiveDropdown(null)}
          />
        )}
      </div>

      {/* Move */}
      <BulkBtn icon={FolderInput} label="Move" onClick={onBulkMove} />

      <div style={{ flex: 1 }} />

      {/* Delete */}
      {confirmDelete ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, color: '#FCA5A5' }}>Delete {selectedCount} items?</span>
          <button onClick={() => { onBulkDelete(); setConfirmDelete(false); }} style={{
            fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 4,
            background: '#DC2626', color: '#FFFFFF', border: 'none', cursor: 'pointer',
          }}>Yes, delete</button>
          <button onClick={() => setConfirmDelete(false)} style={{
            fontSize: 11, padding: '4px 10px', borderRadius: 4,
            background: 'transparent', color: '#94A3B8', border: '1px solid #475569', cursor: 'pointer',
          }}>Cancel</button>
        </div>
      ) : (
        <BulkBtn icon={Trash2} label="Delete" onClick={() => setConfirmDelete(true)} danger />
      )}
    </div>
  );
}

function BulkBtn({ icon: Icon, label, onClick, danger }: {
  icon: React.ComponentType<any>;
  label: string; onClick: () => void; danger?: boolean;
}) {
  return (
    <button onClick={onClick} style={{
      height: 30, padding: '0 10px', fontSize: 12, fontWeight: 500,
      fontFamily: "'Inter', sans-serif",
      color: danger ? '#FCA5A5' : 'var(--bd-default, #E2E8F0)',
      background: 'transparent', border: '1px solid #475569', borderRadius: 4,
      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
    }}
      onMouseEnter={e => (e.currentTarget.style.background = '#334155')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      <Icon size={13} /> {label}
    </button>
  );
}
