import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PROCESS_STEPS } from '@/types/business-request';

interface IndustryFiltersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: {
    deliveryPlatform?: string;
    processStep?: string;
    quarter?: string;
    assignee?: string;
    businessOwner?: string;
  };
  onFiltersChange: (filters: IndustryFiltersDialogProps['filters']) => void;
}

const deliveryPlatformOptions = [
  { value: 'Senaei Platform', label: 'Senaei Platform' },
  { value: 'Innovation Platform', label: 'Innovation Platform' },
  { value: 'Tahommena', label: 'Tahommena' },
  { value: 'Compass', label: 'Compass' },
  { value: 'Mini Apps', label: 'Mini Apps' },
  { value: 'Website', label: 'Website' },
];

const quarterOptions = [
  { value: 'Q1-2025', label: 'Q1 2025' },
  { value: 'Q2-2025', label: 'Q2 2025' },
  { value: 'Q3-2025', label: 'Q3 2025' },
  { value: 'Q4-2025', label: 'Q4 2025' },
  { value: 'Q1-2026', label: 'Q1 2026' },
  { value: 'Q2-2026', label: 'Q2 2026' },
  { value: 'Q3-2026', label: 'Q3 2026' },
  { value: 'Q4-2026', label: 'Q4 2026' },
];

export function IndustryFiltersDialog({
  open,
  onOpenChange,
  filters,
  onFiltersChange,
}: IndustryFiltersDialogProps) {
  const handleClearFilters = () => {
    onFiltersChange({});
  };

  const handleApplyFilters = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Filter Requests</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={filters.processStep || 'all'}
              onValueChange={(value) => onFiltersChange({ ...filters, processStep: value === 'all' ? undefined : value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {PROCESS_STEPS.map((step) => (
                  <SelectItem key={step.value} value={step.value}>
                    {step.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Delivery Platform</Label>
            <Select
              value={filters.deliveryPlatform || 'all'}
              onValueChange={(value) => onFiltersChange({ ...filters, deliveryPlatform: value === 'all' ? undefined : value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="All platforms" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All platforms</SelectItem>
                {deliveryPlatformOptions.map((platform) => (
                  <SelectItem key={platform.value} value={platform.value}>
                    {platform.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Quarter</Label>
            <Select
              value={filters.quarter || 'all'}
              onValueChange={(value) => onFiltersChange({ ...filters, quarter: value === 'all' ? undefined : value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="All quarters" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All quarters</SelectItem>
                {quarterOptions.map((quarter) => (
                  <SelectItem key={quarter.value} value={quarter.value}>
                    {quarter.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Assignee</Label>
            <Select
              value={filters.assignee || 'all'}
              onValueChange={(value) => onFiltersChange({ ...filters, assignee: value === 'all' ? undefined : value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="All assignees" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All assignees</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Business Owner</Label>
            <Select
              value={filters.businessOwner || 'all'}
              onValueChange={(value) => onFiltersChange({ ...filters, businessOwner: value === 'all' ? undefined : value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="All owners" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All owners</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={handleClearFilters} className="flex-1">
              Clear All
            </Button>
            <Button onClick={handleApplyFilters} className="flex-1 bg-brand-gold text-white hover:bg-brand-gold-hover">
              Apply Filters
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
