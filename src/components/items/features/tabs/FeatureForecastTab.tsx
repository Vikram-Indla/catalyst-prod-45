import { ForecastTab } from '@/components/forecast/ForecastTab';

interface FeatureForecastTabProps {
  feature: any;
}

// Map feature estimation_method to ForecastTab estimation system
const mapEstimationMethod = (method: string): 'points' | 'wsjf' | 'tshirt' | 'team_weeks' | 'member_weeks' => {
  switch (method) {
    case 'points':
      return 'points';
    case 'team-weeks':
    case 'team_weeks':
      return 'team_weeks';
    case 'member-weeks':
    case 'member_weeks':
      return 'member_weeks';
    case 'tshirt':
    case 't-shirt':
      return 'tshirt';
    default:
      return 'points';
  }
};

export function FeatureForecastTab({ feature }: FeatureForecastTabProps) {
  if (!feature) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Feature data not available
      </div>
    );
  }

  // Pass the estimation method from the feature to the ForecastTab
  const estimationSystem = mapEstimationMethod(feature.estimation_method || 'points');

  return (
    <ForecastTab 
      workItemId={feature.id} 
      workItemType="feature" 
      estimationSystem={estimationSystem}
    />
  );
}
