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

  const getAvatarColor = (initials: string | null | undefined) => {
    if (!initials) return '#94A3B8';
    const letter = initials.charAt(0).toUpperCase();
    if (letter <= 'E') return '#3B82F6';
    if (letter <= 'J') return '#10B981';
    if (letter <= 'O') return '#8B5CF6';
    if (letter <= 'T') return '#F97316';
    return '#EC4899';
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
    // Simulate right-click at button position
    onContextMenu?.({ 
      ...e, 
      clientX: e.currentTarget.getBoundingClientRect().left,
      clientY: e.currentTarget.getBoundingClientRect().bottom,
    } as React.MouseEvent, tc);
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
          <tr style={{ backgroundColor: '#F8FAFC' }}>
            <th style={{
              width: 44,
              height: 44,
              padding: '0 12px',
              borderBottom: '1px solid #E2E8F0',
              textAlign: 'center',
            }}>
              <input
                type="checkbox"
                checked={allSelected}
                ref={el => { if (el) el.indeterminate = someSelected; }}
                onChange={(e) => onSelectAll(e.target.checked)}
                style={{ width: 16, height: 16, cursor: 'pointer' }}
              />
            </th>
            <th onClick={() => onSort('caseKey')} style={{
              width: 90,
              height: 44,
              padding: '0 12px',
              borderBottom: '1px solid #E2E8F0',
              textAlign: 'left',
              fontSize: 11,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: '#64748B',
              cursor: 'pointer',
              userSelect: 'none',
            }}>
              <span style={{ display: 'flex', alignItems: 'center' }}>
                ID <SortIcon column="caseKey" />
              </span>
            </th>
            <th onClick={() => onSort('title')} style={{
              height: 44,
              padding: '0 12px',
              borderBottom: '1px solid #E2E8F0',
              textAlign: 'left',
              fontSize: 11,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: '#64748B',
              cursor: 'pointer',
              userSelect: 'none',
            }}>
              <span style={{ display: 'flex', alignItems: 'center' }}>
                Title <SortIcon column="title" />
              </span>
            </th>
            <th onClick={() => onSort('priority')} style={{
              width: 80,
              height: 44,
              padding: '0 12px',
              borderBottom: '1px solid #E2E8F0',
              textAlign: 'left',
              fontSize: 11,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: '#64748B',
              cursor: 'pointer',
              userSelect: 'none',
            }}>
              <span style={{ display: 'flex', alignItems: 'center' }}>
                Priority <SortIcon column="priority" />
              </span>
            </th>
            <th style={{
              width: 100,
              height: 44,
              padding: '0 12px',
              borderBottom: '1px solid #E2E8F0',
              textAlign: 'left',
              fontSize: 11,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: '#64748B',
            }}>Type</th>
            <th onClick={() => onSort('status')} style={{
              width: 100,
              height: 44,
              padding: '0 12px',
              borderBottom: '1px solid #E2E8F0',
              textAlign: 'left',
              fontSize: 11,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: '#64748B',
              cursor: 'pointer',
              userSelect: 'none',
            }}>
              <span style={{ display: 'flex', alignItems: 'center' }}>
                Status <SortIcon column="status" />
              </span>
            </th>
            <th style={{
              width: 90,
              height: 44,
              padding: '0 12px',
              borderBottom: '1px solid #E2E8F0',
              textAlign: 'left',
              fontSize: 11,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: '#64748B',
            }}>Auto</th>
            <th style={{
              width: 50,
              height: 44,
              padding: '0 12px',
              borderBottom: '1px solid #E2E8F0',
              textAlign: 'center',
              fontSize: 11,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: '#64748B',
            }}>Owner</th>
            <th onClick={() => onSort('updatedAt')} style={{
              width: 90,
              height: 44,
              padding: '0 12px',
              borderBottom: '1px solid #E2E8F0',
              textAlign: 'left',
              fontSize: 11,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: '#64748B',
              cursor: 'pointer',
              userSelect: 'none',
            }}>
              <span style={{ display: 'flex', alignItems: 'center' }}>
                Updated <SortIcon column="updatedAt" />
              </span>
            </th>
            <th style={{
              width: 50,
              height: 44,
              padding: '0 12px',
              borderBottom: '1px solid #E2E8F0',
            }}></th>
          </tr>
        </thead>
        <tbody>
          {testCases.map((tc) => {
            const isSelected = selectedIds.has(tc.id);
            return (
              <tr
                key={tc.id}
                onClick={() => onRowClick(tc)}
                onContextMenu={(e) => handleContextMenu(e, tc)}
                style={{
                  height: 36,
                  backgroundColor: isSelected ? 'rgba(37, 99, 235, 0.06)' : '#FFFFFF',
                  cursor: 'pointer',
                  transition: 'background-color 0.1s',
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) e.currentTarget.style.backgroundColor = '#F1F5F9';
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) e.currentTarget.style.backgroundColor = '#FFFFFF';
                }}
              >
                <td 
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    height: 36,
                    padding: '0 12px',
                    borderBottom: '1px solid #E2E8F0',
                    textAlign: 'center',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => onSelectOne(tc.id, e.target.checked)}
                    style={{ width: 16, height: 16, cursor: 'pointer' }}
                  />
                </td>
                <td style={{
                  height: 36,
                  padding: '0 12px',
                  borderBottom: '1px solid #E2E8F0',
                  fontFamily: 'Consolas, Monaco, monospace',
                  fontSize: 12,
                  color: '#64748B',
                }}>{tc.caseKey}</td>
                <td style={{
                  height: 36,
                  padding: '0 12px',
                  borderBottom: '1px solid #E2E8F0',
                  fontWeight: 500,
                  color: '#0F172A',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: 300,
                }}>{tc.title}</td>
                <td style={{
                  height: 36,
                  padding: '0 12px',
                  borderBottom: '1px solid #E2E8F0',
                  fontWeight: 600,
                  fontSize: 13,
                  color: tc.priority === 'critical' ? '#991B1B' :
                         tc.priority === 'high' ? '#C2410C' :
                         tc.priority === 'medium' ? '#A16207' : '#64748B',
                }}>
                  {tc.priority.charAt(0).toUpperCase() + tc.priority.slice(1)}
                </td>
                <td style={{
                  height: 36,
                  padding: '0 12px',
                  borderBottom: '1px solid #E2E8F0',
                }}>
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
                    {tc.type.charAt(0).toUpperCase() + tc.type.slice(1)}
                  </span>
                </td>
                <td style={{
                  height: 36,
                  padding: '0 12px',
                  borderBottom: '1px solid #E2E8F0',
                }}>
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
                    {tc.status.charAt(0).toUpperCase() + tc.status.slice(1)}
                  </span>
                </td>
                <td style={{
                  height: 36,
                  padding: '0 12px',
                  borderBottom: '1px solid #E2E8F0',
                }}>
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
                    {tc.automation === 'automated' ? 'Auto' : 
                     tc.automation === 'planned' ? 'Plan' : 'Manual'}
                  </span>
                </td>
                <td style={{
                  height: 36,
                  padding: '0 12px',
                  borderBottom: '1px solid #E2E8F0',
                  textAlign: 'center',
                }}>
                  {tc.ownerInitials && (
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
                  )}
                </td>
                <td style={{
                  height: 36,
                  padding: '0 12px',
                  borderBottom: '1px solid #E2E8F0',
                  fontSize: 12,
                  color: '#94A3B8',
                }}>{formatRelativeTime(tc.updatedAt)}</td>
                <td 
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    height: 36,
                    padding: '0 12px',
                    borderBottom: '1px solid #E2E8F0',
                    textAlign: 'center',
                  }}
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
