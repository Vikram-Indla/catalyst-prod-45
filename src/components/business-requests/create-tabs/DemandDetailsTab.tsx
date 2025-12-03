import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CalendarIcon, Lock, Unlock, Upload } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Delivery Track Parent Options
const DELIVERY_TRACK_PARENTS = [
  'BAU Fast Track',
  'Project',
  'Entity Integration',
];

// Delivery Track Child Options (cascading)
const DELIVERY_TRACK_CHILDREN: Record<string, string[]> = {
  'BAU Fast Track': ['Operational', 'Change Request'],
  'Project': ['New Project', 'New Feature'],
  'Entity Integration': ['New Entity', 'Entity CR'],
};

interface DemandDetailsTabProps {
  data: any;
  onChange: (field: string, value: any) => void;
}

export function DemandDetailsTab({ data, onChange }: DemandDetailsTabProps) {
  const [targetDateLocked, setTargetDateLocked] = useState(false);
  const [lockedByUser, setLockedByUser] = useState<string | null>(null);
  const currentUser = 'Current User'; // In real app, get from auth context

  const handleLockToggle = () => {
    if (targetDateLocked) {
      // Trying to unlock - check if same user
      if (lockedByUser && lockedByUser !== currentUser) {
        toast.error(`Cannot unlock. This date was locked by ${lockedByUser}`);
        return;
      }
      setTargetDateLocked(false);
      setLockedByUser(null);
      toast.info('Target Completion Date unlocked');
    } else {
      // Trying to lock - validate dates are populated
      if (!data.impl_start_date) {
        toast.error('Cannot lock: Initiation Date must be populated first');
        return;
      }
      if (!data.end_date) {
        toast.error('Cannot lock: Target Completion Date must be populated first');
        return;
      }
      setTargetDateLocked(true);
      setLockedByUser(currentUser);
      toast.success(`Target Completion Date locked by ${currentUser}`);
    }
  };

  const selectedTrackParent = data.delivery_track_parent || '';
  const childOptions = DELIVERY_TRACK_CHILDREN[selectedTrackParent] || [];

  return (
    <div className="space-y-6 p-5">
      {/* Basic Information Section */}
      <Card className="border border-border/60 rounded-lg bg-card">
        <CardContent className="p-5 space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-brand-gold">Basic Information</h3>
          
          <div>
            <Label className="text-sm font-medium">
              Summary <span className="text-destructive">*</span>
            </Label>
            <Input
              value={data.title || ''}
              onChange={(e) => onChange('title', e.target.value)}
              placeholder="Enter demand summary (min 5 characters)"
              className="mt-1.5"
            />
          </div>

          <div>
            <Label className="text-sm font-medium">Description</Label>
            <Textarea
              value={data.description || ''}
              onChange={(e) => onChange('description', e.target.value)}
              placeholder="Describe the demand in detail..."
              className="mt-1.5 min-h-[100px] resize-none"
            />
          </div>

          <div>
            <Label className="text-sm font-medium">Attachments</Label>
            <div className="mt-1.5">
              <Button variant="outline" className="w-full justify-start text-muted-foreground">
                <Upload className="mr-2 h-4 w-4" />
                Upload Files...
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">Reporter</Label>
              <Input
                value="Current User"
                disabled
                className="mt-1.5 bg-muted/50"
              />
              <p className="text-xs text-muted-foreground mt-1">Auto-filled (current user)</p>
            </div>

            <div>
              <Label className="text-sm font-medium">Assignee</Label>
              <Select
                value={data.requestor || ''}
                onValueChange={(value) => onChange('requestor', value)}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Select assignee..." />
                </SelectTrigger>
                <SelectContent className="bg-popover border shadow-lg z-50">
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="analyst">Business Analyst</SelectItem>
                  <SelectItem value="tech_lead">Technical Lead</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Delivery Track moved to Basic Information */}
          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border/40">
            <div>
              <Label className="text-sm font-medium">Delivery Track</Label>
              <Select
                value={data.delivery_track_parent || ''}
                onValueChange={(value) => {
                  onChange('delivery_track_parent', value);
                  onChange('track', ''); // Reset child when parent changes
                }}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Select track..." />
                </SelectTrigger>
                <SelectContent className="bg-popover border shadow-lg z-50">
                  {DELIVERY_TRACK_PARENTS.map((opt) => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium">Delivery Track (Child)</Label>
              <Select
                value={data.track || ''}
                onValueChange={(value) => onChange('track', value)}
                disabled={!selectedTrackParent}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder={selectedTrackParent ? "Select..." : "Select parent first"} />
                </SelectTrigger>
                <SelectContent className="bg-popover border shadow-lg z-50">
                  {childOptions.map((opt) => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Timeline Section */}
      <Card className="border border-border/60 rounded-lg bg-card">
        <CardContent className="p-5 space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-brand-gold">Timeline</h3>
          
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label className="text-sm font-medium">Business Ask Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal mt-1.5",
                      !data.start_date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {data.start_date ? format(new Date(data.start_date), 'dd/MM/yyyy') : 'dd/mm/yyyy'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={data.start_date ? new Date(data.start_date) : undefined}
                    onSelect={(date) => onChange('start_date', date ? format(date, 'yyyy-MM-dd') : null)}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label className="text-sm font-medium">Initiation Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal mt-1.5",
                      !data.impl_start_date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {data.impl_start_date ? format(new Date(data.impl_start_date), 'dd/MM/yyyy') : 'dd/mm/yyyy'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={data.impl_start_date ? new Date(data.impl_start_date) : undefined}
                    onSelect={(date) => onChange('impl_start_date', date ? format(date, 'yyyy-MM-dd') : null)}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label className="text-sm font-medium">Target Completion Date</Label>
              <div className="flex gap-2 mt-1.5">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      disabled={targetDateLocked}
                      className={cn(
                        "flex-1 justify-start text-left font-normal",
                        !data.end_date && "text-muted-foreground",
                        targetDateLocked && "opacity-60"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {data.end_date ? format(new Date(data.end_date), 'dd/MM/yyyy') : 'dd/mm/yyyy'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={data.end_date ? new Date(data.end_date) : undefined}
                      onSelect={(date) => onChange('end_date', date ? format(date, 'yyyy-MM-dd') : null)}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleLockToggle}
                  className={cn(
                    "shrink-0",
                    targetDateLocked && "bg-muted border-brand-gold text-brand-gold"
                  )}
                  title={targetDateLocked ? `Locked by ${lockedByUser}` : 'Click to lock date'}
                >
                  {targetDateLocked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                </Button>
              </div>
              {targetDateLocked && lockedByUser && (
                <p className="text-xs text-muted-foreground mt-1">Locked by {lockedByUser}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
