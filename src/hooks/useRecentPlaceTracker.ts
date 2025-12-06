import { useEffect, useRef } from "react";
import { useLocation, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type RoomType = Database["public"]["Enums"]["room_type"];

interface RoomContext {
  roomType: RoomType;
  roomId: string;
  roomName: string;
  roomSubtitle: string | null;
  pageKey: string;
}

/**
 * Hook that automatically tracks recent place visits based on route navigation.
 * This runs in the shell and detects when user enters room pages.
 */
export function useRecentPlaceTracker() {
  const location = useLocation();
  const params = useParams<{ 
    programId?: string; 
    portfolioId?: string; 
    teamId?: string;
  }>();
  const lastTrackedRef = useRef<string | null>(null);

  // Fetch entity names for the current context
  const { data: program } = useQuery({
    queryKey: ["program-name", params.programId],
    queryFn: async () => {
      if (!params.programId) return null;
      const { data } = await supabase
        .from("programs")
        .select("id, name, portfolios(name)")
        .eq("id", params.programId)
        .single();
      return data;
    },
    enabled: !!params.programId,
  });

  const { data: portfolio } = useQuery({
    queryKey: ["portfolio-name", params.portfolioId],
    queryFn: async () => {
      if (!params.portfolioId) return null;
      const { data } = await supabase
        .from("portfolios")
        .select("id, name")
        .eq("id", params.portfolioId)
        .single();
      return data;
    },
    enabled: !!params.portfolioId,
  });

  const { data: team } = useQuery({
    queryKey: ["team-name", params.teamId],
    queryFn: async () => {
      if (!params.teamId) return null;
      const { data } = await supabase
        .from("teams")
        .select("id, name, program_id")
        .eq("id", params.teamId)
        .single();
      
      // Fetch program name separately if needed
      if (data?.program_id) {
        const { data: programData } = await supabase
          .from("programs")
          .select("name")
          .eq("id", data.program_id)
          .single();
        return { ...data, programName: programData?.name || null };
      }
      return { ...data, programName: null };
    },
    enabled: !!params.teamId,
  });

  // Fixed UUIDs for product room pages (deterministic based on page)
  const PRODUCT_ROOM_IDS = {
    "demand-summary": "00000000-0000-0000-0000-000000000001",
    "backlog": "00000000-0000-0000-0000-000000000002",
    "roadmaps": "00000000-0000-0000-0000-000000000003",
  } as const;

  // Determine room context from current route
  const getRoomContext = (): RoomContext | null => {
    const path = location.pathname;

    // Product Room pages
    if (path === "/industry/demand-summary") {
      return {
        roomType: "product" as RoomType,
        roomId: PRODUCT_ROOM_IDS["demand-summary"],
        roomName: "Product Room",
        roomSubtitle: "Demand Summary",
        pageKey: "demand-summary",
      };
    }
    if (path === "/industry") {
      return {
        roomType: "product" as RoomType,
        roomId: PRODUCT_ROOM_IDS["backlog"],
        roomName: "Product Room",
        roomSubtitle: "Backlog",
        pageKey: "backlog",
      };
    }
    if (path === "/industry/roadmaps") {
      return {
        roomType: "product" as RoomType,
        roomId: PRODUCT_ROOM_IDS["roadmaps"],
        roomName: "Product Room",
        roomSubtitle: "Roadmaps",
        pageKey: "roadmaps",
      };
    }

    // Portfolio Room pages
    if (params.portfolioId && portfolio) {
      const isRoomPage = path.includes("/room") || path.endsWith(`/portfolio/${params.portfolioId}`);
      if (isRoomPage) {
        return {
          roomType: "portfolio" as RoomType,
          roomId: params.portfolioId,
          roomName: portfolio.name,
          roomSubtitle: "Portfolio Room",
          pageKey: "room",
        };
      }
    }

    // Program Room pages
    if (params.programId && program) {
      const isRoomPage = path.includes("/room");
      if (isRoomPage) {
        return {
          roomType: "program" as RoomType,
          roomId: params.programId,
          roomName: program.name,
          roomSubtitle: program.portfolios?.name || "Program Room",
          pageKey: "room",
        };
      }
    }

    // Team Room pages
    if (params.teamId && team) {
      const isRoomPage = path.includes("/room");
      if (isRoomPage) {
        return {
          roomType: "team" as RoomType,
          roomId: params.teamId,
          roomName: team.name,
          roomSubtitle: team.programName || "Team Room",
          pageKey: "room",
        };
      }
    }

    return null;
  };

  useEffect(() => {
    const roomContext = getRoomContext();
    if (!roomContext) return;

    // Generate tracking key
    const trackingKey = `${roomContext.roomType}-${roomContext.roomId}-${roomContext.pageKey}`;
    
    // Skip if already tracked
    if (lastTrackedRef.current === trackingKey) return;

    const trackAccess = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const targetUrl = location.pathname + location.search;

        const { error } = await supabase.rpc("track_room_access", {
          p_user_id: user.id,
          p_room_type: roomContext.roomType,
          p_room_id: roomContext.roomId,
          p_room_name: roomContext.roomName,
          p_room_subtitle: roomContext.roomSubtitle,
          p_room_path: targetUrl,
          p_pi_label: null,
          p_page_key: roomContext.pageKey,
          p_timebox_type: null,
          p_timebox_id: null,
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
  }, [location.pathname, location.search, program, portfolio, team]);
}
