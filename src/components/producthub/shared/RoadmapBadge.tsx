/**
 * RoadmapBadge — Shows whether an initiative is on the roadmap
 */
import { Map } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface Props {
  onRoadmap: boolean;
}

export function RoadmapBadge({ onRoadmap }: Props) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className="inline-flex items-center justify-center w-[18px] h-[18px] rounded-[4px] flex-shrink-0"
          style={{
            background: onRoadmap ? '#EFF6FF' : 'transparent',
            color: onRoadmap ? '#2563EB' : '#94A3B8',
            opacity: onRoadmap ? 1 : 0.3,
          }}
        >
          <Map className="w-3 h-3" />
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        {onRoadmap ? 'On Roadmap' : 'Not on Roadmap'}
      </TooltipContent>
    </Tooltip>
  );
}
