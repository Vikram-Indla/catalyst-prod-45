import { useNavigate } from 'react-router-dom';
import { FlaskConical, Layers, CalendarClock, Bug } from 'lucide-react';
import { MetricCard } from './MetricCard';
import { ProjectMetrics } from '@/types/dashboard.types';

interface ProjectMetricsCardsProps {
  metrics: ProjectMetrics;
  programId: string;
  isLoading?: boolean;
}

export function ProjectMetricsCards({ metrics, programId, isLoading }: ProjectMetricsCardsProps) {
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <MetricCard
        title="Cases"
        count={metrics.total_cases}
        icon={FlaskConical}
        color="#3b82f6"
        onClick={() => navigate(`/programs/${programId}/tests/cases`)}
        isLoading={isLoading}
      />
      <MetricCard
        title="Sets"
        count={metrics.total_sets}
        icon={Layers}
        color="#10b981"
        onClick={() => navigate(`/programs/${programId}/tests/sets`)}
        isLoading={isLoading}
      />
      <MetricCard
        title="Cycles"
        count={metrics.total_cycles}
        icon={CalendarClock}
        color="#c69c6d"
        onClick={() => navigate(`/programs/${programId}/tests/cycles`)}
        isLoading={isLoading}
      />
      <MetricCard
        title="Defects"
        count={metrics.total_defects}
        icon={Bug}
        color="#ef4444"
        onClick={() => navigate(`/programs/${programId}/tests/defects`)}
        isLoading={isLoading}
      />
    </div>
  );
}
