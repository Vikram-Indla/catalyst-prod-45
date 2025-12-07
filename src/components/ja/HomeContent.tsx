import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Star, Briefcase, GitBranch, Users, Target, Layers, Map, FileText } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useRecentRooms } from "@/hooks/useRecentRooms";
import { useStarredItems } from "@/hooks/useStarredItems";
import { useActivityFeed } from "@/hooks/useActivityFeed";
import { ActivityFeed } from "./ActivityFeed";
import type { Database } from "@/integrations/supabase/types";
import "./for-you.css";

type RoomType = Database["public"]["Enums"]["room_type"];

const roomIcons: Record<string, React.ReactNode> = {
  program: <Briefcase className="h-3.5 w-3.5 text-amber-600" />,
  portfolio: <Layers className="h-3.5 w-3.5 text-brand-gold" />,
  team: <Users className="h-3.5 w-3.5 text-emerald-600" />,
  strategy: <FileText className="h-3.5 w-3.5 text-brand-gold" />,
  feature: <GitBranch className="h-3.5 w-3.5 text-purple-600" />,
  roadmap: <Map className="h-3.5 w-3.5 text-blue-600" />,
  objective: <Target className="h-3.5 w-3.5 text-gray-500" />,
  product: <Briefcase className="h-3.5 w-3.5 text-brand-gold" />,
};

const roomIconBg: Record<string, string> = {
  program: "bg-amber-100",
  portfolio: "bg-amber-50",
  team: "bg-emerald-100",
  strategy: "bg-amber-50",
  feature: "bg-purple-100",
  roadmap: "bg-blue-100",
  objective: "bg-gray-100",
  product: "bg-amber-50",
};

function getRoomTypeFilter(pathname: string): RoomType | null {
  if (pathname.includes('/product')) {
    return 'product' as RoomType;
  }
  return null;
}

type ActivityTab = "worked" | "viewed" | "assigned" | "starred";

export function HomeContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<ActivityTab>("worked");
  
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
    tab: activeTab,
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

  const RoomCardSkeleton = () => (
    <div className="room-card">
      <Skeleton className="w-7 h-7 rounded mb-2" />
      <Skeleton className="h-3.5 w-3/4 mb-1" />
      <Skeleton className="h-2.5 w-1/2" />
    </div>
  );

  return (
    <div className="catalyst-for-you min-h-screen">
      <div className="px-5 py-4">
        {/* Recent Rooms Section */}
        <section className="mb-5">
          <h2 className="section-header">Recent rooms</h2>

          {loadingRecent ? (
            <div className="rooms-scroll">
              {Array.from({ length: 8 }).map((_, i) => (
                <RoomCardSkeleton key={i} />
              ))}
            </div>
          ) : recentRooms.length > 0 ? (
            <div className="rooms-scroll">
              {recentRooms.map((room) => (
                <div
                  key={room.id}
                  onClick={() => handleRoomClick(room)}
                  className="room-card"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleRoomClick(room);
                    }
                  }}
                >
                  <button
                    onClick={(e) => handleToggleStar(room, e)}
                    className="room-card-star focus:outline-none focus:ring-1 focus:ring-brand-gold rounded"
                    aria-label={isStarred(room.room_type, room.room_id) ? "Unstar room" : "Star room"}
                  >
                    <Star
                      className={`h-3 w-3 ${
                        isStarred(room.room_type, room.room_id)
                          ? "text-brand-gold fill-brand-gold"
                          : "text-gray-400 hover:text-brand-gold"
                      }`}
                    />
                  </button>
                  <div className={`room-card-icon ${roomIconBg[room.room_type] || "bg-gray-100"}`}>
                    {roomIcons[room.room_type] || <Briefcase className="h-3.5 w-3.5 text-gray-500" />}
                  </div>
                  <h3 className="room-card-title">{room.room_name}</h3>
                  <p className="room-card-subtitle">{room.room_subtitle}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <FileText className="h-8 w-8 empty-state-icon mx-auto" />
              <p className="empty-state-title">No recent rooms yet</p>
              <p className="empty-state-subtitle">Start exploring by opening a room from the navigation</p>
            </div>
          )}
        </section>

        {/* Activity Feed Section */}
        <section>
          {/* Tabs */}
          <div className="tabs-list flex items-center">
            <button
              onClick={() => setActiveTab("worked")}
              className="tab-trigger"
              data-state={activeTab === "worked" ? "active" : "inactive"}
            >
              Worked on
            </button>
            <button
              onClick={() => setActiveTab("viewed")}
              className="tab-trigger"
              data-state={activeTab === "viewed" ? "active" : "inactive"}
            >
              Viewed
            </button>
            <button
              onClick={() => setActiveTab("assigned")}
              className="tab-trigger"
              data-state={activeTab === "assigned" ? "active" : "inactive"}
            >
              Assigned to me
              {assignedCount > 0 && (
                <span className="tab-badge">
                  {assignedCount > 99 ? "99+" : assignedCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("starred")}
              className="tab-trigger"
              data-state={activeTab === "starred" ? "active" : "inactive"}
            >
              Starred
            </button>
          </div>

          <div className="mt-3">
            <ActivityFeed items={activityItems} loading={loadingActivity} />
          </div>
        </section>
      </div>
    </div>
  );
}
