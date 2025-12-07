import { useNavigate, useLocation } from "react-router-dom";
import { Star, Briefcase, GitBranch, Users, Target, Layers, Map, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useRecentRooms } from "@/hooks/useRecentRooms";
import { useStarredItems } from "@/hooks/useStarredItems";
import type { Database } from "@/integrations/supabase/types";

type RoomType = Database["public"]["Enums"]["room_type"];

const roomIcons: Record<string, React.ReactNode> = {
  program: <Briefcase className="h-4 w-4 text-workitem-feature" />,
  portfolio: <Layers className="h-4 w-4 text-brand-gold" />,
  team: <Users className="h-4 w-4 text-workitem-story" />,
  strategy: <FileText className="h-4 w-4 text-brand-gold" />,
  feature: <GitBranch className="h-4 w-4 text-workitem-theme" />,
  roadmap: <Map className="h-4 w-4 text-info" />,
  objective: <Target className="h-4 w-4 text-muted-foreground" />,
  product: <Briefcase className="h-4 w-4 text-brand-gold" />,
};

// Determine room type filter based on current route context
function getRoomTypeFilter(pathname: string): RoomType | null {
  // If in Product context, only show product rooms
  if (pathname.includes('/product')) {
    return 'product' as RoomType;
  }
  // For other contexts, show all room types
  return null;
}

export function HomeContent() {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Determine if we need to filter by room type based on context
  const roomTypeFilter = getRoomTypeFilter(location.pathname);
  
  const { recentRooms, loading: loadingRecent, trackRoomAccess } = useRecentRooms({
    filterByRoomType: roomTypeFilter,
    limit: 16,
  });
  const { toggleStar, isStarred } = useStarredItems({
    filterByRoomType: roomTypeFilter,
    limit: 8,
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
    <div className="bg-card border border-border/40 rounded p-3">
      <div className="flex items-center gap-2 mb-2">
        <Skeleton className="w-7 h-7 rounded" />
        <Skeleton className="w-3 h-3 rounded" />
      </div>
      <Skeleton className="h-3 w-3/4 mb-1" />
      <Skeleton className="h-2.5 w-1/2" />
    </div>
  );

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="container mx-auto px-6 py-6 max-w-[1600px]">
        {/* Recent Rooms Section Only */}
        <section>
          <h2 className="text-base font-semibold text-foreground mb-4">Recent rooms</h2>

          {loadingRecent ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <RoomCardSkeleton key={i} />
              ))}
            </div>
          ) : recentRooms.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
              {recentRooms.map((room) => (
                <div
                  key={room.id}
                  onClick={() => handleRoomClick(room)}
                  className="group relative bg-card border border-border/40 rounded hover:shadow-md hover:border-border transition-all cursor-pointer"
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
                    className="absolute top-2 right-2 z-10 p-0.5 hover:scale-110 transition-transform focus:outline-none focus:ring-1 focus:ring-brand-gold rounded"
                    aria-label={isStarred(room.room_type, room.room_id) ? "Unstar room" : "Star room"}
                  >
                    <Star
                      className={`h-3 w-3 ${
                        isStarred(room.room_type, room.room_id)
                          ? "text-brand-gold fill-brand-gold"
                          : "text-muted-foreground/50 hover:text-brand-gold"
                      }`}
                    />
                  </button>
                  <div className="p-3">
                    <div className="flex items-center justify-center w-7 h-7 bg-primary/5 dark:bg-primary/10 rounded mb-2">
                      {roomIcons[room.room_type] || <Briefcase className="h-4 w-4 text-muted-foreground" />}
                    </div>
                    <h3 className="font-medium text-xs mb-0.5 text-foreground group-hover:text-primary transition-colors line-clamp-1">
                      {room.room_name}
                    </h3>
                    <p className="text-[10px] text-muted-foreground line-clamp-1">{room.room_subtitle}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 bg-card border border-border/40 rounded">
              <FileText className="h-8 w-8 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-xs text-muted-foreground mb-1">No recent rooms yet</p>
              <p className="text-[10px] text-muted-foreground/70">Start exploring by opening a room from the navigation</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}