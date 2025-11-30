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

  const { data: children } = useQuery({
    queryKey: ['backlog-item-children', itemId, itemType],
    queryFn: async () => {
      if (itemType === 'epic') {
        const { data, error }: any = await supabase
          .from('features')
          .select('id, name, state, health, estimate_points')
          .eq('epic_id', itemId)
          .order('rank_within_epic');

        if (error) throw error;
        return data || [];
      }
      return [];
    },
    enabled: itemType === 'epic',
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

          <TabsContent value="children" className="p-4 mt-0 space-y-2">
            {children && children.length > 0 ? (
              <>
                <div className="text-xs font-medium text-muted-foreground mb-2">
                  Features ({children.length})
                </div>
                {children.map((child: any) => (
                  <div
                    key={child.id}
                    className="p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{child.name}</div>
                        <div className="flex items-center gap-2 mt-1">
                          {child.state && (
                            <span className="text-xs px-2 py-0.5 bg-muted rounded">
                              {child.state}
                            </span>
                          )}
                          {child.estimate_points && (
                            <span className="text-xs text-muted-foreground">
                              {child.estimate_points} pts
                            </span>
                          )}
                        </div>
                      </div>
                      {child.health && (
                        <div className={`h-2 w-2 rounded-full mt-1 ${
                          child.health === 'green' ? 'bg-success' :
                          child.health === 'yellow' ? 'bg-warning' :
                          child.health === 'red' ? 'bg-destructive' : 'bg-muted-foreground'
                        }`} />
                      )}
                    </div>
                  </div>
                ))}
              </>
            ) : (
              <div className="text-sm text-muted-foreground text-center py-8">
                No child items
              </div>
            )}
          </TabsContent>

          <TabsContent value="intake" className="p-4 mt-0 space-y-4">
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Strategic Driver</label>
                <p className="text-sm mt-1">{item.strategic_driver || 'Not specified'}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Investment Type</label>
                <p className="text-sm mt-1">{item.investment_type || 'Not specified'}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Customers</label>
                <p className="text-sm mt-1">
                  {item.customers && item.customers.length > 0 
                    ? item.customers.join(', ') 
                    : 'None specified'}
                </p>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Epic Type</label>
                <p className="text-sm mt-1">{item.epic_type || 'Not specified'}</p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="benefits" className="p-4 mt-0 space-y-4">
            <div className="space-y-3">
              <div className="p-3 border rounded-lg">
                <h4 className="text-sm font-medium mb-2">Business Value</h4>
                <p className="text-sm text-muted-foreground">
                  Expected business value and ROI metrics will be tracked here.
                </p>
              </div>
              <div className="p-3 border rounded-lg">
                <h4 className="text-sm font-medium mb-2">Cost Savings</h4>
                <p className="text-sm text-muted-foreground">
                  Estimated cost savings from implementing this epic.
                </p>
              </div>
              <div className="p-3 border rounded-lg">
                <h4 className="text-sm font-medium mb-2">Customer Impact</h4>
                <p className="text-sm text-muted-foreground">
                  Expected impact on customer satisfaction and engagement.
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="value" className="p-4 mt-0 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 border rounded-lg">
                <label className="text-xs font-medium text-muted-foreground">Strategic Value Score</label>
                <p className="text-2xl font-bold mt-1">
                  {item.strategic_value_score || 'N/A'}
                </p>
              </div>
              <div className="p-3 border rounded-lg">
                <label className="text-xs font-medium text-muted-foreground">Estimate Confidence</label>
                <p className="text-2xl font-bold mt-1">
                  {item.estimate_confidence ? `${item.estimate_confidence}%` : 'N/A'}
                </p>
              </div>
              <div className="p-3 border rounded-lg">
                <label className="text-xs font-medium text-muted-foreground">Capitalized</label>
                <p className="text-sm mt-1">{item.capitalized ? 'Yes' : 'No'}</p>
              </div>
              <div className="p-3 border rounded-lg">
                <label className="text-xs font-medium text-muted-foreground">MVP</label>
                <p className="text-sm mt-1">{item.mvp ? 'Yes' : 'No'}</p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="forecast" className="p-4 mt-0 space-y-4">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Start Date</label>
                  <p className="text-sm mt-1">
                    {item.start_date ? new Date(item.start_date).toLocaleDateString() : 'Not set'}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">End Date</label>
                  <p className="text-sm mt-1">
                    {item.end_date ? new Date(item.end_date).toLocaleDateString() : 'Not set'}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Target Completion</label>
                  <p className="text-sm mt-1">
                    {item.target_completion_date 
                      ? new Date(item.target_completion_date).toLocaleDateString() 
                      : 'Not set'}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Initiation Date</label>
                  <p className="text-sm mt-1">
                    {item.initiation_date 
                      ? new Date(item.initiation_date).toLocaleDateString() 
                      : 'Not set'}
                  </p>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Effort SWAG</label>
                <p className="text-sm mt-1">{item.effort_swag || 'Not estimated'}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Estimation Method</label>
                <p className="text-sm mt-1">{item.estimate_method || 'Not specified'}</p>
              </div>
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
