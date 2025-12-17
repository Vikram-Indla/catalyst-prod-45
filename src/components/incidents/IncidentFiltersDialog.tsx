import { useState } from 'react';
import { X, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import type { IncidentFilters, IncidentStatus, SeverityLevel, SupportLevel, DeliveryStage } from '@/types/incident';
import { cn } from '@/lib/utils';

const STATUS_OPTIONS: { value: IncidentStatus; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'triage', label: 'Triage' },
  { value: 'to_committee', label: 'To Committee' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'converted', label: 'Converted' },
  { value: 'closed', label: 'Closed' },
];

const SEVERITY_OPTIONS: { value: SeverityLevel; label: string }[] = [
  { value: 'SEV1', label: 'SEV1 — Critical' },
  { value: 'SEV2', label: 'SEV2 — High' },
  { value: 'SEV3', label: 'SEV3 — Medium' },
  { value: 'SEV4', label: 'SEV4 — Low' },
];

const SUPPORT_LEVEL_OPTIONS: { value: SupportLevel; label: string }[] = [
  { value: 'L1', label: 'L1' },
  { value: 'L2', label: 'L2' },
  { value: 'L3', label: 'L3' },
];

const DELIVERY_STAGE_OPTIONS: { value: DeliveryStage; label: string }[] = [
  { value: 'stage', label: 'Stage' },
  { value: 'qa', label: 'QA' },
  { value: 'beta', label: 'Beta' },
  { value: 'prod', label: 'Prod' },
];

interface IncidentFiltersDialogProps {
  filters: IncidentFilters;
  onFiltersChange: (filters: IncidentFilters) => void;
}

export function IncidentFiltersDialog({ filters, onFiltersChange }: IncidentFiltersDialogProps) {
  const [open, setOpen] = useState(false);
  const [draftFilters, setDraftFilters] = useState<IncidentFilters>(filters);

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) {
      setDraftFilters(filters);
    }
    setOpen(isOpen);
  };

  const handleApply = () => {
    onFiltersChange(draftFilters);
    setOpen(false);
  };

  const handleClear = () => {
    const emptyFilters: IncidentFilters = {
      status: [],
      severity: [],
      support_level: [],
      delivery_stage: [],
    };
    setDraftFilters(emptyFilters);
    onFiltersChange(emptyFilters);
    setOpen(false);
  };

  const toggleArrayValue = <T extends string>(key: keyof IncidentFilters, value: T) => {
    const current = (draftFilters[key] as T[]) || [];
    const updated = current.includes(value)
      ? current.filter(v => v !== value)
      : [...current, value];
    setDraftFilters({ ...draftFilters, [key]: updated });
  };

  const activeCount = 
    (filters.status?.length || 0) + 
    (filters.severity?.length || 0) + 
    (filters.support_level?.length || 0) + 
    (filters.delivery_stage?.length || 0);

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="relative">
          <Filter className="h-4 w-4 mr-2" />
          Filters
          {activeCount > 0 && (
            <Badge className="ml-2 h-5 px-1.5 bg-brand-primary text-white">
              {activeCount}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Filter Incidents</span>
            {activeCount > 0 && (
              <Button variant="ghost" size="sm" onClick={handleClear} className="text-muted-foreground">
                Clear all
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Status */}
          <div>
            <Label className="text-sm font-medium mb-3 block">Status</Label>
            <div className="flex flex-wrap gap-2">
              {STATUS_OPTIONS.map(opt => (
                <Badge
                  key={opt.value}
                  variant="outline"
                  className={cn(
                    'cursor-pointer transition-colors',
                    draftFilters.status?.includes(opt.value)
                      ? 'bg-brand-primary text-white border-brand-primary'
                      : 'hover:bg-muted'
                  )}
                  onClick={() => toggleArrayValue('status', opt.value)}
                >
                  {opt.label}
                </Badge>
              ))}
            </div>
          </div>

          {/* Severity */}
          <div>
            <Label className="text-sm font-medium mb-3 block">Severity</Label>
            <div className="flex flex-wrap gap-2">
              {SEVERITY_OPTIONS.map(opt => (
                <Badge
                  key={opt.value}
                  variant="outline"
                  className={cn(
                    'cursor-pointer transition-colors',
                    draftFilters.severity?.includes(opt.value)
                      ? 'bg-brand-primary text-white border-brand-primary'
                      : 'hover:bg-muted'
                  )}
                  onClick={() => toggleArrayValue('severity', opt.value)}
                >
                  {opt.label}
                </Badge>
              ))}
            </div>
          </div>

          {/* Support Level */}
          <div>
            <Label className="text-sm font-medium mb-3 block">Support Level</Label>
            <div className="flex flex-wrap gap-2">
              {SUPPORT_LEVEL_OPTIONS.map(opt => (
                <Badge
                  key={opt.value}
                  variant="outline"
                  className={cn(
                    'cursor-pointer transition-colors',
                    draftFilters.support_level?.includes(opt.value)
                      ? 'bg-brand-primary text-white border-brand-primary'
                      : 'hover:bg-muted'
                  )}
                  onClick={() => toggleArrayValue('support_level', opt.value)}
                >
                  {opt.label}
                </Badge>
              ))}
            </div>
          </div>

          {/* Delivery Stage */}
          <div>
            <Label className="text-sm font-medium mb-3 block">Delivery Stage</Label>
            <div className="flex flex-wrap gap-2">
              {DELIVERY_STAGE_OPTIONS.map(opt => (
                <Badge
                  key={opt.value}
                  variant="outline"
                  className={cn(
                    'cursor-pointer transition-colors',
                    draftFilters.delivery_stage?.includes(opt.value)
                      ? 'bg-brand-primary text-white border-brand-primary'
                      : 'hover:bg-muted'
                  )}
                  onClick={() => toggleArrayValue('delivery_stage', opt.value)}
                >
                  {opt.label}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-border">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleApply} className="bg-brand-primary hover:bg-brand-primary-hover text-white">
            Apply Filters
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
