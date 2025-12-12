import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Plus } from 'lucide-react';
import { useState } from 'react';
import { EpicDetailsPanel } from '@/components/items/epics/EpicDetailsPanel';
import { toast } from 'sonner';

interface ThemeChildrenTabProps {
  themeId: string;
}

export function ThemeChildrenTab({ themeId }: ThemeChildrenTabProps) {
  const queryClient = useQueryClient();
  const [selectedEpicId, setSelectedEpicId] = useState<string | null>(null);
  const [selectedEpic, setSelectedEpic] = useState<any>(null);
  const [showLinkDialog, setShowLinkDialog] = useState(false);

  const { data: epics, isLoading } = useQuery({
    queryKey: ['theme-children', themeId],
    queryFn: async () => {
      if (!themeId) return [];
      
      const { data, error } = await supabase
        .from('epics')
        .select('*, programs!primary_program_id(name)')
        .eq('theme_id', themeId)
        .order('global_rank');

      if (error) throw error;
      return data || [];
    },
    enabled: !!themeId,
  });

  // Fetch epics that are NOT linked to any theme (for linking)
  const { data: availableEpics } = useQuery({
    queryKey: ['available-epics-for-theme', themeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('epics')
        .select('id, name, epic_key')
        .is('theme_id', null)
        .order('name');
      if (error) throw error;
      return data || [];
    },
    enabled: showLinkDialog,
  });

  const linkEpicMutation = useMutation({
    mutationFn: async (epicId: string) => {
      const { error } = await supabase
        .from('epics')
        .update({ theme_id: themeId })
        .eq('id', epicId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['theme-children', themeId] });
      queryClient.invalidateQueries({ queryKey: ['available-epics-for-theme', themeId] });
      toast.success('Epic linked to theme');
      setShowLinkDialog(false);
    },
    onError: () => {
      toast.error('Failed to link epic');
    },
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

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Epics {epics && epics.length > 0 ? `(${epics.length})` : ''}</h3>
          <Button size="sm" variant="outline" className="gap-2" onClick={() => setShowLinkDialog(true)}>
            <Plus className="h-4 w-4" />
            Link Epic
          </Button>
        </div>

        {(!epics || epics.length === 0) ? (
          <div className="border rounded-lg p-8 text-center text-muted-foreground">
            <p className="text-sm">No epics linked to this theme</p>
            <p className="text-xs mt-1">Click "Link Epic" to connect one</p>
          </div>
        ) : (
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
        )}
      </div>

      {/* Link Epic Dialog */}
      {showLinkDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-semibold mb-4">Link Epic to Theme</h3>
            {availableEpics && availableEpics.length > 0 ? (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {availableEpics.map((epic) => (
                  <button
                    key={epic.id}
                    onClick={() => linkEpicMutation.mutate(epic.id)}
                    className="w-full text-left p-3 border rounded-lg hover:bg-muted transition-colors"
                  >
                    <span className="font-mono text-xs text-muted-foreground mr-2">{epic.epic_key}</span>
                    {epic.name}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No unlinked epics available</p>
            )}
            <div className="flex justify-end mt-4">
              <Button variant="outline" onClick={() => setShowLinkDialog(false)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}

      {selectedEpic && (
        <EpicDetailsPanel
          epic={selectedEpic}
          open={!!selectedEpicId}
          onClose={() => {
            setSelectedEpicId(null);
            setSelectedEpic(null);
          }}
        />
      )}
    </>
  );
}
