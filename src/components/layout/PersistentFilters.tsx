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
 * - Portfolio selector (scope)
 * - PI selector (timebox)
 * - Program selector (when in program/team context)
 */

export function PersistentFilters() {
  const { 
    currentRoom,
    selectedPortfolioId, 
    setSelectedPortfolioId,
    selectedProgramId,
    setSelectedProgramId,
    selectedPIIds,
    setSelectedPIIds,
  } = useNavigation();
  
  // Fetch portfolios
  const { data: portfolios = [] } = useQuery({
    queryKey: ['portfolios'],
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
  
  // Fetch programs for selected portfolio
  const { data: programs = [] } = useQuery({
    queryKey: ['programs', selectedPortfolioId],
    queryFn: async () => {
      if (!selectedPortfolioId) return [];
      const { data, error } = await supabase
        .from('programs')
        .select('*')
        .eq('portfolio_id', selectedPortfolioId)
        .eq('status', 'active')
        .order('name');
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedPortfolioId,
  });
  
  // Fetch PIs for selected portfolio
  const { data: programIncrements = [] } = useQuery({
    queryKey: ['program-increments', selectedPortfolioId],
    queryFn: async () => {
      if (!selectedPortfolioId) return [];
      const { data, error } = await supabase
        .from('program_increments')
        .select('*')
        .eq('portfolio_id', selectedPortfolioId)
        .order('start_date', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedPortfolioId,
  });
  
  const showProgramFilter = currentRoom === 'program' || currentRoom === 'team';
  
  return (
    <div className="flex items-center gap-2 border-r pr-4">
      {/* Portfolio Selector */}
      <div className="flex items-center gap-2">
        <Briefcase className="h-4 w-4 text-muted-foreground" />
        <Select value={selectedPortfolioId || ''} onValueChange={setSelectedPortfolioId}>
          <SelectTrigger className="w-[180px] h-8">
            <SelectValue placeholder="Select Portfolio" />
          </SelectTrigger>
          <SelectContent>
            {portfolios.map((portfolio) => (
              <SelectItem key={portfolio.id} value={portfolio.id}>
                {portfolio.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      {/* Program Selector (only in Program/Team rooms) */}
      {showProgramFilter && selectedPortfolioId && (
        <div className="flex items-center gap-2">
          <GitBranch className="h-4 w-4 text-muted-foreground" />
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
      )}
      
      {/* PI Selector */}
      {selectedPortfolioId && (
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
