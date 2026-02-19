import { WidgetCard } from './WidgetCard';
import { CompletionDonut } from './CompletionDonut';
import { OverdueItems } from './OverdueItems';
import { BlockedItems } from './BlockedItems';
import { ItemsByStatus } from './ItemsByStatus';
import { RecentActivity } from './RecentActivity';
import { TeamWorkload } from './TeamWorkload';
import { AIInsightsCard } from './AIInsightsCard';
import { LiveAIInsightsCard } from './LiveAIInsightsCard';

interface WidgetGridProps {
  projectId?: string;
}

export function WidgetGrid({ projectId }: WidgetGridProps) {
  return (
    <>
      <style>{`
        .ph-widget-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
        }
        @media (max-width: 1200px) {
          .ph-widget-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 768px) {
          .ph-widget-grid { grid-template-columns: 1fr; }
        }
      `}</style>
      <div className="ph-widget-grid">
        <WidgetCard title="Completion" actionLabel="View Backlog">
          <div className="flex items-center justify-center py-2">
            <CompletionDonut percent={67} done={30} total={45} />
          </div>
        </WidgetCard>

        <WidgetCard title="Overdue Items">
          <OverdueItems />
        </WidgetCard>

        <WidgetCard title="Blocked Items">
          <BlockedItems />
        </WidgetCard>

        {projectId ? <LiveAIInsightsCard projectId={projectId} /> : <AIInsightsCard />}

        <WidgetCard title="Items by Status">
          <ItemsByStatus />
        </WidgetCard>

        <WidgetCard title="Recent Activity" actionLabel="View All">
          <RecentActivity />
        </WidgetCard>

        <WidgetCard title="Team Workload">
          <TeamWorkload />
        </WidgetCard>
      </div>
    </>
  );
}
