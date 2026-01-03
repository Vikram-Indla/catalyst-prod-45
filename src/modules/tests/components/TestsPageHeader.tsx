/**
 * Tests Page Header
 * Shared header component with scope selector for all Tests pages
 */

import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Building2, Folder, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';

export function useTestsScope() {
  const [searchParams, setSearchParams] = useSearchParams();
  const scopeType = searchParams.get('scopeType') || 'program';
  const scopeId = searchParams.get('scopeId');
  
  const setScopeType = (type: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('scopeType', type);
    params.delete('scopeId');
    setSearchParams(params);
  };
  
  const setScopeId = (id: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('scopeId', id);
    setSearchParams(params);
  };
  
  return { scopeType, scopeId, setScopeType, setScopeId };
}

interface TestsPageHeaderProps {
  activePage: string;
  onCreate?: () => void;
}

export function TestsPageHeader({ activePage, onCreate }: TestsPageHeaderProps) {
  const { scopeType, scopeId, setScopeType, setScopeId } = useTestsScope();

  const { data: programs = [] } = useQuery({
    queryKey: ['programs-for-scope'],
    queryFn: async () => {
      const { data } = await supabase.from('programs').select('id, name, key').eq('status', 'active').order('name');
      return data || [];
    },
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects-for-scope'],
    queryFn: async () => {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/projects?is_active=eq.true&select=id,name&order=name`, {
        headers: { 'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, 'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` }
      });
      const data = await res.json();
      return (data || []).map((p: any) => ({ id: p.id, name: p.name, key: p.name?.substring(0, 3).toUpperCase() || 'PRJ' }));
    },
  });

  const scopeOptions: any[] = scopeType === 'program' ? programs : projects;
  const titles: Record<string, string> = { overview: 'Tests Overview', cases: 'Test Cases', sets: 'Test Sets', cycles: 'Test Cycles', executions: 'Executions', traceability: 'Traceability', reports: 'Reports', admin: 'Administration' };

  return (
    <div className="flex items-center justify-between gap-4 flex-wrap">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-semibold text-text-primary">{titles[activePage] || 'Tests'}</h1>
        <div className="flex items-center gap-2 pl-3 border-l border-border-default">
          <Select value={scopeType} onValueChange={setScopeType}>
            <SelectTrigger className="h-8 w-[100px] text-xs bg-surface-2"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-surface-1">
              <SelectItem value="program"><div className="flex items-center gap-1.5"><Building2 className="h-3 w-3" /> Program</div></SelectItem>
              <SelectItem value="project"><div className="flex items-center gap-1.5"><Folder className="h-3 w-3" /> Project</div></SelectItem>
            </SelectContent>
          </Select>
          <Select value={scopeId || ''} onValueChange={setScopeId}>
            <SelectTrigger className="h-8 w-[180px] text-xs bg-surface-2"><SelectValue placeholder={`Select ${scopeType}`} /></SelectTrigger>
            <SelectContent className="bg-surface-1 max-h-[300px]">
              {scopeOptions.map((opt: any) => (
                <SelectItem key={opt.id} value={opt.id}>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] px-1">{opt.key}</Badge>
                    <span className="truncate">{opt.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      {onCreate && (
        <Button size="sm" className="h-8 text-xs gap-1.5 font-semibold" onClick={onCreate}>
          <Plus className="h-4 w-4" /> + Create Test Case
          <kbd className="ml-1 px-1 py-0.5 text-[9px] rounded bg-surface-3 text-text-secondary hidden sm:inline">C</kbd>
        </Button>
      )}
    </div>
  );
}
