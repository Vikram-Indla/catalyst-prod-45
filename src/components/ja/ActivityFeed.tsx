import { useMemo } from "react";
import { Briefcase, GitBranch, BookOpen, FileText, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { catalystToast } from "@/lib/catalystToast";
import type { ActivityItem, ActivityType } from "@/hooks/useActivityFeed";

interface ActivityFeedProps {
  items: ActivityItem[];
  loading: boolean;
}

const typeConfig: Record<ActivityType, { icon: React.ElementType; bgClass: string; textClass: string }> = {
  epic: { icon: Briefcase, bgClass: "bg-purple-100", textClass: "text-purple-700" },
  feature: { icon: GitBranch, bgClass: "bg-amber-100", textClass: "text-amber-700" },
  story: { icon: BookOpen, bgClass: "bg-emerald-100", textClass: "text-emerald-700" },
  demand: { icon: FileText, bgClass: "bg-blue-100", textClass: "text-blue-700" },
};

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

  const handleClick = () => {
    catalystToast.info("Opened", `Opened ${item.key}`);
  };

  return (
    <div
      onClick={handleClick}
      className="flex items-center px-4 py-1.5 border-b border-border/50 cursor-pointer hover:bg-muted/50 min-h-[44px] transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand-gold"
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
      <div className={`w-[22px] h-[22px] rounded flex items-center justify-center flex-shrink-0 mr-2.5 ${config.bgClass}`}>
        <Icon className={`h-3 w-3 ${config.textClass}`} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 mr-3">
        <p className="text-[13px] text-foreground truncate leading-tight">
          {item.title}
        </p>
        <p className="text-[11px] text-muted-foreground truncate">
          {item.key} · {item.projectName}
        </p>
      </div>

      {/* Action */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-[11px] text-muted-foreground capitalize">
          {item.action}
        </span>
        <div className="w-[22px] h-[22px] rounded-full bg-brand-gold text-white text-[9px] font-semibold flex items-center justify-center">
          U
        </div>
      </div>
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="flex items-center px-4 py-1.5 border-b border-border/50 min-h-[44px]">
      <Skeleton className="w-[22px] h-[22px] rounded mr-2.5" />
      <div className="flex-1 min-w-0 mr-3">
        <Skeleton className="h-3.5 w-3/4 mb-1" />
        <Skeleton className="h-2.5 w-1/2" />
      </div>
      <Skeleton className="w-16 h-3" />
    </div>
  );
}

function GroupHeader({ label }: { label: string }) {
  return (
    <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide px-4 py-2 bg-muted/50 border-b border-border/50">
      {label}
    </div>
  );
}

export function ActivityFeed({ items, loading }: ActivityFeedProps) {
  // Group items by time
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
      <div className="bg-card border border-border/40 rounded overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonRow key={i} />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="bg-card border border-border/40 rounded p-8 text-center">
        <FileText className="h-8 w-8 text-muted-foreground/50 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">No activity found</p>
        <p className="text-xs text-muted-foreground/70 mt-1">Your activity will appear here</p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border/40 rounded overflow-hidden">
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
