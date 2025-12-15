import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle, Link2 } from 'lucide-react';
import { PremiumCard, PremiumCardHeader, PremiumCardContent } from '@/components/ui/premium-card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface MisalignedWorkItemsProps {
  snapshotId?: string;
}

export function MisalignedWorkItems({ snapshotId }: MisalignedWorkItemsProps) {
  const navigate = useNavigate();
  
  const { data: alignmentData = { themes: { total: 0, aligned: 0 }, epics: { total: 0, aligned: 0 }, features: { total: 0, aligned: 0 }, totalItems: 0 } } = useQuery({
    queryKey: ['alignment-data', snapshotId],
    queryFn: async () => {
      if (!snapshotId) return { themes: { total: 0, aligned: 0 }, epics: { total: 0, aligned: 0 }, features: { total: 0, aligned: 0 }, totalItems: 0 };
      // Return mock structure - real implementation would query linked items
      return { 
        themes: { total: 0, aligned: 0 }, 
        epics: { total: 0, aligned: 0 }, 
        features: { total: 0, aligned: 0 }, 
        totalItems: 0 
      };
    },
    enabled: !!snapshotId,
  });

  const totalItems = alignmentData.themes.total + alignmentData.epics.total + alignmentData.features.total;
  const totalMisaligned = (alignmentData.themes.total - alignmentData.themes.aligned) + 
                          (alignmentData.epics.total - alignmentData.epics.aligned) + 
                          (alignmentData.features.total - alignmentData.features.aligned);

  const items = [
    { label: 'Themes', misaligned: alignmentData.themes.total - alignmentData.themes.aligned, total: alignmentData.themes.total },
    { label: 'Epics', misaligned: alignmentData.epics.total - alignmentData.epics.aligned, total: alignmentData.epics.total },
    { label: 'Features', misaligned: alignmentData.features.total - alignmentData.features.aligned, total: alignmentData.features.total },
  ];

  const topMisalignedLayer = items.find(i => i.misaligned > 0)?.label || null;

  const headerAction = (
    <span 
      className="text-[18px] font-bold" 
      style={{ color: totalMisaligned > 0 ? 'hsl(var(--destructive))' : 'hsl(var(--secondary-green))' }}
    >
      {totalMisaligned}
    </span>
  );

  return (
    <PremiumCard className="h-full flex flex-col">
      <PremiumCardHeader title="Alignment" action={headerAction} />
      <PremiumCardContent className="flex-1 py-2">
        {totalItems === 0 ? (
          // No linked work yet - truthful empty state
          <div className="flex flex-col items-center justify-center h-full min-h-[100px] gap-2">
            <div 
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ backgroundColor: 'var(--surface-3)' }}
            >
              <Link2 className="w-4 h-4" style={{ color: 'var(--text-3)' }} />
            </div>
            <p className="text-[14px] font-medium text-center" style={{ color: 'var(--text-1)' }}>
              No linked work yet
            </p>
            <p className="text-[12px] text-center" style={{ color: 'var(--text-2)' }}>
              Link themes, epics, or features to this snapshot
            </p>
          </div>
        ) : totalMisaligned === 0 ? (
          // All items aligned
          <div className="flex flex-col items-center justify-center h-full min-h-[100px] gap-2">
            <div 
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ backgroundColor: 'hsl(var(--secondary-green) / 0.1)' }}
            >
              <CheckCircle className="w-4 h-4" style={{ color: 'hsl(var(--secondary-green))' }} />
            </div>
            <p className="text-[14px] font-medium" style={{ color: 'var(--text-1)' }}>
              All {totalItems} items aligned
            </p>
          </div>
        ) : (
          <div className="space-y-0">
            {items.map((item, index) => (
              <div 
                key={item.label} 
                className="flex items-center justify-between py-2"
                style={{ borderBottom: index < items.length - 1 ? '1px solid var(--divider)' : 'none' }}
              >
                <span className="text-[14px] font-medium" style={{ color: 'var(--text-1)' }}>{item.label}</span>
                <div className="flex items-center gap-2">
                  <span 
                    className="text-[14px] font-bold"
                    style={{ color: item.misaligned > 0 ? 'hsl(var(--destructive))' : 'var(--text-3)' }}
                  >
                    {item.misaligned}
                  </span>
                  <span className="text-[12px]" style={{ color: 'var(--text-3)' }}>
                    / {item.total}
                  </span>
                </div>
              </div>
            ))}
            {topMisalignedLayer && (
              <div className="pt-2 mt-1" style={{ borderTop: '1px solid var(--divider)' }}>
                <p className="text-[12px]" style={{ color: 'var(--text-2)' }}>
                  Top gap: <span className="font-semibold">{topMisalignedLayer}</span>
                </p>
              </div>
            )}
          </div>
        )}
      </PremiumCardContent>
    </PremiumCard>
  );
}
