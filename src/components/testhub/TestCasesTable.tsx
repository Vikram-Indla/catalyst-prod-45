import { useState } from 'react';
import { useTheme } from '@/hooks/useTheme';
import { MoreVertical, ChevronUp, ChevronDown } from 'lucide-react';
import { PriorityIndicator } from '@/components/shared/PriorityIndicator';

interface TestCase {
  id: string;
  caseKey: string;
  title: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  type: string;
  status: 'draft' | 'ready' | 'approved' | 'deprecated';
  ownerInitials?: string | null;
  ownerName?: string | null;
  ownerAvatarUrl?: string | null;
  updatedAt: string;
}

interface TestCasesTableProps {
  testCases: TestCase[];
  selectedIds: Set<string>;
  onSelectAll: (selected: boolean) => void;
  onSelectOne: (id: string, selected: boolean) => void;
  onRowClick: (testCase: TestCase) => void;
  onRowAction?: (testCase: TestCase, action: string) => void;
  onContextMenu?: (e: React.MouseEvent, testCase: TestCase) => void;
  onActionClick?: (testCase: TestCase, rect: DOMRect) => void;
  onSort: (column: string) => void;
  sortColumn: string | null;
  sortDirection: 'asc' | 'desc';
}

export function TestCasesTable({
  testCases,
  selectedIds,
  onSelectAll,
  onSelectOne,
  onRowClick,
  onRowAction,
  onContextMenu,
  onActionClick,
  onSort,
  sortColumn,
  sortDirection,
}: TestCasesTableProps) {
  const [hoveredRowId, setHoveredRowId] = useState<string | null>(null);
  const { isDark } = useTheme();
  const allSelected = testCases.length > 0 && testCases.every(tc => selectedIds.has(tc.id));
  const someSelected = testCases.some(tc => selectedIds.has(tc.id)) && !allSelected;

  const formatRelativeTime = (dateString: string) => {
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

  const getAvatarColor = (initials: string | null | undefined): string => {
    if (!initials) return 'var(--fg-4)';
    const letter = initials.charAt(0).toUpperCase();
    if (letter <= 'E') return 'var(--cp-blue)'; // Blue
    if (letter <= 'J') return 'var(--sem-success)'; // Green
    if (letter <= 'O') return '#8B5CF6'; // Purple
    if (letter <= 'T') return '#F97316'; // Orange
    return '#EC4899'; // Pink
  };

  const SortIcon = ({ column }: { column: string }) => {
    if (sortColumn !== column) return null;
    return sortDirection === 'asc' ? 
      <ChevronUp style={{ width: 14, height: 14, marginLeft: 4 }} /> : 
      <ChevronDown style={{ width: 14, height: 14, marginLeft: 4 }} />;
  };

  const handleContextMenu = (e: React.MouseEvent, tc: TestCase) => {
    e.preventDefault();
    onContextMenu?.(e, tc);
  };

  const handleActionClick = (e: React.MouseEvent, tc: TestCase) => {
    e.stopPropagation();
    e.preventDefault();
    e.nativeEvent.stopImmediatePropagation();
    
    const rect = e.currentTarget.getBoundingClientRect();
    onActionClick?.(tc, rect);
  };

  // Header cell styles
  const headerCellStyle: React.CSSProperties = {
    height: 44,
    padding: '8px 12px',
    backgroundColor: isDark ? '#111111' : 'var(--bg-1)',
    borderBottom: isDark ? '1px solid #2E2E2E' : '1px solid var(--divider)',
    fontSize: 11,
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: isDark ? '#878787' : 'var(--fg-3)',
    verticalAlign: 'middle',
  };

  // Body cell base styles
  const bodyCellStyle: React.CSSProperties = {
    height: 50,
    padding: '8px 12px',
    borderBottom: isDark ? '0.75px solid #2E2E2E' : '1px solid var(--divider)',
    verticalAlign: 'middle',
  };

  return (
    <div className="th-table-wrapper" style={{
      backgroundColor: isDark ? 'var(--cp-bg-surface, #242528)' : 'var(--cp-float)',
      border: isDark ? '1px solid #2E2E2E' : '1px solid var(--divider)',
      borderRadius: 8,
      overflow: 'hidden',
    }}>
      <table className="th-table-responsive" style={{
        width: '100%',
        borderCollapse: 'collapse',
        tableLayout: 'fixed',
        minWidth: 900,
      }}>
        <thead>
          <tr>
            {/* Checkbox */}
            <th className="th-table-col-checkbox" style={{ ...headerCellStyle, width: 44, textAlign: 'center' }}>
              <input
                type="checkbox"
                checked={allSelected}
                ref={el => { if (el) el.indeterminate = someSelected; }}
                onChange={(e) => onSelectAll(e.target.checked)}
                style={{ width: 16, height: 16, cursor: 'pointer' }}
              />
            </th>
            {/* ID */}
            <th 
              className="th-table-col-id"
              onClick={() => onSort('caseKey')} 
              style={{ ...headerCellStyle, width: 90, textAlign: 'left', cursor: 'pointer', userSelect: 'none' }}
            >
              <span style={{ display: 'flex', alignItems: 'center' }}>
                ID <SortIcon column="caseKey" />
              </span>
            </th>
            {/* Title */}
            <th 
              className="th-table-col-title"
              onClick={() => onSort('title')} 
              style={{ ...headerCellStyle, textAlign: 'left', cursor: 'pointer', userSelect: 'none' }}
            >
              <span style={{ display: 'flex', alignItems: 'center' }}>
                Title <SortIcon column="title" />
              </span>
            </th>
            {/* Priority */}
            <th 
              className="th-table-col-priority"
              onClick={() => onSort('priority')} 
              style={{ ...headerCellStyle, width: 100, textAlign: 'left', cursor: 'pointer', userSelect: 'none' }}
            >
              <span style={{ display: 'flex', alignItems: 'center' }}>
                Priority <SortIcon column="priority" />
              </span>
            </th>
            {/* Type */}
            <th className="th-table-col-type" style={{ ...headerCellStyle, width: 100, textAlign: 'left' }}>
              Type
            </th>
            {/* Status */}
            <th 
              className="th-table-col-status"
              onClick={() => onSort('status')} 
              style={{ ...headerCellStyle, width: 100, textAlign: 'left', cursor: 'pointer', userSelect: 'none' }}
            >
              <span style={{ display: 'flex', alignItems: 'center' }}>
                Status <SortIcon column="status" />
              </span>
            </th>
            {/* Assigned To */}
            <th className="th-table-col-assignee" style={{ ...headerCellStyle, width: 160, textAlign: 'left' }}>
              Assigned To
            </th>
            {/* Updated - separate column */}
            <th 
              className="th-table-col-updated"
              onClick={() => onSort('updatedAt')} 
              style={{ ...headerCellStyle, width: 90, textAlign: 'left', cursor: 'pointer', userSelect: 'none' }}
            >
              <span style={{ display: 'flex', alignItems: 'center' }}>
                Updated <SortIcon column="updatedAt" />
              </span>
            </th>
            {/* Actions */}
            <th className="th-table-col-actions" style={{ ...headerCellStyle, width: 50 }}></th>
          </tr>
        </thead>
        <tbody>
          {testCases.map((tc) => {
            const isSelected = selectedIds.has(tc.id);
            const isHovered = hoveredRowId === tc.id;
            
            return (
              <tr
                key={tc.id}
                onClick={() => onRowClick(tc)}
                onContextMenu={(e) => handleContextMenu(e, tc)}
                onMouseEnter={() => setHoveredRowId(tc.id)}
                onMouseLeave={() => setHoveredRowId(null)}
                style={{
                  height: 50,
                  backgroundColor: isSelected ? 'rgba(37, 99, 235, 0.06)' : isHovered ? (isDark ? '#1F1F1F' : 'var(--cp-bd-zone)') : (isDark ? 'var(--cp-bg-surface, #242528)' : 'var(--cp-float)'),
                  cursor: 'pointer',
                  transition: 'background-color 0.1s',
                }}
              >
                {/* Checkbox */}
                <td 
                  className="th-table-col-checkbox"
                  onClick={(e) => e.stopPropagation()}
                  style={{ ...bodyCellStyle, textAlign: 'center' }}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => onSelectOne(tc.id, e.target.checked)}
                    style={{ width: 16, height: 16, cursor: 'pointer' }}
                  />
                </td>
                
                {/* ID */}
                <td className="th-table-col-id" style={{
                  ...bodyCellStyle,
                  fontFamily: 'Consolas, Monaco, monospace',
                  fontSize: 12,
                  color: 'var(--fg-3)',
                }}>
                  {tc.caseKey}
                </td>
                
                {/* Title - Allow multi-line wrapping */}
                <td className="th-table-col-title" style={{
                  ...bodyCellStyle,
                  fontWeight: 500,
                  color: 'var(--fg-1)',
                  lineHeight: 1.4,
                  paddingTop: 10,
                  paddingBottom: 10,
                  maxWidth: 350,
                }}>
                  {tc.title}
                </td>
                
                {/* Priority — canonical bars + label */}
                <td className="th-table-col-priority" style={bodyCellStyle}>
                  <PriorityIndicator priority={tc.priority} isDark={isDark} />
                </td>
                
                {/* Type - Pill badge */}
                <td className="th-table-col-type" style={bodyCellStyle}>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    height: 22,
                    padding: '0 8px',
                    fontSize: 11,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    borderRadius: 4,
                    backgroundColor: tc.type === 'security' ? 'rgba(239,68,68,0.1)' :
                                    tc.type === 'performance' ? 'rgba(215,119,6,0.1)' :
                                    tc.type === 'api' ? 'rgba(139,92,246,0.1)' : 'var(--cp-bd-zone)',
                    color: tc.type === 'security' ? 'var(--sem-danger)' :
                           tc.type === 'performance' ? '#B45309' :
                           tc.type === 'api' ? '#2563EB' : 'var(--fg-2)',
                  }}>
                    {tc.type.toUpperCase()}
                  </span>
                </td>
                
                {/* Status - Colored pill badge */}
                <td className="th-table-col-status" style={bodyCellStyle}>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    height: 22,
                    padding: '0 8px',
                    fontSize: 11,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    borderRadius: 4,
                    backgroundColor: tc.status === 'approved' ? 'rgba(16,185,129,0.1)' :
                                    tc.status === 'ready' ? 'rgba(37,99,235,0.1)' :
                                    tc.status === 'deprecated' ? 'rgba(239,68,68,0.1)' : 'var(--cp-bd-zone)',
                    color: tc.status === 'approved' ? 'var(--sem-success)' :
                           tc.status === 'ready' ? 'var(--cp-blue)' :
                           tc.status === 'deprecated' ? 'var(--sem-danger)' : 'var(--fg-3)',
                  }}>
                    {tc.status.toUpperCase()}
                  </span>
                </td>
                
                
                {/* Assigned To - Avatar + Full Name */}
                <td className="th-table-col-assignee" style={bodyCellStyle}>
                  {tc.ownerName ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {tc.ownerAvatarUrl ? (
                        <img
                          src={tc.ownerAvatarUrl}
                          alt={tc.ownerName}
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: '50%',
                            objectFit: 'cover',
                            flexShrink: 0,
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 24,
                            height: 24,
                            borderRadius: '50%',
                            backgroundColor: getAvatarColor(tc.ownerInitials),
                            color: '#FFFFFF',
                            fontSize: 9,
                            fontWeight: 600,
                            flexShrink: 0,
                          }}
                        >
                          {tc.ownerInitials}
                        </div>
                      )}
                      <span style={{ fontSize: 12, color: 'var(--fg-2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {tc.ownerName}
                      </span>
                    </div>
                  ) : (
                    <span style={{ color: 'var(--fg-4)', fontSize: 12, fontStyle: 'italic' }}>Unassigned</span>
                  )}
                </td>
                
                {/* Updated - Gray relative time */}
                <td className="th-table-col-updated" style={bodyCellStyle}>
                  <span style={{ fontSize: 12, color: 'var(--fg-4)' }}>
                    {formatRelativeTime(tc.updatedAt)}
                  </span>
                </td>
                
                {/* Actions - Visible on hover */}
                <td 
                  className="th-table-col-actions"
                  onClick={(e) => e.stopPropagation()}
                  style={{ ...bodyCellStyle, textAlign: 'center' }}
                >
                  <button 
                    data-actions-trigger
                    onClick={(e) => handleActionClick(e, tc)}
                    style={{
                      width: 28,
                      height: 28,
                      padding: 0,
                      border: 'none',
                      borderRadius: 6,
                      backgroundColor: 'transparent',
                      color: 'var(--fg-4)',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: isHovered ? 1 : 0.5,
                      transition: 'opacity 0.15s, background-color 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--cp-bd-zone)';
                      e.currentTarget.style.color = 'var(--fg-3)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = 'var(--fg-4)';
                    }}
                  >
                    <MoreVertical style={{ width: 16, height: 16 }} />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default TestCasesTable;
