import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface CheckInModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { value: number; date: Date; note: string }) => void;
  keyResult: {
    summary: string;
    current_value: number;
    goal_value: number;
    metric_type: string;
  };
}

export function CheckInModal({ open, onClose, onSubmit, keyResult }: CheckInModalProps) {
  const [value, setValue] = useState(keyResult.current_value);
  const [date, setDate] = useState<Date>(new Date());
  const [note, setNote] = useState("");

  const handleSubmit = () => {
    onSubmit({ value, date, note });
    onClose();
    setValue(keyResult.current_value);
    setNote("");
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Record Check-In</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <h4 className="font-medium mb-2">{keyResult.summary}</h4>
            <p className="text-sm text-muted-foreground">
              Current: {keyResult.current_value} → Target: {keyResult.goal_value}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="value">New Value</Label>
            <Input
              id="value"
              type="number"
              value={value}
              onChange={(e) => setValue(Number(e.target.value))}
              step={keyResult.metric_type === "percentage" ? 0.01 : 1}
            />
          </div>

          <div className="space-y-2">
            <Label>Check-In Date</Label>
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

          <div className="space-y-2">
            <Label htmlFor="note">Note (optional)</Label>
            <Textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add context about this update..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>Record Check-In</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
