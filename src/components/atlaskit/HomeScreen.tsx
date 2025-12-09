import React, { useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { token } from '@atlaskit/tokens';
import Avatar from '@atlaskit/avatar';
import Button from '@atlaskit/button';
import Tooltip from '@atlaskit/tooltip';
import EmptyState from '@atlaskit/empty-state';
import StarIcon from '@atlaskit/icon/glyph/star';
import StarFilledIcon from '@atlaskit/icon/glyph/star-filled';
import PageIcon from '@atlaskit/icon/glyph/page';
import LightbulbIcon from '@atlaskit/icon/glyph/lightbulb';
import TaskIcon from '@atlaskit/icon/glyph/task';
import FolderIcon from '@atlaskit/icon/glyph/folder';
import Spinner from '@atlaskit/spinner';
import { useRecentRooms } from '@/hooks/useRecentRooms';
import { useStarredItems } from '@/hooks/useStarredItems';
import { useActivityFeed, ActivityItem, ActivityType } from '@/hooks/useActivityFeed';
import type { Database } from '@/integrations/supabase/types';

type RoomType = Database['public']['Enums']['room_type'];
type ActivityTab = 'worked' | 'viewed' | 'assigned' | 'starred';

function getRoomTypeFilter(pathname: string): RoomType | null {
  if (pathname.includes('/product')) {
    return 'product' as RoomType;
  }
  return null;
}

const getRoomIcon = (roomType: string) => {
  switch (roomType) {
    case 'program':
      return '📋';
    case 'portfolio':
      return '📁';
    case 'team':
      return '👥';
    case 'strategy':
      return '🎯';
    case 'product':
      return '🏢';
    case 'feature':
      return '⚡';
    case 'roadmap':
      return '🗺️';
    default:
      return '📄';
  }
};

export default function HomeScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedTab, setSelectedTab] = useState<ActivityTab>('worked');

  const roomTypeFilter = getRoomTypeFilter(location.pathname);

  const { recentRooms, loading: loadingRecent, trackRoomAccess } = useRecentRooms({
    filterByRoomType: roomTypeFilter,
    limit: 16,
  });
  const { toggleStar, isStarred } = useStarredItems({
    filterByRoomType: roomTypeFilter,
    limit: 50,
  });
  const { items: activityItems, loading: loadingActivity, assignedCount } = useActivityFeed({
    tab: selectedTab,
    limit: 20,
  });

  const handleRoomClick = async (room: typeof recentRooms[0]) => {
    await trackRoomAccess(
      room.room_type,
      room.room_id,
      room.room_name,
      room.room_subtitle,
      room.room_path,
      room.pi_label
    );
    navigate(room.room_path);
  };

  const handleToggleStar = async (room: typeof recentRooms[0], e: React.MouseEvent) => {
    e.stopPropagation();
    await toggleStar({
      room_type: room.room_type,
      room_id: room.room_id,
      room_name: room.room_name,
      room_subtitle: room.room_subtitle,
      room_path: room.room_path,
      pi_label: room.pi_label,
    });
  };

  const tabs = [
    { key: 'worked' as ActivityTab, label: 'Worked on' },
    { key: 'viewed' as ActivityTab, label: 'Viewed' },
    { key: 'assigned' as ActivityTab, label: 'Assigned to me', count: assignedCount },
    { key: 'starred' as ActivityTab, label: 'Starred' },
  ];

  return (
    <div
      style={{
        padding: token('space.400', '32px'),
        background: token('color.background.neutral', '#F4F5F7'),
        minHeight: '100vh',
      }}
    >
      {/* RECENT ROOMS SECTION */}
      <section style={{ marginBottom: token('space.600', '48px') }}>
        <h2
          style={{
            fontSize: '12px',
            fontWeight: 600,
            color: token('color.text.subtle', '#626F86'),
            marginBottom: token('space.300', '24px'),
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          RECENT ROOMS
        </h2>

        {loadingRecent ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: token('space.600', '48px') }}>
            <Spinner size="large" />
          </div>
        ) : recentRooms.length > 0 ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: token('space.300', '24px'),
            }}
          >
            {recentRooms.map((room) => (
              <RoomCard
                key={room.id}
                room={room}
                isStarred={isStarred(room.room_type, room.room_id)}
                onToggleStar={(e) => handleToggleStar(room, e)}
                onClick={() => handleRoomClick(room)}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            header="No recent rooms"
            description="Start exploring by opening a room from the navigation"
          />
        )}
      </section>

      {/* FOR YOU SECTION */}
      <section>
        {/* Custom Tab List - Jira Style */}
        <div
          style={{
            display: 'flex',
            borderBottom: `2px solid ${token('color.border', '#DFE1E6')}`,
            marginBottom: token('space.300', '24px'),
          }}
        >
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setSelectedTab(tab.key)}
              style={{
                padding: `${token('space.150', '12px')} ${token('space.200', '16px')}`,
                fontSize: '14px',
                fontWeight: selectedTab === tab.key ? 600 : 400,
                color: selectedTab === tab.key
                  ? token('color.text.brand', '#0052CC')
                  : token('color.text.subtle', '#626F86'),
                background: 'transparent',
                border: 'none',
                borderBottom: selectedTab === tab.key
                  ? `2px solid ${token('color.border.brand', '#0052CC')}`
                  : '2px solid transparent',
                marginBottom: '-2px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: token('space.100', '8px'),
                transition: 'color 150ms, border-color 150ms',
              }}
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span
                  style={{
                    background: token('color.background.neutral.bold', '#DFE1E6'),
                    color: token('color.text', '#172B4D'),
                    fontSize: '11px',
                    fontWeight: 600,
                    padding: '2px 6px',
                    borderRadius: '10px',
                    minWidth: '18px',
                    textAlign: 'center',
                  }}
                >
                  {tab.count > 99 ? '99+' : tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Activity List */}
        <ActivityList activities={activityItems} loading={loadingActivity} />
      </section>
    </div>
  );
}

