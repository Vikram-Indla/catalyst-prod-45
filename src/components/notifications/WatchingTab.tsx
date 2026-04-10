/**
 * WatchingTab — Activity feed for watched issues
 * Light mode only.
 */
import { useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Eye, MessageSquare, ArrowRightLeft, UserCheck, ArrowUp, Paperclip } from "lucide-react";

// ── Helpers ────────────────────────────────────────
function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}

function dateBucket(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const weekAgo = new Date(today.getTime() - 7 * 86400000);
  if (d >= today) return "Today";
  if (d >= yesterday) return "Yesterday";
  if (d >= weekAgo) return "This week";
  return "Earlier";
}

const ACTIVITY_ICONS: Record<string, { icon: typeof MessageSquare; color: string }> = {
  comment_added: { icon: MessageSquare, color: "#2563EB" },
  status_changed: { icon: ArrowRightLeft, color: "#D97706" },
  assignee_changed: { icon: UserCheck, color: "#10B981" },
  priority_changed: { icon: ArrowUp, color: "#DC2626" },
  attachment_added: { icon: Paperclip, color: "#64748B" },
};

const ACTIVITY_LABELS: Record<string, string> = {
  comment_added: "added a comment",
  status_changed: "changed status",
  assignee_changed: "changed assignee",
  priority_changed: "changed priority",
  attachment_added: "added an attachment",
};

function StatusLozenge({ value }: { value: string }) {
  const lower = (value || "").toLowerCase();
  let bg = "#DFE1E6";
  let color = "#253858";
  if (lower.includes("progress") || lower.includes("review") || lower.includes("active")) {
    bg = "#DEEBFF"; color = "#0747A6";
  } else if (lower.includes("done") || lower.includes("approved") || lower.includes("complete") || lower.includes("closed")) {
    bg = "#E3FCEF"; color = "#006644";
  }
  return (
    <span style={{
      display: "inline-block", height: 20, lineHeight: "20px",
      fontSize: 11, fontWeight: 700, textTransform: "uppercase",
      letterSpacing: "0.03em", borderRadius: 3,
      padding: "0 6px", background: bg, color,
      fontFamily: "Inter, sans-serif",
    }}>
      {value}
    </span>
  );
}

// ── Initials ────────────────────────────────────────
function getInitials(name: string): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0]?.toUpperCase() || "?";
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

interface WatchActivity {
  id: string;
  issue_id: string;
  actor_id: string | null;
  activity_type: string;
  old_value: string | null;
  new_value: string | null;
  comment_body: string | null;
  created_at: string;
  issue_key?: string;
  summary?: string;
  issue_type?: string;
  actor_name?: string;
  actor_avatar?: string | null;
}

