// =====================================================
// PROJECT HEADER COMPONENT
// Header with project info and view selector
// =====================================================

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Settings, Users, MoreHorizontal, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ViewSelector } from './ViewSelector';

interface ProjectHeaderProps {
  project: {
    id: string;
    name: string;
    description?: string | null;
    key: string;
  };
  onCreateFeature?: () => void;
}

export function ProjectHeader({ project, onCreateFeature }: ProjectHeaderProps) {
  const navigate = useNavigate();

  return (
    <div className="sticky top-0 z-30 bg-white border-b shadow-sm">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Left: Back + Project Info */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/projects')}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-gray-500" />
            </button>
            
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold">{project.name}</h1>
                <span className="px-2 py-0.5 rounded text-xs font-mono bg-gray-100 text-gray-600">
                  {project.key}
                </span>
              </div>
              {project.description && (
                <p className="text-sm text-gray-500 mt-0.5">{project.description}</p>
              )}
            </div>
          </div>

          {/* Center: View Selector */}
          <ViewSelector projectId={project.id} />

          {/* Right: Actions */}
          <div className="flex items-center gap-3">
            <Button
              onClick={onCreateFeature}
              className="bg-[var(--ds-text-brand,var(--ds-text-brand, #2563eb))] hover:bg-[var(--ds-background-brand-bold-hovered,var(--ds-background-brand-bold-hovered, #1d4ed8))] text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Feature
            </Button>

            <Button variant="outline" size="icon">
              <Users className="w-4 h-4" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => navigate(`/projects/${project.id}/settings`)}>
                  <Settings className="w-4 h-4 mr-2" />
                  Project Settings
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </div>
  );
}
