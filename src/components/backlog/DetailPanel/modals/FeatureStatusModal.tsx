import { Dialog, DialogContent } from '@/components/ui/dialog';
import { X } from 'lucide-react';
import { Feature } from '@/types/backlog.types';
import { Progress } from '@/components/ui/progress';

interface FeatureStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  feature: Feature | null;
}

export function FeatureStatusModal({ isOpen, onClose, feature }: FeatureStatusModalProps) {
  if (!feature) return null;

  const completionPercent = feature.storyPointsTotal > 0 
    ? Math.round((feature.storyPointsAccepted / feature.storyPointsTotal) * 100)
    : 0;

  const storiesAcceptedPercent = feature.storiesTotal > 0
    ? Math.round((feature.storiesAccepted / feature.storiesTotal) * 100)
    : 0;

  const storiesDeliveredPercent = feature.storiesTotal > 0
    ? Math.round((feature.storiesDelivered / feature.storiesTotal) * 100)
    : 0;

  const scopePercent = feature.scopeEstimate > 0
    ? Math.round((feature.scopeActual / feature.scopeEstimate) * 100)
    : 0;

  const isOnTrack = feature.status === 'on_track';
  const statusColor = isOnTrack ? '#36B37E' : feature.status === 'at_risk' ? '#FF991F' : '#DE350B';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[460px] p-0 bg-[#172B4D] text-white border-none">
        <div className="relative p-6">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/70 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Status Header */}
          <div className="mb-4">
            <h3 className="text-2xl font-semibold mb-2">
              {isOnTrack ? 'On Track' : feature.status === 'at_risk' ? 'At Risk' : 'Off Track'}
            </h3>
            <p className="text-sm text-white/80">
              The Feature is in <span className="font-semibold">{feature.processStep || '2 - In Progress'}</span> and is currently in{' '}
              <span className="font-semibold">Implementing</span>
            </p>
          </div>

          {/* Completion Percentage */}
          <div className="mb-6">
            <h4 className="text-xl font-semibold mb-3">
              {completionPercent}% Done <span className="text-sm font-normal text-white/70">(based on story points)</span>
            </h4>

            {/* Story Points Progress */}
            <div className="mb-3">
              <div className="flex justify-between text-sm text-white/80 mb-1">
                <span>{feature.storyPointsAccepted} of {feature.storyPointsTotal} Story Points Accepted</span>
              </div>
              <div className="h-3 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${completionPercent}%`,
                    backgroundColor: '#36B37E'
                  }}
                />
              </div>
            </div>

            {/* Stories Accepted Progress */}
            <div className="mb-3">
              <div className="flex justify-between text-sm text-white/80 mb-1">
                <span>{feature.storiesAccepted} of {feature.storiesTotal} Stories Accepted</span>
              </div>
              <div className="h-3 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${storiesAcceptedPercent}%`,
                    backgroundColor: '#36B37E'
                  }}
                />
              </div>
            </div>

            {/* Stories Delivered Progress */}
            <div className="mb-3">
              <div className="flex justify-between text-sm text-white/80 mb-1">
                <span>{feature.storiesDelivered} of {feature.storiesTotal} Stories Delivered</span>
              </div>
              <div className="h-3 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${storiesDeliveredPercent}%`,
                    backgroundColor: storiesDeliveredPercent === 0 ? '#FFFFFF' : '#36B37E'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Scope Section */}
          <div className="mb-6">
            <h4 className="text-lg font-semibold mb-3">Scope</h4>
            <div className="h-4 bg-white/20 rounded-full overflow-hidden mb-2">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${scopePercent}%`,
                  backgroundColor: '#0052CC'
                }}
              />
            </div>
            <p className="text-sm text-white/80">
              Estimate of {feature.scopeEstimate} points / {feature.scopeActual} points
            </p>
          </div>

          {/* Add Notes Section */}
          <div>
            <h4 className="text-lg font-semibold mb-2">Add Notes</h4>
            <textarea
              className="w-full min-h-[80px] px-3 py-2 bg-white/10 border border-white/20 rounded text-sm text-white placeholder:text-white/50 focus:outline-none focus:border-white/40"
              placeholder="Add notes about this feature..."
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
