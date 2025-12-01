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

  return <ForecastTab workItemId={epic.id} workItemType="epic" />;
}
