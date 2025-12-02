import { FileText, FolderKanban, RefreshCw, AlertCircle } from 'lucide-react';
import { MetricCard } from './MetricCard';
import { useProjectMetrics } from '@/hooks/useTestDashboard';
import { useNavigate } from 'react-router-dom';
import { AdhocCycleIndicator } from './AdhocCycleIndicator';

export function ProjectMetricsCards() {
  const { data: metrics, isLoading } = useProjectMetrics();
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <MetricCard
        title="Cases"
        count={metrics?.total_cases || 0}
        icon={FileText}
        color="blue"
        isLoading={isLoading}
        onClick={() => navigate('/tests/cases')}
      />
      
      <MetricCard
        title="Sets"
        count={metrics?.total_sets || 0}
        icon={FolderKanban}
        color="green"
        isLoading={isLoading}
        onClick={() => navigate('/tests/sets')}
      />
      
      <MetricCard
        title="Cycles"
        count={metrics?.total_cycles || 0}
        icon={RefreshCw}
        color="gold"
        isLoading={isLoading}
        onClick={() => navigate('/tests/cycles')}
        infoTooltip={metrics?.total_cycles === 1 ? <AdhocCycleIndicator /> : undefined}
      />
      
      <MetricCard
        title="Defects"
        count={metrics?.total_defects || 0}
        icon={AlertCircle}
        color="red"
        isLoading={isLoading}
      />
    </div>
  );
}
