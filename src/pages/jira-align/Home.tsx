import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Layers, Target, FolderKanban, Star } from 'lucide-react';

const recentRooms = [
  { name: 'Mobile', type: 'Program', pi: 'PI-5', icon: Layers },
  { name: 'Geekbooks 2023 Snapshot', type: 'Strategy', pi: '', icon: Target },
  { name: 'Geekbooks Online Services', type: 'Portfolio', pi: 'PI.1', icon: FolderKanban },
  { name: 'Geekbooks Online Services', type: 'Portfolio', pi: 'PI.1', icon: FolderKanban },
  { name: 'Geekbooks Online Services', type: 'Program', pi: 'PI.1', icon: Layers }
];

const starredPages = [
  { name: 'Product Room (Labs)', subtitle: 'Product - Check Scanning App', pi: 'PI-5', icon: FolderKanban },
  { name: 'Objective tree', subtitle: 'Program - Website Services', pi: 'PI.1', icon: Target },
  { name: 'Roadmaps', subtitle: 'Portfolio - Geekbooks Online Services', pi: '', icon: Layers },
  { name: 'Features', subtitle: 'Program - Website Services', pi: '', icon: Layers },
  { name: 'Program Room', subtitle: 'Program - Website Services', pi: '', icon: Layers }
];

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="max-w-7xl mx-auto p-8">
      {/* Recent Rooms */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-6 text-foreground">Recent rooms</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {recentRooms.map((room, idx) => (
            <Card
              key={idx}
              className="p-4 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate('/portfolio-room')}
            >
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <room.icon className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm mb-1 truncate">{room.name}</h3>
                  <p className="text-xs text-muted-foreground">{room.type}</p>
                  {room.pi && (
                    <span className="inline-block mt-2 px-2 py-0.5 bg-muted rounded text-xs">
                      {room.pi}
                    </span>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Starred */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold text-foreground">Starred</h2>
          <button className="text-sm text-primary hover:underline">View all</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {starredPages.map((page, idx) => (
            <Card key={idx} className="p-4 cursor-pointer hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded bg-accent/50 flex items-center justify-center flex-shrink-0">
                  <page.icon className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-medium text-sm mb-1">{page.name}</h3>
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400 flex-shrink-0" />
                  </div>
                  <p className="text-xs text-muted-foreground">{page.subtitle}</p>
                  {page.pi && (
                    <span className="inline-block mt-2 px-2 py-0.5 bg-muted rounded text-xs">
                      {page.pi}
                    </span>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
