import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

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

// Status mapping helpers
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

  // Compact progress row
  const ProgressRow = ({ 
    label, 
    accepted, 
    total, 
    onClick 
  }: { 
    label: string; 
    accepted: number; 
    total: number; 
    onClick?: () => void;
  }) => {
    const percent = total > 0 ? (accepted / total) * 100 : 0;
    
    return (
      <div 
        className="flex items-center gap-2 py-1.5 cursor-pointer rounded transition-colors"
        onClick={onClick}
        style={{ borderBottom: '1px solid var(--divider)' }}
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--surface-2)'}
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
      >
        <span className="text-xs min-w-[70px]" style={{ color: 'var(--text-2)' }}>
          {label}
        </span>
        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--surface-3)' }}>
          <div 
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${percent}%`, backgroundColor: 'hsl(var(--secondary-green))' }}
          />
        </div>
        <span className="text-xs font-medium min-w-[36px] text-right" style={{ color: 'var(--accent-color)' }}>
          {accepted}/{total}
        </span>
      </div>
    );
  };

  const handleThemesClick = () => navigate('/enterprise/strategic-backlog?tab=themes');
  const handleEpicsClick = () => navigate('/items/epics');
  const handleFeaturesClick = () => navigate('/items/features');
  const handleStoriesClick = () => navigate('/items/stories');
  const handleDependenciesClick = () => navigate('/dependencies');

  return (
    <Card 
      className="rounded-lg shadow-sm border"
      style={{ 
        borderColor: 'var(--divider)',
        backgroundColor: 'var(--surface-1)',
      }}
    >
      <CardHeader 
        className="py-2 px-3 border-b" 
        style={{ 
          borderColor: 'var(--divider)',
          backgroundColor: 'var(--surface-1)',
        }}
      >
        <CardTitle className="text-xs font-semibold" style={{ color: 'var(--text-1)' }}>
          Progress</CardTitle>
      </CardHeader>
      <CardContent className="px-3 py-2">
        {isLoading ? (
          <div className="py-4 text-center text-xs" style={{ color: 'var(--text-3)' }}>Loading...</div>
        ) : !progressData ? (
          <div className="py-4 text-center text-xs" style={{ color: 'var(--text-3)' }}>Select snapshot</div>
        ) : (
          <div className="space-y-0">
            <ProgressRow label="Themes" accepted={progressData.themes.completed} total={progressData.themes.total} onClick={handleThemesClick} />
            <ProgressRow label="Epics" accepted={progressData.epics.completed} total={progressData.epics.total} onClick={handleEpicsClick} />
            <ProgressRow label="Features" accepted={progressData.features.completed} total={progressData.features.total} onClick={handleFeaturesClick} />
            <ProgressRow label="Stories" accepted={progressData.stories.completed} total={progressData.stories.total} onClick={handleStoriesClick} />
            <ProgressRow label="Dependencies" accepted={progressData.dependencies.resolved} total={progressData.dependencies.total} onClick={handleDependenciesClick} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
