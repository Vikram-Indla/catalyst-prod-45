import { useState } from 'react';
import { useTimeTracking, formatMinutes } from '@/hooks/useTimeTracking';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Clock, Plus, Trash2, Calendar } from 'lucide-react';
import { format } from 'date-fns';

interface TimeTrackingSectionProps {
  workItemId: string;
  workItemType: 'story' | 'feature' | 'epic';
}

export function TimeTrackingSection({ workItemId, workItemType }: TimeTrackingSectionProps) {
  const { timeLogs, timeData, isLoading, addTimeLog, updateOriginalEstimate, deleteTimeLog } = useTimeTracking(workItemId, workItemType);
  
  const [logOpen, setLogOpen] = useState(false);
  const [estimateOpen, setEstimateOpen] = useState(false);
  const [hours, setHours] = useState('');
  const [minutes, setMinutes] = useState('');
  const [description, setDescription] = useState('');
  const [estimateHours, setEstimateHours] = useState('');
  const [estimateMinutes, setEstimateMinutes] = useState('');

  const handleLogTime = () => {
    const totalMinutes = (parseInt(hours) || 0) * 60 + (parseInt(minutes) || 0);
    if (totalMinutes > 0) {
      addTimeLog.mutate({ minutes: totalMinutes, description: description || undefined });
      setHours('');
      setMinutes('');
      setDescription('');
      setLogOpen(false);
    }
  };

  const handleUpdateEstimate = () => {
    const totalMinutes = (parseInt(estimateHours) || 0) * 60 + (parseInt(estimateMinutes) || 0);
    updateOriginalEstimate.mutate(totalMinutes);
    setEstimateHours('');
    setEstimateMinutes('');
    setEstimateOpen(false);
  };

  if (isLoading) {
    return (
      <Card className="bg-white border border-neutral-200 rounded-xl shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Clock className="h-4 w-4 text-brand-gold" />
            Time Tracking
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-sm text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  const originalMinutes = timeData?.original_minutes || 0;
  const spentMinutes = timeData?.spent_minutes || 0;
  const remainingMinutes = timeData?.remaining_minutes || 0;
  const progress = originalMinutes > 0 ? Math.min(100, (spentMinutes / originalMinutes) * 100) : 0;
  const isOverBudget = spentMinutes > originalMinutes && originalMinutes > 0;

  return (
    <Card className="bg-white border border-neutral-200 rounded-xl shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Clock className="h-4 w-4 text-brand-gold" />
          Time Tracking
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-4">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <Popover open={estimateOpen} onOpenChange={setEstimateOpen}>
            <PopoverTrigger asChild>
              <button className="p-2 rounded-md hover:bg-muted/50 transition-colors text-left">
                <div className="text-xs text-muted-foreground">Original</div>
                <div className="text-sm font-medium">{formatMinutes(originalMinutes)}</div>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-64" align="start">
              <div className="space-y-3">
                <Label className="text-sm font-medium">Set Original Estimate</Label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Label className="text-xs text-muted-foreground">Hours</Label>
                    <Input 
                      type="number" 
                      min="0"
                      value={estimateHours}
                      onChange={(e) => setEstimateHours(e.target.value)}
                      placeholder="0"
                    />
                  </div>
                  <div className="flex-1">
                    <Label className="text-xs text-muted-foreground">Minutes</Label>
                    <Input 
                      type="number" 
                      min="0" 
                      max="59"
                      value={estimateMinutes}
                      onChange={(e) => setEstimateMinutes(e.target.value)}
                      placeholder="0"
                    />
                  </div>
                </div>
                <Button 
                  size="sm" 
                  className="w-full"
                  onClick={handleUpdateEstimate}
                  disabled={updateOriginalEstimate.isPending}
                >
                  Update Estimate
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          <div className="p-2">
            <div className="text-xs text-muted-foreground">Spent</div>
            <div className={`text-sm font-medium ${isOverBudget ? 'text-destructive' : ''}`}>
              {formatMinutes(spentMinutes)}
            </div>
          </div>

          <div className="p-2">
            <div className="text-xs text-muted-foreground">Remaining</div>
            <div className={`text-sm font-medium ${remainingMinutes === 0 && originalMinutes > 0 ? 'text-muted-foreground' : ''}`}>
              {formatMinutes(remainingMinutes)}
            </div>
          </div>
        </div>

        {/* Progress bar */}
        {originalMinutes > 0 && (
          <div className="space-y-1">
            <Progress 
              value={progress} 
              className={`h-2 ${isOverBudget ? '[&>div]:bg-destructive' : ''}`}
            />
            {isOverBudget && (
              <Badge variant="destructive" className="text-xs">
                Over by {formatMinutes(spentMinutes - originalMinutes)}
              </Badge>
            )}
          </div>
        )}

        {/* Log time button */}
        <Popover open={logOpen} onOpenChange={setLogOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="w-full">
              <Plus className="h-3 w-3 mr-1" />
              Log Time
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72" align="start">
            <div className="space-y-3">
              <Label className="text-sm font-medium">Log Time</Label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label className="text-xs text-muted-foreground">Hours</Label>
                  <Input 
                    type="number" 
                    min="0"
                    value={hours}
                    onChange={(e) => setHours(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div className="flex-1">
                  <Label className="text-xs text-muted-foreground">Minutes</Label>
                  <Input 
                    type="number" 
                    min="0" 
                    max="59"
                    value={minutes}
                    onChange={(e) => setMinutes(e.target.value)}
                    placeholder="0"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Description (optional)</Label>
                <Input 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What did you work on?"
                />
              </div>
              <Button 
                size="sm" 
                className="w-full"
                onClick={handleLogTime}
                disabled={addTimeLog.isPending}
              >
                Log Time
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        {/* Recent logs */}
        {timeLogs.length > 0 && (
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Recent Work Logs</Label>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {timeLogs.slice(0, 5).map((log) => (
                <div 
                  key={log.id} 
                  className="flex items-center justify-between text-xs p-2 bg-muted/30 rounded-md group"
                >
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3 w-3 text-muted-foreground" />
                    <span>{format(new Date(log.work_date), 'MMM d')}</span>
                    <Badge variant="secondary" className="text-xs">
                      {formatMinutes(log.minutes_logged)}
                    </Badge>
                  </div>
                  <button
                    onClick={() => deleteTimeLog.mutate(log.id)}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
