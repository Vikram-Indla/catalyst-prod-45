import { useMemo } from "react";
import { Briefcase, GitBranch, BookOpen, FileText } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { catalystToast } from "@/lib/catalystToast";
import type { ActivityItem, ActivityType } from "@/hooks/useActivityFeed";

interface ActivityFeedProps {
  items: ActivityItem[];
  loading: boolean;
}

const typeConfig: Record<ActivityType, { icon: React.ElementType; bgClass: string; iconClass: string }> = {
  epic: { icon: Briefcase, bgClass: "bg-purple-100", iconClass: "text-purple-700" },
  feature: { icon: GitBranch, bgClass: "bg-amber-100", iconClass: "text-amber-700" },
  story: { icon: BookOpen, bgClass: "bg-emerald-100", iconClass: "text-emerald-700" },
  demand: { icon: FileText, bgClass: "bg-blue-100", iconClass: "text-blue-700" },
};

const avatarColors = ["#C69C6D", "#5243AA", "#00875A", "#0052CC", "#FF5630"];

function getTimeGroup(date: Date): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const lastMonth = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
  
  const itemDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  
  if (itemDate >= today) return "TODAY";
  if (itemDate >= yesterday) return "YESTERDAY";
  if (itemDate >= lastWeek) return "IN THE LAST WEEK";
  if (itemDate >= lastMonth) return "IN THE LAST MONTH";
  return "OLDER";
}

function FeedRow({ item }: { item: ActivityItem }) {
  const config = typeConfig[item.type] || typeConfig.demand;
  const Icon = config.icon;
  const avatarColor = avatarColors[item.id.charCodeAt(0) % avatarColors.length];

  const handleClick = () => {
    catalystToast.info("Opened", `Opened ${item.key}`);
  };

  return (
    <div
      onClick={handleClick}
      className="feed-row"
      tabIndex={0}
      role="button"
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      {/* Icon */}
      <div className={`feed-row-icon ${config.bgClass}`}>
        <Icon className={`h-3 w-3 ${config.iconClass}`} />
      </div>

      {/* Content */}
      <div className="feed-row-content">
        <p className="feed-row-title">{item.title}</p>
        <p className="feed-row-meta">{item.key} • {item.projectName}</p>
      </div>

      {/* Right column - action + avatar */}
      <div className="feed-row-right">
        <span className="feed-row-action">{item.action}</span>
        <div className="avatar-cluster">
          <div 
            className="avatar" 
            style={{ backgroundColor: avatarColor }}
            title="User"
          >
            U
          </div>
        </div>
      </div>
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="feed-row" style={{ cursor: "default" }}>
      <Skeleton className="w-5 h-5 rounded mr-2.5" />
      <div className="feed-row-content">
        <Skeleton className="h-3.5 w-3/4 mb-1" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      <Skeleton className="w-16 h-3" />
    </div>
  );
}

function GroupHeader({ label }: { label: string }) {
  return (
    <div className="feed-group-header">
      {label}
    </div>
  );
}

export function ActivityFeed({ items, loading }: ActivityFeedProps) {
  const groupedItems = useMemo(() => {
    const groups: Record<string, ActivityItem[]> = {};
    const groupOrder = ["TODAY", "YESTERDAY", "IN THE LAST WEEK", "IN THE LAST MONTH", "OLDER"];
    
    items.forEach((item) => {
      const group = getTimeGroup(new Date(item.updatedAt));
      if (!groups[group]) groups[group] = [];
      groups[group].push(item);
    });

    return groupOrder
      .filter((group) => groups[group]?.length > 0)
      .map((group) => ({ label: group, items: groups[group] }));
  }, [items]);

  if (loading) {
    return (
      <div className="feed-container">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonRow key={i} />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="empty-state">
        <FileText className="h-8 w-8 empty-state-icon mx-auto" />
        <p className="empty-state-title">No activity found</p>
        <p className="empty-state-subtitle">Your activity will appear here</p>
      </div>
    );
  }

  return (
    <div className="feed-container">
      {groupedItems.map((group) => (
        <div key={group.label}>
          <GroupHeader label={group.label} />
          {group.items.map((item) => (
            <FeedRow key={item.id} item={item} />
          ))}
        </div>
      ))}
    </div>
  );
}
