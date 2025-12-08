import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { PROCESS_STEPS, DELIVERY_PLATFORM_OPTIONS } from '@/types/business-request';

interface IndustryFiltersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: {
    deliveryPlatform?: string;
    processStep?: string;
    quarter?: string;
    assignee?: string;
    businessOwner?: string;
    department?: string;
    reporter?: string;
    ageing?: string;
    quickFilter?: string;
  };
  onFiltersChange: (filters: IndustryFiltersDialogProps['filters']) => void;
}

const quickFilters = [
  { id: 'my-open-requests', label: 'My Open Requests' },
  { id: 'high-priority', label: 'High Priority' },
  { id: 'new-this-week', label: 'New This Week' },
  { id: 'overdue-items', label: 'Overdue Items' },
  { id: 'current-quarter', label: 'Current Quarter' },
  { id: 'unassigned', label: 'Unassigned' },
];

const ageingOptions = [
  { value: 'all', label: 'All' },
  { value: '0-7', label: '0-7 days' },
  { value: '8-14', label: '8-14 days' },
  { value: '15-30', label: '15-30 days' },
  { value: '30+', label: '30+ days' },
];

const departmentOptions = [
  { value: 'it', label: 'IT' },
  { value: 'hr', label: 'HR' },
  { value: 'finance', label: 'Finance' },
  { value: 'operations', label: 'Operations' },
  { value: 'marketing', label: 'Marketing' },
];

export function IndustryFiltersDialog({
  open,
  onOpenChange,
  filters,
  onFiltersChange,
}: IndustryFiltersDialogProps) {
  const [peopleOpen, setPeopleOpen] = useState(true);
  const [statusOpen, setStatusOpen] = useState(true);
  const [datesOpen, setDatesOpen] = useState(true);

  const handleClearFilters = () => {
    onFiltersChange({});
  };

  const handleApplyFilters = () => {
    onOpenChange(false);
  };

  const handleQuickFilterClick = (filterId: string) => {
    const newQuickFilter = filters.quickFilter === filterId ? undefined : filterId;
    onFiltersChange({ ...filters, quickFilter: newQuickFilter });
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.deliveryPlatform) count++;
    if (filters.processStep) count++;
    if (filters.quarter) count++;
    if (filters.assignee) count++;
    if (filters.businessOwner) count++;
    if (filters.department) count++;
    if (filters.reporter) count++;
    if (filters.ageing) count++;
    if (filters.quickFilter) count++;
    return count;
  }, [filters]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-white p-0 gap-0 max-h-[85vh] flex flex-col">
        <DialogHeader className="px-6 py-4 border-b border-border flex-shrink-0">
          <DialogTitle className="text-foreground text-lg font-semibold">Filters</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {/* Quick Filters Section */}
          <div className="px-6 py-4 border-b border-border">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 block">
              Quick Filters
            </Label>
            <div className="flex flex-wrap gap-2">
              {quickFilters.map((qf) => (
                <button
                  key={qf.id}
                  onClick={() => handleQuickFilterClick(qf.id)}
                  className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                    filters.quickFilter === qf.id
                      ? 'bg-brand-gold text-white border-brand-gold'
                      : 'bg-white text-foreground border-border hover:border-brand-gold/50'
                  }`}
                >
                  {qf.label}
                </button>
              ))}
            </div>
          </div>

          {/* People Section */}
          <Collapsible open={peopleOpen} onOpenChange={setPeopleOpen}>
            <CollapsibleTrigger className="w-full px-6 py-3 border-b border-border flex items-center justify-between hover:bg-muted/30 transition-colors">
              <span className="font-semibold text-foreground">People</span>
              {peopleOpen ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="px-6 py-4 space-y-4 border-b border-border">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-brand-gold">Reporter</Label>
                    <Select
                      value={filters.reporter || 'all'}
                      onValueChange={(value) => onFiltersChange({ ...filters, reporter: value === 'all' ? undefined : value })}
                    >
                      <SelectTrigger className="bg-white border-border">
                        <SelectValue placeholder="Select reporters..." />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        <SelectItem value="all">Select reporters...</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-brand-gold">Business Owner</Label>
                    <Select
                      value={filters.businessOwner || 'all'}
                      onValueChange={(value) => onFiltersChange({ ...filters, businessOwner: value === 'all' ? undefined : value })}
                    >
                      <SelectTrigger className="bg-white border-border">
                        <SelectValue placeholder="Search business owners..." />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        <SelectItem value="all">Search business owners...</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-brand-gold">Assignee</Label>
                    <Select
                      value={filters.assignee || 'all'}
                      onValueChange={(value) => onFiltersChange({ ...filters, assignee: value === 'all' ? undefined : value })}
                    >
                      <SelectTrigger className="bg-white border-border">
                        <SelectValue placeholder="Select assignees..." />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        <SelectItem value="all">Select assignees...</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-brand-gold">Department</Label>
                    <Select
                      value={filters.department || 'all'}
                      onValueChange={(value) => onFiltersChange({ ...filters, department: value === 'all' ? undefined : value })}
                    >
                      <SelectTrigger className="bg-white border-border">
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        <SelectItem value="all">Select...</SelectItem>
                        {departmentOptions.map((dept) => (
                          <SelectItem key={dept.value} value={dept.value}>
                            {dept.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Status & Workflow Section */}
          <Collapsible open={statusOpen} onOpenChange={setStatusOpen}>
            <CollapsibleTrigger className="w-full px-6 py-3 border-b border-border flex items-center justify-between hover:bg-muted/30 transition-colors">
              <span className="font-semibold text-foreground">Status & Workflow</span>
              {statusOpen ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="px-6 py-4 space-y-4 border-b border-border">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-brand-gold">Process Step</Label>
                    <Select
                      value={filters.processStep || 'all'}
                      onValueChange={(value) => onFiltersChange({ ...filters, processStep: value === 'all' ? undefined : value })}
                    >
                      <SelectTrigger className="bg-white border-border">
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        <SelectItem value="all">Select...</SelectItem>
                        {PROCESS_STEPS.map((step) => (
                          <SelectItem key={step.value} value={step.value}>
                            {step.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-brand-gold">Ageing</Label>
                    <Select
                      value={filters.ageing || 'all'}
                      onValueChange={(value) => onFiltersChange({ ...filters, ageing: value === 'all' ? undefined : value })}
                    >
                      <SelectTrigger className="bg-white border-border">
                        <SelectValue placeholder="All" />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        {ageingOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Dates Section */}
          <Collapsible open={datesOpen} onOpenChange={setDatesOpen}>
            <CollapsibleTrigger className="w-full px-6 py-3 border-b border-border flex items-center justify-between hover:bg-muted/30 transition-colors">
              <span className="font-semibold text-foreground">Dates</span>
              {datesOpen ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="px-6 py-4 border-b border-border">
                <p className="text-sm text-muted-foreground">Date filters coming soon</p>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex items-center justify-between flex-shrink-0 bg-white">
          <span className="text-sm text-muted-foreground">
            <span className="text-brand-gold font-medium">{activeFilterCount}</span> filters applied
          </span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClearFilters}>
              Clear All
            </Button>
            <Button onClick={handleApplyFilters} className="bg-brand-gold text-white hover:bg-brand-gold-hover">
              Apply
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
