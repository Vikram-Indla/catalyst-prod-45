import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Search, Layers, Star, Plus, Settings, X } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { useStarredItems } from '@/hooks/useStarredItems';
import { useCatalystContext } from '@/contexts/CatalystContext';
import { getProjectLandingRoute } from '@/lib/workspaceContext';

interface ProjectSelectorDropdownProps {
  onClose: () => void;
  onCreateClick?: () => void;
}

export function ProjectSelectorDropdown({ onClose, onCreateClick }: ProjectSelectorDropdownProps) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const { isStarred, toggleStar } = useStarredItems();
  const { programId, programName, setProgramId, setProjectId, setProgramName, setProjectName } = useCatalystContext();

  const { data: projects, isLoading } = useQuery({
    queryKey: ['projects-header', programId],
    queryFn: async () => {
      let query = supabase
        .from('programs')
        .select(`
          id,
          name,
          portfolio_id,
          portfolios (
            id,
            name
          )
        `)
        .order('name');
      
      // Filter by selected program if one is selected
      if (programId) {
        query = query.eq('portfolio_id', programId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data || [];
    },
  });

  const filtered = (projects || []).filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (project: typeof filtered[0]) => {
    // Set context: Project selected, also set its parent Program
    setProjectId(project.id);
    setProjectName(project.name);
    
    // Link to parent program
    if (project.portfolio_id && project.portfolios) {
      setProgramId(project.portfolio_id);
      setProgramName(project.portfolios.name);
    }
    
    // Navigate to Project landing route
    navigate(getProjectLandingRoute(project.id));
    onClose();
  };

  const handleToggleStar = async (e: React.MouseEvent, project: typeof filtered[0]) => {
    e.stopPropagation();
    await toggleStar({
      room_type: 'program',
      room_id: project.id,
      room_name: project.name,
      room_subtitle: project.portfolios?.name || 'Project',
      room_path: getProjectLandingRoute(project.id),
      pi_label: null,
    });
  };

  const handleCreateClick = () => {
    onClose();
    onCreateClick?.();
  };

  const handleManageClick = () => {
    navigate('/admin/programs');
    onClose();
  };

  const handleClearFilter = () => {
    setProgramId(null);
    setProgramName(null);
  };

  return (
    <div className="w-80 bg-popover border rounded-md shadow-lg">
      <div className="p-3 border-b">
        <p className="text-xs font-semibold text-muted-foreground mb-2">PROJECTS</p>
        
        {/* Show filter indicator when program is selected */}
        {programId && programName && (
          <div className="mb-2 flex items-center gap-2 px-2 py-1.5 bg-muted rounded text-xs">
            <span className="text-muted-foreground">Filtered by:</span>
            <span className="font-medium">{programName}</span>
            <button
              onClick={handleClearFilter}
              className="ml-auto p-0.5 hover:bg-background rounded"
              aria-label="Clear filter"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}
        
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
      <ScrollArea className="max-h-64">
        <div className="p-2">
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-3 py-8 text-center text-sm text-muted-foreground">
              {search ? 'No projects found' : programId ? 'No projects in this program' : 'No projects available'}
            </div>
          ) : (
            filtered.map((project) => {
              const starred = isStarred('program', project.id);
              return (
                <button
                  key={project.id}
                  onClick={() => handleSelect(project)}
                  className="w-full text-left px-3 py-2 rounded hover:bg-accent text-sm group"
                >
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{project.name}</div>
                      {project.portfolios && (
                        <div className="text-xs text-muted-foreground truncate">
                          {project.portfolios.name}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={(e) => handleToggleStar(e, project)}
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
      
      {/* Bottom Actions */}
      <div className="border-t">
        <div className="p-2 space-y-1">
          <button
            onClick={handleCreateClick}
            className="w-full text-left px-3 py-2 rounded hover:bg-accent text-sm flex items-center gap-2 text-brand-gold font-medium"
          >
            <Plus className="h-4 w-4" />
            Create Project
          </button>
          <Separator className="my-1" />
          <button
            onClick={handleManageClick}
            className="w-full text-left px-3 py-2 rounded hover:bg-accent text-sm flex items-center gap-2 text-muted-foreground"
          >
            <Settings className="h-4 w-4" />
            Manage Projects
          </button>
        </div>
      </div>
    </div>
  );
}
