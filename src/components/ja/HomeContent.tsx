import { useNavigate } from "react-router-dom";
import { Star, Briefcase, GitBranch, Users, Target, Layers, Map, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

type RoomType = "program" | "portfolio" | "team" | "strategy" | "feature" | "roadmap" | "objective" | "product";

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
  program: <Briefcase className="h-8 w-8 text-cyan-500" />,
  portfolio: <Layers className="h-8 w-8 text-blue-500" />,
  team: <Users className="h-8 w-8 text-cyan-500" />,
  strategy: <FileText className="h-8 w-8 text-blue-500" />,
  feature: <GitBranch className="h-8 w-8 text-purple-500" />,
  roadmap: <Map className="h-8 w-8 text-cyan-500" />,
  objective: <Target className="h-8 w-8 text-gray-500" />,
  product: <Briefcase className="h-8 w-8 text-blue-500" />,
};

export function HomeContent() {
  const navigate = useNavigate();

  // Mock data for Jira Align home page
  const recentRooms: Room[] = [
    {
      id: "mobile",
      title: "Mobile",
      subtitle: "Program",
      type: "program",
      pi: "PI-5",
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
      type: "product",
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
    <div className="min-h-screen bg-muted/30">
      <div className="container mx-auto px-8 py-10 max-w-[1600px]">
        {/* Recent Rooms Section */}
        <section className="mb-16">
          <h2 className="text-xl font-semibold text-foreground mb-6">Recent rooms</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
            {recentRooms.map((room) => (
              <div
                key={room.id}
                onClick={() => navigate(room.path)}
                className="group relative bg-card border border-border/40 rounded-md hover:shadow-lg hover:border-border transition-all cursor-pointer"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-5">
                    <div className="flex items-center justify-center w-14 h-14 bg-cyan-50 dark:bg-cyan-950/20 rounded">
                      {roomIcons[room.type]}
                    </div>
                  </div>
                  <h3 className="font-semibold text-base mb-1.5 text-foreground group-hover:text-primary transition-colors">
                    {room.title}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-3">{room.subtitle}</p>
                  {room.pi && (
                    <p className="text-sm text-muted-foreground font-medium">{room.pi}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Starred Section */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-foreground">Starred</h2>
            <Button
              variant="link"
              className="text-primary hover:text-primary/80 px-0 h-auto"
              onClick={() => navigate("/starred")}
            >
              View all
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
            {starredRooms.map((room) => (
              <div
                key={room.id}
                onClick={() => navigate(room.path)}
                className="group relative bg-card border border-border/40 rounded-md hover:shadow-lg hover:border-border transition-all cursor-pointer"
              >
                <div className="absolute top-4 right-4 z-10">
                  <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                </div>
                <div className="p-6">
                  <div className="flex items-start justify-between mb-5">
                    <div className="flex items-center justify-center w-14 h-14 bg-cyan-50 dark:bg-cyan-950/20 rounded">
                      {roomIcons[room.type]}
                    </div>
                  </div>
                  <h3 className="font-semibold text-base mb-1.5 text-foreground group-hover:text-primary transition-colors">
                    {room.title}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-3">{room.subtitle}</p>
                  {room.pi && (
                    <p className="text-sm text-muted-foreground font-medium">{room.pi}</p>
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
