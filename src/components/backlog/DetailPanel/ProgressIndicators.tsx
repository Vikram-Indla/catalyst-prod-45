import { EpicDetail, EpicState } from '@/types/backlog.types';
import { FormSelect } from './FormSelect';

// Static configuration - not seed data
const EPIC_STATES: EpicState[] = [
  { id: 1, name: 'Funnel', color: '#6B778C' },
  { id: 2, name: 'Backlog', color: '#0052CC' },
  { id: 3, name: 'In Progress', color: '#0065FF' },
  { id: 4, name: 'Done', color: '#36B37E' },
];

interface ProgressIndicatorsProps {
  epic: EpicDetail;
}

export function ProgressIndicators({ epic }: ProgressIndicatorsProps) {
  const acceptedPercentage = epic.storyPointsTotal > 0 
    ? (epic.storyPointsAccepted / epic.storyPointsTotal) * 100 
    : 0;
  const featuresAcceptedPercentage = epic.featuresTotal > 0 
    ? (epic.featuresAccepted / epic.featuresTotal) * 100 
    : 0;
  const featuresInDeliveryPercentage = epic.featuresTotal > 0 
    ? (epic.featuresInDelivery / epic.featuresTotal) * 100 
    : 0;
  const featuresDeliveredPercentage = epic.featuresTotal > 0 
    ? (epic.featuresDelivered / epic.featuresTotal) * 100 
    : 0;

  return (
    <div className="flex flex-col gap-4">
      {/* State */}
      <div className="flex flex-col gap-2">
        <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
          <span className="text-[8px] text-destructive">■</span>
          State:
        </label>
        <FormSelect
          value={String(epic.state.id)}
          options={EPIC_STATES.map(s => ({ value: String(s.id), label: `${s.id} - ${s.name}` }))}
          onChange={() => {}}
        />
      </div>

      {/* Story Points */}
      <div className="flex flex-col gap-1.5">
        <div className="text-sm">
          <span className="font-semibold text-foreground">{epic.storyPointsAccepted}</span>
          <span className="text-muted-foreground"> of {epic.storyPointsTotal}</span>
        </div>
        <div className="text-xs text-muted-foreground">Story points accepted</div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-success rounded-full transition-all duration-300"
            style={{ width: `${acceptedPercentage}%` }}
          />
        </div>
      </div>

      {/* Features Accepted */}
      <div className="flex flex-col gap-1.5">
        <div className="text-sm">
          <span className="font-semibold text-foreground">{epic.featuresAccepted}</span>
          <span className="text-muted-foreground"> of {epic.featuresTotal}</span>
        </div>
        <div className="text-xs text-muted-foreground">Features Accepted</div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-success rounded-full transition-all duration-300"
            style={{ width: `${featuresAcceptedPercentage}%` }}
          />
        </div>
      </div>

      {/* Features in Delivery */}
      <div className="flex flex-col gap-1.5">
        <div className="text-sm">
          <span className="font-semibold text-foreground">{epic.featuresInDelivery}</span>
          <span className="text-muted-foreground"> of {epic.featuresTotal}</span>
        </div>
        <div className="text-xs text-muted-foreground">Features in Delivery</div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-300"
            style={{ width: `${featuresInDeliveryPercentage}%` }}
          />
        </div>
      </div>

      {/* Features Delivered */}
      <div className="flex flex-col gap-1.5">
        <div className="text-sm">
          <span className="font-semibold text-foreground">{epic.featuresDelivered}</span>
          <span className="text-muted-foreground"> of {epic.featuresTotal}</span>
        </div>
        <div className="text-xs text-muted-foreground">Features Delivered</div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-300"
            style={{ width: `${featuresDeliveredPercentage}%` }}
          />
        </div>
      </div>
    </div>
  );
}
