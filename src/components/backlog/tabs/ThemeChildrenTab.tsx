import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { EpicDetailsPanel } from '@/components/items/epics/EpicDetailsPanel';

interface ThemeChildrenTabProps {
  themeId: string;
}

export function ThemeChildrenTab({ themeId }: ThemeChildrenTabProps) {
  const [selectedEpicId, setSelectedEpicId] = useState<string | null>(null);
  const [selectedEpic, setSelectedEpic] = useState<any>(null);

  const { data: epics, isLoading } = useQuery({
    queryKey: ['theme-children', themeId],
    queryFn: async () => {
      if (!themeId) return [];
      
      const { data, error } = await supabase
        .from('epics')
        .select('*, programs(name)')
        .eq('theme_id', themeId)
        .order('global_rank');

      if (error) throw error;
      return data || [];
    },
    enabled: !!themeId,
  });

  const handleEpicClick = (epic: any) => {
    setSelectedEpic(epic);
    setSelectedEpicId(epic.id);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!epics || epics.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No epics found for this theme
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Epics ({epics.length})</h3>
        </div>

        <div className="space-y-2">
          {epics.map((epic) => (
            <Card 
              key={epic.id} 
              className="cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => handleEpicClick(epic)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-mono text-muted-foreground">
                        {epic.epic_key || 'E-???'}
                      </span>
                      {epic.state && (
                        <Badge variant="outline" className="text-xs">
                          {epic.state}
                        </Badge>
                      )}
                    </div>
                    <h4 className="font-medium text-sm mb-2 line-clamp-2">
                      {epic.name}
                    </h4>
                    {epic.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {epic.description}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    {epic.programs?.name && (
                      <Badge variant="secondary" className="text-xs">
                        {epic.programs.name}
                      </Badge>
                    )}
                    {epic.points_estimate !== null && (
                      <span className="text-sm text-muted-foreground">
                        {epic.points_estimate} pts
                      </span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <EpicDetailsPanel
        epic={selectedEpic}
        open={!!selectedEpicId}
        onClose={() => {
          setSelectedEpicId(null);
          setSelectedEpic(null);
        }}
      />
    </>
  );
}
