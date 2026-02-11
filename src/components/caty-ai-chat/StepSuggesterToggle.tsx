import { Sparkles } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface StepSuggesterToggleProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
}

export function StepSuggesterToggle({ enabled, onToggle }: StepSuggesterToggleProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2">
            <Switch id="caty-suggest" checked={enabled} onCheckedChange={onToggle} />
            <Label htmlFor="caty-suggest" className="flex items-center gap-1.5 cursor-pointer text-sm">
              <Sparkles className="h-3.5 w-3.5 text-purple-600" />
              CATY Suggestions
            </Label>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>AI-powered step suggestions while you type</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
