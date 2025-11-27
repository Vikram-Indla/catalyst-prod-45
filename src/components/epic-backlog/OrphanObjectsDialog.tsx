import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { AlertCircle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface OrphanObjectsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OrphanObjectsDialog({ open, onOpenChange }: OrphanObjectsDialogProps) {
  // Fetch epics without PI assignments
  const { data: epicsWithoutPI } = useQuery({
    queryKey: ['orphan-epics-no-pi'],
    queryFn: async () => {
      const { data: allEpics } = await supabase
        .from('epics')
        .select('id, name, epic_key')
        .is('deleted_at', null)
        .is('parked_at', null);
      
      const { data: assignedEpicIds } = await supabase
        .from('epic_program_increments')
        .select('epic_id');
      
      const assignedIds = new Set(assignedEpicIds?.map(e => e.epic_id) || []);
      return allEpics?.filter(e => !assignedIds.has(e.id)) || [];
    },
    enabled: open,
  });

  // Fetch epics without programs
  const { data: epicsWithoutProgram } = useQuery({
    queryKey: ['orphan-epics-no-program'],
    queryFn: async () => {
      const { data } = await supabase
        .from('epics')
        .select('id, name, epic_key')
        .is('primary_program_id', null)
        .is('deleted_at', null)
        .is('parked_at', null);
      return data || [];
    },
    enabled: open,
  });

  // Fetch epics without themes
  const { data: epicsWithoutTheme } = useQuery({
    queryKey: ['orphan-epics-no-theme'],
    queryFn: async () => {
      const { data } = await supabase
        .from('epics')
        .select('id, name, epic_key')
        .is('theme_id', null)
        .is('deleted_at', null)
        .is('parked_at', null);
      return data || [];
    },
    enabled: open,
  });

  // Fetch features without epics
  const { data: featuresWithoutEpic } = useQuery({
    queryKey: ['orphan-features-no-epic'],
    queryFn: async () => {
      const { data } = await supabase
        .from('features')
        .select('id, name')
        .is('epic_id', null);
      return data || [];
    },
    enabled: open,
  });

  const OrphanList = ({ items, type }: { items: any[] | undefined; type: string }) => {
    if (!items || items.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <AlertCircle className="h-12 w-12 mb-3 opacity-20" />
          <p className="text-sm">No orphan {type} found</p>
        </div>
      );
    }

    return (
      <ScrollArea className="h-[400px]">
        <div className="space-y-2 p-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <AlertCircle className="h-4 w-4 text-destructive" />
                <div>
                  <p className="text-sm font-medium">{item.name}</p>
                  {item.epic_key && (
                    <p className="text-xs text-muted-foreground">{item.epic_key}</p>
                  )}
                </div>
              </div>
              <Badge variant="outline" className="text-destructive border-destructive">
                Orphan
              </Badge>
            </div>
          ))}
        </div>
      </ScrollArea>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            Orphan Objects
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="no-pi" className="mt-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="no-pi" className="text-xs">
              No PI
              {epicsWithoutPI && epicsWithoutPI.length > 0 && (
                <Badge variant="destructive" className="ml-2 h-5 min-w-5 rounded-full px-1">
                  {epicsWithoutPI.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="no-program" className="text-xs">
              No Program
              {epicsWithoutProgram && epicsWithoutProgram.length > 0 && (
                <Badge variant="destructive" className="ml-2 h-5 min-w-5 rounded-full px-1">
                  {epicsWithoutProgram.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="no-theme" className="text-xs">
              No Theme
              {epicsWithoutTheme && epicsWithoutTheme.length > 0 && (
                <Badge variant="destructive" className="ml-2 h-5 min-w-5 rounded-full px-1">
                  {epicsWithoutTheme.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="no-epic" className="text-xs">
              Features No Epic
              {featuresWithoutEpic && featuresWithoutEpic.length > 0 && (
                <Badge variant="destructive" className="ml-2 h-5 min-w-5 rounded-full px-1">
                  {featuresWithoutEpic.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="no-pi" className="mt-4">
            <OrphanList items={epicsWithoutPI} type="epics without PI" />
          </TabsContent>

          <TabsContent value="no-program" className="mt-4">
            <OrphanList items={epicsWithoutProgram} type="epics without program" />
          </TabsContent>

          <TabsContent value="no-theme" className="mt-4">
            <OrphanList items={epicsWithoutTheme} type="epics without theme" />
          </TabsContent>

          <TabsContent value="no-epic" className="mt-4">
            <OrphanList items={featuresWithoutEpic} type="features without epic" />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
