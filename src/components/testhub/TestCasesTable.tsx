import { useState } from 'react';
import { MoreVertical, ChevronUp, ChevronDown } from 'lucide-react';

interface TestCase {
  id: string;
  caseKey: string;
  title: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  type: string;
  status: 'draft' | 'ready' | 'approved' | 'deprecated';
  automation: 'manual' | 'automated' | 'planned';
  ownerInitials?: string | null;
  ownerName?: string | null;
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
  onSort,
  sortColumn,
  sortDirection,
}: TestCasesTableProps) {
  const [hoveredRowId, setHoveredRowId] = useState<string | null>(null);
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
    if (!initials) return '#94A3B8';
    const letter = initials.charAt(0).toUpperCase();
    if (letter <= 'E') return '#3B82F6'; // Blue
    if (letter <= 'J') return '#10B981'; // Green
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
    // Use native event to prevent document click handler from firing
    e.nativeEvent.stopImmediatePropagation();
    
    const rect = e.currentTarget.getBoundingClientRect();
    onContextMenu?.({ 
      ...e, 
      clientX: rect.right - 180, // Position menu to the left of the button
      clientY: rect.bottom + 4,
    } as React.MouseEvent, tc);
  };

  // Header cell styles
  const headerCellStyle: React.CSSProperties = {
    height: 44,
    padding: '0 12px',
    backgroundColor: '#F8FAFC',
    borderBottom: '1px solid #E2E8F0',
    fontSize: 11,
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: '#64748B',
    verticalAlign: 'middle',
  };

  // Body cell base styles
  const bodyCellStyle: React.CSSProperties = {
    height: 36,
    padding: '0 12px',
    borderBottom: '1px solid #E2E8F0',
    verticalAlign: 'middle',
  };

  return (
    <div style={{
      backgroundColor: '#FFFFFF',
      border: '1px solid #E2E8F0',
      borderRadius: 8,
      overflow: 'hidden',
    }}>
      <table style={{
        width: '100%',
        borderCollapse: 'collapse',
        tableLayout: 'fixed',
      }}>
        <thead>
          <tr>
            {/* Checkbox */}
            <th style={{ ...headerCellStyle, width: 44, textAlign: 'center' }}>
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
              onClick={() => onSort('caseKey')} 
              style={{ ...headerCellStyle, width: 90, textAlign: 'left', cursor: 'pointer', userSelect: 'none' }}
            >
              <span style={{ display: 'flex', alignItems: 'center' }}>
                ID <SortIcon column="caseKey" />
              </span>
            </th>
            {/* Title */}
            <th 
              onClick={() => onSort('title')} 
              style={{ ...headerCellStyle, textAlign: 'left', cursor: 'pointer', userSelect: 'none' }}
            >
              <span style={{ display: 'flex', alignItems: 'center' }}>
                Title <SortIcon column="title" />
              </span>
            </th>
            {/* Priority */}
            <th 
              onClick={() => onSort('priority')} 
              style={{ ...headerCellStyle, width: 80, textAlign: 'left', cursor: 'pointer', userSelect: 'none' }}
            >
              <span style={{ display: 'flex', alignItems: 'center' }}>
                Priority <SortIcon column="priority" />
              </span>
            </th>
            {/* Type */}
            <th style={{ ...headerCellStyle, width: 100, textAlign: 'left' }}>
              Type
            </th>
            {/* Status */}
            <th 
              onClick={() => onSort('status')} 
              style={{ ...headerCellStyle, width: 100, textAlign: 'left', cursor: 'pointer', userSelect: 'none' }}
            >
              <span style={{ display: 'flex', alignItems: 'center' }}>
                Status <SortIcon column="status" />
              </span>
            </th>
            {/* Auto */}
            <th style={{ ...headerCellStyle, width: 90, textAlign: 'left' }}>
              Auto
            </th>
            {/* Owner - separate column */}
            <th style={{ ...headerCellStyle, width: 50, textAlign: 'center' }}>
              Owner
            </th>
            {/* Updated - separate column */}
            <th 
              onClick={() => onSort('updatedAt')} 
              style={{ ...headerCellStyle, width: 90, textAlign: 'left', cursor: 'pointer', userSelect: 'none' }}
            >
              <span style={{ display: 'flex', alignItems: 'center' }}>
                Updated <SortIcon column="updatedAt" />
              </span>
            </th>
            {/* Actions */}
            <th style={{ ...headerCellStyle, width: 50 }}></th>
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
                  height: 36,
                  backgroundColor: isSelected ? 'rgba(37, 99, 235, 0.06)' : isHovered ? '#F1F5F9' : '#FFFFFF',
                  cursor: 'pointer',
                  transition: 'background-color 0.1s',
                }}
              >
                {/* Checkbox */}
                <td 
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
                <td style={{
                  ...bodyCellStyle,
                  fontFamily: 'Consolas, Monaco, monospace',
                  fontSize: 12,
                  color: '#64748B',
                }}>
                  {tc.caseKey}
                </td>
                
                {/* Title - Allow multi-line wrapping */}
                <td style={{
                  ...bodyCellStyle,
                  fontWeight: 500,
                  color: '#0F172A',
                  lineHeight: 1.4,
                  paddingTop: 10,
                  paddingBottom: 10,
                  maxWidth: 350,
                }}>
                  {tc.title}
                </td>
                
                {/* Priority - Bold colored text */}
                <td style={bodyCellStyle}>
                  <span style={{
                    fontWeight: 600,
                    fontSize: 13,
                    color: tc.priority === 'critical' ? '#991B1B' :
                           tc.priority === 'high' ? '#C2410C' :
                           tc.priority === 'medium' ? '#A16207' : '#64748B',
                  }}>
                    {tc.priority.charAt(0).toUpperCase() + tc.priority.slice(1)}
                  </span>
                </td>
                
                {/* Type - Pill badge */}
                <td style={bodyCellStyle}>
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
                                    tc.type === 'api' ? 'rgba(139,92,246,0.1)' : '#F1F5F9',
                    color: tc.type === 'security' ? '#DC2626' :
                           tc.type === 'performance' ? '#B45309' :
                           tc.type === 'api' ? '#7C3AED' : '#475569',
                  }}>
                    {tc.type.toUpperCase()}
                  </span>
                </td>
                
                {/* Status - Colored pill badge */}
                <td style={bodyCellStyle}>
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
                                    tc.status === 'deprecated' ? 'rgba(239,68,68,0.1)' : '#F1F5F9',
                    color: tc.status === 'approved' ? '#059669' :
                           tc.status === 'ready' ? '#2563EB' :
                           tc.status === 'deprecated' ? '#DC2626' : '#64748B',
                  }}>
                    {tc.status.toUpperCase()}
                  </span>
                </td>
                
                {/* Auto - Pill badge */}
                <td style={bodyCellStyle}>
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
                    backgroundColor: tc.automation === 'automated' ? 'rgba(16,185,129,0.1)' :
                                    tc.automation === 'planned' ? 'rgba(37,99,235,0.1)' : '#F1F5F9',
                    color: tc.automation === 'automated' ? '#059669' :
                           tc.automation === 'planned' ? '#2563EB' : '#64748B',
                  }}>
                    {tc.automation === 'automated' ? 'AUTO' : 
                     tc.automation === 'planned' ? 'PLAN' : 'MANUAL'}
                  </span>
                </td>
                
                {/* Owner - Avatar with colors based on initials */}
                <td style={{ ...bodyCellStyle, textAlign: 'center' }}>
                  {tc.ownerInitials ? (
                    <div
                      title={tc.ownerName || ''}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        backgroundColor: getAvatarColor(tc.ownerInitials),
                        color: '#FFFFFF',
                        fontSize: 10,
                        fontWeight: 600,
                      }}
                    >
                      {tc.ownerInitials}
                    </div>
                  ) : (
                    <span style={{ color: '#94A3B8', fontSize: 12 }}>—</span>
                  )}
                </td>
                
                {/* Updated - Gray relative time */}
                <td style={bodyCellStyle}>
                  <span style={{ fontSize: 12, color: '#94A3B8' }}>
                    {formatRelativeTime(tc.updatedAt)}
                  </span>
                </td>
                
                {/* Actions - Visible on hover */}
                <td 
                  onClick={(e) => e.stopPropagation()}
                  style={{ ...bodyCellStyle, textAlign: 'center' }}
                >
                  <button 
                    onClick={(e) => handleActionClick(e, tc)}
                    style={{
                      width: 28,
                      height: 28,
                      padding: 0,
                      border: 'none',
                      borderRadius: 6,
                      backgroundColor: 'transparent',
                      color: '#94A3B8',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: isHovered ? 1 : 0.5,
                      transition: 'opacity 0.15s, background-color 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#F1F5F9';
                      e.currentTarget.style.color = '#64748B';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = '#94A3B8';
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
