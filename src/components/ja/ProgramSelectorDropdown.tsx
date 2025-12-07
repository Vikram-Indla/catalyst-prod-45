import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Search, Layers, Star } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useStarredItems } from '@/hooks/useStarredItems';

interface ProgramSelectorDropdownProps {
  onClose: () => void;
}

export function ProgramSelectorDropdown({ onClose }: ProgramSelectorDropdownProps) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const { isStarred, toggleStar } = useStarredItems();

  const { data: programs, isLoading } = useQuery({
    queryKey: ['programs-header'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('programs')
        .select(`
          id,
          name,
          portfolio_id,
          portfolios (
            name
          )
        `)
        .order('name');
      
      if (error) throw error;
      return data || [];
    },
  });

  const filtered = (programs || []).filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (programId: string) => {
    navigate(`/programs/${programId}/room`);
    onClose();
  };

  const handleToggleStar = async (e: React.MouseEvent, program: typeof filtered[0]) => {
    e.stopPropagation();
    await toggleStar({
      room_type: 'program',
      room_id: program.id,
      room_name: program.name,
      room_subtitle: program.portfolios?.name || 'Project',
      room_path: `/programs/${program.id}/room`,
      pi_label: null,
    });
  };

  return (
    <div className="w-80 bg-popover border rounded-md shadow-lg">
      <div className="p-3 border-b">
        <p className="text-xs font-semibold text-muted-foreground mb-2">PROJECTS</p>
        <div className="relative">
          <Input
            type="text"
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-8 h-9"
          />
          <Search className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        </div>
      </div>
      <ScrollArea className="max-h-80">
        <div className="p-2">
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
            </div>
          ) : filtered.length === 0 ? (
          <div className="px-3 py-8 text-center text-sm text-muted-foreground">
              {search ? 'No projects found' : 'No projects available'}
            </div>
          ) : (
            filtered.map((program) => {
              const starred = isStarred('program', program.id);
              return (
                <button
                  key={program.id}
                  onClick={() => handleSelect(program.id)}
                  className="w-full text-left px-3 py-2 rounded hover:bg-accent text-sm group"
                >
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{program.name}</div>
                      {program.portfolios && (
                        <div className="text-xs text-muted-foreground truncate">
                          {program.portfolios.name}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={(e) => handleToggleStar(e, program)}
                      className="p-1 rounded hover:bg-muted transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-brand-gold"
                      aria-label={starred ? "Unstar project" : "Star project"}
                    >
                      <Star
                        className={`h-4 w-4 ${
                          starred
                            ? "text-brand-gold fill-brand-gold"
                            : "text-muted-foreground hover:text-brand-gold"
                        }`}
                      />
                    </button>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}