export default function WatchingTab() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: activities = [], isLoading } = useQuery({
    queryKey: ["watching-tab", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      // Get watched issue IDs
      const { data: watches } = await supabase
        .from("issue_watchers")
        .select("issue_id")
        .eq("user_id", user!.id);

      if (!watches?.length) return [];

      const issueIds = watches.map(w => w.issue_id);

      // Get activity for those issues
      const { data: acts } = await supabase
        .from("watch_activity")
        .select("*")
        .in("issue_id", issueIds)
        .order("created_at", { ascending: false })
        .limit(50);

      if (!acts?.length) return [];

      // Fetch issue details
      const uniqueIssueIds = [...new Set(acts.map(a => a.issue_id))];
      const { data: issues } = await supabase
        .from("catalyst_issues")
        .select("id, issue_key, title, issue_type")
        .in("id", uniqueIssueIds);

      const issueMap = new Map(issues?.map(i => [i.id, i]) ?? []);

      // Fetch actor profiles
      const uniqueActorIds = [...new Set(acts.map(a => a.actor_id).filter(Boolean))] as string[];
      const { data: profiles } = uniqueActorIds.length > 0
        ? await supabase.from("profiles").select("id, full_name, avatar_url").in("id", uniqueActorIds)
        : { data: [] };

      const profileMap = new Map(profiles?.map(p => [p.id, p]) ?? []);

      return acts.map(a => {
        const issue = issueMap.get(a.issue_id);
        const actor = a.actor_id ? profileMap.get(a.actor_id) : null;
        return {
          ...a,
          issue_key: issue?.issue_key ?? "—",
          summary: issue?.title ?? "",
          issue_type: issue?.issue_type ?? "Story",
          actor_name: actor?.full_name ?? "Unknown",
          actor_avatar: actor?.avatar_url ?? null,
        } as WatchActivity;
      });
    },
    staleTime: 30_000,
  });

  // Realtime subscription
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel("watch-activity-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "watch_activity" }, () => {
        queryClient.invalidateQueries({ queryKey: ["watching-tab"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id, queryClient]);

  // Group by date bucket
  const groups = useMemo(() => {
    const buckets: Record<string, WatchActivity[]> = {};
    const order = ["Today", "Yesterday", "This week", "Earlier"];
    for (const a of activities) {
      const bucket = dateBucket(a.created_at);
      if (!buckets[bucket]) buckets[bucket] = [];
      buckets[bucket].push(a);
    }
    return order.filter(b => buckets[b]?.length).map(b => ({ label: b, items: buckets[b]! }));
  }, [activities]);

  // Empty state
  if (!isLoading && activities.length === 0) {
    return (
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", padding: "48px 20px", gap: 12,
      }}>
        <Eye size={40} color="#CBD5E1" strokeWidth={1.2} />
        <span style={{ fontSize: 14, color: "#94A3B8", fontFamily: "Inter, sans-serif" }}>
          Nothing watched yet
        </span>
        <span style={{ fontSize: 12, color: "#CBD5E1", fontFamily: "Inter, sans-serif" }}>
          Use the 👁 icon on any issue to watch it
        </span>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div style={{ padding: 24, display: "flex", justifyContent: "center" }}>
        <div style={{
          width: 24, height: 24,
          border: "2.5px solid #E2E8F0", borderTopColor: "#2563EB",
          borderRadius: "50%", animation: "spin 0.7s linear infinite",
        }} />
      </div>
    );
  }

  return (
    <div>
      {groups.map(group => (
        <div key={group.label}>
          {/* Section header */}
          <div style={{
            position: "sticky", top: 0, zIndex: 10,
            background: "#F8FAFC", padding: "5px 14px",
            fontFamily: "Inter, sans-serif", fontSize: 10,
            fontWeight: 700, color: "#94A3B8",
            textTransform: "uppercase", letterSpacing: "0.04em",
          }}>
            {group.label}
          </div>

          {group.items.map(activity => {
            const actCfg = ACTIVITY_ICONS[activity.activity_type] ?? ACTIVITY_ICONS.comment_added;
            const ActIcon = actCfg.icon;

            return (
              <div
                key={activity.id}
                style={{
                  display: "flex", gap: 10, padding: "10px 14px",
                  minHeight: 52,
                  borderBottom: "0.75px solid #F1F5F9",
                  transition: "background 120ms",
                  cursor: "default",
                }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(37,99,235,0.03)"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              >
                {/* Activity type icon */}
                <div style={{ flexShrink: 0, marginTop: 2 }}>
                  <ActIcon size={16} color={actCfg.color} />
                </div>

                {/* Actor avatar */}
                <div style={{
                  width: 24, height: 24, borderRadius: "50%",
                  background: activity.actor_id ? "#DEEBFF" : "#E2E8F0",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                  fontSize: 10, fontWeight: 700,
                  fontFamily: "Inter, sans-serif",
                  color: activity.actor_id ? "#0747A6" : "#94A3B8",
                }}>
                  {getInitials(activity.actor_name ?? "")}
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, lineHeight: "16px" }}>
                    <span style={{ fontWeight: 600, color: "#1E293B" }}>{activity.actor_name}</span>
                    {" "}
                    <span style={{ color: "#64748B" }}>
                      {ACTIVITY_LABELS[activity.activity_type] ?? activity.activity_type}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, lineHeight: "16px", marginTop: 2 }}>
                    <span style={{
                      fontFamily: "JetBrains Mono, monospace",
                      fontSize: 10, color: "#2563EB",
                    }}>
                      {activity.issue_key}
                    </span>
                    <span style={{ color: "#94A3B8", margin: "0 4px" }}>·</span>
                    <span style={{
                      color: "#475569", overflow: "hidden",
                      textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {activity.summary}
                    </span>
                  </div>
                  {activity.activity_type === "comment_added" && activity.comment_body && (
                    <div style={{
                      fontSize: 11, color: "#64748B", fontStyle: "italic",
                      marginTop: 2, lineHeight: "16px",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      maxWidth: 280,
                    }}>
                      {activity.comment_body.slice(0, 80)}
                    </div>
                  )}
                </div>

                {/* Right side — time + status badge */}
                <div style={{
                  display: "flex", flexDirection: "column",
                  alignItems: "flex-end", gap: 4, flexShrink: 0,
                }}>
                  <span style={{
                    fontFamily: "JetBrains Mono, monospace",
                    fontSize: 10, color: "#94A3B8",
                  }}>
                    {relativeTime(activity.created_at)}
                  </span>
                  {activity.activity_type === "status_changed" && activity.new_value && (
                    <StatusLozenge value={activity.new_value} />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
