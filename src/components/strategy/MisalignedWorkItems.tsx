import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
      return { themes: 0, epics: 0, features: 0, dependencies: 0 };
    },
    enabled: !!snapshotId,
  });

  const items = [
    { label: 'Themes', count: misalignedData.themes },
    { label: 'Epics', count: misalignedData.epics },
    { label: 'Features', count: misalignedData.features },
    { label: 'Dependencies', count: misalignedData.dependencies },
  ];

  const totalMisaligned = misalignedData.themes + misalignedData.epics + misalignedData.features;

  return (
    <Card 
      className="rounded-lg shadow-sm"
      style={{ 
        borderLeft: '2px solid var(--accent-color)',
        backgroundColor: 'var(--surface-1)',
      }}
    >
      <CardHeader className="py-2 px-3" style={{ backgroundColor: 'var(--surface-2)', borderRadius: '8px 8px 0 0' }}>
        <CardTitle className="text-xs font-semibold" style={{ color: 'var(--text-1)' }}>
          Misaligned</CardTitle>
      </CardHeader>
      <CardContent className="px-3 py-2">
        {/* Total KPI */}
        <div className="flex items-center justify-between py-2 mb-1" style={{ borderBottom: '1px solid var(--divider)' }}>
          <span className="text-[10px] font-medium uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>Total</span>
          <span className="text-lg font-bold" style={{ color: 'var(--accent-color)' }}>{totalMisaligned}</span>
        </div>
        
        {/* Breakdown */}
        <div className="space-y-0">
          {items.map((item) => (
            <div 
              key={item.label} 
              className="flex items-center justify-between py-1.5"
              style={{ borderBottom: '1px solid var(--divider)' }}
            >
              <span className="text-xs" style={{ color: 'var(--text-2)' }}>{item.label}</span>
              <span className="text-xs font-semibold" style={{ color: 'var(--accent-color)' }}>{item.count}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
