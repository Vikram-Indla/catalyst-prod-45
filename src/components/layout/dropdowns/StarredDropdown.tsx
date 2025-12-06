import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Search, Layers, Target, Map, Briefcase, Users, FileText, Box } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useStarredItems } from '@/hooks/useStarredItems';
import { Skeleton } from '@/components/ui/skeleton';

const roomIcons: Record<string, React.ElementType> = {
  program: Briefcase,
  portfolio: Layers,
  team: Users,
  strategy: FileText,
  roadmap: Map,
  objective: Target,
  product: Box,
};

interface StarredDropdownProps {
  onClose: () => void;
}

export function StarredDropdown({ onClose }: StarredDropdownProps) {
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const { starredItems, loading } = useStarredItems({ limit: 20 });

  const filtered = starredItems.filter(item =>
    item.room_name.toLowerCase().includes(search.toLowerCase()) ||
    (item.room_subtitle?.toLowerCase().includes(search.toLowerCase()))
  );

  const handleItemClick = (path: string) => {
    navigate(path);
    onClose();
  };

  return (
    <div className="absolute top-full left-0 mt-1 w-96 bg-popover border rounded-md shadow-lg z-50">
      <div className="p-3 border-b">
        <p className="text-xs font-semibold text-muted-foreground mb-2">STARRED</p>
        <div className="relative">
          <Input
            type="text"
            placeholder="Search by page title"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-8"
          />
          <Search className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        </div>
      </div>
      <ScrollArea className="max-h-96">
        <div className="p-2">
          {loading ? (
            <div className="space-y-2 p-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="w-8 h-8 rounded" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-32 mb-1" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length > 0 ? (
            filtered.map((item) => {
              const IconComponent = roomIcons[item.room_type] || Briefcase;
              return (
                <button
                  key={item.id}
                  onClick={() => handleItemClick(item.room_path)}
                  className="w-full flex items-start gap-3 px-3 py-2 rounded hover:bg-accent text-left"
                >
                  <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <IconComponent className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{item.room_name}</p>
                    <p className="text-xs text-muted-foreground">{item.room_subtitle}</p>
                  </div>
                  {item.pi_label && (
                    <span className="text-xs text-muted-foreground flex-shrink-0">{item.pi_label}</span>
                  )}
                </button>
              );
            })
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <p className="text-sm">No starred pages yet</p>
              <p className="text-xs mt-1">Click the star icon on any room to add it here</p>
            </div>
          )}
        </div>
      </ScrollArea>
      {starredItems.length > 0 && (
        <div className="p-3 border-t">
          <button 
            className="text-sm text-primary hover:underline"
            onClick={() => {
              navigate('/starred');
              onClose();
            }}
          >
            View all starred pages
          </button>
        </div>
      )}
    </div>
  );
}
