import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type RoomType = Database["public"]["Enums"]["room_type"];

export interface RecentRoom {
  id: string;
  room_type: RoomType;
  room_id: string;
  room_name: string;
  room_subtitle: string | null;
  room_path: string;
  pi_label: string | null;
  last_accessed_at: string;
  access_count: number;
}

interface UseRecentRoomsOptions {
  filterByRoomType?: RoomType | null;
  limit?: number;
}

export function useRecentRooms(options: UseRecentRoomsOptions = {}) {
  const { filterByRoomType = null, limit = 10 } = options;
  const [recentRooms, setRecentRooms] = useState<RecentRoom[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRecentRooms = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let query = supabase
        .from("recent_activity")
        .select("*")
        .eq("user_id", user.id)
        .order("last_accessed_at", { ascending: false })
        .limit(limit);

      // Apply room type filter if specified
      if (filterByRoomType) {
        query = query.eq("room_type", filterByRoomType);
      }

      const { data, error } = await query;

      if (error) throw error;
      setRecentRooms(data || []);
    } catch (error) {
      console.error("Error fetching recent rooms:", error);
    } finally {
      setLoading(false);
    }
  };

  const trackRoomAccess = async (
    roomType: string,
    roomId: string,
    roomName: string,
    roomSubtitle: string | null,
    roomPath: string,
    piLabel: string | null = null
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.rpc("track_room_access", {
        p_user_id: user.id,
        p_room_type: roomType as RoomType,
        p_room_id: roomId,
        p_room_name: roomName,
        p_room_subtitle: roomSubtitle,
        p_room_path: roomPath,
        p_pi_label: piLabel,
      });

      if (error) throw error;
      await fetchRecentRooms();
    } catch (error) {
      console.error("Error tracking room access:", error);
    }
  };

  useEffect(() => {
    fetchRecentRooms();

    // Set up realtime subscription
    const channel = supabase
      .channel("recent-activity-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "recent_activity",
        },
        () => {
          fetchRecentRooms();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [filterByRoomType, limit]);

  return { recentRooms, loading, trackRoomAccess, refetch: fetchRecentRooms };
}
