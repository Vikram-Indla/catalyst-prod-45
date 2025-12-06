import { useNavigate, useLocation } from "react-router-dom";
import { Star, Briefcase, GitBranch, Users, Target, Layers, Map, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useRecentRooms } from "@/hooks/useRecentRooms";
import { useStarredItems } from "@/hooks/useStarredItems";
import type { Database } from "@/integrations/supabase/types";

type RoomType = Database["public"]["Enums"]["room_type"];

const roomIcons: Record<string, React.ReactNode> = {
  program: <Briefcase className="h-8 w-8 text-workitem-feature" />,
  portfolio: <Layers className="h-8 w-8 text-brand-gold" />,
  team: <Users className="h-8 w-8 text-workitem-story" />,
  strategy: <FileText className="h-8 w-8 text-brand-gold" />,
  feature: <GitBranch className="h-8 w-8 text-workitem-theme" />,
  roadmap: <Map className="h-8 w-8 text-info" />,
  objective: <Target className="h-8 w-8 text-muted-foreground" />,
  product: <Briefcase className="h-8 w-8 text-brand-gold" />,
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
    limit: 8,
  });
  const { starredItems, loading: loadingStarred, toggleStar, isStarred } = useStarredItems({
    filterByRoomType: roomTypeFilter,
    limit: 8,
  });

  const handleRoomClick = async (room: typeof recentRooms[0] | typeof starredItems[0]) => {
    // Track access for recent rooms
    if ('last_accessed_at' in room) {
      await trackRoomAccess(
        room.room_type,
        room.room_id,
        room.room_name,
        room.room_subtitle,
        room.room_path,
        room.pi_label
      );
    }
    
    // Navigate to room
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

  // Loading skeleton component
  const RoomCardSkeleton = () => (
    <div className="bg-card border border-border/40 rounded-md p-6">
      <div className="flex items-start justify-between mb-5">
        <Skeleton className="w-14 h-14 rounded" />
        <Skeleton className="w-5 h-5 rounded" />
      </div>
      <Skeleton className="h-5 w-3/4 mb-2" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  );

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="container mx-auto px-8 py-10 max-w-[1600px]">
        {/* Recent Rooms Section */}
        <section className="mb-16">
          <h2 className="text-xl font-semibold text-foreground mb-6">Recent rooms</h2>

          {loadingRecent ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
              {Array.from({ length: 4 }).map((_, i) => (
                <RoomCardSkeleton key={i} />
              ))}
            </div>
          ) : recentRooms.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
              {recentRooms.map((room) => (
                <div
                  key={room.id}
                  onClick={() => handleRoomClick(room)}
                  className="group relative bg-card border border-border/40 rounded-md hover:shadow-lg hover:border-border transition-all cursor-pointer"
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
                    className="absolute top-4 right-4 z-10 p-1 hover:scale-110 transition-transform focus:outline-none focus:ring-2 focus:ring-brand-gold focus:ring-offset-2 rounded"
                    aria-label={isStarred(room.room_type, room.room_id) ? "Unstar room" : "Star room"}
                  >
                    <Star
                      className={`h-5 w-5 ${
                        isStarred(room.room_type, room.room_id)
                          ? "text-brand-gold fill-brand-gold"
                          : "text-muted-foreground hover:text-brand-gold"
                      }`}
                    />
                  </button>
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-5">
                      <div className="flex items-center justify-center w-14 h-14 bg-primary/5 dark:bg-primary/10 rounded">
                        {roomIcons[room.room_type] || <Briefcase className="h-8 w-8 text-muted-foreground" />}
                      </div>
                    </div>
                    <h3 className="font-semibold text-base mb-1.5 text-foreground group-hover:text-primary transition-colors">
                      {room.room_name}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-3">{room.room_subtitle}</p>
                    {room.pi_label && (
                      <p className="text-sm text-muted-foreground font-medium">{room.pi_label}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-card border border-border/40 rounded-md">
              <FileText className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
              <p className="text-sm text-muted-foreground mb-2">No recent rooms yet</p>
              <p className="text-xs text-muted-foreground/70">Start exploring by opening a room from the navigation</p>
            </div>
          )}
        </section>

        {/* Starred Section */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-foreground">Starred</h2>
            {starredItems.length >= 8 && (
              <Button
                variant="link"
                className="text-primary hover:text-primary/80 px-0 h-auto"
                onClick={() => navigate("/starred")}
              >
                View all
              </Button>
            )}
          </div>

          {loadingStarred ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
              {Array.from({ length: 4 }).map((_, i) => (
                <RoomCardSkeleton key={i} />
              ))}
            </div>
          ) : starredItems.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
              {starredItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleRoomClick(item)}
                  className="group relative bg-card border border-border/40 rounded-md hover:shadow-lg hover:border-border transition-all cursor-pointer"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleRoomClick(item);
                    }
                  }}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleStar({
                        room_type: item.room_type,
                        room_id: item.room_id,
                        room_name: item.room_name,
                        room_subtitle: item.room_subtitle,
                        room_path: item.room_path,
                        pi_label: item.pi_label,
                      });
                    }}
                    className="absolute top-4 right-4 z-10 p-1 hover:scale-110 transition-transform focus:outline-none focus:ring-2 focus:ring-brand-gold focus:ring-offset-2 rounded"
                    aria-label="Unstar room"
                  >
                    <Star className="h-5 w-5 text-brand-gold fill-brand-gold" />
                  </button>
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-5">
                      <div className="flex items-center justify-center w-14 h-14 bg-primary/5 dark:bg-primary/10 rounded">
                        {roomIcons[item.room_type] || <Briefcase className="h-8 w-8 text-muted-foreground" />}
                      </div>
                    </div>
                    <h3 className="font-semibold text-base mb-1.5 text-foreground group-hover:text-primary transition-colors">
                      {item.room_name}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-3">{item.room_subtitle}</p>
                    {item.pi_label && (
                      <p className="text-sm text-muted-foreground font-medium">{item.pi_label}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-card border border-border/40 rounded-md">
              <Star className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
              <p className="text-sm text-muted-foreground mb-2">No starred rooms yet</p>
              <p className="text-xs text-muted-foreground/70">Click the star icon on any room to add it here</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}