import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Star, Calendar, TrendingUp } from "lucide-react";

export function HomeContent() {
  const navigate = useNavigate();

  // Fetch default program and PI for proper navigation
  const { data: programs } = useQuery({
    queryKey: ['programs-for-nav'],
    queryFn: async () => {
      const { data } = await supabase.from('programs').select('id, name').order('name').limit(1);
      return data;
    },
  });

  const { data: programIncrements } = useQuery({
    queryKey: ['pis-for-nav'],
    queryFn: async () => {
      // Get PI-5 which has features properly distributed across teams and sprints
      const { data } = await supabase
        .from('program_increments')
        .select('id, name')
        .eq('id', '3e5ae5ed-8aa9-4211-9add-2031b0f6541b')
        .limit(1);
      return data;
    },
  });

  const handleProgramBoardClick = () => {
    const defaultProgram = programs?.[0]?.id;
    const defaultPI = programIncrements?.[0]?.id;
    
    // Only navigate if we have both values
    if (defaultProgram && defaultPI) {
      navigate(`/programs/program-board?program=${defaultProgram}&pi=${defaultPI}`);
    } else {
      // If data isn't loaded yet, just go to the route and let it load defaults
      navigate('/programs/program-board');
    }
  };

  const recentRooms = [
    {
      id: "1",
      title: "Enterprise Strategy",
      subtitle: "Strategic Planning",
      pi: "PI-24 Q1",
      icon: "🎯",
      path: "/enterprise/strategy-room",
    },
    {
      id: "2",
      title: "Epic Backlog",
      subtitle: "Portfolio Planning",
      pi: "PI-24 Q1",
      icon: "📊",
      path: "/items/epics",
    },
    {
      id: "3",
      title: "Program Board",
      subtitle: "PI Planning",
      pi: "PI-24 Q1",
      icon: "📋",
      onClick: handleProgramBoardClick,
    },
    {
      id: "4",
      title: "Team Velocity",
      subtitle: "Sprint Planning",
      pi: "Sprint 5",
      icon: "⚡",
      path: "/team-room",
    },
    {
      id: "5",
      title: "OKR Hub",
      subtitle: "Objectives & Key Results",
      pi: "Q1 2024",
      icon: "🎪",
      path: "/enterprise/okr-hub",
    },
  ];

  const starredRooms = [
    {
      id: "star-1",
      title: "Epic Backlog",
      subtitle: "Portfolio Planning",
      pi: "PI-24 Q1",
      icon: "📊",
      path: "/items/epics",
    },
  ];

  return (
    <div className="container mx-auto px-6 py-8 max-w-7xl">
      {/* Recent Rooms Section */}
      <section className="mb-12">
        <div className="flex items-center gap-2 mb-6">
          <Calendar className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-xl font-semibold">Recent rooms</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {recentRooms.map((room) => (
            <div
              key={room.id}
              onClick={() => room.onClick ? room.onClick() : navigate(room.path)}
              className="group bg-card rounded-lg border shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden"
            >
              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="text-3xl">{room.icon}</div>
                  <div className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                    {room.pi}
                  </div>
                </div>
                <h3 className="font-semibold text-sm mb-1 group-hover:text-primary transition-colors">
                  {room.title}
                </h3>
                <p className="text-xs text-muted-foreground">{room.subtitle}</p>
              </div>
              <div className="h-1 bg-gradient-to-r from-primary/20 to-primary/5 group-hover:from-primary/40 group-hover:to-primary/10 transition-all" />
            </div>
          ))}
        </div>
      </section>

      {/* Starred Section */}
      <section>
        <div className="flex items-center gap-2 mb-6">
          <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
          <h2 className="text-xl font-semibold">Starred</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {starredRooms.map((room) => (
            <div
              key={room.id}
              onClick={() => navigate(room.path)}
              className="group bg-card rounded-lg border shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden relative"
            >
              <div className="absolute top-2 right-2">
                <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="text-3xl">{room.icon}</div>
                  <div className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded mr-6">
                    {room.pi}
                  </div>
                </div>
                <h3 className="font-semibold text-sm mb-1 group-hover:text-primary transition-colors">
                  {room.title}
                </h3>
                <p className="text-xs text-muted-foreground">{room.subtitle}</p>
              </div>
              <div className="h-1 bg-gradient-to-r from-yellow-500/20 to-yellow-500/5 group-hover:from-yellow-500/40 group-hover:to-yellow-500/10 transition-all" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
