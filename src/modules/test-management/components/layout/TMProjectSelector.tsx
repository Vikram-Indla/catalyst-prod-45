/**
 * TM Project Selector
 * Dropdown for selecting the active project in Test Management
 */

import React, { useState } from 'react';
import { Check, ChevronDown, Plus, Search } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useProjectStore, TMProject } from '../../stores/projectStore';

interface TMProjectSelectorProps {
  collapsed?: boolean;
}

export function TMProjectSelector({ collapsed = false }: TMProjectSelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const { projects, selectedProjectId, setSelectedProjectId } = useProjectStore();
  
  const selectedProject = projects.find(p => p.id === selectedProjectId);
  
  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    project.key.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelect = (projectId: string) => {
    setSelectedProjectId(projectId);
    setOpen(false);
    setSearchQuery('');
  };

  if (collapsed) {
    return (
      <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground font-semibold text-sm">
        {selectedProject?.key?.slice(0, 2) || 'TM'}
      </div>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between bg-background hover:bg-accent"
        >
          <div className="flex items-center gap-2 truncate">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-primary text-primary-foreground text-xs font-semibold shrink-0">
              {selectedProject?.key?.slice(0, 2) || 'TM'}
            </div>
            <span className="truncate">{selectedProject?.name || 'Select project'}</span>
          </div>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="start">
        <div className="p-2">
          <div className="flex items-center gap-2 px-2 pb-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 border-0 bg-transparent p-0 focus-visible:ring-0"
            />
          </div>
        </div>
        <Separator />
        <ScrollArea className="max-h-[300px]">
          <div className="p-1">
            {filteredProjects.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                No projects found
              </div>
            ) : (
              filteredProjects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => handleSelect(project.id)}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors',
                    'hover:bg-accent hover:text-accent-foreground',
                    selectedProjectId === project.id && 'bg-accent'
                  )}
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded bg-primary/10 text-primary text-xs font-semibold shrink-0">
                    {project.key.slice(0, 2)}
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <div className="truncate font-medium">{project.name}</div>
                    {project.description && (
                      <div className="truncate text-xs text-muted-foreground">
                        {project.description}
                      </div>
                    )}
                  </div>
                  {selectedProjectId === project.id && (
                    <Check className="h-4 w-4 text-primary shrink-0" />
                  )}
                </button>
              ))
            )}
          </div>
        </ScrollArea>
        <Separator />
        <div className="p-1">
          <button
            className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            onClick={() => {
              // TODO: Open create project modal
              console.log('Create new project');
              setOpen(false);
            }}
          >
            <Plus className="h-4 w-4" />
            <span>Create New Project</span>
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
