/**
 * ActivityFeed — Widget 11: Scrollable activity feed with avatars
 * Row 5, span 8
 */

interface FeedItem {
  initials: string;
  color: string;
  text: React.ReactNode;
  time: string;
}

const FEED: FeedItem[] = [
  {
    initials: 'AH', color: '#2563EB',
    text: <><strong>Ahmed Hassan</strong> updated KR "Digitize 80% of permits" progress to <strong style={{ color: '#0D9488' }}>82%</strong></>,
    time: '2 hours ago',
  },
  {
    initials: 'AI', color: '#7C3AED',
    text: <><strong>AI Insight</strong> flagged Supply Chain Q3 logistics hub as <strong style={{ color: '#EF4444' }}>Off Track</strong> — contractor delays</>,
    time: '3 hours ago',
  },
  {
    initials: 'SR', color: '#0D9488',
    text: <><strong>Sara Al-Rashid</strong> completed STEM scholarship pipeline quarterly review — <strong style={{ color: '#0D9488' }}>on track</strong></>,
    time: '5 hours ago',
  },
  {
    initials: 'MK', color: '#D97706',
    text: <><strong>Mohammed Khan</strong> requested budget reallocation for Supply Chain — <strong style={{ color: '#D97706' }}>pending</strong></>,
    time: 'Yesterday',
  },
  {
    initials: 'FN', color: '#7C3AED',
    text: <><strong>Fatima Noor</strong> submitted ESG compliance framework draft for review</>,
    time: 'Yesterday',
  },
  {
    initials: 'KA', color: '#06B6D4',
    text: <><strong>Khalid Al-Otaibi</strong> closed Epic "Ministry Integration Phase 2" — all features delivered</>,
    time: '2 days ago',
  },
];

export function ActivityFeed() {
  return (
    <div style={{ maxHeight: 200, overflowY: 'auto' }}>
      {FEED.map((item, i) => (
        <div
          key={i}
          className="flex gap-3"
          style={{
            padding: '10px 4px',
            borderBottom: i < FEED.length - 1 ? '1px solid var(--catalyst-border-default, #E2E8F0)' : 'none',
            transition: 'background 120ms',
            borderRadius: 6,
            margin: '0 -4px',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--catalyst-bg-hover, #F8FAFC)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
          {/* Avatar */}
          <div
            className="flex items-center justify-center flex-shrink-0"
            style={{
              width: 28, height: 28, borderRadius: '50%', background: item.color,
              color: '#FFFFFF', fontSize: 10, fontWeight: 600,
            }}
          >
            {item.initials}
          </div>
          {/* Content */}
          <div className="flex-1 min-w-0">
            <div style={{ fontSize: 11, color: 'var(--catalyst-text-secondary)', lineHeight: 1.5 }}>
              {item.text}
            </div>
            <div style={{ fontSize: 10, color: 'var(--catalyst-text-tertiary)', marginTop: 2 }}>
              {item.time}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
