import { ForecastTab } from '@/features/estimation/components/ForecastTab';

interface FeatureForecastTabProps {
  feature: any;
}

export function FeatureForecastTab({ feature }: FeatureForecastTabProps) {
  if (!feature) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Feature data not available
      </div>
    );
  }

  return <ForecastTab workItemId={feature.id} workItemType="feature" />;
}
