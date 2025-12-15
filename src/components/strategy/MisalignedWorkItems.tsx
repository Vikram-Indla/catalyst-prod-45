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
    <Card 
      className="rounded-lg shadow-sm"
      style={{ 
        borderLeft: '3px solid var(--accent-color)',
        backgroundColor: 'var(--surface-1)',
      }}
    >
      <CardHeader className="py-3 px-4" style={{ backgroundColor: 'var(--surface-2)', borderRadius: '8px 8px 0 0' }}>
        <CardTitle className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>
          Misaligned Work Items
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <div className="space-y-3">
          {/* Total KPI - CIO-ready */}
          <div className="flex items-center justify-between p-3 rounded-md" style={{ backgroundColor: 'var(--surface-2)' }}>
            <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>Total Misaligned</span>
            <span className="text-xl font-bold" style={{ color: 'var(--accent-color)' }}>{totalMisaligned}</span>
          </div>
          
          {/* Breakdown list - compact */}
          <div className="space-y-0">
            {items.map((item) => (
              <div key={item.label} className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid var(--divider)' }}>
                <span className="text-xs" style={{ color: 'var(--text-2)' }}>{item.label}</span>
                <span className={`text-sm font-semibold ${item.color}`}>{item.count}</span>
              </div>
            ))}
          </div>

          <p className="text-[11px] mt-3" style={{ color: 'var(--text-3)' }}>
            Items associated with themes or objectives but not planned in an aligned PI.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
