/**
 * ActivityFeed — Widget 11: Scrollable activity feed
 * Row 5, span 8
 * STAGE D NOTE: Activity feed uses mock data until an es_activity_log table is created.
 */

interface FeedItem {
  initials: string;
  color: string;
  text: React.ReactNode;
  time: string;
}

/* All human avatars: exec-blue-700. AI avatar: exec-ai-purple. */
const TEMP_MOCK_FEED: FeedItem[] = [
  {
    initials: 'AH', color: '#7DB8FC',
    text: <><strong>Ahmed Hassan</strong> updated KR "Digitize 80% of permits" progress to <strong style={{ color: '#7DB8FC' }}>82%</strong></>,
    time: '2 hours ago',
  },
  {
    initials: 'AI', color: '#2563EB',
    text: <><strong>AI Insight</strong> flagged Supply Chain Q3 logistics hub as <strong style={{ color: '#DC2626' }}>Off Track</strong> — contractor delays</>,
    time: '3 hours ago',
  },
  {
    initials: 'SR', color: '#7DB8FC',
    text: <><strong>Sara Al-Rashid</strong> completed STEM scholarship pipeline quarterly review — <strong style={{ color: '#16A34A' }}>on track</strong></>,
    time: '5 hours ago',
  },
  {
    initials: 'MK', color: '#7DB8FC',
    text: <><strong>Mohammed Khan</strong> requested budget reallocation for Supply Chain — <strong style={{ color: '#D97706' }}>pending</strong></>,
    time: 'Yesterday',
  },
  {
    initials: 'FN', color: '#7DB8FC',
    text: <><strong>Fatima Noor</strong> submitted ESG compliance framework draft for review</>,
    time: 'Yesterday',
  },
  {
    initials: 'KA', color: '#7DB8FC',
    text: <><strong>Khalid Al-Otaibi</strong> closed Epic "Ministry Integration Phase 2" — all features delivered</>,
    time: '2 days ago',
  },
];

export function ActivityFeed() {
  return (
    <div style={{ flex: 1, overflowY: 'auto' }}>
      {TEMP_MOCK_FEED.map((item, i) => (
        <div
          key={i}
          className="flex gap-3"
          style={{
            padding: '10px 4px',
            borderBottom: i < TEMP_MOCK_FEED.length - 1 ? '1px solid var(--exec-border, var(--bd-default, rgba(255,255,255,0.10)))' : 'none',
            transition: 'background 120ms',
            borderRadius: 6,
            margin: '0 -4px',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--exec-bg-hover, #1A1A1A)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
          <div
            className="flex items-center justify-center flex-shrink-0"
            style={{
              width: 28, height: 28, borderRadius: '50%', background: item.color,
              color: '#FFFFFF', fontSize: 10, fontWeight: 600,
            }}
          >
            {item.initials}
          </div>
          <div className="flex-1 min-w-0">
            <div style={{ fontSize: 11, color: 'var(--exec-text-secondary)', lineHeight: 1.5 }}>
              {item.text}
            </div>
            <div style={{ fontSize: 10, color: 'var(--exec-text-tertiary)', marginTop: 2 }}>
              {item.time}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
