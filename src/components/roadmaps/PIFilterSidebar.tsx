import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface PIFilterSidebarProps {
  selectedPIIds: string[];
  onSelectionChange: (piIds: string[]) => void;
  portfolioId?: string;
}

export function PIFilterSidebar({ selectedPIIds, onSelectionChange, portfolioId }: PIFilterSidebarProps) {
  const [search, setSearch] = useState('');
  const [tempSelection, setTempSelection] = useState<string[]>(selectedPIIds);

  const { data: programIncrements } = useQuery({
    queryKey: ['pi-selector-all', portfolioId],
    queryFn: async () => {
      let query = supabase
        .from('program_increments')
        .select('*')
        .order('start_date', { ascending: false });
      
      if (portfolioId) {
        query = query.eq('program_id', portfolioId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Group PIs by state
  const groupedPIs = {
    'IN PROGRESS': programIncrements?.filter(pi => pi.state === 'active') || [],
    'PLANNING': programIncrements?.filter(pi => pi.state === 'planned') || [],
    'DONE': programIncrements?.filter(pi => pi.state === 'closed') || [],
  };

  // Filter by search
  const filterPIs = (pis: any[]) => {
    if (!search) return pis;
    return pis.filter(pi =>
      pi.name.toLowerCase().includes(search.toLowerCase()) ||
      format(parseISO(pi.start_date), 'M/d/yyyy').includes(search) ||
      format(parseISO(pi.end_date), 'M/d/yyyy').includes(search)
    );
  };

  const handleToggle = (piId: string) => {
    if (tempSelection.includes(piId)) {
      setTempSelection(tempSelection.filter(id => id !== piId));
    } else {
      setTempSelection([...tempSelection, piId]);
    }
  };

  const handleApply = () => {
    onSelectionChange(tempSelection);
  };

  const handleClearAll = () => {
    setTempSelection([]);
  };

  const handleCancel = () => {
    setTempSelection(selectedPIIds);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          PROGRAM INCREMENT
        </div>
        <div className="text-sm font-medium mb-3">
          {selectedPIIds.length === 0 ? 'All time' : `${selectedPIIds.length} selected`}
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search Program Increment"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
      </div>

      <ScrollArea className="flex-1 px-4">
        <div className="space-y-6 py-4">
          {Object.entries(groupedPIs).map(([group, pis]) => {
            const filteredPIs = filterPIs(pis);
            if (filteredPIs.length === 0) return null;

            return (
              <div key={group} className="space-y-2">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {group}
                </div>
                {filteredPIs.map((pi) => (
                  <div key={pi.id} className="flex items-start gap-2 py-1">
                    <Checkbox
                      id={`pi-${pi.id}`}
                      checked={tempSelection.includes(pi.id)}
                      onCheckedChange={() => handleToggle(pi.id)}
                      className="mt-1"
                    />
                    <label
                      htmlFor={`pi-${pi.id}`}
                      className="flex-1 text-sm cursor-pointer leading-tight"
                    >
                      <div className="font-medium">{pi.name}</div>
                      <div className="text-xs text-muted-foreground">
                        ({format(parseISO(pi.start_date), 'M/d/yyyy')} - {format(parseISO(pi.end_date), 'M/d/yyyy')})
                      </div>
                    </label>
                  </div>
                ))}
              </div>
            );
          })}

          {(programIncrements?.length || 0) === 0 && (
            <div className="text-sm text-muted-foreground text-center py-8">
              No program increments found
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="p-4 border-t bg-card">
        <div className="flex items-center gap-2">
          <Button
            onClick={handleApply}
            disabled={tempSelection.length === 0}
            className="flex-1"
            size="sm"
          >
            Apply
          </Button>
          <Button
            onClick={handleClearAll}
            variant="ghost"
            size="sm"
          >
            Clear all
          </Button>
          <Button
            onClick={handleCancel}
            variant="ghost"
            size="sm"
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}