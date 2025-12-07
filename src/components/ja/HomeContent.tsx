import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Star, Briefcase, GitBranch, Users, Target, Layers, Map, FileText } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRecentRooms } from "@/hooks/useRecentRooms";
import { useStarredItems } from "@/hooks/useStarredItems";
import { useActivityFeed } from "@/hooks/useActivityFeed";
import { ActivityFeed } from "./ActivityFeed";
import type { Database } from "@/integrations/supabase/types";

type RoomType = Database["public"]["Enums"]["room_type"];

const roomIcons: Record<string, React.ReactNode> = {
  program: <Briefcase className="h-3.5 w-3.5 text-workitem-feature" />,
  portfolio: <Layers className="h-3.5 w-3.5 text-brand-gold" />,
  team: <Users className="h-3.5 w-3.5 text-workitem-story" />,
  strategy: <FileText className="h-3.5 w-3.5 text-brand-gold" />,
  feature: <GitBranch className="h-3.5 w-3.5 text-workitem-theme" />,
  roadmap: <Map className="h-3.5 w-3.5 text-info" />,
  objective: <Target className="h-3.5 w-3.5 text-muted-foreground" />,
  product: <Briefcase className="h-3.5 w-3.5 text-brand-gold" />,
};

// Determine room type filter based on current route context
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

  // Compact loading skeleton
  const RoomCardSkeleton = () => (
    <div className="bg-card border border-border/40 rounded p-2.5 min-w-[140px]">
      <div className="flex items-center gap-2 mb-1.5">
        <Skeleton className="w-6 h-6 rounded" />
        <Skeleton className="w-2.5 h-2.5 rounded" />
      </div>
      <Skeleton className="h-3 w-3/4 mb-1" />
      <Skeleton className="h-2 w-1/2" />
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="px-6 py-5">
        {/* Recent Rooms Section */}
        <section className="mb-6">
          <h2 className="text-[13px] font-semibold text-foreground mb-3">Recent rooms</h2>

          {loadingRecent ? (
            <div className="flex gap-2.5 overflow-x-auto pb-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <RoomCardSkeleton key={i} />
              ))}
            </div>
          ) : recentRooms.length > 0 ? (
            <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-thin">
              {recentRooms.map((room) => (
                <div
                  key={room.id}
                  onClick={() => handleRoomClick(room)}
                  className="group relative bg-card border border-border/40 rounded hover:shadow-md hover:border-border transition-all cursor-pointer min-w-[140px] max-w-[160px] flex-shrink-0"
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
                    className="absolute top-1.5 right-1.5 z-10 p-0.5 hover:scale-110 transition-transform focus:outline-none focus:ring-1 focus:ring-brand-gold rounded"
                    aria-label={isStarred(room.room_type, room.room_id) ? "Unstar room" : "Star room"}
                  >
                    <Star
                      className={`h-2.5 w-2.5 ${
                        isStarred(room.room_type, room.room_id)
                          ? "text-brand-gold fill-brand-gold"
                          : "text-muted-foreground/50 hover:text-brand-gold"
                      }`}
                    />
                  </button>
                  <div className="p-2.5">
                    <div className="flex items-center justify-center w-6 h-6 bg-amber-50 dark:bg-amber-900/20 rounded mb-1.5">
                      {roomIcons[room.room_type] || <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />}
                    </div>
                    <h3 className="font-semibold text-[13px] mb-0.5 text-foreground group-hover:text-primary transition-colors line-clamp-1">
                      {room.room_name}
                    </h3>
                    <p className="text-[11px] text-muted-foreground line-clamp-1">{room.room_subtitle}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 bg-card border border-border/40 rounded">
              <FileText className="h-7 w-7 text-muted-foreground/50 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground mb-0.5">No recent rooms yet</p>
              <p className="text-[10px] text-muted-foreground/70">Start exploring by opening a room from the navigation</p>
            </div>
          )}
        </section>

        {/* Activity Feed Section */}
        <section>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ActivityTab)} className="w-full">
            <TabsList className="h-9 bg-transparent border-b border-border/40 w-full justify-start rounded-none p-0 gap-0">
              <TabsTrigger 
                value="worked"
                className="h-9 px-4 text-[13px] font-normal text-muted-foreground data-[state=active]:text-primary data-[state=active]:font-medium data-[state=active]:shadow-none rounded-none border-b-2 border-transparent data-[state=active]:border-primary bg-transparent"
              >
                Worked on
              </TabsTrigger>
              <TabsTrigger 
                value="viewed"
                className="h-9 px-4 text-[13px] font-normal text-muted-foreground data-[state=active]:text-primary data-[state=active]:font-medium data-[state=active]:shadow-none rounded-none border-b-2 border-transparent data-[state=active]:border-primary bg-transparent"
              >
                Viewed
              </TabsTrigger>
              <TabsTrigger 
                value="assigned"
                className="h-9 px-4 text-[13px] font-normal text-muted-foreground data-[state=active]:text-primary data-[state=active]:font-medium data-[state=active]:shadow-none rounded-none border-b-2 border-transparent data-[state=active]:border-primary bg-transparent"
              >
                Assigned to me
                {assignedCount > 0 && (
                  <span className="ml-1.5 text-[11px] bg-muted text-muted-foreground rounded px-1.5 py-0.5">
                    {assignedCount > 99 ? "99+" : assignedCount}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger 
                value="starred"
                className="h-9 px-4 text-[13px] font-normal text-muted-foreground data-[state=active]:text-primary data-[state=active]:font-medium data-[state=active]:shadow-none rounded-none border-b-2 border-transparent data-[state=active]:border-primary bg-transparent"
              >
                Starred
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="mt-4">
            <ActivityFeed items={activityItems} loading={loadingActivity} />
          </div>
        </section>
      </div>
    </div>
  );
}
