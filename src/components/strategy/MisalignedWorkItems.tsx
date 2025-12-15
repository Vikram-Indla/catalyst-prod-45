import { useQuery } from '@tanstack/react-query';
import { AlertTriangle } from 'lucide-react';
import { PremiumCard, PremiumCardHeader, PremiumCardContent } from '@/components/ui/premium-card';

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

  const headerAction = (
    <span className="text-lg font-bold" style={{ color: totalMisaligned > 0 ? 'hsl(var(--destructive))' : 'var(--text-1)' }}>
      {totalMisaligned}
    </span>
  );

  return (
    <PremiumCard className="h-full flex flex-col">
      <PremiumCardHeader title="Misaligned" action={headerAction} />
      <PremiumCardContent className="flex-1">
        {totalMisaligned === 0 ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[120px] gap-2">
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ backgroundColor: 'hsl(var(--secondary-green) / 0.1)' }}
            >
              <AlertTriangle className="w-4 h-4" style={{ color: 'hsl(var(--secondary-green))' }} />
            </div>
            <p className="text-sm font-medium" style={{ color: 'var(--text-1)' }}>
              All items aligned
            </p>
            <p className="text-xs" style={{ color: 'var(--text-3)' }}>No misalignment detected</p>
          </div>
        ) : (
          <div className="space-y-0">
            {items.map((item, index) => (
              <div 
                key={item.label} 
                className="flex items-center justify-between py-2.5"
                style={{ borderBottom: index < items.length - 1 ? '1px solid var(--divider)' : 'none' }}
              >
                <span className="text-sm" style={{ color: 'var(--text-1)' }}>{item.label}</span>
                <span 
                  className="text-sm font-semibold"
                  style={{ color: item.count > 0 ? 'hsl(var(--destructive))' : 'var(--text-2)' }}
                >
                  {item.count}
                </span>
              </div>
            ))}
          </div>
        )}
      </PremiumCardContent>
    </PremiumCard>
  );
}
