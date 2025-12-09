import React, { useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Avatar from '@atlaskit/avatar';
import Spinner from '@atlaskit/spinner';
import EmptyState from '@atlaskit/empty-state';
import StarIcon from '@atlaskit/icon/glyph/star';
import StarFilledIcon from '@atlaskit/icon/glyph/star-filled';
import PageIcon from '@atlaskit/icon/glyph/page';
import LightbulbIcon from '@atlaskit/icon/glyph/lightbulb';
import TaskIcon from '@atlaskit/icon/glyph/task';
import FolderIcon from '@atlaskit/icon/glyph/folder';
import { useRecentRooms } from '@/hooks/useRecentRooms';
import { useStarredItems } from '@/hooks/useStarredItems';
import { useActivityFeed, ActivityItem } from '@/hooks/useActivityFeed';
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

const getRoomBgColor = (roomType: string) => {
  switch (roomType) {
    case 'program':
      return '#DEEBFF';
    case 'portfolio':
      return '#EAE6FF';
    case 'team':
      return '#E3FCEF';
    case 'strategy':
      return '#FFEBE6';
    case 'product':
      return '#FFF0B3';
    default:
      return '#F4F5F7';
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
        padding: '32px 40px',
        background: '#FAFBFC',
        minHeight: '100vh',
      }}
    >
      {/* PAGE TITLE */}
      <h1 style={{
        fontSize: '20px',
        fontWeight: 500,
        lineHeight: '24px',
        color: '#172B4D',
        margin: '0 0 24px 0',
      }}>
        For you
      </h1>

      {/* RECENT ROOMS SECTION */}
      <section style={{ marginBottom: '40px' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '12px',
        }}>
          <h2 style={{
            fontSize: '11px',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: '#5E6C84',
            margin: 0,
          }}>
            Recent projects
          </h2>
          <a
            href="/projects"
            style={{
              fontSize: '12px',
              fontWeight: 400,
              color: '#0052CC',
              textDecoration: 'none',
            }}
          >
            View all projects
          </a>
        </div>

        {loadingRecent ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '32px' }}>
            <Spinner size="medium" />
          </div>
        ) : recentRooms.length > 0 ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
              gap: '12px',
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

      {/* TABS */}
      <div style={{
        borderBottom: '2px solid #DFE1E6',
        marginBottom: '24px',
      }}>
        <div style={{
          display: 'flex',
          gap: '24px',
        }}>
          {tabs.map((tab) => (
            <TabItem
              key={tab.key}
              label={tab.label}
              isActive={selectedTab === tab.key}
              badge={tab.count !== undefined && tab.count > 0 ? (tab.count > 99 ? '99+' : String(tab.count)) : undefined}
              onClick={() => setSelectedTab(tab.key)}
            />
          ))}
        </div>
      </div>

      {/* ACTIVITY LIST */}
      <ActivityList activities={activityItems} loading={loadingActivity} />
    </div>
  );
}

