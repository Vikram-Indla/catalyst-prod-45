import { ForecastTab } from '@/components/forecast/ForecastTab';

interface EpicForecastTabProps {
  epic: any;
}

export function EpicForecastTab({ epic }: EpicForecastTabProps) {
  if (!epic) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Epic data not available
      </div>
    );
  }

  // Pass the estimation system from the epic to the ForecastTab
  const estimationSystem = epic.estimation_system || 'points';

  return (
    <ForecastTab 
      workItemId={epic.id} 
      workItemType="epic" 
      estimationSystem={estimationSystem}
    />
  );
}
