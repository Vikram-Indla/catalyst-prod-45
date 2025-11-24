import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScopeSelector } from '@/components/shared/ScopeSelector';
import { HealthBadge } from '@/components/shared/HealthBadge';
import { format, differenceInDays } from 'date-fns';

export default function PortfolioRoadmap() {
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string>('');
  const [viewMode, setViewMode] = useState<'initiatives' | 'epics'>('initiatives');

  const { data: initiatives } = useQuery({
    queryKey: ['roadmap-initiatives', selectedPortfolioId],
    queryFn: async () => {
      if (!selectedPortfolioId) return [];
      const { data, error } = await supabase
        .from('initiatives')
        .select('*, strategic_themes(name, color_tag)')
        .order('created_at');
      if (error) throw error;
      return data;
    },
    enabled: !!selectedPortfolioId,
  });

  const { data: epics } = useQuery({
    queryKey: ['roadmap-epics', selectedPortfolioId],
    queryFn: async () => {
      if (!selectedPortfolioId) return [];
      const { data, error } = await supabase
        .from('epics')
        .select('*, strategic_themes(name, color_tag), programs(name)')
        .order('start_date');
      if (error) throw error;
      return data;
    },
    enabled: !!selectedPortfolioId && viewMode === 'epics',
  });

  const getTimelinePosition = (startDate: string | null, endDate: string | null) => {
    if (!startDate || !endDate) return { left: '0%', width: '10%' };

    const start = new Date(startDate);
    const end = new Date(endDate);
    const today = new Date();
    
    // Calculate months from today
    const monthsFromToday = Math.floor(differenceInDays(start, today) / 30);
    const duration = Math.floor(differenceInDays(end, start) / 30);
    
    const left = Math.max(0, (monthsFromToday + 6) * 8.33); // 8.33% per month (12 months view)
    const width = Math.min(duration * 8.33, 100 - left);
    
    return { left: `${left}%`, width: `${width}%` };
  };

  const getMonths = () => {
    const months = [];
    const today = new Date();
    
    for (let i = -6; i < 6; i++) {
      const date = new Date(today.getFullYear(), today.getMonth() + i, 1);
      months.push(format(date, 'MMM yyyy'));
    }
    
    return months;
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Portfolio Roadmap</h1>
          <p className="text-muted-foreground">Timeline view of strategic initiatives and epics</p>
        </div>
      </div>

      <div className="flex gap-4">
        <ScopeSelector value={selectedPortfolioId} onChange={setSelectedPortfolioId} />
        
        <Select value={viewMode} onValueChange={(value: any) => setViewMode(value)}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="initiatives">Initiatives</SelectItem>
            <SelectItem value="epics">Epics</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {selectedPortfolioId && (
        <Card className="p-6">
          <div className="space-y-6">
            <div className="relative">
              <div className="flex border-b pb-2 mb-4">
                {getMonths().map((month, i) => (
                  <div key={i} className="flex-1 text-center text-sm font-medium text-muted-foreground">
                    {month}
                  </div>
                ))}
              </div>
              
              {viewMode === 'initiatives' && (
                <div className="space-y-3">
                  <div className="text-center text-muted-foreground py-8">
                    <p>Initiatives don't have start/end dates.</p>
                    <p className="text-sm mt-2">Switch to Epics view to see timeline visualization.</p>
                  </div>
                </div>
              )}

              {viewMode === 'epics' && (
                <div className="space-y-3">
                  {epics?.filter(e => e.start_date && e.end_date).map((epic) => {
                    const position = getTimelinePosition(epic.start_date, epic.end_date);
                    
                    return (
                      <div key={epic.id} className="relative h-12 flex items-center">
                        <div className="absolute left-0 w-48 pr-4">
                          <div className="text-sm font-medium truncate">{epic.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {epic.programs?.name}
                          </div>
                        </div>
                        <div className="ml-48 relative w-full h-8">
                          <div
                            className="absolute h-full bg-secondary/20 border-l-4 border-secondary rounded flex items-center px-2 gap-2"
                            style={{ left: position.left, width: position.width }}
                          >
                            <span className="text-xs font-medium truncate">
                              {epic.name}
                            </span>
                            <HealthBadge health={epic.health} className="ml-auto" />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground pt-4 border-t">
              <div className="w-4 h-4 bg-primary/20 border-l-4 border-primary"></div>
              <span>Initiative</span>
              <div className="w-4 h-4 bg-secondary/20 border-l-4 border-secondary ml-4"></div>
              <span>Epic</span>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
