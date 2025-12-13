import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { PROCESS_STEPS, DELIVERY_PLATFORM_OPTIONS } from '@/types/business-request';
import { useDepartments } from '@/hooks/useDepartmentsAndOwners';
import { CalendarIcon, X, Sparkles, Clock, AlertTriangle, CalendarDays, User, Zap } from 'lucide-react';
import { format, subDays, startOfDay, endOfDay, startOfQuarter, endOfQuarter, addQuarters } from 'date-fns';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import { UserPicker } from '@/components/ui/user-picker';
import { BusinessOwnerPicker } from '@/components/ui/business-owner-picker';

export type SmartFilterType = 'myOpen' | 'highPriority' | 'newThisWeek' | 'overdue' | 'currentQuarter' | 'unassigned' | null;

export interface SmartFilters {
  // Smart filter preset
  activeSmartFilter?: SmartFilterType;
  
  // Left column filters
  requestId?: string;
  requestIdMode?: 'exact' | 'contains';
  rank?: number[];
  scoreMin?: number;
  scoreMax?: number;
  summary?: string;
  processStep?: string[];
  submittedDateFrom?: Date;
  submittedDateTo?: Date;
  ageing?: string[];
  
  // Right column filters
  department?: string[];
  businessOwnerValues?: string[]; // Changed to array for multi-select
  reporterIds?: string[]; // Changed to array of user IDs for multi-select
  assigneeIds?: string[]; // Changed to array of user IDs for multi-select
  deliveryPlatform?: string[];
  targetDateFrom?: Date;
  targetDateTo?: Date;
  quarter?: string[];
}

interface SmartFiltersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: SmartFilters;
  onFiltersChange: (filters: SmartFilters) => void;
}

// DEPARTMENT_OPTIONS imported from business-request.ts (single source of truth)

const AGEING_BUCKETS = [
  { value: '0-7', label: '0–7 days (New)', min: 0, max: 7 },
  { value: '8-30', label: '8–30 days (In Progress)', min: 8, max: 30 },
  { value: '31-60', label: '31–60 days (At Risk)', min: 31, max: 60 },
  { value: '60+', label: '60+ days (Stale)', min: 61, max: Infinity },
];

const generateQuarters = (): { value: string; label: string }[] => {
  const quarters = [];
  const today = new Date();
  for (let offset = -4; offset <= 2; offset++) {
    const date = addQuarters(today, offset);
    const q = Math.ceil((date.getMonth() + 1) / 3);
    const year = date.getFullYear();
    quarters.push({ value: `Q${q}-${year}`, label: `Q${q} ${year}` });
  }
  return quarters;
};

const QUARTER_OPTIONS = generateQuarters();

const SMART_FILTERS = [
  { id: 'myOpen' as SmartFilterType, label: 'My Open Requests', icon: User, description: 'Requests you created or are assigned to' },
  { id: 'highPriority' as SmartFilterType, label: 'High Priority', icon: Zap, description: 'Rank 1-3 or Score ≥80' },
  { id: 'newThisWeek' as SmartFilterType, label: 'New This Week', icon: Sparkles, description: 'Submitted in last 7 days' },
  { id: 'overdue' as SmartFilterType, label: 'Overdue Items', icon: AlertTriangle, description: 'Past target date, not closed' },
  { id: 'currentQuarter' as SmartFilterType, label: 'Current Quarter', icon: CalendarDays, description: 'Planned for this quarter' },
  { id: 'unassigned' as SmartFilterType, label: 'Unassigned', icon: Clock, description: 'No assignee set' },
];

