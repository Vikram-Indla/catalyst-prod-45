import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface CheckIn {
  id: string;
  checked_in_at: string;
  value: number;
  note_richtext: string | null;
  created_by_user_id: string | null;
}

interface CheckInModalProps {
  open: boolean;
  onClose: () => void;
  keyResult: {
    id: string;
    summary: string;
    metric_type: string;
    baseline_value: number | null;
    goal_value: number;
    current_value: number | null;
  };
  checkins: CheckIn[];
  onUpdate: (value: number, note: string, date: Date) => void;
  onDelete: (checkinId: string) => void;
}

export function CheckInModal({ open, onClose, keyResult, checkins, onUpdate, onDelete }: CheckInModalProps) {
  const [date, setDate] = useState<Date>(new Date());
  const [value, setValue] = useState<string>(keyResult.current_value?.toString() || '');
  const [note, setNote] = useState('');

  const score = keyResult.goal_value && keyResult.baseline_value !== null
    ? Math.max(0, Math.min(1, ((keyResult.current_value || 0) - keyResult.baseline_value) / (keyResult.goal_value - keyResult.baseline_value)))
    : 0;

  const achievedPercent = ((score * 100).toFixed(2));

  const handleUpdate = () => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      onUpdate(numValue, note, date);
      setValue('');
      setNote('');
      setDate(new Date());
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Update Progress</DialogTitle>
          <p className="text-sm text-muted-foreground">
            If the value is updated, the score will automatically recalculate.
          </p>
        </DialogHeader>

        <div className="grid grid-cols-[200px_1fr] gap-6 mt-4">
          {/* Left: Score display */}
          <div className="flex flex-col items-center justify-center border rounded-lg p-6 bg-muted/30">
            <div className="text-5xl font-bold text-success">{score.toFixed(1)}</div>
            <div className="text-sm text-muted-foreground mt-2">Score</div>
            <div className="text-xs text-muted-foreground mt-1">{achievedPercent}% achieved</div>
          </div>

          {/* Right: Input controls */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date ? format(date, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={(d) => d && setDate(d)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <Label>Value</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder="Enter value"
                  />
                  <span className="text-sm text-muted-foreground whitespace-nowrap">
                    {keyResult.metric_type}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <Label>Note</Label>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add a note about this update..."
                rows={4}
                className="resize-none"
              />
            </div>

            <Button onClick={handleUpdate} className="w-full">
              Update
            </Button>
          </div>
        </div>

        {/* Previous updates */}
        <div className="mt-6 border-t pt-4">
          <h4 className="text-sm font-semibold mb-3">Previous updates:</h4>
          <div className="space-y-3 max-h-60 overflow-y-auto">
            {checkins.map((checkin) => (
              <div key={checkin.id} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>U</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm">
                    <span className="font-medium">User</span> updated the value to{' '}
                    <span className="font-semibold">{checkin.value} {keyResult.metric_type}</span>
                  </p>
                  {checkin.note_richtext && (
                    <p className="text-sm text-muted-foreground mt-1">{checkin.note_richtext}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(new Date(checkin.checked_in_at), 'PPp')}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(checkin.id)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