// ============================================
// ROOM CARD COMPONENT
// ============================================

interface RoomCardProps {
  room: {
    id: string;
    room_type: string;
    room_id: string;
    room_name: string;
    room_subtitle: string | null;
    room_path: string;
  };
  isStarred: boolean;
  onToggleStar: (e: React.MouseEvent) => void;
  onClick: () => void;
}

function RoomCard({ room, isStarred, onToggleStar, onClick }: RoomCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        background: token('elevation.surface', '#FFFFFF'),
        borderRadius: token('border.radius', '3px'),
        padding: token('space.300', '24px'),
        boxShadow: isHovered
          ? token('elevation.shadow.overlay', '0px 8px 12px rgba(9, 30, 66, 0.15)')
          : token('elevation.shadow.raised', '0px 1px 1px rgba(9, 30, 66, 0.25)'),
        border: `1px solid ${token('color.border', '#DFE1E6')}`,
        transition: 'box-shadow 150ms, transform 150ms',
        cursor: 'pointer',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        gap: token('space.150', '12px'),
        transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
      }}
    >
      {/* STAR BUTTON */}
      <div
        style={{
          position: 'absolute',
          top: token('space.150', '12px'),
          right: token('space.150', '12px'),
          opacity: isHovered || isStarred ? 1 : 0,
          transition: 'opacity 150ms',
        }}
      >
        <Tooltip content={isStarred ? 'Unstar' : 'Star'}>
          <Button
            appearance="subtle"
            iconBefore={
              isStarred ? (
                <StarFilledIcon
                  label="Starred"
                  size="small"
                  primaryColor={token('color.icon.warning', '#FF991F')}
                />
              ) : (
                <StarIcon
                  label="Star"
                  size="small"
                  primaryColor={token('color.icon.subtle', '#6B778C')}
                />
              )
            }
            onClick={onToggleStar}
          />
        </Tooltip>
      </div>

      {/* ROOM ICON */}
      <div
        style={{
          width: '40px',
          height: '40px',
          background: token('color.background.warning.bold', '#FFAB00'),
          borderRadius: token('border.radius', '3px'),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '20px',
        }}
      >
        {getRoomIcon(room.room_type)}
      </div>

      {/* ROOM INFO */}
      <div>
        <h3
          style={{
            fontSize: '16px',
            fontWeight: 600,
            color: token('color.text', '#172B4D'),
            margin: 0,
            marginBottom: token('space.050', '4px'),
          }}
        >
          {room.room_name}
        </h3>
        <p
          style={{
            fontSize: '12px',
            color: token('color.text.subtlest', '#6B778C'),
            margin: 0,
          }}
        >
          {room.room_subtitle || room.room_type}
        </p>
      </div>
    </div>
  );
}

// ============================================
// ACTIVITY LIST COMPONENT
// ============================================

interface ActivityListProps {
  activities: ActivityItem[];
  loading: boolean;
}

