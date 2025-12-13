/**
 * Project Selector Dropdown - Revamped for Catalyst Menu
 * Shows: Projects filtered by selected program
 * Format: "Project Name (PROGRAM_KEY)"
 * Admin-only: Create Project, Manage Projects
 * Clicking navigates to Project Backlog
 */
import React, { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Settings, LayoutGrid, Lock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useWorkspaceAccess } from '@/hooks/useWorkspaceAccess';
import { useCatalystContext } from '@/contexts/CatalystContext';
import { cn } from '@/lib/utils';

interface ProjectSelectorDropdownProps {
  onClose: () => void;
  onCreateClick?: () => void;
}

export const ProjectSelectorDropdown = React.memo(function ProjectSelectorDropdown({ 
  onClose, 
  onCreateClick 
}: ProjectSelectorDropdownProps) {
  const navigate = useNavigate();
  const { programs, projects, projectsLoading, isAdmin } = useWorkspaceAccess();
  const { programId, setProgramId, setProjectId, setProgramName, setProjectName } = useCatalystContext();
  const [search, setSearch] = useState('');

  // Filter projects by selected program (if any), then apply search
  const filteredProjects = projects
    .filter(p => !programId || p.programId === programId)
    .filter(p => 
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.key.toLowerCase().includes(search.toLowerCase())
    )
    .map(p => {
      // Find parent program for display
      const parentProgram = programs.find(prog => prog.id === p.programId);
      const programKey = parentProgram?.key || '';
      return { ...p, programKey, programName: parentProgram?.name || '' };
    });

  const handleSelect = useCallback((project: typeof filteredProjects[0]) => {
    if (!project.canAccess) return;
    
    setProjectId(project.id);
    setProjectName(project.name);
    
    if (project.programId && project.programName) {
      setProgramId(project.programId);
      setProgramName(project.programName);
    }
    
    // Navigate to Project Backlog as default
    navigate(`/project/${project.id}/backlog`);
    onClose();
  }, [navigate, onClose, setProgramId, setProgramName, setProjectId, setProjectName]);

  const handleCreate = useCallback(() => {
    onClose();
    onCreateClick?.();
  }, [onClose, onCreateClick]);

  const handleManage = useCallback(() => {
    navigate('/admin/programs');
    onClose();
  }, [navigate, onClose]);

  return (
    <div className="w-80 bg-popover border border-border rounded-md shadow-md overflow-hidden z-[60]">
      {/* Header */}
      <div className="px-3 py-2 border-b border-border">
        <p className="text-sm font-medium text-foreground mb-2">Projects</p>
        <div className="relative">
          <Input
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 text-sm pr-8"
            autoFocus
          />
          <Search className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        </div>
      </div>

      {/* Projects List */}
      <div className="max-h-[280px] overflow-y-auto">
        {projectsLoading ? (
          <div className="px-4 py-6 text-center text-sm text-muted-foreground">
            Loading...
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-muted-foreground">
            {search ? 'No projects found' : programId ? 'No projects in this program' : 'No projects available'}
          </div>
        ) : (
          filteredProjects.map((project) => {
            const hasValidProgramKey = project.programKey && project.programKey.length === 3;
            return (
              <button
                key={project.id}
                onClick={() => handleSelect(project)}
                disabled={!project.canAccess}
                className={cn(
                  "flex items-center gap-2 w-full px-3 py-2.5 text-left transition-colors",
                  project.canAccess 
                    ? "hover:bg-muted cursor-pointer" 
                    : "opacity-50 cursor-not-allowed"
                )}
              >
                <LayoutGrid className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0 flex items-center gap-1.5">
                  <span className="text-sm text-foreground truncate">
                    {project.name}
                  </span>
                  {hasValidProgramKey && (
                    <span className="text-xs text-muted-foreground flex-shrink-0 font-mono uppercase">
                      ({project.programKey})
                    </span>
                  )}
                  {!project.canAccess && (
                    <Lock className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Admin Actions */}
      {isAdmin && (
        <div className="border-t border-border divide-y divide-border/50">
          <button
            onClick={handleCreate}
            className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"
          >
            <Plus className="h-4 w-4 text-muted-foreground" />
            Create Project
          </button>
          <button
            onClick={handleManage}
            className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"
          >
            <Settings className="h-4 w-4 text-muted-foreground" />
            Manage Projects
          </button>
        </div>
      )}
    </div>
  );
});
