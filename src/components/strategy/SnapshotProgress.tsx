import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { PremiumCard, PremiumCardHeader, PremiumCardContent } from '@/components/ui/premium-card';

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
  dependencies: { total: number; resolved: number };
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
    queryKey: ['snapshot-progress-jiraalign', snapshotId],
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

      const { data: dependencies } = await supabase
        .from('dependencies')
        .select('status, delivered_at');

      const calcCounts = (items: { status?: string | null; state?: string | null }[] | null): StatusCounts => {
        const list = items || [];
        return {
          total: list.length,
          notStarted: list.filter(i => isNotStarted(i.status || i.state)).length,
          inProgress: list.filter(i => isInProgress(i.status || i.state)).length,
          completed: list.filter(i => isCompleted(i.status || i.state)).length,
        };
      };

      const depList = dependencies || [];
      const resolvedDeps = depList.filter(d => 
        d.delivered_at || ['delivered', 'resolved', 'done', 'completed'].includes((d.status || '').toLowerCase())
      ).length;

      return {
        themes: calcCounts(themes),
        epics: calcCounts(epics),
        features: calcCounts(features),
        stories: calcCounts(stories),
        dependencies: { total: depList.length, resolved: resolvedDeps },
      };
    },
    enabled: !!snapshotId,
  });

  const ProgressRow = ({ 
    label, 
    accepted, 
    total, 
    onClick,
    isLast = false,
  }: { 
    label: string; 
    accepted: number; 
    total: number; 
    onClick?: () => void;
    isLast?: boolean;
  }) => {
    const percent = total > 0 ? Math.round((accepted / total) * 100) : 0;
    
    return (
      <div 
        className="flex items-center gap-3 py-2.5 cursor-pointer rounded transition-colors hover:bg-[var(--surface-2)] group"
        onClick={onClick}
        style={{ borderBottom: isLast ? 'none' : '1px solid var(--divider)' }}
      >
        <span className="text-sm min-w-[80px]" style={{ color: 'var(--text-1)' }}>
          {label}
        </span>
        <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--surface-3)' }}>
          <div 
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${percent}%`, backgroundColor: 'hsl(var(--secondary-green))' }}
          />
        </div>
        <span className="text-sm font-semibold min-w-[48px] text-right" style={{ color: 'var(--text-1)' }}>
          {accepted}/{total}
        </span>
        <ChevronRight 
          className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" 
          style={{ color: 'var(--text-3)' }} 
        />
      </div>
    );
  };

  const handleThemesClick = () => navigate('/enterprise/strategic-backlog?tab=themes');
  const handleEpicsClick = () => navigate('/items/epics');
  const handleFeaturesClick = () => navigate('/items/features');
  const handleStoriesClick = () => navigate('/items/stories');
  const handleDependenciesClick = () => navigate('/dependencies');

  return (
    <PremiumCard className="h-full flex flex-col">
      <PremiumCardHeader title="Progress" />
      <PremiumCardContent className="flex-1">
        {isLoading ? (
          <div className="flex items-center justify-center h-full min-h-[120px]">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        ) : !progressData ? (
          <div className="flex items-center justify-center h-full min-h-[120px]">
            <span className="text-sm" style={{ color: 'var(--text-3)' }}>Select snapshot</span>
          </div>
        ) : (
          <div className="space-y-0">
            <ProgressRow label="Themes" accepted={progressData.themes.completed} total={progressData.themes.total} onClick={handleThemesClick} />
            <ProgressRow label="Epics" accepted={progressData.epics.completed} total={progressData.epics.total} onClick={handleEpicsClick} />
            <ProgressRow label="Features" accepted={progressData.features.completed} total={progressData.features.total} onClick={handleFeaturesClick} />
            <ProgressRow label="Stories" accepted={progressData.stories.completed} total={progressData.stories.total} onClick={handleStoriesClick} />
            <ProgressRow label="Dependencies" accepted={progressData.dependencies.resolved} total={progressData.dependencies.total} onClick={handleDependenciesClick} isLast />
          </div>
        )}
      </PremiumCardContent>
    </PremiumCard>
  );
}
