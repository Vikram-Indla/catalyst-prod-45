import PriorityChip from "./PriorityChip";

interface AIDigestItem {
  id: string;
  title: string;
  priority: 'high' | 'medium' | 'low';
  summary: string;
}

interface AIDigestTabProps {
  items?: AIDigestItem[];
  lastGenerated?: string;
  onRefresh?: () => void;
  hasNewDigest?: boolean;
}

const MOCK_ITEMS: AIDigestItem[] = [
  { id: '1', title: 'Payment Gateway integration blocked by vendor API changes', priority: 'high', summary: 'Vendor updated authentication flow — 3 stories blocked.' },
  { id: '2', title: 'Release cycle velocity trending 18% below target', priority: 'medium', summary: 'Team capacity reduced due to public holiday schedule.' },
  { id: '3', title: 'UAT sign-off pending for Release 4.2', priority: 'low', summary: 'All test cases passed — awaiting business owner approval.' },
];

export default function AIDigestTab({ items = MOCK_ITEMS, lastGenerated = '2 hours ago', onRefresh }: AIDigestTabProps) {
  return (
    <div style={{ padding: '12px 20px' }}>
      {/* m-12: pulse dot keyframes injected in NotificationPanel */}

      {/* Purple badge */}
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '6px 12px',
        background: 'rgba(124,58,237,.08)',
        border: '0.5px solid rgba(124,58,237,.2)',
        borderRadius: 6,
        marginBottom: 12,
      }}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M7 1L8.5 5.5L13 7L8.5 8.5L7 13L5.5 8.5L1 7L5.5 5.5L7 1Z" fill="#7C3AED"/>
        </svg>
        <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 600, color: '#7C3AED' }}>
          AI Digest — Today
        </span>
      </div>

      {/* Summary card */}
      <div style={{
        background: 'rgba(124,58,237,.08)',
        borderRadius: 6,
        padding: '14px 16px',
        marginBottom: 16,
        fontFamily: 'Inter, sans-serif',
      }}>
        <p style={{ fontSize: 13, color: '#0F172A', lineHeight: '20px', margin: 0 }}>
          3 items need your attention today. Payment Gateway is the highest priority with blocked stories.
        </p>
        <p style={{ fontSize: 11, color: '#94A3B8', margin: '8px 0 0' }}>
          Last generated {lastGenerated} ·{' '}
          <button
            onClick={(e) => { e.stopPropagation(); onRefresh?.(); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#2563EB', fontSize: 11, fontFamily: 'Inter, sans-serif', padding: 0 }}
          >
            Refresh
          </button>
        </p>
      </div>

      {/* Priority items */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {items.map(item => (
          <div key={item.id} style={{
            padding: '12px 16px',
            background: '#F8FAFC',
            border: '0.5px solid rgba(15,23,42,.08)',
            borderRadius: 6,
            cursor: 'pointer',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <PriorityChip level={item.priority} />
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 600, color: '#0F172A' }}>
                {item.title}
              </span>
            </div>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: '#64748B', margin: 0, lineHeight: '18px' }}>
              {item.summary}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
