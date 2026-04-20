/**
 * RoadmapBadge — Shows whether an initiative is on the roadmap
 */
import { Map } from 'lucide-react';
import { Tooltip } from '@/components/ads';

interface Props {
  onRoadmap: boolean;
}

export function RoadmapBadge({ onRoadmap }: Props) {
  return (
    <Tooltip content={onRoadmap ? 'On Roadmap' : 'Not on Roadmap'} position="top">
      <span
        className="inline-flex items-center justify-center w-[18px] h-[18px] rounded-[4px] flex-shrink-0"
        style={{
          background: onRoadmap ? 'var(--cp-blue-wash)' : 'transparent',
          color: onRoadmap ? 'var(--cp-blue)' : 'var(--fg-4)',
          opacity: onRoadmap ? 1 : 0.3,
        }}
      >
        <Map className="w-3 h-3" />
      </span>
    </Tooltip>
  );
}
