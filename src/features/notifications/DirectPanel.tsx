import { useState, useCallback } from 'react';
import { Box, xcss } from '@atlaskit/primitives';
import { token } from '@atlaskit/tokens';
import { MOCK_DIRECT_NOTIFICATIONS } from './mock/directMockData';
import { groupByDate } from './utils/date';
import DirectNotificationRow from './components/DirectNotificationRow';

interface DirectPanelProps {
  unreadOnly: boolean;
  isDark: boolean;
}

const panelXcss = xcss({
  display: 'flex',
  flexDirection: 'column',
  flex: '1',
});

const sectionHeaderXcss = xcss({
  paddingBlock: 'space.100',
  paddingInline: 'space.200',
});

const emptyXcss = xcss({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 'space.600',
  gap: 'space.100',
});

function SectionLabel({ label, isDark }: { label: string; isDark: boolean }) {
  return (
    <Box xcss={sectionHeaderXcss}>
      <span
        style={{
          fontFamily: 'Inter, sans-serif',
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.06em',
          textTransform: 'uppercase' as const,
          color: isDark
            ? '#878787'
            : token('color.text.subtlest', '#8590A2'),
        }}
      >
        {label}
      </span>
    </Box>
  );
}

function EmptyUnread({ isDark }: { isDark: boolean }) {
  return (
    <Box xcss={emptyXcss}>
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden="true">
        <circle cx="24" cy="24" r="20" fill={isDark ? '#292929' : token('color.background.neutral', '#F4F5F7')} />
        <path d="M16 24l5 5 11-11" stroke={isDark ? '#878787' : token('color.text.subtlest', '#8590A2')} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      <span
        style={{
          fontFamily: 'Inter, sans-serif',
          fontSize: 14,
          fontWeight: 600,
          color: isDark ? '#EDEDED' : token('color.text', '#172B4D'),
        }}
      >
        You're all caught up
      </span>
      <span
        style={{
          fontFamily: 'Inter, sans-serif',
          fontSize: 13,
          color: isDark ? '#A1A1A1' : token('color.text.subtle', '#626F86'),
          textAlign: 'center',
        }}
      >
        No unread notifications right now.
      </span>
    </Box>
  );
}

export default function DirectPanel({ unreadOnly, isDark }: DirectPanelProps) {
  const [readIds, setReadIds] = useState<Set<string>>(() => {
    const init = new Set<string>();
    for (const n of MOCK_DIRECT_NOTIFICATIONS) {
      if (n.readAt) init.add(n.id);
    }
    return init;
  });

  const handleMarkRead = useCallback((id: string) => {
    setReadIds(prev => new Set(prev).add(id));
  }, []);

  const visible = unreadOnly
    ? MOCK_DIRECT_NOTIFICATIONS.filter(n => !readIds.has(n.id))
    : MOCK_DIRECT_NOTIFICATIONS;

  const groups = groupByDate(visible);

  if (visible.length === 0) {
    return <EmptyUnread isDark={isDark} />;
  }

  const dividerColor = isDark ? '#2E2E2E' : token('color.border', '#DFE1E6');

  return (
    <Box xcss={panelXcss}>
      {groups.map((group, gi) => (
        <Box key={group.label}>
          {gi > 0 && (
            <div
              style={{ height: 1, background: dividerColor, marginInline: 16, marginBlock: 4 }}
              role="separator"
              aria-hidden="true"
            />
          )}
          <SectionLabel label={group.label} isDark={isDark} />
          {group.items.map(n => (
            <DirectNotificationRow
              key={n.id}
              notification={n}
              isRead={readIds.has(n.id)}
              onMarkRead={handleMarkRead}
              isDark={isDark}
            />
          ))}
        </Box>
      ))}
    </Box>
  );
}
