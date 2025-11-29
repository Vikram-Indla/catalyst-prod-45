import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Star, Briefcase, GitBranch, Users, Target, Layers, Map } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

type RoomType = "program" | "portfolio" | "team" | "strategy" | "feature" | "roadmap" | "objective";

interface Room {
  id: string;
  title: string;
  subtitle: string;
  type: RoomType;
  pi?: string;
  path: string;
  isStarred?: boolean;
}

const roomIcons: Record<RoomType, React.ReactNode> = {
  program: <Briefcase className="h-8 w-8 text-cyan-600" />,
  portfolio: <Layers className="h-8 w-8 text-blue-600" />,
  team: <Users className="h-8 w-8 text-cyan-600" />,
  strategy: <Target className="h-8 w-8 text-blue-500" />,
  feature: <GitBranch className="h-8 w-8 text-purple-600" />,
  roadmap: <Map className="h-8 w-8 text-cyan-600" />,
  objective: <Target className="h-8 w-8 text-gray-600" />,
};

export function HomeContent() {
  const navigate = useNavigate();
  const [selectedPortfolio] = useState<string>("all");

  // Mock data for Jira Align home page
  const recentRooms: Room[] = [
    {
      id: "mobile",
      title: "Mobile",
      subtitle: "Program",
      type: "program",
      pi: "PI 5",
      path: "/programs",
    },
    {
      id: "geekbooks-snapshot",
      title: "Geekbooks 2023 Snapshot",
      subtitle: "Strategy",
      type: "strategy",
      pi: "",
      path: "/enterprise/strategy-room",
    },
    {
      id: "geekbooks-1",
      title: "Geekbooks Online Services",
      subtitle: "Portfolio",
      type: "portfolio",
      pi: "PI 1",
      path: "/portfolio-room",
    },
    {
      id: "geekbooks-2",
      title: "Geekbooks Online Services",
      subtitle: "Portfolio",
      type: "portfolio",
      pi: "PI 1",
      path: "/portfolio-room",
    },
    {
      id: "geekbooks-3",
      title: "Geekbooks Online Services",
      subtitle: "Program",
      type: "program",
      pi: "PI 1",
      path: "/programs",
    },
  ];

  const starredRooms: Room[] = [
    {
      id: "star-product-room",
      title: "Product Room (Labs)",
      subtitle: "Product · Check Scanning App",
      type: "program",
      pi: "PI 5",
      path: "/programs",
      isStarred: true,
    },
    {
      id: "star-objective-tree",
      title: "Objective tree",
      subtitle: "Program · Website Services",
      type: "objective",
      pi: "PI 1",
      path: "/enterprise/okr-tree",
      isStarred: true,
    },
    {
      id: "star-roadmaps",
      title: "Roadmaps",
      subtitle: "Portfolio · Geekbooks Online Services",
      type: "roadmap",
      pi: "",
      path: "/roadmaps",
      isStarred: true,
    },
    {
      id: "star-features",
      title: "Features",
      subtitle: "Program · Website Services",
      type: "feature",
      pi: "",
      path: "/features",
      isStarred: true,
    },
    {
      id: "star-program-room",
      title: "Program Room",
      subtitle: "Program · Website Services",
      type: "program",
      pi: "",
      path: "/programs",
      isStarred: true,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-8 max-w-[1400px]">
        {/* Recent Rooms Section */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-foreground">Recent rooms</h2>
            
            <Select value={selectedPortfolio}>
              <SelectTrigger className="w-[280px] bg-background border-border">
                <SelectValue placeholder="Search to filter portfolios" />
              </SelectTrigger>
              <SelectContent className="bg-background border-border">
                <SelectItem value="all">All Portfolios</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {recentRooms.map((room) => (
              <div
                key={room.id}
                onClick={() => navigate(room.path)}
                className="group relative bg-card border border-border rounded-lg hover:shadow-md transition-all cursor-pointer"
              >
                <div className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center justify-center w-12 h-12 bg-cyan-50 dark:bg-cyan-950/20 rounded">
                      {roomIcons[room.type]}
                    </div>
                  </div>
                  <h3 className="font-semibold text-sm mb-1 text-foreground group-hover:text-primary transition-colors">
                    {room.title}
                  </h3>
                  <p className="text-xs text-muted-foreground mb-2">{room.subtitle}</p>
                  {room.pi && (
                    <p className="text-xs text-muted-foreground font-medium">{room.pi}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Starred Section */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-foreground">Starred</h2>
            <Button variant="link" className="text-primary hover:text-primary/80 px-0">
              View all
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {starredRooms.map((room) => (
              <div
                key={room.id}
                onClick={() => navigate(room.path)}
                className="group relative bg-card border border-border rounded-lg hover:shadow-md transition-all cursor-pointer"
              >
                <div className="absolute top-3 right-3 z-10">
                  <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                </div>
                <div className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center justify-center w-12 h-12 bg-cyan-50 dark:bg-cyan-950/20 rounded">
                      {roomIcons[room.type]}
                    </div>
                  </div>
                  <h3 className="font-semibold text-sm mb-1 text-foreground group-hover:text-primary transition-colors">
                    {room.title}
                  </h3>
                  <p className="text-xs text-muted-foreground mb-2">{room.subtitle}</p>
                  {room.pi && (
                    <p className="text-xs text-muted-foreground font-medium">{room.pi}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
