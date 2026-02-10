/**
 * TestHub Cases Table Component
 * Ring-fenced CATALYST V10 design with 36px rows
 */

import { useState } from 'react';
import { format } from 'date-fns';
import { 
  MoreHorizontal, 
  Eye, 
  Edit2, 
  Copy, 
  Trash2, 
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { TMTestCase } from '@/types/test-management';
import { cn } from '@/lib/utils';

interface TestHubCasesTableProps {
  cases: TMTestCase[];
  projectId: string;
  onRefresh: () => void;
}

const statusConfig: Record<string, { label: string; badgeClass: string; icon: any }> = {
  DRAFT: { label: 'Draft', badgeClass: 'th-badge-draft', icon: Clock },
  REVIEW: { label: 'Review', badgeClass: 'th-badge-active', icon: AlertCircle },
  READY: { label: 'Ready', badgeClass: 'th-badge-ready', icon: CheckCircle2 },
  APPROVED: { label: 'Approved', badgeClass: 'th-badge-approved', icon: CheckCircle2 },
  DEPRECATED: { label: 'Deprecated', badgeClass: 'th-badge-failed', icon: XCircle },
};

const priorityConfig: Record<string, { label: string; className: string }> = {
  critical: { label: 'Critical', className: 'th-priority-critical' },
  high: { label: 'High', className: 'th-priority-high' },
  medium: { label: 'Medium', className: 'th-priority-medium' },
  low: { label: 'Low', className: 'th-priority-low' },
};

export function TestHubCasesTable({ cases, projectId, onRefresh }: TestHubCasesTableProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(cases.map(c => c.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  const allSelected = cases.length > 0 && selectedIds.size === cases.length;

  return (
    <div style={{ padding: '16px' }}>
      <table className="th-table">
        <thead>
          <tr>
            <th style={{ width: '40px' }}>
              <input
                type="checkbox"
                className="th-checkbox"
                checked={allSelected}
                onChange={(e) => handleSelectAll(e.target.checked)}
              />
            </th>
            <th style={{ width: '100px' }} className="sortable">Key</th>
            <th className="sortable">Title</th>
            <th style={{ width: '100px' }}>Status</th>
            <th style={{ width: '100px' }}>Priority</th>
            <th style={{ width: '100px' }}>Type</th>
            <th style={{ width: '70px', textAlign: 'center' }}>Steps</th>
            <th style={{ width: '120px' }}>Updated</th>
            <th style={{ width: '50px' }}></th>
          </tr>
        </thead>
        <tbody>
          {cases.map(testCase => {
            const statusKey = (testCase.status || 'draft').toUpperCase();
            const status = statusConfig[statusKey] || statusConfig.DRAFT;
            const StatusIcon = status.icon;
            const priorityName = testCase.priority?.name?.toLowerCase() || 'medium';
            const priority = priorityConfig[priorityName] || priorityConfig.medium;
            const isSelected = selectedIds.has(testCase.id);
            const caseKey = (testCase as any).case_key || testCase.key || '';
            const stepCount = (testCase as any).steps?.length || 0;
            const isAiGenerated = (testCase as any).is_ai_generated === true;

            return (
              <tr
                key={testCase.id}
                className={cn(isSelected && 'selected')}
              >
                <td onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    className="th-checkbox"
                    checked={isSelected}
                    onChange={(e) => handleSelectOne(testCase.id, e.target.checked)}
                  />
                </td>
                <td className="th-cell-id">
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    {caseKey}
                    {isAiGenerated && (
                      <span
                        title="AI Generated"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 18,
                          height: 18,
                          borderRadius: 4,
                          background: 'linear-gradient(135deg, #8B5CF6, #6366F1)',
                          flexShrink: 0,
                        }}
                      >
                        <Sparkles style={{ width: 11, height: 11, color: '#FFFFFF' }} />
                      </span>
                    )}
                  </span>
                </td>
                <td>
                  <div className="th-cell-title">{testCase.title}</div>
                  {testCase.folder && (
                    <div style={{ fontSize: 'var(--th-text-sm)', color: 'var(--th-text-faint)' }}>
                      {testCase.folder.name}
                    </div>
                  )}
                </td>
                <td>
                  <span className={cn('th-badge', status.badgeClass)}>
                    <StatusIcon style={{ width: '12px', height: '12px', marginRight: '4px' }} />
                    {status.label}
                  </span>
                </td>
                <td>
                  <span className={priority.className}>
                    {testCase.priority?.name || 'Medium'}
                  </span>
                </td>
                <td style={{ color: 'var(--th-text-sec)' }}>
                  {testCase.type?.name || 'Functional'}
                </td>
                <td style={{ textAlign: 'center', color: 'var(--th-text-faint)' }}>
                  {stepCount}
                </td>
                <td className="th-cell-time">
                  {testCase.updated_at 
                    ? format(new Date(testCase.updated_at), 'MMM d, yyyy')
                    : '-'}
                </td>
                <td onClick={(e) => e.stopPropagation()} style={{ position: 'relative' }}>
                  <button
                    className="th-btn-icon th-btn-icon-sm"
                    onClick={() => setOpenMenuId(openMenuId === testCase.id ? null : testCase.id)}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                  
                  {/* Dropdown Menu */}
                  {openMenuId === testCase.id && (
                    <>
                      <div 
                        style={{ position: 'fixed', inset: 0, zIndex: 50 }}
                        onClick={() => setOpenMenuId(null)}
                      />
                      <div
                        style={{
                          position: 'absolute',
                          right: 0,
                          top: '100%',
                          background: 'var(--th-bg)',
                          border: '1px solid var(--th-border)',
                          borderRadius: 'var(--th-radius)',
                          boxShadow: 'var(--th-shadow-3)',
                          minWidth: '160px',
                          zIndex: 100,
                          padding: '4px',
                        }}
                      >
                        <button className="th-dropdown-item" onClick={() => setOpenMenuId(null)}>
                          <Eye className="h-4 w-4" />
                          View Details
                        </button>
                        <button className="th-dropdown-item" onClick={() => setOpenMenuId(null)}>
                          <Edit2 className="h-4 w-4" />
                          Edit
                        </button>
                        <button className="th-dropdown-item" onClick={() => setOpenMenuId(null)}>
                          <Play className="h-4 w-4" />
                          Execute
                        </button>
                        <button className="th-dropdown-item" onClick={() => setOpenMenuId(null)}>
                          <Copy className="h-4 w-4" />
                          Clone
                        </button>
                        <div style={{ borderTop: '1px solid var(--th-border)', margin: '4px 0' }} />
                        <button 
                          className="th-dropdown-item" 
                          style={{ color: 'var(--th-danger)' }}
                          onClick={() => setOpenMenuId(null)}
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Bulk actions bar */}
      {selectedIds.size > 0 && (
        <div 
          style={{
            position: 'sticky',
            bottom: 0,
            background: 'var(--th-bg)',
            borderTop: '1px solid var(--th-border)',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            marginTop: '16px',
          }}
        >
          <span style={{ fontSize: 'var(--th-text-md)', fontWeight: 500 }}>
            {selectedIds.size} selected
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="th-btn-secondary" style={{ height: '32px', padding: '0 12px' }}>
              Move to Folder
            </button>
            <button className="th-btn-secondary" style={{ height: '32px', padding: '0 12px' }}>
              Change Status
            </button>
            <button 
              className="th-btn-secondary" 
              style={{ height: '32px', padding: '0 12px', color: 'var(--th-danger)' }}
            >
              Delete
            </button>
          </div>
          <button
            className="th-btn-ghost"
            style={{ marginLeft: 'auto' }}
            onClick={() => setSelectedIds(new Set())}
          >
            Clear Selection
          </button>
        </div>
      )}

      <style>{`
        .th-dropdown-item {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background: none;
          border: none;
          font-family: var(--th-font-ui);
          font-size: var(--th-text-md);
          color: var(--th-text-sec);
          cursor: pointer;
          border-radius: var(--th-radius-sm);
          transition: background var(--th-transition-fast);
        }
        .th-dropdown-item:hover {
          background: var(--th-surface);
        }
      `}</style>
    </div>
  );
}
