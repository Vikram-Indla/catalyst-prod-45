import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
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

export function useStarredItems() {
  const [starredItems, setStarredItems] = useState<StarredItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchStarredItems = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("starred_items")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

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

      // Check if already starred
      const existing = starredItems.find(
        (s) => s.room_type === item.room_type && s.room_id === item.room_id
      );

      if (existing) {
        // Unstar
        const { error } = await supabase
          .from("starred_items")
          .delete()
          .eq("id", existing.id);

        if (error) throw error;

        toast({
          title: "Removed from starred",
          description: `${item.room_name} has been removed from your starred items.`,
        });
      } else {
        // Star
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

        toast({
          title: "Added to starred",
          description: `${item.room_name} has been added to your starred items.`,
        });
      }

      // Refresh list
      await fetchStarredItems();
    } catch (error) {
      console.error("Error toggling star:", error);
      toast({
        title: "Error",
        description: "Failed to update starred items.",
        variant: "destructive",
      });
    }
  };

  const isStarred = (roomType: RoomType, roomId: string) => {
    return starredItems.some(
      (item) => item.room_type === roomType && item.room_id === roomId
    );
  };

  useEffect(() => {
    fetchStarredItems();

    // Set up realtime subscription
    const channel = supabase
      .channel("starred-items-changes")
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
  }, []);

  return { starredItems, loading, toggleStar, isStarred, refetch: fetchStarredItems };
}
