// =====================================================
// PROJECT DIRECTORY PAGE - BUILD_UNIT_2.1 SPEC COMPLIANT
// Enhanced with Grid/List view toggle - Phase 2
// =====================================================

import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  Search, Plus, Star, MoreHorizontal, Archive, 
  Settings, Eye, Lock, Users 
} from 'lucide-react';
import { CreateProjectDialog } from '@/components/projects/CreateProjectDialog';
import { ProjectCard } from '@/components/projects/ProjectCard';
import { ViewToggle, type ViewMode } from '@/components/projects/ViewToggle';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useProjects, useArchiveProject } from '@/hooks/useProjects';
import { PROJECT_TYPE_CONFIG, PROJECT_COLORS, type ProjectType } from '@/types/project';

const VIEW_STORAGE_KEY = 'catalyst-project-directory-view';

export default function ProjectDirectory() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [starredProjects, setStarredProjects] = useState<Set<string>>(() => {
    const stored = localStorage.getItem('catalyst-starred-projects');
    return stored ? new Set(JSON.parse(stored)) : new Set();
  });
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [filterProgramId, setFilterProgramId] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [showArchived, setShowArchived] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const stored = localStorage.getItem(VIEW_STORAGE_KEY);
    return (stored === 'grid' || stored === 'list') ? stored : 'list';
  });

  // Persist view mode
  useEffect(() => {
    localStorage.setItem(VIEW_STORAGE_KEY, viewMode);
  }, [viewMode]);

  // Fetch projects with filters
  const { data: projects = [], isLoading, error } = useProjects({
    search: searchQuery || undefined,
    program_id: filterProgramId !== 'all' ? filterProgramId : undefined,
    project_type: filterType !== 'all' ? (filterType as ProjectType) : undefined,
    is_archived: showArchived ? undefined : false,
  });

  // Fetch programs for filter dropdown
  const { data: programs } = useQuery({
    queryKey: ['programs-for-filter'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('programs')
        .select('id, name, key')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const archiveProject = useArchiveProject();

  // Sort: starred first, then by name
  const sortedProjects = useMemo(() => {
    return [...projects].sort((a, b) => {
      const aStarred = starredProjects.has(a.id);
      const bStarred = starredProjects.has(b.id);
      if (aStarred && !bStarred) return -1;
      if (!aStarred && bStarred) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [projects, starredProjects]);

  const toggleStar = (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setStarredProjects(prev => {
      const newSet = new Set(prev);
      if (newSet.has(projectId)) {
        newSet.delete(projectId);
      } else {
        newSet.add(projectId);
      }
      localStorage.setItem('catalyst-starred-projects', JSON.stringify([...newSet]));
      return newSet;
    });
  };

  const handleArchive = (projectId: string, archive: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
    archiveProject.mutate({ id: projectId, archive });
  };

  const getProjectColor = (project: { color?: string | null; id: string }) => {
    if (project.color) return project.color;
    const index = project.id.charCodeAt(0) % PROJECT_COLORS.length;
    return PROJECT_COLORS[index];
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  };

  if (error) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-lg font-medium text-foreground mb-2">Error loading projects</h2>
        <p className="text-muted-foreground">Please try again.</p>
      </div>
    );
  }

  return (
    <div className="p-6 px-10 bg-card min-h-screen">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-medium text-foreground">Projects</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {projects.length} project{projects.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} className="bg-[hsl(var(--brand-primary))] hover:bg-[hsl(var(--brand-primary-hover))]">
          <Plus className="w-4 h-4 mr-1" /> Create project
        </Button>
      </div>

      {/* FILTERS */}
      <div className="flex gap-3 mb-4 flex-wrap items-center">
        <div className="relative w-[280px]">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search projects"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={filterProgramId} onValueChange={setFilterProgramId}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All programs" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All programs</SelectItem>
            {programs?.map((program) => (
              <SelectItem key={program.id} value={program.id}>
                {program.name} ({program.key})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {Object.entries(PROJECT_TYPE_CONFIG).map(([key, config]) => (
              <SelectItem key={key} value={key}>
                {config.icon} {config.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant={showArchived ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => setShowArchived(!showArchived)}
          className="gap-2"
        >
          <Archive className="w-4 h-4" />
          {showArchived ? 'Showing archived' : 'Show archived'}
        </Button>
        
        {/* View Toggle - pushed to right */}
        <div className="ml-auto">
          <ViewToggle view={viewMode} onViewChange={setViewMode} />
        </div>
      </div>

      {/* CONTENT */}
      {isLoading ? (
        <div className="flex justify-center py-12">Loading...</div>
      ) : sortedProjects.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">No projects found</p>
          <Button onClick={() => setShowCreateDialog(true)}>Create project</Button>
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID VIEW */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {sortedProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              isStarred={starredProjects.has(project.id)}
              onToggleStar={(e) => toggleStar(project.id, e)}
              onArchive={(archive, e) => handleArchive(project.id, archive, e)}
            />
          ))}
        </div>
      ) : (
        /* LIST VIEW (TABLE) */
        <div className="border border-border rounded-lg overflow-hidden">
          <div className="grid grid-cols-[40px_1fr_90px_120px_180px_160px_50px] bg-muted px-3 py-2 text-[11px] font-semibold uppercase text-muted-foreground border-b border-border">
            <div></div>
            <div>Name</div>
            <div>Key</div>
            <div>Type</div>
            <div>Program</div>
            <div>Lead</div>
            <div></div>
          </div>
          {sortedProjects.map((project) => {
            const typeConfig = PROJECT_TYPE_CONFIG[project.project_type as ProjectType] || PROJECT_TYPE_CONFIG.basic;
            const isStarred = starredProjects.has(project.id);
            const bgColor = getProjectColor(project);

            return (
              <div
                key={project.id}
                onClick={() => navigate(`/projects/${project.id}/work`)}
                className={cn(
                  'grid grid-cols-[40px_1fr_90px_120px_180px_160px_50px] px-3 py-2.5 border-b border-border items-center cursor-pointer transition-colors',
                  project.is_archived ? 'bg-muted/50 opacity-75' : 'bg-card hover:bg-muted'
                )}
              >
                {/* Star */}
                <button
                  onClick={(e) => toggleStar(project.id, e)}
                  className="p-1 bg-transparent border-none cursor-pointer"
                >
                  <Star
                    className={cn(
                      'w-4 h-4 transition-colors',
                      isStarred ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground hover:text-yellow-400'
                    )}
                  />
                </button>

                {/* Name with avatar */}
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className="w-7 h-7 rounded flex items-center justify-center text-white text-xs font-medium flex-shrink-0"
                    style={{ backgroundColor: bgColor }}
                  >
                    {project.key?.slice(0, 2) || getInitials(project.name)}
                  </div>
                  <span className="text-sm font-medium text-foreground truncate">
                    {project.name}
                  </span>
                  {project.is_private && (
                    <Lock className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                  )}
                  {project.is_archived && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                      Archived
                    </Badge>
                  )}
                </div>

                {/* Key */}
                <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
                  {project.key}
                </code>

                {/* Type badge */}
                <div>
                  <Badge variant="outline" className="text-xs font-normal gap-1">
                    <span>{typeConfig.icon}</span>
                    {typeConfig.label}
                  </Badge>
                </div>

                {/* Program */}
                <span className="text-sm text-muted-foreground truncate">
                  {project.program?.name || 'No program'}
                </span>

                {/* Lead */}
                <div className="flex items-center gap-2">
                  {project.lead ? (
                    <>
                      <Avatar className="w-6 h-6">
                        <AvatarImage src={project.lead.avatar_url || undefined} />
                        <AvatarFallback className="text-[10px]">
                          {getInitials(project.lead.full_name || 'U')}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm text-muted-foreground truncate">
                        {project.lead.full_name || 'Unknown'}
                      </span>
                    </>
                  ) : (
                    <span className="text-sm text-muted-foreground">Unassigned</span>
                  )}
                </div>

                {/* Actions */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => navigate(`/projects/${project.id}/work`)}>
                      <Eye className="w-4 h-4 mr-2" />
                      View project
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate(`/projects/${project.id}/settings`)}>
                      <Settings className="w-4 h-4 mr-2" />
                      Settings
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate(`/projects/${project.id}/members`)}>
                      <Users className="w-4 h-4 mr-2" />
                      Members
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={(e) => handleArchive(project.id, !project.is_archived, e as any)}
                    >
                      <Archive className="w-4 h-4 mr-2" />
                      {project.is_archived ? 'Restore' : 'Archive'}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            );
          })}
        </div>
      )}

      <CreateProjectDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        defaultProgramId={filterProgramId !== 'all' ? filterProgramId : undefined}
      />
    </div>
  );
}
