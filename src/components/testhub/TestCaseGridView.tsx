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

interface TestCaseGridViewProps {
  testCases: TestCase[];
  selectedIds: Set<string>;
  onSelectOne: (id: string, selected: boolean) => void;
  onRowClick: (testCase: TestCase) => void;
}

export function TestCaseGridView({ testCases, selectedIds, onSelectOne, onRowClick }: TestCaseGridViewProps) {
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
    if (letter <= 'E') return '#3B82F6';
    if (letter <= 'J') return '#10B981';
    if (letter <= 'O') return '#8B5CF6';
    if (letter <= 'T') return '#F97316';
    return '#EC4899';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return '#991B1B';
      case 'high': return '#C2410C';
      case 'medium': return '#A16207';
      default: return '#64748B';
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'approved': return { bg: 'rgba(16,185,129,0.1)', color: '#059669' };
      case 'ready': return { bg: 'rgba(37,99,235,0.1)', color: '#2563EB' };
      case 'deprecated': return { bg: 'rgba(239,68,68,0.1)', color: '#DC2626' };
      default: return { bg: '#F1F5F9', color: '#64748B' };
    }
  };

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
      gap: 16,
      padding: 20,
    }}>
      {testCases.map(tc => {
        const isSelected = selectedIds.has(tc.id);
        const statusStyle = getStatusStyle(tc.status);

        return (
          <div
            key={tc.id}
            onClick={() => onRowClick(tc)}
            style={{
              backgroundColor: '#FFFFFF',
              border: `1px solid ${isSelected ? '#2563EB' : '#E2E8F0'}`,
              borderRadius: 12,
              padding: 16,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              if (!isSelected) {
                e.currentTarget.style.borderColor = '#CBD5E1';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isSelected) {
                e.currentTarget.style.borderColor = '#E2E8F0';
                e.currentTarget.style.boxShadow = 'none';
              }
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <span style={{ fontSize: 12, fontFamily: 'monospace', color: '#64748B' }}>
                {tc.caseKey}
              </span>
              <input
                type="checkbox"
                checked={isSelected}
                onChange={(e) => {
                  e.stopPropagation();
                  onSelectOne(tc.id, e.target.checked);
                }}
                onClick={(e) => e.stopPropagation()}
                style={{ width: 16, height: 16, cursor: 'pointer' }}
              />
            </div>

            {/* Title */}
            <h3 style={{
              fontSize: 14,
              fontWeight: 600,
              color: '#0F172A',
              margin: '8px 0 12px',
              lineHeight: 1.4,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}>
              {tc.title}
            </h3>

            {/* Divider */}
            <div style={{ height: 1, backgroundColor: '#E2E8F0', margin: '12px 0' }} />

            {/* Metadata */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: getPriorityColor(tc.priority) }}>
                {tc.priority.charAt(0).toUpperCase() + tc.priority.slice(1)}
              </span>
              <span style={{
                fontSize: 10,
                fontWeight: 600,
                textTransform: 'uppercase',
                padding: '2px 6px',
                borderRadius: 4,
                backgroundColor: statusStyle.bg,
                color: statusStyle.color,
              }}>
                {tc.status}
              </span>
              <span style={{
                fontSize: 10,
                fontWeight: 600,
                textTransform: 'uppercase',
                padding: '2px 6px',
                borderRadius: 4,
                backgroundColor: tc.automation === 'automated' ? 'rgba(16,185,129,0.1)' : '#F1F5F9',
                color: tc.automation === 'automated' ? '#059669' : '#64748B',
              }}>
                {tc.automation === 'automated' ? 'Auto' : tc.automation === 'planned' ? 'Plan' : 'Manual'}
              </span>
            </div>

            {/* Footer */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {tc.ownerInitials && (
                <div style={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  backgroundColor: getAvatarColor(tc.ownerInitials),
                  color: '#FFFFFF',
                  fontSize: 10,
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  {tc.ownerInitials}
                </div>
              )}
              <span style={{ fontSize: 12, color: '#94A3B8' }}>
                {formatRelativeTime(tc.updatedAt)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default TestCaseGridView;
