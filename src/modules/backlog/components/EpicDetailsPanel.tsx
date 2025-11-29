import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface EpicDetailsPanelProps {
  itemId: string;
  itemType: string;
  onClose: () => void;
}

export function EpicDetailsPanel({
  itemId,
  itemType,
  onClose,
}: EpicDetailsPanelProps) {
  const { data: item } = useQuery({
    queryKey: ['backlog-item', itemId, itemType],
    queryFn: async () => {
      const tableName = getTableName(itemType);
      const { data, error }: any = await supabase
        .from(tableName as any)
        .select('*')
        .eq('id', itemId)
        .single();

      if (error) throw error;
      return data as any;
    },
  });

  if (!item) {
    return null;
  }

  return (
    <div className="w-[600px] border-l bg-card flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex-1 min-w-0">
          <div className="font-mono text-xs text-muted-foreground mb-1">
            {item.epic_key || item.id?.slice(0, 8)}
          </div>
          <h3 className="font-semibold text-sm truncate">{item.name}</h3>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0 ml-2">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="details" className="flex-1 flex flex-col">
        <TabsList className="w-full justify-start rounded-none border-b px-4">
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="children">Children</TabsTrigger>
          <TabsTrigger value="intake">Intake</TabsTrigger>
          <TabsTrigger value="benefits">Benefits</TabsTrigger>
          <TabsTrigger value="value">Value</TabsTrigger>
          <TabsTrigger value="forecast">Forecast</TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1">
          <TabsContent value="details" className="p-4 space-y-4 mt-0">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Description</label>
              <p className="text-sm mt-1">{item.description || 'No description'}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground">State</label>
                <p className="text-sm mt-1">{item.state || 'N/A'}</p>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground">Health</label>
                <p className="text-sm mt-1">{item.health || 'N/A'}</p>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground">Owner</label>
                <p className="text-sm mt-1">{item.owner_name || 'Unassigned'}</p>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground">Estimate</label>
                <p className="text-sm mt-1">{item.estimate || 'N/A'}</p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="children" className="p-4 mt-0">
            <div className="text-sm text-muted-foreground">
              Child items will be displayed here
            </div>
          </TabsContent>

          <TabsContent value="intake" className="p-4 mt-0">
            <div className="text-sm text-muted-foreground">
              Intake form responses will be displayed here
            </div>
          </TabsContent>

          <TabsContent value="benefits" className="p-4 mt-0">
            <div className="text-sm text-muted-foreground">
              Benefits will be displayed here
            </div>
          </TabsContent>

          <TabsContent value="value" className="p-4 mt-0">
            <div className="text-sm text-muted-foreground">
              Value metrics will be displayed here
            </div>
          </TabsContent>

          <TabsContent value="forecast" className="p-4 mt-0">
            <div className="text-sm text-muted-foreground">
              Forecast data will be displayed here
            </div>
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
}

function getTableName(type: string): string {
  const tableMap: Record<string, string> = {
    theme: 'strategic_themes',
    epic: 'epics',
    capability: 'capabilities',
    feature: 'features',
    story: 'stories',
    defect: 'defects',
    objective: 'objectives',
  };
  return tableMap[type] || 'epics';
}
