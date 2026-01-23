import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ChevronDown, 
  Plus, 
  Star, 
  Clock, 
  LayoutGrid,
  Loader2,
  FolderKanban
} from 'lucide-react';
import { useRecentProjects, useStarredProjects } from '@/hooks/useJiraNavigation';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface ProjectItemProps {
  project: {
    id: string;
    name: string;
    key: string;
    color: string | null;
  };
  onNavigate: () => void;
}

function ProjectItem({ project, onNavigate }: ProjectItemProps) {
  return (
    <DropdownMenuItem asChild className="cursor-pointer">
      <Link 
        to={`/projects/${project.key}/board`} 
        className="flex items-center gap-3 w-full"
        onClick={onNavigate}
      >
        <div 
          className="w-7 h-7 rounded-md flex items-center justify-center text-white text-xs font-semibold shrink-0"
          style={{ backgroundColor: project.color || 'hsl(var(--primary))' }}
        >
          {project.key.substring(0, 2).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{project.name}</p>
          <p className="text-xs text-muted-foreground">{project.key}</p>
        </div>
      </Link>
    </DropdownMenuItem>
  );
}

export function ProjectsDropdown() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  
  const { data: recentProjects, isLoading: recentLoading } = useRecentProjects();
  const { data: starredProjects, isLoading: starredLoading } = useStarredProjects();

  const isLoading = recentLoading || starredLoading;
  const hasStarred = starredProjects && starredProjects.length > 0;
  const hasRecent = recentProjects && recentProjects.length > 0;

  const handleNavigate = () => setOpen(false);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          className={cn(
            "flex items-center gap-1.5 font-medium text-muted-foreground hover:text-foreground",
            open && "bg-muted"
          )}
        >
          <FolderKanban className="w-4 h-4" />
          Projects
          <ChevronDown className={cn(
            "w-4 h-4 transition-transform duration-200",
            open && "rotate-180"
          )} />
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent 
        className="w-80" 
        align="start"
        sideOffset={8}
      >
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Starred Projects */}
            {hasStarred && (
              <>
                <DropdownMenuLabel className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                  Starred
                </DropdownMenuLabel>
                <DropdownMenuGroup>
                  {starredProjects.slice(0, 5).map((project) => (
                    <ProjectItem key={project.id} project={project} onNavigate={handleNavigate} />
                  ))}
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
              </>
            )}

            {/* Recent Projects */}
            <DropdownMenuLabel className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              <Clock className="w-3.5 h-3.5" />
              Recent
            </DropdownMenuLabel>
            <DropdownMenuGroup>
              {hasRecent ? (
                recentProjects.slice(0, 5).map((project) => (
                  <ProjectItem key={project.id} project={project} onNavigate={handleNavigate} />
                ))
              ) : (
                <div className="px-3 py-6 text-center">
                  <FolderKanban className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No recent projects</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    Projects you visit will appear here
                  </p>
                </div>
              )}
            </DropdownMenuGroup>

            <DropdownMenuSeparator />

            {/* Actions */}
            <DropdownMenuGroup>
              <DropdownMenuItem asChild className="cursor-pointer">
                <Link to="/projects" className="flex items-center gap-2" onClick={handleNavigate}>
                  <LayoutGrid className="w-4 h-4" />
                  <span>View all projects</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="cursor-pointer text-primary focus:text-primary focus:bg-primary/10"
                onClick={() => {
                  setOpen(false);
                  navigate('/projects/create');
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                <span>Create project</span>
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
