import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface MisalignedWorkItemsProps {
  snapshotId?: string;
}

export function MisalignedWorkItems({ snapshotId }: MisalignedWorkItemsProps) {
  const { data: misalignedData = { themes: 0, epics: 0, features: 0, dependencies: 0 } } = useQuery({
    queryKey: ['misaligned-work-items', snapshotId],
    queryFn: async () => {
      if (!snapshotId) return { themes: 0, epics: 0, features: 0, dependencies: 0 };

      // In a real implementation, this would query for work items 
      // associated with objectives/goals in the pyramid but not 
      // planned in an aligned PI
      
      // Empty data - populated from database
      return {
        themes: 0,
        epics: 0,
        features: 0,
        dependencies: 0
      };
    },
    enabled: !!snapshotId,
  });

  const items = [
    { label: 'Misaligned Themes', count: misalignedData.themes, color: 'text-brand-gold' },
    { label: 'Misaligned Epics', count: misalignedData.epics, color: 'text-brand-gold' },
    { label: 'Misaligned Features', count: misalignedData.features, color: 'text-brand-gold' },
    { label: 'Dependencies', count: misalignedData.dependencies, color: 'text-info' },
  ];

  const totalMisaligned = misalignedData.themes + misalignedData.epics + misalignedData.features;

  return (
    <Card className="border-l-4 border-l-brand-gold">
      <CardHeader>
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-brand-gold" />
          <CardTitle className="text-base flex items-center gap-2">Misaligned Work Items</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
            <span className="text-sm font-semibold">Total Misaligned</span>
            <span className="text-2xl font-bold text-brand-gold">{totalMisaligned}</span>
          </div>
          
          <div className="space-y-2">
            {items.map((item) => (
              <div key={item.label} className="flex items-center justify-between py-2 border-b last:border-0">
                <span className="text-sm text-secondary-green">{item.label}</span>
                <span className={`text-sm font-semibold ${item.color}`}>{item.count}</span>
              </div>
            ))}
          </div>

          <p className="text-xs text-muted-foreground mt-4 italic">
            Misaligned work items are associated with themes or objectives in the pyramid, 
            but not planned in an aligned Program Increment.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
