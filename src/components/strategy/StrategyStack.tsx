import { useState } from 'react';
import { Target, Palette, Boxes, FileCode, ChevronRight, Plus, ExternalLink } from 'lucide-react';
import { PremiumCard, PremiumCardHeader, PremiumCardContent } from '@/components/ui/premium-card';
import { useStrategyPyramidCounts } from '@/hooks/useExecutionMetrics';
import { useOKRv2StrategyMetrics } from '@/hooks/useOKRv2StrategyMetrics';
import { PyramidDrilldownDrawer } from './PyramidDrilldownDrawer';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface StrategyStackProps {
  onLayerClick: (label: string) => void;
  snapshotId?: string;
}

type LayerKey = 'objectives' | 'themes' | 'epics' | 'features';

interface LayerConfig {
  key: LayerKey;
  label: string;
  icon: typeof Target;
  color: string;
  bgColor: string;
}

const layerConfigs: LayerConfig[] = [
  { 
    key: 'objectives', 
    label: 'Objectives', 
    icon: Target,
    color: 'hsl(var(--secondary-green))',
    bgColor: 'hsl(var(--secondary-green) / 0.1)',
  },
  { 
    key: 'themes', 
    label: 'Themes', 
    icon: Palette,
    color: 'hsl(var(--secondary-bronze))',
    bgColor: 'hsl(var(--secondary-bronze) / 0.1)',
  },
  { 
    key: 'epics', 
    label: 'Epics', 
    icon: Boxes,
    color: 'hsl(var(--brand-gold))',
    bgColor: 'hsl(var(--brand-gold) / 0.1)',
  },
  { 
    key: 'features', 
    label: 'Features', 
    icon: FileCode,
    color: 'hsl(var(--secondary-champagne))',
    bgColor: 'hsl(var(--secondary-champagne) / 0.1)',
  },
];

