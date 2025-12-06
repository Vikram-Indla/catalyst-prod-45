import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type RoomType = Database["public"]["Enums"]["room_type"];

interface TrackRecentPlaceOptions {
  roomType: RoomType;
  roomId: string;
  roomName: string;
  roomSubtitle?: string | null;
  pageKey?: string;
  piLabel?: string | null;
  timeboxType?: string | null;
  timeboxId?: string | null;
}

/**
 * Hook to automatically track room/page visits for Recent Rooms functionality.
 * Matches Jira Align behavior: UPSERT by (user_id, room_type, room_id, page_key)
 * so revisiting with different PI updates the existing entry (no duplicates).
 */
export function useTrackRecentPlace(options: TrackRecentPlaceOptions | null) {
  const location = useLocation();
  const lastTrackedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!options) return;

    const {
      roomType,
      roomId,
      roomName,
      roomSubtitle = null,
      pageKey = "room",
      piLabel = null,
      timeboxType = null,
      timeboxId = null,
    } = options;

    // Generate a tracking key to avoid duplicate calls for the same navigation
    const trackingKey = `${roomType}-${roomId}-${pageKey}-${location.pathname}`;
    
    // Skip if we already tracked this exact navigation
    if (lastTrackedRef.current === trackingKey) {
      return;
    }

    const trackAccess = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Build the target URL (current path + search params)
        const targetUrl = location.pathname + location.search;

        const { error } = await supabase.rpc("track_room_access", {
          p_user_id: user.id,
          p_room_type: roomType,
          p_room_id: roomId,
          p_room_name: roomName,
          p_room_subtitle: roomSubtitle,
          p_room_path: targetUrl,
          p_pi_label: piLabel,
          p_page_key: pageKey,
          p_timebox_type: timeboxType,
          p_timebox_id: timeboxId,
        });

        if (error) {
          console.error("Error tracking room access:", error);
        } else {
          lastTrackedRef.current = trackingKey;
        }
      } catch (error) {
        console.error("Error tracking room access:", error);
      }
    };

    trackAccess();
  }, [options, location.pathname, location.search]);
}

/**
 * Utility function to track room access imperatively (for navigation handlers)
 */
export async function trackRecentPlace(options: TrackRecentPlaceOptions & { targetUrl?: string }) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const {
      roomType,
      roomId,
      roomName,
      roomSubtitle = null,
      pageKey = "room",
      piLabel = null,
      timeboxType = null,
      timeboxId = null,
      targetUrl = "",
    } = options;

    const { error } = await supabase.rpc("track_room_access", {
      p_user_id: user.id,
      p_room_type: roomType,
      p_room_id: roomId,
      p_room_name: roomName,
      p_room_subtitle: roomSubtitle,
      p_room_path: targetUrl,
      p_pi_label: piLabel,
      p_page_key: pageKey,
      p_timebox_type: timeboxType,
      p_timebox_id: timeboxId,
    });

    if (error) {
      console.error("Error tracking room access:", error);
    }
  } catch (error) {
    console.error("Error tracking room access:", error);
  }
}