export function SmartFiltersDialog({
  open,
  onOpenChange,
  filters,
  onFiltersChange,
}: SmartFiltersDialogProps) {
  const { user } = useAuth();
  const [localFilters, setLocalFilters] = useState<SmartFilters>(filters);
  
  // Fetch departments from admin-configured data (ZERO-SEED policy)
  const { data: departments = [] } = useDepartments();
  const departmentOptions = departments.map(d => ({ value: d.id, label: { en: d.name } }));

  useEffect(() => {
    if (open) {
      setLocalFilters(filters);
    }
  }, [open, filters]);

  const handleSmartFilterClick = (filterId: SmartFilterType) => {
    const today = new Date();
    const currentQuarter = Math.ceil((today.getMonth() + 1) / 3);
    const currentYear = today.getFullYear();
    
    let newFilters: SmartFilters = { activeSmartFilter: filterId };
    
    switch (filterId) {
      case 'myOpen':
        newFilters = {
          ...newFilters,
          reporterIds: user?.id ? [user.id] : [],
          processStep: ['request_received', 'under_study', 'in_progress', 'awaiting_business_response', 'on_hold', 'implemented'],
        };
        break;
      case 'highPriority':
        newFilters = {
          ...newFilters,
          rank: [1, 2, 3],
          scoreMin: 80,
          processStep: ['under_study', 'in_progress', 'awaiting_business_response'],
        };
        break;
      case 'newThisWeek':
        newFilters = {
          ...newFilters,
          submittedDateFrom: subDays(today, 7),
          submittedDateTo: today,
        };
        break;
      case 'overdue':
        newFilters = {
          ...newFilters,
          targetDateTo: subDays(today, 1),
          processStep: ['request_received', 'under_study', 'in_progress', 'awaiting_business_response', 'on_hold', 'implemented'],
        };
        break;
      case 'currentQuarter':
        newFilters = {
          ...newFilters,
          quarter: [`Q${currentQuarter}-${currentYear}`],
        };
        break;
      case 'unassigned':
        newFilters = {
          ...newFilters,
          assigneeIds: ['UNASSIGNED'],
          processStep: ['request_received', 'under_study', 'awaiting_business_response'],
        };
        break;
    }
    
    setLocalFilters(newFilters);
  };

  const handleClearFilters = () => {
    setLocalFilters({});
  };

  const handleApplyFilters = () => {
    onFiltersChange(localFilters);
    onOpenChange(false);
  };

  const updateFilter = <K extends keyof SmartFilters>(key: K, value: SmartFilters[K]) => {
    setLocalFilters(prev => ({ ...prev, [key]: value, activeSmartFilter: null }));
  };

  const toggleMultiSelect = (key: 'processStep' | 'department' | 'deliveryPlatform' | 'quarter' | 'ageing' | 'rank', value: string | number) => {
    const current = (localFilters[key] as (string | number)[] | undefined) || [];
    const newValues = current.includes(value)
      ? current.filter(v => v !== value)
      : [...current, value];
    updateFilter(key, newValues.length > 0 ? newValues as any : undefined);
  };

  const activeFilterCount = Object.entries(localFilters).filter(([key, value]) => {
    if (key === 'activeSmartFilter') return false;
    if (Array.isArray(value)) return value.length > 0;
    return value !== undefined && value !== '' && value !== null;
  }).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl bg-card max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            Filter Demands
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="bg-brand-gold/20 text-brand-gold">
                {activeFilterCount} active
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Smart Filters Section */}
        <div className="space-y-3">
          <Label className="text-sm font-medium text-brand-gold">Smart Filters</Label>
          <div className="grid grid-cols-3 gap-2">
            {SMART_FILTERS.map((sf) => (
              <Button
                key={sf.id}
                variant="outline"
                size="sm"
                className={cn(
                  "justify-start gap-2 h-auto py-2 px-3 text-left",
                  localFilters.activeSmartFilter === sf.id
                    ? "border-brand-gold bg-brand-gold/10 text-brand-gold"
                    : "border-border hover:border-brand-gold/50 hover:bg-brand-gold/5"
                )}
                onClick={() => handleSmartFilterClick(sf.id)}
              >
                <sf.icon className="h-4 w-4 shrink-0" />
                <div className="min-w-0">
                  <div className="font-medium text-xs truncate">{sf.label}</div>
                </div>
              </Button>
            ))}
          </div>
        </div>

        <div className="border-t border-border my-4" />

        {/* Two Column Layout */}
        <div className="grid grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-4">
            {/* Request ID */}
            <div className="space-y-1.5">
              <Label className="text-sm">Request ID</Label>
              <Input
                placeholder="Search MIM-XXX..."
                value={localFilters.requestId || ''}
                onChange={(e) => updateFilter('requestId', e.target.value || undefined)}
                className="h-9"
              />
            </div>

            {/* Rank */}
            <div className="space-y-1.5">
              <Label className="text-sm">Rank</Label>
              <div className="flex flex-wrap gap-1">
                {[1, 2, 3, 4, 5].map((rank) => (
                  <Button
                    key={rank}
                    variant="outline"
                    size="sm"
                    className={cn(
                      "h-7 w-7 p-0",
                      localFilters.rank?.includes(rank) && "border-brand-gold bg-brand-gold/10 text-brand-gold"
                    )}
                    onClick={() => toggleMultiSelect('rank', rank)}
                  >
                    {rank}
                  </Button>
                ))}
              </div>
            </div>

            {/* Score Range */}
            <div className="space-y-1.5">
              <Label className="text-sm text-destructive">Score Range</Label>
              <div className="flex gap-2 items-center">
                <Input
                  type="number"
                  placeholder="Min"
                  value={localFilters.scoreMin ?? ''}
                  onChange={(e) => updateFilter('scoreMin', e.target.value ? parseInt(e.target.value) : undefined)}
                  className="h-9 w-20"
                  min={0}
                  max={100}
                />
                <span className="text-muted-foreground">—</span>
                <Input
                  type="number"
                  placeholder="Max"
                  value={localFilters.scoreMax ?? ''}
                  onChange={(e) => updateFilter('scoreMax', e.target.value ? parseInt(e.target.value) : undefined)}
                  className="h-9 w-20"
                  min={0}
                  max={100}
                />
              </div>
            </div>

            {/* Summary */}
            <div className="space-y-1.5">
              <Label className="text-sm text-destructive">Summary</Label>
              <Input
                placeholder="Text contains..."
                value={localFilters.summary || ''}
                onChange={(e) => updateFilter('summary', e.target.value || undefined)}
                className="h-9"
              />
            </div>

            {/* Process Step */}
            <div className="space-y-1.5">
              <Label className="text-sm">Process Step</Label>
              <div className="flex flex-wrap gap-1">
                {PROCESS_STEPS.map((step) => (
                  <Button
                    key={step.value}
                    variant="outline"
                    size="sm"
                    className={cn(
                      "h-7 text-xs",
                      localFilters.processStep?.includes(step.value) && "border-brand-gold bg-brand-gold/10 text-brand-gold"
                    )}
                    onClick={() => toggleMultiSelect('processStep', step.value)}
                  >
                    {step.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Submitted Date */}
            <div className="space-y-1.5">
              <Label className="text-sm text-destructive">Submitted Date</Label>
              <div className="flex gap-2 items-center">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className={cn("h-9 w-28 justify-start text-left font-normal", !localFilters.submittedDateFrom && "text-muted-foreground")}>
                      <CalendarIcon className="mr-1 h-3 w-3" />
                      {localFilters.submittedDateFrom ? format(localFilters.submittedDateFrom, "MMM d") : "From"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-popover" align="start">
                    <Calendar mode="single" selected={localFilters.submittedDateFrom} onSelect={(date) => updateFilter('submittedDateFrom', date)} />
                  </PopoverContent>
                </Popover>
                <span className="text-muted-foreground">—</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className={cn("h-9 w-28 justify-start text-left font-normal", !localFilters.submittedDateTo && "text-muted-foreground")}>
                      <CalendarIcon className="mr-1 h-3 w-3" />
                      {localFilters.submittedDateTo ? format(localFilters.submittedDateTo, "MMM d") : "To"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-popover" align="start">
                    <Calendar mode="single" selected={localFilters.submittedDateTo} onSelect={(date) => updateFilter('submittedDateTo', date)} />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Ageing */}
            <div className="space-y-1.5">
              <Label className="text-sm">Ageing</Label>
              <div className="flex flex-wrap gap-1">
                {AGEING_BUCKETS.map((bucket) => (
                  <Button
                    key={bucket.value}
                    variant="outline"
                    size="sm"
                    className={cn(
                      "h-7 text-xs",
                      localFilters.ageing?.includes(bucket.value) && "border-brand-gold bg-brand-gold/10 text-brand-gold"
                    )}
                    onClick={() => toggleMultiSelect('ageing', bucket.value)}
                  >
                    {bucket.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-4">
            {/* Department */}
            <div className="space-y-1.5">
              <Label className="text-sm">Department</Label>
              <div className="flex flex-wrap gap-1">
                {departmentOptions.map((dept) => (
                  <Button
                    key={dept.value}
                    variant="outline"
                    size="sm"
                    className={cn(
                      "h-7 text-xs",
                      localFilters.department?.includes(dept.value) && "border-brand-gold bg-brand-gold/10 text-brand-gold"
                    )}
                    onClick={() => toggleMultiSelect('department', dept.value)}
                  >
                    {dept.label.en}
                  </Button>
                ))}
              </div>
            </div>

            {/* Business Owner */}
            <div className="space-y-1.5">
              <Label className="text-sm">Business Owner</Label>
              <BusinessOwnerPicker
                value={localFilters.businessOwnerValues || []}
                onChange={(value) => updateFilter('businessOwnerValues', value)}
                placeholder="Search business owners..."
              />
            </div>

            {/* Reporter */}
            <div className="space-y-1.5">
              <Label className="text-sm">Reporter</Label>
              <UserPicker
                value={localFilters.reporterIds || []}
                onChange={(value) => {
                  const ids = Array.isArray(value) ? value : value ? [value] : undefined;
                  updateFilter('reporterIds', ids?.length ? ids : undefined);
                }}
                placeholder="Select reporters..."
                multiSelect={true}
              />
            </div>

            {/* Assignee */}
            <div className="space-y-1.5">
              <Label className="text-sm">Assignee</Label>
              <UserPicker
                value={localFilters.assigneeIds || []}
                onChange={(value) => {
                  const ids = Array.isArray(value) ? value : value ? [value] : undefined;
                  updateFilter('assigneeIds', ids?.length ? ids : undefined);
                }}
                placeholder="Select assignees..."
                multiSelect={true}
                showUnassigned={true}
              />
            </div>

            {/* Delivery Platform */}
            <div className="space-y-1.5">
              <Label className="text-sm">Delivery Platform</Label>
              <div className="flex flex-wrap gap-1">
                {DELIVERY_PLATFORM_OPTIONS.slice(0, 6).map((platform) => (
                  <Button
                    key={platform.value}
                    variant="outline"
                    size="sm"
                    className={cn(
                      "h-7 text-xs",
                      localFilters.deliveryPlatform?.includes(platform.value) && "border-brand-gold bg-brand-gold/10 text-brand-gold"
                    )}
                    onClick={() => toggleMultiSelect('deliveryPlatform', platform.value)}
                  >
                    {platform.label.en}
                  </Button>
                ))}
              </div>
            </div>

            {/* Target Date */}
            <div className="space-y-1.5">
              <Label className="text-sm text-destructive">Target Date</Label>
              <div className="flex gap-2 items-center">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className={cn("h-9 w-28 justify-start text-left font-normal", !localFilters.targetDateFrom && "text-muted-foreground")}>
                      <CalendarIcon className="mr-1 h-3 w-3" />
                      {localFilters.targetDateFrom ? format(localFilters.targetDateFrom, "MMM d") : "From"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-popover" align="start">
                    <Calendar mode="single" selected={localFilters.targetDateFrom} onSelect={(date) => updateFilter('targetDateFrom', date)} />
                  </PopoverContent>
                </Popover>
                <span className="text-muted-foreground">—</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className={cn("h-9 w-28 justify-start text-left font-normal", !localFilters.targetDateTo && "text-muted-foreground")}>
                      <CalendarIcon className="mr-1 h-3 w-3" />
                      {localFilters.targetDateTo ? format(localFilters.targetDateTo, "MMM d") : "To"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-popover" align="start">
                    <Calendar mode="single" selected={localFilters.targetDateTo} onSelect={(date) => updateFilter('targetDateTo', date)} />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Quarter */}
            <div className="space-y-1.5">
              <Label className="text-sm">Quarter</Label>
              <div className="flex flex-wrap gap-1">
                {QUARTER_OPTIONS.map((q) => (
                  <Button
                    key={q.value}
                    variant="outline"
                    size="sm"
                    className={cn(
                      "h-7 text-xs",
                      localFilters.quarter?.includes(q.value) && "border-brand-gold bg-brand-gold/10 text-brand-gold"
                    )}
                    onClick={() => toggleMultiSelect('quarter', q.value)}
                  >
                    {q.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="mt-6 gap-2">
          <Button variant="outline" onClick={handleClearFilters} className="flex-1">
            Clear All
          </Button>
          <Button onClick={handleApplyFilters} className="flex-1 bg-brand-gold text-white hover:bg-brand-gold-hover">
            Apply Filters
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
