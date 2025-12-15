import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Info } from 'lucide-react';
import { PremiumCard, PremiumCardHeader, PremiumCardContent } from '@/components/ui/premium-card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface SnapshotProgressProps {
  snapshotId?: string;
}

interface StatusCounts {
  total: number;
  notStarted: number;
  inProgress: number;
  completed: number;
}

interface ProgressData {
  themes: StatusCounts;
  epics: StatusCounts;
  features: StatusCounts;
  stories: StatusCounts;
  risks: { total: number; mitigated: number };
}

const isNotStarted = (status: string | null) => {
  const s = (status || '').toLowerCase();
  return ['not_started', 'proposed', 'funnel', 'backlog', 'new', ''].includes(s) || !status;
};

const isCompleted = (status: string | null) => {
  const s = (status || '').toLowerCase();
  return ['done', 'completed', 'accepted', 'closed', 'released'].includes(s);
};

const isInProgress = (status: string | null) => {
  return !isNotStarted(status) && !isCompleted(status);
};

export function SnapshotProgress({ snapshotId }: SnapshotProgressProps) {
  const navigate = useNavigate();

  const { data: progressData, isLoading } = useQuery({
    queryKey: ['snapshot-coverage-v2', snapshotId],
    queryFn: async (): Promise<ProgressData | null> => {
      if (!snapshotId) return null;

      const { data: themes } = await supabase
        .from('strategic_themes')
        .select('status')
        .eq('snapshot_id', snapshotId);

      const { data: epics } = await supabase
        .from('epics')
        .select('status, state')
        .is('deleted_at', null);

      const { data: features } = await supabase
        .from('features')
        .select('status')
        .is('deleted_at', null);

      const { data: stories } = await supabase
        .from('stories')
        .select('status, state')
        .is('deleted_at', null);

      // Fetch risks instead of dependencies
      const { data: risks } = await supabase
        .from('risks')
        .select('status, resolution_method');

      const calcCounts = (items: { status?: string | null; state?: string | null }[] | null): StatusCounts => {
        const list = items || [];
        return {
          total: list.length,
          notStarted: list.filter(i => isNotStarted(i.status || i.state)).length,
          inProgress: list.filter(i => isInProgress(i.status || i.state)).length,
          completed: list.filter(i => isCompleted(i.status || i.state)).length,
        };
      };

      // Count mitigated/resolved risks
      const riskList = risks || [];
      const mitigatedRisks = riskList.filter(r => 
        r.resolution_method === 'Resolved' || 
        ['closed', 'mitigated', 'resolved'].includes((r.status || '').toLowerCase())
      ).length;

      return {
        themes: calcCounts(themes),
        epics: calcCounts(epics),
        features: calcCounts(features),
        stories: calcCounts(stories),
        risks: { total: riskList.length, mitigated: mitigatedRisks },
      };
    },
    enabled: !!snapshotId,
  });

  const ProgressRow = ({ 
    label, 
    completed, 
    total, 
    onClick,
    isLast = false,
  }: { 
    label: string; 
    completed: number; 
    total: number; 
    onClick?: () => void;
    isLast?: boolean;
  }) => {
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    return (
      <div 
        className="flex items-center gap-2 py-2 cursor-pointer rounded transition-colors hover:bg-[var(--surface-2)] group"
        onClick={onClick}
        style={{ borderBottom: isLast ? 'none' : '1px solid var(--divider)' }}
      >
        <span className="text-[14px] font-medium min-w-[72px]" style={{ color: 'var(--text-1)' }}>
          {label}
        </span>
        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--surface-3)' }}>
          <div 
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${percent}%`, backgroundColor: 'hsl(var(--secondary-green))' }}
          />
        </div>
        <span className="text-[14px] font-bold min-w-[44px] text-right" style={{ color: 'var(--text-1)' }}>
          {completed}/{total}
        </span>
        <ChevronRight 
          className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" 
          style={{ color: 'var(--text-2)' }} 
        />
      </div>
    );
  };

  const handleThemesClick = () => navigate('/enterprise/strategic-backlog?tab=themes');
  const handleEpicsClick = () => navigate('/items/epics');
  const handleFeaturesClick = () => navigate('/items/features');
  const handleStoriesClick = () => navigate('/items/stories');
  const handleRisksClick = () => navigate('/enterprise/risks');

  const headerAction = (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Info className="w-3.5 h-3.5 cursor-help" style={{ color: 'var(--text-3)' }} />
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[200px] text-[12px]">
          Coverage indicates items linked to this snapshot
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  return (
    <PremiumCard className="h-full flex flex-col">
      <PremiumCardHeader title="Coverage" action={headerAction} />
      <PremiumCardContent className="flex-1 py-2">
        {isLoading ? (
          <div className="flex items-center justify-center h-full min-h-[100px]">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
          </div>
        ) : !progressData ? (
          <div className="flex items-center justify-center h-full min-h-[100px]">
            <span className="text-[14px]" style={{ color: 'var(--text-2)' }}>Select snapshot</span>
          </div>
        ) : (
          <div className="space-y-0">
            <ProgressRow label="Themes" completed={progressData.themes.completed} total={progressData.themes.total} onClick={handleThemesClick} />
            <ProgressRow label="Epics" completed={progressData.epics.completed} total={progressData.epics.total} onClick={handleEpicsClick} />
            <ProgressRow label="Features" completed={progressData.features.completed} total={progressData.features.total} onClick={handleFeaturesClick} />
            <ProgressRow label="Stories" completed={progressData.stories.completed} total={progressData.stories.total} onClick={handleStoriesClick} />
            <ProgressRow label="Risks" completed={progressData.risks.mitigated} total={progressData.risks.total} onClick={handleRisksClick} isLast />
          </div>
        )}
      </PremiumCardContent>
    </PremiumCard>
  );
}
