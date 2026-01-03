/**
 * useGlobalTestScope Hook
 * Manages scope selection (global/program/project) with localStorage persistence
 * and URL synchronization
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

export type ScopeType = 'global' | 'program' | 'project';

const STORAGE_KEY = 'catalyst-test-scope';

interface StoredScope {
  type: ScopeType;
  id: string | null;
}

interface Program {
  id: string;
  name: string;
}

interface Project {
  id: string;
  name: string;
  program_id?: string;
}

export function useGlobalTestScope() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Initialize from URL, then localStorage, then default
  const getInitialScope = (): StoredScope => {
    // First check URL
    const urlScopeType = searchParams.get('scopeType') as ScopeType | null;
    const urlScopeId = searchParams.get('scopeId');
    
    if (urlScopeType) {
      return { type: urlScopeType, id: urlScopeId };
    }
    
    // Then check localStorage
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as StoredScope;
        if (parsed.type && ['global', 'program', 'project'].includes(parsed.type)) {
          return parsed;
        }
      }
    } catch (e) {
      // Ignore parse errors
    }
    
    // Default to global
    return { type: 'global', id: null };
  };

  const [scope, setScope] = useState<StoredScope>(getInitialScope);

  // Fetch programs for scope selector
  const { data: programs = [], isLoading: programsLoading } = useQuery<Program[]>({
    queryKey: ['test-scope-programs'],
    queryFn: async () => {
      // Cast to avoid deep type inference issues
      const result = await (supabase
        .from('programs')
        .select('id, name') as any);
      
      if (result.error) return [];
      return (result.data || []).map((p: any) => ({
        id: String(p.id),
        name: String(p.name || 'Unknown'),
      }));
    },
    enabled: !!user,
    staleTime: 60000,
  });

  // Fetch projects for scope selector
  const { data: projects = [], isLoading: projectsLoading } = useQuery<Project[]>({
    queryKey: ['test-scope-projects'],
    queryFn: async () => {
      // Cast to avoid deep type inference issues
      const result = await (supabase
        .from('projects')
        .select('id, name, program_id') as any);
      
      if (result.error) return [];
      return (result.data || []).map((p: any) => ({
        id: String(p.id),
        name: String(p.name || 'Unknown'),
        program_id: p.program_id ? String(p.program_id) : undefined,
      }));
    },
    enabled: !!user,
    staleTime: 60000,
  });

  // Update scope and persist
  const setScopeType = useCallback((type: ScopeType) => {
    setScope(() => {
      const newScope = { type, id: null };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newScope));
      return newScope;
    });
  }, []);

  const setScopeId = useCallback((id: string | null) => {
    setScope(prev => {
      const newScope = { ...prev, id };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newScope));
      return newScope;
    });
  }, []);

  // Sync URL when scope changes
  useEffect(() => {
    const currentType = searchParams.get('scopeType');
    const currentId = searchParams.get('scopeId');
    
    if (currentType !== scope.type || currentId !== scope.id) {
      const newParams = new URLSearchParams(searchParams);
      newParams.set('scopeType', scope.type);
      if (scope.id) {
        newParams.set('scopeId', scope.id);
      } else {
        newParams.delete('scopeId');
      }
      setSearchParams(newParams, { replace: true });
    }
  }, [scope, searchParams, setSearchParams]);

  // Get current scope display name
  const scopeDisplayName = useMemo(() => {
    if (scope.type === 'global') return 'All Programs';
    if (scope.type === 'program' && scope.id) {
      const program = programs.find(p => p.id === scope.id);
      return program?.name || 'Unknown Program';
    }
    if (scope.type === 'project' && scope.id) {
      const project = projects.find(p => p.id === scope.id);
      return project?.name || 'Unknown Project';
    }
    return 'Select Scope';
  }, [scope, programs, projects]);

  // Get program ID for the current scope (for queries)
  const effectiveProgramId = useMemo(() => {
    if (scope.type === 'program') return scope.id;
    if (scope.type === 'project' && scope.id) {
      const project = projects.find(p => p.id === scope.id);
      return project?.program_id || null;
    }
    return null;
  }, [scope, projects]);

  return {
    scopeType: scope.type,
    scopeId: scope.id,
    setScopeType,
    setScopeId,
    scopeDisplayName,
    effectiveProgramId,
    programs,
    projects,
    isLoading: programsLoading || projectsLoading,
  };
}