function getTimeGroup(date: Date): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const lastMonth = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

  const itemDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (itemDate >= today) return 'TODAY';
  if (itemDate >= yesterday) return 'YESTERDAY';
  if (itemDate >= lastWeek) return 'IN THE LAST WEEK';
  if (itemDate >= lastMonth) return 'IN THE LAST MONTH';
  return 'OLDER';
}

function ActivityList({ activities, loading }: ActivityListProps) {
  const groupedItems = useMemo(() => {
    const groups: Record<string, ActivityItem[]> = {};
    const groupOrder = ['TODAY', 'YESTERDAY', 'IN THE LAST WEEK', 'IN THE LAST MONTH', 'OLDER'];

    activities.forEach((item) => {
      const group = getTimeGroup(new Date(item.updatedAt));
      if (!groups[group]) groups[group] = [];
      groups[group].push(item);
    });

    return groupOrder
      .filter((group) => groups[group]?.length > 0)
      .map((group) => ({ label: group, items: groups[group] }));
  }, [activities]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: token('space.600', '48px') }}>
        <Spinner size="large" />
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <EmptyState
        header="No recent activity"
        description="Your recent work will appear here"
      />
    );
  }

  return (
    <div>
      {groupedItems.map((group) => (
        <div key={group.label} style={{ marginBottom: token('space.300', '24px') }}>
          {/* GROUP HEADER */}
          <h3
            style={{
              fontSize: '11px',
              fontWeight: 700,
              color: token('color.text.subtle', '#626F86'),
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: token('space.200', '16px'),
            }}
          >
            {group.label}
          </h3>

          {/* ACTIVITY ITEMS */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: token('space.100', '8px') }}>
            {group.items.map((item) => (
              <ActivityItemRow key={item.id} activity={item} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================
// ACTIVITY ITEM COMPONENT
// ============================================

function ActivityItemRow({ activity }: { activity: ActivityItem }) {
  const [isHovered, setIsHovered] = useState(false);

  const getIcon = () => {
    switch (activity.type) {
      case 'epic':
        return <FolderIcon label="Epic" size="medium" primaryColor={token('color.icon.discovery', '#6554C0')} />;
      case 'feature':
        return <LightbulbIcon label="Feature" size="medium" primaryColor={token('color.icon.warning', '#FFAB00')} />;
      case 'story':
        return <TaskIcon label="Story" size="medium" primaryColor={token('color.icon.success', '#36B37E')} />;
      case 'demand':
        return <PageIcon label="Demand" size="medium" primaryColor={token('color.icon.information', '#0065FF')} />;
      default:
        return <PageIcon label="Item" size="medium" primaryColor={token('color.icon.subtle', '#6B778C')} />;
    }
  };

  const avatarColors = ['#C69C6D', '#5243AA', '#00875A', '#0052CC', '#FF5630'];
  const avatarColor = avatarColors[activity.id.charCodeAt(0) % avatarColors.length];

  return (
    <a
      href="#"
      onClick={(e) => e.preventDefault()}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        display: 'flex',
        gap: token('space.200', '16px'),
        padding: token('space.200', '16px'),
        borderRadius: token('border.radius', '3px'),
        background: isHovered ? token('color.background.neutral.hovered', '#F4F5F7') : 'transparent',
        textDecoration: 'none',
        transition: 'background 150ms',
        alignItems: 'center',
      }}
    >
      {/* ICON */}
      <div
        style={{
          width: '40px',
          height: '40px',
          background: token('color.background.neutral', '#F4F5F7'),
          borderRadius: token('border.radius', '3px'),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {getIcon()}
      </div>

      {/* CONTENT */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <h4
          style={{
            fontSize: '14px',
            fontWeight: 500,
            color: token('color.text', '#172B4D'),
            margin: 0,
            marginBottom: token('space.050', '4px'),
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {activity.title}
        </h4>
        <p
          style={{
            fontSize: '12px',
            color: token('color.text.subtlest', '#6B778C'),
            margin: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {activity.key} • {activity.projectName}
        </p>
      </div>

      {/* METADATA */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: token('space.150', '12px'),
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontSize: '12px',
            color: token('color.text.subtlest', '#6B778C'),
          }}
        >
          {activity.action}
        </span>
        <Tooltip content="User">
          <Avatar
            size="small"
            appearance="circle"
            name="User"
          />
        </Tooltip>
      </div>
    </a>
  );
}
