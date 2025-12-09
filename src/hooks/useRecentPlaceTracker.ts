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
  roomSubtitle: string;  // Shows the last visited page within the room
  pageKey: string;
  targetUrl: string;     // Clean deep link (no noisy params)
}

/**
 * Hook that automatically tracks recent place visits based on route navigation.
 * Implements Jira Align parity: one entry per room (roomType + entityId),
 * subtitle shows last visited page. No duplicates for same room.
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

  // Single fixed UUID for Product Room (all pages within Product Room share this)
  const PRODUCT_ROOM_ID = "00000000-0000-0000-0000-000000000001";

  /**
   * Derive page label from path for subtitle display.
   * Only top-level section/tab names, ignoring query params and transient states.
   */
  const getPageLabel = (path: string): { pageKey: string; label: string; cleanPath: string } => {
    // Product Room pages
    if (path === "/industry" || path === "/industry/") {
      return { pageKey: "backlog", label: "Backlog", cleanPath: "/industry" };
    }
    if (path === "/industry/roadmaps" || path.startsWith("/industry/roadmaps")) {
      return { pageKey: "roadmaps", label: "Roadmaps", cleanPath: "/industry/roadmaps" };
    }
    if (path.startsWith("/industry/risks")) {
      return { pageKey: "risks", label: "Risks", cleanPath: "/industry/risks" };
    }
    if (path.startsWith("/industry/milestones")) {
      return { pageKey: "milestones", label: "Milestones", cleanPath: "/industry/milestones" };
    }
    
    // Default for other pages within a room
    return { pageKey: "room", label: "Overview", cleanPath: path.split("?")[0] };
  };

  // Determine room context from current route
  const getRoomContext = (): RoomContext | null => {
    const path = location.pathname;

    // Product Room - ALL pages within Product use the SAME room_id
    if (path.startsWith("/industry")) {
      const { pageKey, label, cleanPath } = getPageLabel(path);
      return {
        roomType: "product" as RoomType,
        roomId: PRODUCT_ROOM_ID,
        roomName: "Product Room",
        roomSubtitle: label,
        pageKey: pageKey,
        targetUrl: cleanPath,
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
          targetUrl: `/portfolio/${params.portfolioId}/room`,
        };
      }
      // Other portfolio pages (backlog, roadmaps, etc.)
      if (path.includes("/backlog")) {
        return {
          roomType: "portfolio" as RoomType,
          roomId: params.portfolioId,
          roomName: portfolio.name,
          roomSubtitle: "Backlog",
          pageKey: "backlog",
          targetUrl: `/portfolio/${params.portfolioId}/backlog`,
        };
      }
      if (path.includes("/roadmaps")) {
        return {
          roomType: "portfolio" as RoomType,
          roomId: params.portfolioId,
          roomName: portfolio.name,
          roomSubtitle: "Roadmaps",
          pageKey: "roadmaps",
          targetUrl: `/portfolio/${params.portfolioId}/roadmaps`,
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
          targetUrl: `/programs/${params.programId}/room`,
        };
      }
      // Other program pages
      if (path.includes("/backlog")) {
        return {
          roomType: "program" as RoomType,
          roomId: params.programId,
          roomName: program.name,
          roomSubtitle: "Backlog",
          pageKey: "backlog",
          targetUrl: `/programs/${params.programId}/backlog`,
        };
      }
      if (path.includes("/dependencies")) {
        return {
          roomType: "program" as RoomType,
          roomId: params.programId,
          roomName: program.name,
          roomSubtitle: "Dependencies",
          pageKey: "dependencies",
          targetUrl: `/programs/${params.programId}/dependencies`,
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
          targetUrl: `/team/${params.teamId}/room`,
        };
      }
      // Other team pages
      if (path.includes("/backlog")) {
        return {
          roomType: "team" as RoomType,
          roomId: params.teamId,
          roomName: team.name,
          roomSubtitle: "Backlog",
          pageKey: "backlog",
          targetUrl: `/team/${params.teamId}/backlog`,
        };
      }
      if (path.includes("/stories")) {
        return {
          roomType: "team" as RoomType,
          roomId: params.teamId,
          roomName: team.name,
          roomSubtitle: "Stories",
          pageKey: "stories",
          targetUrl: `/team/${params.teamId}/stories`,
        };
      }
    }

    return null;
  };

  useEffect(() => {
    const roomContext = getRoomContext();
    if (!roomContext) return;

    // Generate tracking key at ROOM level (not page level)
    // This ensures we only track one entry per room
    const trackingKey = `${roomContext.roomType}:${roomContext.roomId}`;
    
    // Skip if we just tracked this room (but allow subtitle updates)
    // We want to update if it's the same room but different page
    const fullKey = `${trackingKey}:${roomContext.pageKey}`;
    if (lastTrackedRef.current === fullKey) return;

    const trackAccess = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { error } = await supabase.rpc("track_room_access", {
          p_user_id: user.id,
          p_room_type: roomContext.roomType,
          p_room_id: roomContext.roomId,
          p_room_name: roomContext.roomName,
          p_room_subtitle: roomContext.roomSubtitle,
          p_room_path: roomContext.targetUrl,  // Clean URL, no query params
          p_pi_label: null,
          p_page_key: roomContext.pageKey,
          p_timebox_type: null,
          p_timebox_id: null,
        });

        if (error) {
          console.error("Error tracking room access:", error);
        } else {
          lastTrackedRef.current = fullKey;
        }
      } catch (error) {
        console.error("Error tracking room access:", error);
      }
    };

    trackAccess();
  }, [location.pathname, program, portfolio, team]);
}
