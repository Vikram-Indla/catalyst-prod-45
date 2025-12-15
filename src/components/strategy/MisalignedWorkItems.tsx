import { useQuery } from '@tanstack/react-query';
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

  return (
    <PremiumCard className="h-full flex flex-col">
      <PremiumCardHeader title="Misaligned" />
      <PremiumCardContent className="flex-1">
        {/* Total KPI */}
        <div className="flex items-center justify-between py-2 mb-1" style={{ borderBottom: '1px solid var(--divider)' }}>
          <span className="text-[10px] font-medium uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>Total</span>
          <span className="text-lg font-bold" style={{ color: 'var(--accent-color)' }}>{totalMisaligned}</span>
        </div>
        
        {/* Breakdown */}
        <div className="space-y-0">
          {items.map((item, index) => (
            <div 
              key={item.label} 
              className="flex items-center justify-between py-2"
              style={{ borderBottom: index < items.length - 1 ? '1px solid var(--divider)' : 'none' }}
            >
              <span className="text-xs" style={{ color: 'var(--text-2)' }}>{item.label}</span>
              <span className="text-xs font-semibold" style={{ color: 'var(--accent-color)' }}>{item.count}</span>
            </div>
          ))}
        </div>
      </PremiumCardContent>
    </PremiumCard>
  );
}
