/**
 * PROJECT SCOPE REQUIRED COMPONENT
 * 
 * Displays a blocking message when user attempts to access
 * test management features at non-project scope.
 * 
 * Test creation, execution, and management is ONLY available at project level.
 */

import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, Folder, Building2, FolderKanban, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface ProjectScopeRequiredProps {
  featureName: string; // e.g., "Test Cases", "Test Cycles"
}

export function ProjectScopeRequired({ featureName }: ProjectScopeRequiredProps) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const scopeType = searchParams.get('scopeType') || 'enterprise';

  // Fetch projects for drill-down
  const { data: projects = [], isLoading: projectsLoading } = useQuery<
    Array<{ id: string; name: string; key?: string }>
  >({
    queryKey: ['test-projects-list'],
    queryFn: async () => {
      const { data } = await supabase.from('projects').select('id, name, key');
      return (data || [])
        .filter((p: any) => p.is_active !== false)
        .map((p: any) => ({
          id: String(p.id),
          name: String(p.name),
          key: p.key ? String(p.key) : undefined,
        }));
    },
  });

  const handleProjectSelect = (projectId: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('scopeType', 'project');
    params.set('scopeId', projectId);
    setSearchParams(params);
  };

  const handleGoToOverview = () => {
    navigate('/tests?scopeType=project');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6">
      <div className="max-w-lg w-full">
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            {scopeType === 'enterprise' ? (
              <Building2 className="h-16 w-16 text-text-muted" />
            ) : (
              <FolderKanban className="h-16 w-16 text-text-muted" />
            )}
            <div className="absolute -bottom-1 -right-1 bg-warning rounded-full p-1.5">
              <Lock className="h-4 w-4 text-warning-foreground" />
            </div>
          </div>
        </div>

        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-semibold text-text-primary mb-2">
            {featureName} Require Project Scope
          </h1>
          <p className="text-text-muted">
            {scopeType === 'enterprise' 
              ? `${featureName} are managed at the project level. Select a program first, then a project to continue.`
              : `${featureName} are managed at the project level. Select a project to create, edit, or execute tests.`
            }
          </p>
        </div>

        {/* Scope Badge */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-warning/10 border border-warning/30 rounded-full">
            <Lock className="h-3.5 w-3.5 text-warning" />
            <span className="c-caption font-medium text-warning capitalize">
              {scopeType} Scope
            </span>
            <span className="text-text-muted c-caption">· Read-only aggregation</span>
          </div>
        </div>

        {/* Project Selector */}
        <div className="bg-surface-1 border border-border-default rounded-lg p-6 mb-4">
          <label className="c-overline text-text-muted block mb-2">
            SELECT PROJECT TO CONTINUE
          </label>
          <Select onValueChange={handleProjectSelect} disabled={projectsLoading}>
            <SelectTrigger className="w-full h-10 bg-surface-0 border-border-default">
              <SelectValue placeholder={projectsLoading ? "Loading projects..." : "Choose a project"} />
            </SelectTrigger>
            <SelectContent className="bg-surface-0 max-h-[300px]">
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  <div className="flex items-center gap-2">
                    <Folder className="h-4 w-4 text-text-muted" />
                    {project.key && (
                      <span className="font-mono text-text-muted c-caption">{project.key}</span>
                    )}
                    <span>{project.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Alternative Action */}
        <div className="text-center">
          <Button variant="ghost" onClick={handleGoToOverview} className="gap-2">
            Go to Tests Overview
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