export function StrategyStack({ onLayerClick, snapshotId }: StrategyStackProps) {
  const navigate = useNavigate();
  const [drilldownLayer, setDrilldownLayer] = useState<string | null>(null);
  
  const { data: counts, isLoading } = useStrategyPyramidCounts(snapshotId);
  const { data: okrMetrics, isLoading: okrLoading } = useOKRv2StrategyMetrics(snapshotId);

  const objectivesCount = okrMetrics?.count || 0;

  const getLayerData = (key: LayerKey) => {
    switch (key) {
      case 'objectives':
        return { 
          count: objectivesCount, 
          aligned: objectivesCount, 
          gap: 0,
          progress: okrMetrics?.avgProgress || 0,
        };
      case 'themes':
        return { 
          count: counts?.themes || 0, 
          aligned: counts?.themes || 0, 
          gap: 0,
          progress: 0,
        };
      case 'epics':
        return { 
          count: counts?.epics || 0, 
          aligned: counts?.alignedEpics || 0, 
          gap: counts?.misalignedEpics || 0,
          progress: counts?.alignedEpics && counts?.epics ? Math.round((counts.alignedEpics / counts.epics) * 100) : 0,
        };
      case 'features':
        return { 
          count: counts?.features || 0, 
          aligned: counts?.alignedFeatures || 0, 
          gap: counts?.misalignedFeatures || 0,
          progress: counts?.alignedFeatures && counts?.features ? Math.round((counts.alignedFeatures / counts.features) * 100) : 0,
        };
      default:
        return { count: 0, aligned: 0, gap: 0, progress: 0 };
    }
  };

  const handleDrilldown = (label: string) => {
    setDrilldownLayer(label);
    onLayerClick(label);
  };

  const handleOpenOKRHub = () => navigate('/enterprise/okr-hub');

  const allEmpty = !isLoading && !okrLoading && 
    objectivesCount === 0 && 
    (counts?.themes ?? 0) === 0 && 
    (counts?.epics ?? 0) === 0 && 
    (counts?.features ?? 0) === 0;

  return (
    <>
      <PremiumCard accent="bronze">
        <PremiumCardHeader
          title="Strategy Coverage & Alignment" 
          subtitle="Coverage across strategic layers"
          action={
            <div className="flex items-center gap-2">
              <Button 
                size="sm" 
                className="gap-1.5 h-7 text-[12px]"
                style={{ backgroundColor: 'hsl(var(--brand-gold))', color: 'white' }}
              >
                <Plus className="w-3 h-3" />
                Create Objective
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-1.5 h-7 text-[12px]"
                onClick={handleOpenOKRHub}
              >
                <ExternalLink className="w-3 h-3" />
                OKR Hub
              </Button>
            </div>
          }
        />
        <PremiumCardContent noPadding>
          {/* Empty state banner */}
          {allEmpty && (
            <div 
              className="px-4 py-3 text-[13px] border-b"
              style={{ 
                backgroundColor: 'hsl(var(--brand-gold) / 0.08)',
                borderColor: 'hsl(var(--brand-gold) / 0.2)',
                color: 'var(--text-1)',
              }}
            >
              No strategy items linked yet. Create an objective to start tracking progress, alignment, and risk.
            </div>
          )}

          {/* Table header */}
          <div 
            className="grid items-center px-4 py-2"
            style={{
              gridTemplateColumns: '160px 64px 1fr 56px 56px 56px 28px',
              backgroundColor: 'var(--surface-2)',
              borderBottom: '1px solid var(--divider)',
            }}
          >
            <div className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-2)' }}>
              Layer
            </div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-right pr-2" style={{ color: 'var(--text-2)' }}>
              Count
            </div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-center" style={{ color: 'var(--text-2)' }}>
              Coverage
            </div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-right" style={{ color: 'var(--text-2)' }}>
              %
            </div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-right" style={{ color: 'var(--text-2)' }}>
              Aligned
            </div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-right" style={{ color: 'var(--text-2)' }}>
              Gap
            </div>
            <div></div>
          </div>

          {/* Table rows */}
          {layerConfigs.map((layer, index) => {
            const data = getLayerData(layer.key);
            const Icon = layer.icon;
            const isLast = index === layerConfigs.length - 1;
            
            return (
              <button
                key={layer.key}
                onClick={() => handleDrilldown(layer.label)}
                className="w-full grid items-center px-4 py-2.5 transition-colors text-left group hover:bg-[var(--surface-2)]"
                style={{ 
                  gridTemplateColumns: '160px 64px 1fr 56px 56px 56px 28px',
                  borderBottom: isLast ? 'none' : '1px solid var(--divider)',
                }}
              >
                {/* Layer icon + label */}
                <div className="flex items-center gap-2">
                  <div 
                    className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: layer.bgColor }}
                  >
                    <Icon className="w-3 h-3" style={{ color: layer.color }} />
                  </div>
                  <span 
                    className="text-[13px] font-medium"
                    style={{ color: 'var(--text-1)' }}
                  >
                    {layer.label}
                  </span>
                </div>

                {/* Count - right aligned */}
                <div className="text-right pr-2">
                  <span 
                    className="text-[14px] font-bold tabular-nums"
                    style={{ color: 'var(--text-1)' }}
                  >
                    {isLoading || okrLoading ? '–' : data.count}
                  </span>
                </div>

                {/* Coverage bar */}
                <div className="flex items-center px-3">
                  {data.count > 0 ? (
                    <div 
                      className="w-full h-[6px] rounded-full overflow-hidden" 
                      style={{ backgroundColor: 'var(--surface-3)' }}
                    >
                      <div 
                        className="h-full rounded-full transition-all"
                        style={{ 
                          width: `${data.progress}%`,
                          backgroundColor: layer.color,
                        }}
                      />
                    </div>
                  ) : (
                    <div 
                      className="w-full h-[6px] rounded-full" 
                      style={{ backgroundColor: 'var(--surface-3)' }}
                    />
                  )}
                </div>

                {/* Percentage */}
                <div className="text-right">
                  <span 
                    className="text-[13px] font-semibold tabular-nums"
                    style={{ color: data.count === 0 ? 'var(--text-3)' : 'var(--text-1)' }}
                  >
                    {data.count === 0 ? '—' : `${data.progress}%`}
                  </span>
                </div>

                {/* Aligned */}
                <div className="text-right">
                  <span 
                    className="text-[13px] font-semibold tabular-nums"
                    style={{ color: data.aligned > 0 ? 'hsl(var(--secondary-green))' : 'var(--text-3)' }}
                  >
                    {data.aligned}
                  </span>
                </div>

                {/* Gap */}
                <div className="text-right">
                  <span 
                    className="text-[13px] font-semibold tabular-nums"
                    style={{ color: data.gap > 0 ? 'hsl(var(--destructive))' : 'var(--text-3)' }}
                  >
                    {data.gap}
                  </span>
                </div>

                {/* Drilldown chevron */}
                <div className="flex justify-center">
                  <ChevronRight 
                    className="w-4 h-4 opacity-40 group-hover:opacity-100 transition-opacity"
                    style={{ color: 'var(--text-2)' }}
                  />
                </div>
              </button>
            );
          })}
        </PremiumCardContent>
      </PremiumCard>

      <PyramidDrilldownDrawer
        open={!!drilldownLayer}
        onClose={() => setDrilldownLayer(null)}
        layer={drilldownLayer}
        snapshotId={snapshotId}
      />
    </>
  );
}
