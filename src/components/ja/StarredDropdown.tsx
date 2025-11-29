import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Star, Briefcase, GitBranch, Users, Target, Map, FileText, Layers } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useStarredItems } from "@/hooks/useStarredItems";

interface StarredDropdownProps {
  onClose: () => void;
}

type RoomType = "program" | "portfolio" | "team" | "strategy" | "feature" | "roadmap" | "objective" | "product";

const roomIcons: Record<RoomType, React.ReactNode> = {
  program: <Briefcase className="h-5 w-5 text-workitem-feature" />,
  portfolio: <Layers className="h-5 w-5 text-brand-gold" />,
  team: <Users className="h-5 w-5 text-workitem-story" />,
  strategy: <FileText className="h-5 w-5 text-brand-gold" />,
  feature: <GitBranch className="h-5 w-5 text-workitem-theme" />,
  roadmap: <Map className="h-5 w-5 text-info" />,
  objective: <Target className="h-5 w-5 text-muted-foreground" />,
  product: <Briefcase className="h-5 w-5 text-brand-gold" />,
};

export function StarredDropdown({ onClose }: StarredDropdownProps) {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const { starredItems, loading } = useStarredItems();

  const filteredItems = starredItems.filter(
    (item) =>
      item.room_name.toLowerCase().includes(search.toLowerCase()) ||
      (item.room_subtitle && item.room_subtitle.toLowerCase().includes(search.toLowerCase()))
  );

  const handleSelect = (path: string) => {
    navigate(path);
    onClose();
  };

  return (
    <div className="w-[400px] bg-popover border border-border rounded-md shadow-lg">
      <div className="p-3 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search starred pages..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 bg-background"
          />
        </div>
      </div>

      <ScrollArea className="h-[320px]">
        <div className="p-2">
          {loading ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              Loading...
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              No starred pages found
            </div>
          ) : (
            filteredItems.map((item) => (
              <div
                key={item.id}
                onClick={() => handleSelect(item.room_path)}
                className="flex items-start gap-3 p-3 rounded-md hover:bg-accent cursor-pointer transition-colors"
              >
                <div className="flex items-center justify-center w-10 h-10 bg-primary/5 dark:bg-primary/10 rounded flex-shrink-0">
                  {roomIcons[item.room_type as RoomType]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Star className="h-3.5 w-3.5 text-brand-gold fill-brand-gold flex-shrink-0" />
                    <h4 className="font-medium text-sm truncate">{item.room_name}</h4>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.room_subtitle}</p>
                  {item.pi_label && (
                    <p className="text-xs text-muted-foreground font-medium mt-1">{item.pi_label}</p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      <div className="p-3 border-t border-border">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-primary hover:text-primary hover:bg-primary/10"
          onClick={() => {
            navigate("/starred");
            onClose();
          }}
        >
          View all starred pages
        </Button>
      </div>
    </div>
  );
}
