import { useNavigation } from '@/contexts/NavigationContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Briefcase, Calendar, GitBranch, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

/**
 * Persistent scope and time filters in top navigation
 * Source: https://help.jiraalign.com/hc/en-us/articles/17158556046612-Navigate-Jira-Align
 * 
 * These filters persist across all rooms and views:
 * - Program selector (scope)
 * - PI selector (timebox)
 * - Project selector (when in project/team context)
 */

export function PersistentFilters() {
  const { 
    currentRoom,
    selectedProgramId, 
    setSelectedProgramId,
    selectedProjectId,
    setSelectedProjectId,
    selectedPIIds,
    setSelectedPIIds,
  } = useNavigation();
  
  // Fetch programs (formerly portfolios)
  const { data: programs = [] } = useQuery({
    queryKey: ['programs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('portfolios')
        .select('*')
        .eq('status', 'active')
        .order('name');
      if (error) throw error;
      return data || [];
    },
  });
  
  // Fetch projects for selected program
  const { data: projects = [] } = useQuery({
    queryKey: ['projects', selectedProgramId],
    queryFn: async () => {
      if (!selectedProgramId) return [];
      const { data, error } = await supabase
        .from('programs')
        .select('*')
        .eq('portfolio_id', selectedProgramId)
        .eq('status', 'active')
        .order('name');
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedProgramId,
  });
  
  // Fetch PIs for selected program
  const { data: programIncrements = [] } = useQuery({
    queryKey: ['program-increments', selectedProgramId],
    queryFn: async () => {
      if (!selectedProgramId) return [];
      const { data, error } = await supabase
        .from('program_increments')
        .select('*')
        .eq('portfolio_id', selectedProgramId)
        .order('start_date', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedProgramId,
  });
  
  const showProjectFilter = currentRoom === 'project' || currentRoom === 'team';
  
  return (
    <div className="flex items-center gap-2 border-r pr-4">
      {/* Program Selector */}
      <div className="flex items-center gap-2">
        <Briefcase className="h-4 w-4 text-muted-foreground" />
        <Select value={selectedProgramId || ''} onValueChange={setSelectedProgramId}>
          <SelectTrigger className="w-[180px] h-8">
            <SelectValue placeholder="Select Program" />
          </SelectTrigger>
          <SelectContent>
            {programs.map((program) => (
              <SelectItem key={program.id} value={program.id}>
                {program.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      {/* Project Selector (only in Project/Team rooms) */}
      {showProjectFilter && selectedProgramId && (
        <div className="flex items-center gap-2">
          <GitBranch className="h-4 w-4 text-muted-foreground" />
          <Select value={selectedProjectId || ''} onValueChange={setSelectedProjectId}>
            <SelectTrigger className="w-[180px] h-8">
              <SelectValue placeholder="Select Project" />
            </SelectTrigger>
            <SelectContent>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      
      {/* PI Selector */}
      {selectedProgramId && (
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <Select 
            value={selectedPIIds[0] || ''} 
            onValueChange={(value) => setSelectedPIIds([value])}
          >
            <SelectTrigger className="w-[180px] h-8">
              <SelectValue placeholder="Select PI" />
            </SelectTrigger>
            <SelectContent>
              {programIncrements.map((pi) => (
                <SelectItem key={pi.id} value={pi.id}>
                  <div className="flex items-center gap-2">
                    <span>{pi.name}</span>
                    {pi.state === 'active' && (
                      <Badge variant="default" className="h-4 px-1 text-[10px]">
                        Active
                      </Badge>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
