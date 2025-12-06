import { useState, useEffect, useId } from "react";
import { supabase } from "@/integrations/supabase/client";
import { catalystToast } from "@/lib/catalystToast";
import type { Database } from "@/integrations/supabase/types";

type RoomType = Database["public"]["Enums"]["room_type"];

export interface StarredItem {
  id: string;
  room_type: RoomType;
  room_id: string;
  room_name: string;
  room_subtitle: string | null;
  room_path: string;
  pi_label: string | null;
  created_at: string;
}

interface UseStarredItemsOptions {
  filterByRoomType?: RoomType | null;
  limit?: number;
}

export function useStarredItems(options: UseStarredItemsOptions = {}) {
  const { filterByRoomType = null, limit = 10 } = options;
  const [starredItems, setStarredItems] = useState<StarredItem[]>([]);
  const [loading, setLoading] = useState(true);
  const instanceId = useId(); // Unique ID for each hook instance

  const fetchStarredItems = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let query = supabase
        .from("starred_items")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      // Apply room type filter if specified
      if (filterByRoomType) {
        query = query.eq("room_type", filterByRoomType);
      }

      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query;

      if (error) throw error;
      setStarredItems(data || []);
    } catch (error) {
      console.error("Error fetching starred items:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleStar = async (item: Omit<StarredItem, "id" | "created_at">) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // CRITICAL: Query the database directly to check if starred
      // Do NOT rely on local starredItems array which may be limited
      const { data: existingData, error: checkError } = await supabase
        .from("starred_items")
        .select("id")
        .eq("user_id", user.id)
        .eq("room_type", item.room_type)
        .eq("room_id", item.room_id)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existingData) {
        // Unstar - item exists in database
        const { error } = await supabase
          .from("starred_items")
          .delete()
          .eq("id", existingData.id);

        if (error) throw error;

        catalystToast.info(
          "Removed from starred",
          `${item.room_name} has been removed from your starred items.`
        );
      } else {
        // Star - item does not exist in database
        const { error } = await supabase
          .from("starred_items")
          .insert([{
            user_id: user.id,
            room_type: item.room_type,
            room_id: item.room_id,
            room_name: item.room_name,
            room_subtitle: item.room_subtitle,
            room_path: item.room_path,
            pi_label: item.pi_label,
          }]);

        if (error) throw error;

        catalystToast.info(
          "Added to starred",
          `${item.room_name} has been added to your starred items.`
        );
      }

      // Refresh list
      await fetchStarredItems();
    } catch (error: any) {
      console.error("Error toggling star:", error);
      console.error("Error details:", error?.message, error?.details, error?.hint, error?.code);
      catalystToast.error(
        "Error",
        error?.message || "Failed to update starred items."
      );
    }
  };

  // Check if an item is starred - query database if not in local cache
  const isStarred = (roomType: RoomType, roomId: string) => {
    return starredItems.some(
      (item) => item.room_type === roomType && item.room_id === roomId
    );
  };

  useEffect(() => {
    fetchStarredItems();

    // Set up realtime subscription with unique channel name per instance
    const channel = supabase
      .channel(`starred-items-changes-${instanceId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "starred_items",
        },
        () => {
          fetchStarredItems();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [filterByRoomType, limit]);

  return { starredItems, loading, toggleStar, isStarred, refetch: fetchStarredItems };
}
