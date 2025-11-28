import { Check } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

// Citation: (Doc: Navigate to the backlog - PDF provided)
// Citation: (Screenshot: d42cde74-f227-43a1-b657-abc89ed9c8da.png)
// Citation: (Screenshot: 833d61be-08c3-4a00-a6c7-8bccf264cb1c.png)

export type BacklogView = 'theme' | 'epic' | 'capability' | 'feature';

interface BacklogViewSelectorProps {
  value: BacklogView;
  onChange: (value: BacklogView) => void;
  className?: string;
}

export function BacklogViewSelector({ value, onChange, className }: BacklogViewSelectorProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <label className="text-sm font-medium text-muted-foreground">Viewing:</label>
      <Select value={value} onValueChange={(val) => onChange(val as BacklogView)}>
        <SelectTrigger className="w-[200px] h-9 bg-background">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-background">
          <SelectGroup>
            <SelectItem value="theme" className="cursor-pointer">
              <div className="flex items-center gap-2">
                {value === 'theme' && <Check className="h-4 w-4" />}
                <span>Theme Backlog</span>
              </div>
            </SelectItem>
            <SelectItem value="epic" className="cursor-pointer">
              <div className="flex items-center gap-2">
                {value === 'epic' && <Check className="h-4 w-4" />}
                <span>Epic Backlog</span>
              </div>
            </SelectItem>
            <SelectItem value="capability" className="cursor-pointer">
              <div className="flex items-center gap-2">
                {value === 'capability' && <Check className="h-4 w-4" />}
                <span>Capability Backlog</span>
              </div>
            </SelectItem>
            <SelectItem value="feature" className="cursor-pointer">
              <div className="flex items-center gap-2">
                {value === 'feature' && <Check className="h-4 w-4" />}
                <span>Feature Backlog</span>
              </div>
            </SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
}
