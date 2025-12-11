import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, Plus, Settings, LayoutGrid, Star, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useStarredItems } from '@/hooks/useStarredItems';
import { useCatalystContext } from '@/contexts/CatalystContext';
import { getProjectLandingRoute } from '@/lib/workspaceContext';
import { Input } from '@/components/ui/input';

interface ProjectSelectorDropdownProps {
  onClose: () => void;
  onCreateClick?: () => void;
}

export const ProjectSelectorDropdown = React.memo(function ProjectSelectorDropdown({ 
  onClose, 
  onCreateClick 
}: ProjectSelectorDropdownProps) {
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

  const handleSelect = useCallback((project: typeof filtered[0]) => {
    setProjectId(project.id);
    setProjectName(project.name);
    
    if (project.portfolio_id && project.portfolios) {
      setProgramId(project.portfolio_id);
      setProgramName(project.portfolios.name);
    }
    
    navigate(getProjectLandingRoute(project.id));
    onClose();
  }, [navigate, onClose, setProgramId, setProgramName, setProjectId, setProjectName]);

  const handleToggleStar = useCallback(async (e: React.MouseEvent, project: typeof filtered[0]) => {
    e.stopPropagation();
    await toggleStar({
      room_type: 'program',
      room_id: project.id,
      room_name: project.name,
      room_subtitle: project.portfolios?.name || 'Project',
      room_path: getProjectLandingRoute(project.id),
      pi_label: null,
    });
  }, [toggleStar]);

  const handleCreateClick = useCallback(() => {
    onClose();
    onCreateClick?.();
  }, [onClose, onCreateClick]);

  const handleManageClick = useCallback(() => {
    navigate('/admin/programs');
    onClose();
  }, [navigate, onClose]);

  const handleClearFilter = useCallback(() => {
    setProgramId(null);
    setProgramName(null);
  }, [setProgramId, setProgramName]);

  return (
    <div className="w-80 bg-popover border border-border rounded-md shadow-lg overflow-hidden z-[60]">
      <div className="p-3 border-b border-border">
        <p className="text-xs font-semibold text-muted-foreground mb-2">PROJECTS</p>
        
        {/* FILTER CHIP (if program selected) */}
        {programId && programName && (
          <div className="mb-2 flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Filtered by:</span>
            <span className="font-medium text-foreground">{programName}</span>
            <button
              onClick={handleClearFilter}
              className="p-0.5 hover:bg-accent rounded"
            >
              <X className="w-3 h-3 text-muted-foreground" />
            </button>
          </div>
        )}
        
        <div className="relative">
          <Input
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-8 h-9"
          />
          <Search className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        </div>
      </div>

      {/* PROJECTS LIST */}
      <div className="max-h-[300px] overflow-y-auto">
        {isLoading ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            Loading...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            {search ? 'No projects found' : programId ? 'No projects in this program' : 'No projects available'}
          </div>
        ) : (
          filtered.map((project) => (
            <ProjectListItem
              key={project.id}
              project={project}
              isStarred={isStarred('program', project.id)}
              onSelect={handleSelect}
              onToggleStar={handleToggleStar}
            />
          ))
        )}
      </div>

      {/* FOOTER */}
      <div className="border-t border-border">
        <DropdownActionButton onClick={handleCreateClick}>
          <Plus className="w-4 h-4 text-muted-foreground" />
          Create Project
        </DropdownActionButton>
        
        <DropdownActionButton onClick={handleManageClick}>
          <Settings className="w-4 h-4 text-muted-foreground" />
          Manage Projects
        </DropdownActionButton>
      </div>
    </div>
  );
});

// Memoized list item component
interface ProjectListItemProps {
  project: {
    id: string;
    name: string;
    portfolio_id: string | null;
    portfolios: { id: string; name: string } | null;
  };
  isStarred: boolean;
  onSelect: (project: any) => void;
  onToggleStar: (e: React.MouseEvent, project: any) => void;
}

const ProjectListItem = React.memo(function ProjectListItem({ 
  project, 
  isStarred, 
  onSelect, 
  onToggleStar 
}: ProjectListItemProps) {
  const handleClick = useCallback(() => {
    onSelect(project);
  }, [project, onSelect]);

  const handleStarClick = useCallback((e: React.MouseEvent) => {
    onToggleStar(e, project);
  }, [project, onToggleStar]);

  return (
    <div
      className="flex items-center gap-2 px-4 py-2 transition-colors cursor-pointer hover:bg-muted"
      onClick={handleClick}
    >
      <LayoutGrid className="w-5 h-5 text-muted-foreground" />
      <div className="flex-1 min-w-0">
        <div className="text-sm text-foreground truncate">
          {project.name}
        </div>
        {project.portfolios && (
          <div className="text-xs text-muted-foreground truncate">
            {project.portfolios.name}
          </div>
        )}
      </div>
      <button
        onClick={handleStarClick}
        className="bg-transparent border-none cursor-pointer p-1 flex items-center"
      >
        <Star 
          className={`w-4 h-4 ${isStarred ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`}
        />
      </button>
    </div>
  );
});

// Action button component
interface DropdownActionButtonProps {
  onClick: () => void;
  children: React.ReactNode;
}

const DropdownActionButton = React.memo(function DropdownActionButton({ 
  onClick, 
  children 
}: DropdownActionButtonProps) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 w-full px-4 py-2 text-sm text-foreground bg-transparent border-none cursor-pointer text-left transition-colors hover:bg-muted"
    >
      {children}
    </button>
  );
});