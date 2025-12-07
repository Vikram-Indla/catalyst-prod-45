import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ActivityType = "epic" | "feature" | "story" | "demand";

export interface ActivityItem {
  id: string;
  type: ActivityType;
  key: string;
  title: string;
  projectName: string;
  updatedAt: string;
  createdAt: string;
  ownerId: string | null;
  createdBy: string | null;
  action: "created" | "updated";
}

interface UseActivityFeedOptions {
  tab: "worked" | "viewed" | "assigned" | "starred";
  limit?: number;
  offset?: number;
}

export function useActivityFeed(options: UseActivityFeedOptions) {
  const { tab, limit = 20, offset = 0 } = options;
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [assignedCount, setAssignedCount] = useState(0);

  const fetchActivityItems = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setItems([]);
        setLoading(false);
        return;
      }

      let allItems: ActivityItem[] = [];

      if (tab === "worked" || tab === "viewed") {
        // Get recent activity (rooms user has accessed)
        const { data: recentData } = await supabase
          .from("recent_activity")
          .select("*")
          .eq("user_id", user.id)
          .order("last_accessed_at", { ascending: false })
          .range(offset, offset + limit - 1);

        if (recentData) {
          allItems = recentData.map((item) => ({
            id: item.id,
            type: (item.room_type === "program" ? "feature" : item.room_type) as ActivityType,
            key: item.room_id.substring(0, 8).toUpperCase(),
            title: item.room_name,
            projectName: item.room_subtitle || "Project",
            updatedAt: item.last_accessed_at,
            createdAt: item.last_accessed_at,
            ownerId: user.id,
            createdBy: user.id,
            action: "updated" as const,
          }));
        }
      } else if (tab === "assigned") {
        // Fetch items assigned to current user from multiple tables
        const [epicsRes, featuresRes, storiesRes, demandsRes] = await Promise.all([
          supabase
            .from("epics")
            .select("id, name, epic_key, updated_at, created_at, owner_id")
            .eq("owner_id", user.id)
            .order("updated_at", { ascending: false })
            .range(offset, offset + Math.floor(limit / 4)),
          supabase
            .from("features")
            .select("id, name, display_id, updated_at, created_at, owner_id")
            .eq("owner_id", user.id)
            .order("updated_at", { ascending: false })
            .range(offset, offset + Math.floor(limit / 4)),
          supabase
            .from("stories")
            .select("id, name, story_key, updated_at, created_at, owner_id")
            .eq("owner_id", user.id)
            .order("updated_at", { ascending: false })
            .range(offset, offset + Math.floor(limit / 4)),
          supabase
            .from("business_requests")
            .select("id, title, request_key, updated_at, created_at, assignee")
            .eq("assignee", user.id)
            .order("updated_at", { ascending: false })
            .range(offset, offset + Math.floor(limit / 4)),
        ]);

        // Map epics
        if (epicsRes.data) {
          allItems.push(...epicsRes.data.map((e) => ({
            id: e.id,
            type: "epic" as ActivityType,
            key: e.epic_key || e.id.substring(0, 8).toUpperCase(),
            title: e.name,
            projectName: "Epic",
            updatedAt: e.updated_at,
            createdAt: e.created_at,
            ownerId: e.owner_id,
            createdBy: null,
            action: (e.updated_at !== e.created_at ? "updated" : "created") as "created" | "updated",
          })));
        }

        // Map features
        if (featuresRes.data) {
          allItems.push(...featuresRes.data.map((f) => ({
            id: f.id,
            type: "feature" as ActivityType,
            key: f.display_id || f.id.substring(0, 8).toUpperCase(),
            title: f.name,
            projectName: "Feature",
            updatedAt: f.updated_at,
            createdAt: f.created_at,
            ownerId: f.owner_id,
            createdBy: null,
            action: (f.updated_at !== f.created_at ? "updated" : "created") as "created" | "updated",
          })));
        }

        // Map stories
        if (storiesRes.data) {
          allItems.push(...storiesRes.data.map((s) => ({
            id: s.id,
            type: "story" as ActivityType,
            key: s.story_key || s.id.substring(0, 8).toUpperCase(),
            title: s.name,
            projectName: "Story",
            updatedAt: s.updated_at,
            createdAt: s.created_at,
            ownerId: s.owner_id,
            createdBy: null,
            action: (s.updated_at !== s.created_at ? "updated" : "created") as "created" | "updated",
          })));
        }

        // Map demands
        if (demandsRes.data) {
          allItems.push(...demandsRes.data.map((d) => ({
            id: d.id,
            type: "demand" as ActivityType,
            key: d.request_key || d.id.substring(0, 8).toUpperCase(),
            title: d.title,
            projectName: "Demand",
            updatedAt: d.updated_at,
            createdAt: d.created_at,
            ownerId: null,
            createdBy: null,
            action: (d.updated_at !== d.created_at ? "updated" : "created") as "created" | "updated",
          })));
        }

        // Sort by updated_at
        allItems.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      } else if (tab === "starred") {
        // Get starred items
        const { data: starredData } = await supabase
          .from("starred_items")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .range(offset, offset + limit - 1);

        if (starredData) {
          allItems = starredData.map((item) => ({
            id: item.id,
            type: (item.room_type === "program" ? "feature" : item.room_type) as ActivityType,
            key: item.room_id.substring(0, 8).toUpperCase(),
            title: item.room_name,
            projectName: item.room_subtitle || "Project",
            updatedAt: item.created_at,
            createdAt: item.created_at,
            ownerId: null,
            createdBy: null,
            action: "created" as const,
          }));
        }
      }

      setItems(allItems);
      setHasMore(allItems.length >= limit);
    } catch (error) {
      console.error("Error fetching activity items:", error);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [tab, limit, offset]);

  // Fetch assigned count for badge
  const fetchAssignedCount = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [epicsCount, featuresCount, storiesCount, demandsCount] = await Promise.all([
        supabase.from("epics").select("id", { count: "exact", head: true }).eq("owner_id", user.id),
        supabase.from("features").select("id", { count: "exact", head: true }).eq("owner_id", user.id),
        supabase.from("stories").select("id", { count: "exact", head: true }).eq("owner_id", user.id),
        supabase.from("business_requests").select("id", { count: "exact", head: true }).eq("assignee", user.id),
      ]);

      const total = 
        (epicsCount.count || 0) + 
        (featuresCount.count || 0) + 
        (storiesCount.count || 0) + 
        (demandsCount.count || 0);
      
      setAssignedCount(total);
    } catch (error) {
      console.error("Error fetching assigned count:", error);
    }
  }, []);

  useEffect(() => {
    fetchActivityItems();
    fetchAssignedCount();
  }, [fetchActivityItems, fetchAssignedCount]);

  return { items, loading, hasMore, assignedCount, refetch: fetchActivityItems };
}
