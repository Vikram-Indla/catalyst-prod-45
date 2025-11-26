import { useState } from 'react';
import { ChevronDown, ChevronRight, FileText, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { CalendarIcon } from 'lucide-react';

interface KeyResult {
  id: string;
  summary: string;
  metric_type: string;
  baseline_value: number | null;
  goal_value: number;
  current_value: number | null;
  owner_user_id: string | null;
  due_date: string | null;
}

interface KeyResultItemProps {
  keyResult: KeyResult;
  onOpenCheckIn: () => void;
  onUpdate: (updates: Partial<KeyResult>) => void;
}

export function KeyResultItem({ keyResult, onOpenCheckIn, onUpdate }: KeyResultItemProps) {
  const [expanded, setExpanded] = useState(false);

  const score = keyResult.goal_value && keyResult.baseline_value !== null
    ? Math.max(0, Math.min(1, ((keyResult.current_value || 0) - keyResult.baseline_value) / (keyResult.goal_value - keyResult.baseline_value)))
    : 0;

  const progress = score * 100;

  return (
    <div className="border rounded-lg overflow-hidden bg-card">
      <div
        className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2 flex-1">
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="text-sm font-medium">{keyResult.summary}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn(
            "text-sm font-semibold px-2 py-0.5 rounded",
            score >= 0.7 ? "text-green-700 bg-green-100" : score >= 0.4 ? "text-yellow-700 bg-yellow-100" : "text-red-700 bg-red-100"
          )}>
            {score.toFixed(1)}
          </span>
        </div>
      </div>

      {expanded && (
        <div className="p-4 border-t space-y-4 bg-muted/20">
          <div>
            <div className="text-xs text-muted-foreground mb-1">Progress</div>
            <Progress value={progress} className="h-2" />
            <div className="text-xs text-muted-foreground mt-1">{progress.toFixed(0)}% complete</div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-xs text-muted-foreground mb-1">Current</div>
              <Input
                type="number"
                value={keyResult.current_value || 0}
                onChange={(e) => onUpdate({ current_value: parseFloat(e.target.value) })}
                className="h-8"
              />
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">Goal</div>
              <Input
                type="number"
                value={keyResult.goal_value}
                onChange={(e) => onUpdate({ goal_value: parseFloat(e.target.value) })}
                className="h-8"
              />
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">Baseline</div>
              <Input
                type="number"
                value={keyResult.baseline_value || 0}
                onChange={(e) => onUpdate({ baseline_value: parseFloat(e.target.value) })}
                className="h-8"
              />
            </div>
          </div>

          <div>
            <div className="text-xs text-muted-foreground mb-1">Key result owner</div>
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <AvatarFallback>U</AvatarFallback>
              </Avatar>
              <span className="text-sm">TODO: Owner selector</span>
            </div>
          </div>

          <div>
            <div className="text-xs text-muted-foreground mb-1">Due date</div>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal h-8",
                    !keyResult.due_date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {keyResult.due_date ? format(new Date(keyResult.due_date), "PPP") : <span>Select a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={keyResult.due_date ? new Date(keyResult.due_date) : undefined}
                  onSelect={(date) => date && onUpdate({ due_date: date.toISOString() })}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <div className="text-xs text-muted-foreground mb-1">Key result type</div>
            <div className="text-sm">{keyResult.metric_type}</div>
          </div>

          <div className="flex items-center gap-2 pt-2 border-t">
            <Button variant="outline" size="sm" className="flex-1">
              <FileText className="h-4 w-4 mr-2" />
              Reports
            </Button>
            <Button variant="default" size="sm" className="flex-1" onClick={onOpenCheckIn}>
              <TrendingUp className="h-4 w-4 mr-2" />
              Check-in
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