// ============================================
// ROOM CARD - COMPACT JIRA SIZE
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
        display: 'block',
        background: '#FFFFFF',
        border: '1px solid #DFE1E6',
        borderRadius: '3px',
        padding: '12px',
        cursor: 'pointer',
        position: 'relative',
        minHeight: '100px',
        transition: 'box-shadow 150ms',
        boxShadow: isHovered ? '0 4px 8px rgba(9, 30, 66, 0.15)' : 'none',
      }}
    >
      {/* STAR BUTTON */}
      <div style={{
        position: 'absolute',
        top: '8px',
        right: '8px',
        opacity: isHovered || isStarred ? 1 : 0,
        transition: 'opacity 150ms',
      }}>
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToggleStar(e);
          }}
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {isStarred ? (
            <StarFilledIcon 
              label="Starred" 
              size="small" 
              primaryColor="#FFAB00"
            />
          ) : (
            <StarIcon 
              label="Star" 
              size="small" 
              primaryColor="#6B778C"
            />
          )}
        </button>
      </div>

      {/* ROOM ICON */}
      <div style={{
        width: '32px',
        height: '32px',
        background: getRoomBgColor(room.room_type),
        borderRadius: '3px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '8px',
        fontSize: '16px',
      }}>
        {getRoomIcon(room.room_type)}
      </div>

      {/* ROOM INFO */}
      <div>
        <h3 style={{
          fontSize: '14px',
          fontWeight: 600,
          lineHeight: '20px',
          color: '#172B4D',
          margin: '0 0 2px 0',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {room.room_name}
        </h3>
        <p style={{
          fontSize: '11px',
          fontWeight: 400,
          lineHeight: '16px',
          color: '#5E6C84',
          margin: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {room.room_subtitle || room.room_type}
        </p>
      </div>
    </div>
  );
}

// ============================================
// TAB ITEM
// ============================================

interface TabItemProps {
  label: string;
  isActive?: boolean;
  badge?: string;
  onClick: () => void;
}

function TabItem({ label, isActive = false, badge, onClick }: TabItemProps) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'transparent',
        border: 'none',
        borderBottom: isActive ? '2px solid #0052CC' : '2px solid transparent',
        padding: '8px 0',
        fontSize: '14px',
        fontWeight: 500,
        color: isActive ? '#0052CC' : '#42526E',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        marginBottom: '-2px',
      }}
    >
      {label}
      {badge && (
        <span style={{
          background: '#DFE1E6',
          color: '#42526E',
          fontSize: '11px',
          fontWeight: 600,
          padding: '2px 6px',
          borderRadius: '10px',
          lineHeight: '16px',
        }}>
          {badge}
        </span>
      )}
    </button>
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
      <div style={{ display: 'flex', justifyContent: 'center', padding: '32px' }}>
        <Spinner size="medium" />
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
        <section key={group.label} style={{ marginBottom: '24px' }}>
          <h3 style={{
            fontSize: '11px',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: '#6B778C',
            margin: '0 0 12px 0',
          }}>
            {group.label}
          </h3>

          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0',
          }}>
            {group.items.map((item) => (
              <ActivityItemRow key={item.id} activity={item} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

// ============================================
// ACTIVITY ITEM - COMPACT JIRA SIZE
// ============================================

function ActivityItemRow({ activity }: { activity: ActivityItem }) {
  const [isHovered, setIsHovered] = useState(false);

  const getIcon = () => {
    switch (activity.type) {
      case 'epic':
        return <FolderIcon label="Epic" size="small" primaryColor="#6554C0" />;
      case 'feature':
        return <LightbulbIcon label="Feature" size="small" primaryColor="#FFAB00" />;
      case 'story':
        return <TaskIcon label="Story" size="small" primaryColor="#36B37E" />;
      case 'demand':
        return <PageIcon label="Demand" size="small" primaryColor="#0065FF" />;
      default:
        return <PageIcon label="Item" size="small" primaryColor="#6B778C" />;
    }
  };

  const getIconBg = () => {
    switch (activity.type) {
      case 'epic':
        return '#EAE6FF';
      case 'feature':
        return '#FFF0B3';
      case 'story':
        return '#E3FCEF';
      case 'demand':
        return '#DEEBFF';
      default:
        return '#F4F5F7';
    }
  };

  return (
    <a
      href="#"
      onClick={(e) => e.preventDefault()}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '8px 12px',
        background: isHovered ? '#F4F5F7' : 'transparent',
        borderRadius: '3px',
        textDecoration: 'none',
        transition: 'background 150ms',
      }}
    >
      {/* ICON */}
      <div style={{
        width: '24px',
        height: '24px',
        background: getIconBg(),
        borderRadius: '3px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}>
        {getIcon()}
      </div>

      {/* CONTENT */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: '14px',
          fontWeight: 500,
          lineHeight: '20px',
          color: '#172B4D',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {activity.title}
        </div>
        <div style={{
          fontSize: '12px',
          fontWeight: 400,
          lineHeight: '16px',
          color: '#6B778C',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {activity.key} • {activity.projectName}
        </div>
      </div>

      {/* METADATA */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        flexShrink: 0,
      }}>
        <span style={{
          fontSize: '12px',
          color: '#6B778C',
        }}>
          {activity.action === 'created' ? 'Created' : 'Updated'}
        </span>
        <Avatar
          size="xsmall"
          name="User"
        />
      </div>
    </a>
  );
}
