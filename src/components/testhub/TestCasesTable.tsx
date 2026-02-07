// ═══════════════════════════════════════════════════════════════════════════
// TEST CASES TABLE COMPONENT
// Copy this ENTIRE file to: src/components/testhub/TestCasesTable.tsx
// ═══════════════════════════════════════════════════════════════════════════

import { useState } from 'react';
import { MoreVertical, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

interface TestCase {
  id: string;
  caseKey: string;
  title: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  type: 'functional' | 'regression' | 'security' | 'integration' | 'performance';
  status: 'draft' | 'ready' | 'approved' | 'deprecated';
  automation: 'manual' | 'automated' | 'planned';
  ownerName?: string;
  ownerInitials?: string;
  ownerColor?: string;
  updatedAt: string;
}

interface TestCasesTableProps {
  testCases: TestCase[];
  selectedIds: Set<string>;
  onSelectAll: (selected: boolean) => void;
  onSelectOne: (id: string, selected: boolean) => void;
  onRowClick: (testCase: TestCase) => void;
  onRowAction: (testCase: TestCase, action: string) => void;
  sortColumn: string | null;
  sortDirection: 'asc' | 'desc';
  onSort: (column: string) => void;
}

export function TestCasesTable({
  testCases,
  selectedIds,
  onSelectAll,
  onSelectOne,
  onRowClick,
  onRowAction,
  sortColumn,
  sortDirection,
  onSort,
}: TestCasesTableProps) {
  const allSelected = testCases.length > 0 && testCases.every(tc => selectedIds.has(tc.id));
  const someSelected = testCases.some(tc => selectedIds.has(tc.id));

  const getPriorityClass = (priority: string) => {
    switch (priority) {
      case 'critical': return 'th-priority-critical';
      case 'high': return 'th-priority-high';
      case 'medium': return 'th-priority-medium';
      case 'low': return 'th-priority-low';
      default: return '';
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'draft': return 'th-badge th-badge-draft';
      case 'ready': return 'th-badge th-badge-ready';
      case 'approved': return 'th-badge th-badge-approved';
      case 'deprecated': return 'th-badge th-badge-deprecated';
      default: return 'th-badge';
    }
  };

  const getTypeBadgeClass = (type: string) => {
    switch (type) {
      case 'functional': return 'th-badge th-badge-functional';
      case 'regression': return 'th-badge th-badge-regression';
      case 'security': return 'th-badge th-badge-security';
      case 'integration': return 'th-badge th-badge-integration';
      case 'performance': return 'th-badge th-badge-performance';
      default: return 'th-badge';
    }
  };

  const getAutomationBadgeClass = (automation: string) => {
    switch (automation) {
      case 'manual': return 'th-badge th-badge-manual';
      case 'automated': return 'th-badge th-badge-automated';
      case 'planned': return 'th-badge th-badge-planned';
      default: return 'th-badge';
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const renderSortIcon = (column: string) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="sort-icon" style={{ width: 12, height: 12 }} />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="sort-icon" style={{ width: 12, height: 12 }} />
      : <ArrowDown className="sort-icon" style={{ width: 12, height: 12 }} />;
  };

  return (
    <table className="th-table">
      <thead>
        <tr>
          <th className="col-checkbox">
            <input
              type="checkbox"
              className={`th-checkbox ${someSelected && !allSelected ? 'indeterminate' : ''}`}
              checked={allSelected}
              onChange={(e) => onSelectAll(e.target.checked)}
            />
          </th>
          <th className="col-id sortable" onClick={() => onSort('caseKey')}>
            ID {renderSortIcon('caseKey')}
          </th>
          <th className="sortable" onClick={() => onSort('title')}>
            Title {renderSortIcon('title')}
          </th>
          <th className="col-priority sortable" onClick={() => onSort('priority')}>
            Priority {renderSortIcon('priority')}
          </th>
          <th className="col-type">Type</th>
          <th className="col-status sortable" onClick={() => onSort('status')}>
            Status {renderSortIcon('status')}
          </th>
          <th className="col-automation">Auto</th>
          <th className="col-owner">Owner</th>
          <th className="col-updated sortable" onClick={() => onSort('updatedAt')}>
            Updated {renderSortIcon('updatedAt')}
          </th>
          <th className="col-actions"></th>
        </tr>
      </thead>
      <tbody>
        {testCases.map((tc) => (
          <tr
            key={tc.id}
            className={selectedIds.has(tc.id) ? 'selected' : ''}
            onClick={() => onRowClick(tc)}
          >
            <td className="col-checkbox" onClick={(e) => e.stopPropagation()}>
              <input
                type="checkbox"
                className="th-checkbox"
                checked={selectedIds.has(tc.id)}
                onChange={(e) => onSelectOne(tc.id, e.target.checked)}
              />
            </td>
            <td className="col-id">
              <span className="th-cell-id">{tc.caseKey}</span>
            </td>
            <td>
              <span className="th-cell-title">{tc.title}</span>
            </td>
            <td className="col-priority">
              <span className={getPriorityClass(tc.priority)}>
                {tc.priority.charAt(0).toUpperCase() + tc.priority.slice(1)}
              </span>
            </td>
            <td className="col-type">
              <span className={getTypeBadgeClass(tc.type)}>
                {tc.type.charAt(0).toUpperCase() + tc.type.slice(1)}
              </span>
            </td>
            <td className="col-status">
              <span className={getStatusBadgeClass(tc.status)}>
                {tc.status.charAt(0).toUpperCase() + tc.status.slice(1)}
              </span>
            </td>
            <td className="col-automation">
              <span className={getAutomationBadgeClass(tc.automation)}>
                {tc.automation === 'automated' ? 'Auto' : tc.automation === 'planned' ? 'Plan' : 'Manual'}
              </span>
            </td>
            <td className="col-owner">
              {tc.ownerInitials && (
                <div className={`th-avatar th-avatar-${tc.ownerColor || 'blue'}`} title={tc.ownerName}>
                  {tc.ownerInitials}
                </div>
              )}
            </td>
            <td className="col-updated">
              <span className="th-cell-time">{formatTime(tc.updatedAt)}</span>
            </td>
            <td className="col-actions" onClick={(e) => e.stopPropagation()}>
              <button
                className="th-row-action-btn"
                onClick={() => onRowAction(tc, 'menu')}
              >
                <MoreVertical />
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default TestCasesTable;
