/**
 * BulkActionBar — Sticky toolbar for bulk operations on selected work items
 * F5: Bulk status/assignee/priority/delete  F6: Bulk move parent
 */

import { useState } from 'react';
import { X, ArrowRightLeft, Users, Flag, Trash2, FolderInput } from '@/lib/atlaskit-icons';
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
      height: 48, background: 'var(--ds-text)', display: 'flex', alignItems: 'center', gap: 8,
      padding: '0 16px', fontFamily: 'var(--cp-font-body)', position: 'sticky', top: 0, zIndex: 50,
      borderRadius: '8px 8px 0 0',
    }}>
      <span style={{ fontSize: 'var(--ds-font-size-300)', fontWeight: 600, color: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated)))' }}>
        {selectedCount} item{selectedCount > 1 ? 's' : ''} selected
      </span>

      <button onClick={onClear} style={{
        background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px',
        display: 'flex', alignItems: 'center', gap: 4, color: 'var(--ds-text-subtlest, var(--cp-ink-4, var(--cp-border-neutral-light)))', fontSize: 'var(--ds-font-size-200)',
      }}>
        <X size={14} /> Clear
      </button>

      <div style={{ width: 1, height: 20, background: 'var(--cp-ink-2, var(--cp-ink-2, var(--cp-ink-2)))', margin: '0 4px' }} />

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
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-danger)' }}>Delete {selectedCount} items?</span>
          <button onClick={() => { onBulkDelete(); setConfirmDelete(false); }} style={{
            fontSize: 'var(--ds-font-size-100)', fontWeight: 600, padding: '4px 10px', borderRadius: 4,
            background: 'var(--ds-text-danger, var(--cp-danger))', color: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated)))', border: 'none', cursor: 'pointer',
          }}>Yes, delete</button>
          <button onClick={() => setConfirmDelete(false)} style={{
            fontSize: 'var(--ds-font-size-100)', padding: '4px 10px', borderRadius: 4,
            background: 'transparent', color: 'var(--ds-text-subtlest, var(--cp-ink-4, var(--cp-border-neutral-light)))', border: '1px solid var(--ds-text-subtle)', cursor: 'pointer',
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
      height: 30, padding: '0 10px', fontSize: 'var(--ds-font-size-200)', fontWeight: 500,
      fontFamily: 'var(--cp-font-body)',
      color: danger ? 'var(--ds-border-danger)' : 'var(--bd-default, var(--cp-border, var(--cp-bg-sunken)))',
      background: 'transparent', border: '1px solid var(--ds-text-subtle)', borderRadius: 4,
      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
    }}
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--cp-ink-2, var(--cp-ink-2, var(--cp-ink-2)))')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      <Icon size={13} /> {label}
    </button>
  );
}
