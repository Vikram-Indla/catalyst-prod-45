import { EpicDetail, EpicState } from '@/types/backlog.types';
import { FormSelect } from './FormSelect';
import { EPIC_STATES } from '@/data/epicDetailData';

interface ProgressIndicatorsProps {
  epic: EpicDetail;
}

export function ProgressIndicators({ epic }: ProgressIndicatorsProps) {
  const acceptedPercentage = (epic.storyPointsAccepted / epic.storyPointsTotal) * 100;
  const featuresAcceptedPercentage = (epic.featuresAccepted / epic.featuresTotal) * 100;
  const featuresInDeliveryPercentage = (epic.featuresInDelivery / epic.featuresTotal) * 100;
  const featuresDeliveredPercentage = (epic.featuresDelivered / epic.featuresTotal) * 100;

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
