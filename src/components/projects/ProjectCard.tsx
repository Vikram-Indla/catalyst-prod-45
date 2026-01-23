// =====================================================
// PROJECT CARD - Grid View Component
// Phase 2 Execution Package - BUILD_UNIT_2.1
// =====================================================

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, Lock, MoreHorizontal, Archive, Settings, Eye, Users } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { PROJECT_TYPE_CONFIG, PROJECT_COLORS, type ProjectType } from '@/types/project';
import type { Project } from '@/types/project';

interface ProjectCardProps {
  project: Project;
  isStarred: boolean;
  onToggleStar: (e: React.MouseEvent) => void;
  onArchive: (archive: boolean, e: React.MouseEvent) => void;
}

export function ProjectCard({ project, isStarred, onToggleStar, onArchive }: ProjectCardProps) {
  const navigate = useNavigate();
  const typeConfig = PROJECT_TYPE_CONFIG[project.project_type as ProjectType] || PROJECT_TYPE_CONFIG.basic;

  const getProjectColor = () => {
    if (project.color) return project.color;
    const index = project.id.charCodeAt(0) % PROJECT_COLORS.length;
    return PROJECT_COLORS[index];
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  };

  const bgColor = getProjectColor();

  return (
    <div
      onClick={() => navigate(`/projects/${project.id}/work`)}
      className={cn(
        'group relative rounded-lg border-2 bg-card p-4 transition-all cursor-pointer',
        'hover:shadow-md hover:border-[hsl(var(--brand-primary))]/40',
        project.is_archived 
          ? 'opacity-70 border-border bg-muted/50' 
          : 'border-border'
      )}
    >
      {/* Color accent bar */}
      <div 
        className="absolute top-0 left-0 right-0 h-1 rounded-t-md" 
        style={{ backgroundColor: bgColor }}
      />

      {/* Header row */}
      <div className="flex items-start justify-between mb-3 pt-1">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div
            className="w-9 h-9 rounded-md flex items-center justify-center text-white text-sm font-semibold flex-shrink-0"
            style={{ backgroundColor: bgColor }}
          >
            {project.key?.slice(0, 2) || getInitials(project.name)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-semibold text-foreground truncate">
                {project.name}
              </h3>
              {project.is_private && (
                <Lock className="w-3 h-3 text-muted-foreground flex-shrink-0" />
              )}
            </div>
            <code className="text-xs text-muted-foreground font-mono">{project.key}</code>
          </div>
        </div>

        {/* Star & Actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={onToggleStar}
            className="p-1.5 rounded hover:bg-muted transition-colors bg-transparent border-none cursor-pointer"
          >
            <Star
              className={cn(
                'w-4 h-4 transition-colors',
                isStarred ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground hover:text-yellow-400'
              )}
            />
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
              >
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
              <DropdownMenuItem onClick={(e) => onArchive(!project.is_archived, e as any)}>
                <Archive className="w-4 h-4 mr-2" />
                {project.is_archived ? 'Restore' : 'Archive'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Description */}
      {project.description && (
        <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
          {project.description}
        </p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-border">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px] font-normal gap-1 px-1.5 py-0">
            <span>{typeConfig.icon}</span>
            {typeConfig.label}
          </Badge>
          {project.is_archived && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              Archived
            </Badge>
          )}
        </div>

        {/* Lead avatar */}
        {project.lead ? (
          <Avatar className="w-6 h-6">
            <AvatarImage src={project.lead.avatar_url || undefined} />
            <AvatarFallback className="text-[10px] bg-muted">
              {getInitials(project.lead.full_name || 'U')}
            </AvatarFallback>
          </Avatar>
        ) : (
          <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
            <span className="text-[9px] text-muted-foreground">—</span>
          </div>
        )}
      </div>
    </div>
  );
}
