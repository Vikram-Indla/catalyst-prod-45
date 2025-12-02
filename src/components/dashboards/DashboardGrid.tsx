import { GadgetPosition, GadgetType } from '@/types/dashboard.types';
import { GadgetContainer } from './GadgetContainer';
import { ProjectOverviewGadget } from './gadgets/ProjectOverviewGadget';
import { ExecutionDistributionGadget } from './gadgets/ExecutionDistributionGadget';
import { TopContributorsGadget } from './gadgets/TopContributorsGadget';
import { ExecutionBurndownGadget } from './gadgets/ExecutionBurndownGadget';
import { DefectSummaryGadget } from './gadgets/DefectSummaryGadget';
import { CycleProgressGadget } from './gadgets/CycleProgressGadget';
import { RecentExecutionsGadget } from './gadgets/RecentExecutionsGadget';
import { TestCoverageGadget } from './gadgets/TestCoverageGadget';
import { TesterWorkloadGadget } from './gadgets/TesterWorkloadGadget';
import { PassRateTrendGadget } from './gadgets/PassRateTrendGadget';
import { CasesByTypeGadget } from './gadgets/CasesByTypeGadget';
import { ActivityFeedGadget } from './gadgets/ActivityFeedGadget';
import { RequirementsCoverageGadget } from './gadgets/RequirementsCoverageGadget';

interface DashboardGridProps {
  gadgets: GadgetPosition[];
  onRemoveGadget?: (gadgetId: string) => void;
  onConfigureGadget?: (gadgetId: string) => void;
  isEditing?: boolean;
}

const GADGET_COMPONENTS: Partial<Record<GadgetType, React.ComponentType<{ config: any }>>> = {
  project_overview: ProjectOverviewGadget,
  execution_distribution: ExecutionDistributionGadget,
  top_contributors: TopContributorsGadget,
  execution_burndown: ExecutionBurndownGadget,
  defect_summary: DefectSummaryGadget
};

// Extended components not in original types
const EXTENDED_GADGETS: Record<string, React.ComponentType<{ config: any }>> = {
  cycle_progress: CycleProgressGadget,
  recent_executions: RecentExecutionsGadget,
  test_coverage: TestCoverageGadget,
  tester_workload: TesterWorkloadGadget,
  pass_rate_trend: PassRateTrendGadget,
  cases_by_type: CasesByTypeGadget,
  activity_feed: ActivityFeedGadget,
  requirements_coverage: RequirementsCoverageGadget
};

export function DashboardGrid({ gadgets, onRemoveGadget, onConfigureGadget, isEditing }: DashboardGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {gadgets.map((gadget) => {
        const GadgetComponent = GADGET_COMPONENTS[gadget.gadgetType] || EXTENDED_GADGETS[gadget.gadgetType];
        
        if (!GadgetComponent) {
          return null;
        }

        const colSpan = gadget.width >= 2 ? 'md:col-span-2' : '';
        const rowSpan = gadget.height >= 2 ? 'row-span-2' : '';

        return (
          <div key={gadget.id} className={`${colSpan} ${rowSpan}`}>
            <GadgetContainer
              gadgetType={gadget.gadgetType}
              onRemove={isEditing && onRemoveGadget ? () => onRemoveGadget(gadget.id) : undefined}
              onConfigure={onConfigureGadget ? () => onConfigureGadget(gadget.id) : undefined}
            >
              <GadgetComponent config={gadget.config} />
            </GadgetContainer>
          </div>
        );
      })}
    </div>
  );
}
