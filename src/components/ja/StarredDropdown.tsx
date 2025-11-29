import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Star, Briefcase, GitBranch, Users, Target, Map, FileText, Layers } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface StarredDropdownProps {
  onClose: () => void;
}

type RoomType = "program" | "portfolio" | "team" | "strategy" | "feature" | "roadmap" | "objective" | "product";

interface StarredItem {
  id: string;
  title: string;
  subtitle: string;
  type: RoomType;
  pi?: string;
  path: string;
}

const roomIcons: Record<RoomType, React.ReactNode> = {
  program: <Briefcase className="h-5 w-5 text-cyan-500" />,
  portfolio: <Layers className="h-5 w-5 text-blue-500" />,
  team: <Users className="h-5 w-5 text-cyan-500" />,
  strategy: <FileText className="h-5 w-5 text-blue-500" />,
  feature: <GitBranch className="h-5 w-5 text-purple-500" />,
  roadmap: <Map className="h-5 w-5 text-cyan-500" />,
  objective: <Target className="h-5 w-5 text-gray-500" />,
  product: <Briefcase className="h-5 w-5 text-blue-500" />,
};

export function StarredDropdown({ onClose }: StarredDropdownProps) {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const starredItems: StarredItem[] = [
    {
      id: "star-product-room",
      title: "Product Room (Labs)",
      subtitle: "Product · Check Scanning App",
      type: "product",
      pi: "PI 5",
      path: "/programs",
    },
    {
      id: "star-objective-tree",
      title: "Objective tree",
      subtitle: "Program · Website Services",
      type: "objective",
      pi: "PI 1",
      path: "/enterprise/okr-tree",
    },
    {
      id: "star-roadmaps",
      title: "Roadmaps",
      subtitle: "Portfolio · Geekbooks Online Services",
      type: "roadmap",
      path: "/roadmaps",
    },
    {
      id: "star-features",
      title: "Features",
      subtitle: "Program · Website Services",
      type: "feature",
      path: "/features",
    },
    {
      id: "star-program-room",
      title: "Program Room",
      subtitle: "Program · Website Services",
      type: "program",
      path: "/programs",
    },
  ];

  const filteredItems = starredItems.filter(
    (item) =>
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.subtitle.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (item: StarredItem) => {
    navigate(item.path);
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
          {filteredItems.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              No starred pages found
            </div>
          ) : (
            filteredItems.map((item) => (
              <div
                key={item.id}
                onClick={() => handleSelect(item)}
                className="flex items-start gap-3 p-3 rounded-md hover:bg-accent cursor-pointer transition-colors"
              >
                <div className="flex items-center justify-center w-10 h-10 bg-cyan-50 dark:bg-cyan-950/20 rounded flex-shrink-0">
                  {roomIcons[item.type]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500 flex-shrink-0" />
                    <h4 className="font-medium text-sm truncate">{item.title}</h4>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.subtitle}</p>
                  {item.pi && (
                    <p className="text-xs text-muted-foreground font-medium mt-1">{item.pi}</p>
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
