import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Box, ListTree, Map, TrendingUp, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCatalystContext } from '@/contexts/CatalystContext';
import { PROCESS_STEPS } from '@/types/business-request';

interface ProductRoomSidebarProps {
  expanded: boolean;
  onToggle: () => void;
  className?: string;
}

const menuItems = [
  { title: 'Product Room', path: '/industry', icon: Box, exact: true },
  { title: 'Backlog', path: '/industry', icon: ListTree, exact: true },
  { title: 'Roadmaps', path: '/industry/roadmaps', icon: Map, exact: false },
  { title: 'Reports', path: '/industry/reports', icon: TrendingUp, exact: false },
];

const deliveryPlatformOptions = [
  { value: 'all', label: 'All Platforms' },
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

export function ProductRoomSidebar({ expanded, onToggle, className }: ProductRoomSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { deliveryPlatform, setDeliveryPlatform, industryFilters, setIndustryFilters } = useCatalystContext();

  const isActive = (path: string, exact: boolean = false) => {
    if (exact) return location.pathname === path;
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  // Get the label for the currently selected platform
  const selectedPlatformLabel = deliveryPlatformOptions.find(p => p.value === deliveryPlatform)?.label || deliveryPlatform;

  const handleProcessStepToggle = (value: string) => {
    const newSteps = industryFilters.processSteps.includes(value)
      ? industryFilters.processSteps.filter(s => s !== value)
      : [...industryFilters.processSteps, value];
    setIndustryFilters({ ...industryFilters, processSteps: newSteps });
  };

  const handleQuarterToggle = (value: string) => {
    const newQuarters = industryFilters.quarters.includes(value)
      ? industryFilters.quarters.filter(q => q !== value)
      : [...industryFilters.quarters, value];
    setIndustryFilters({ ...industryFilters, quarters: newQuarters });
  };

  const handleDateChange = (field: 'dateFrom' | 'dateTo', value: string) => {
    setIndustryFilters({ ...industryFilters, [field]: value });
  };

  return (
    <TooltipProvider>
      <aside
        className={cn(
          'h-full border-r bg-card flex flex-col transition-all duration-300 overflow-hidden',
          expanded ? 'w-64' : 'w-16',
          className
        )}
      >
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between shrink-0">
          {expanded ? (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-brand-gold/20 flex items-center justify-center text-brand-gold font-semibold text-sm">
                PR
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-foreground">Product</span>
                <span className="text-xs text-muted-foreground">{selectedPlatformLabel}</span>
              </div>
            </div>
          ) : (
            <div className="w-10 h-10 rounded-lg bg-brand-gold/20 flex items-center justify-center text-brand-gold font-semibold text-sm mx-auto">
              PR
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className={cn('h-8 w-8', !expanded && 'mx-auto mt-2')}
          >
            {expanded ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
        </div>

        {/* Scrollable content area */}
        <div className="flex-1 overflow-y-auto">
          {/* Delivery Platform Selector */}
          {expanded && (
            <div className="p-4 border-b">
              <span className="text-xs font-semibold text-brand-gold uppercase tracking-wider">
                Delivery Platform
              </span>
              <Select value={deliveryPlatform} onValueChange={setDeliveryPlatform}>
                <SelectTrigger className="mt-2 w-full bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border shadow-lg z-50">
                  {deliveryPlatformOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Navigation Menu */}
          <nav className="p-2 space-y-1 border-b">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path, item.exact);

              if (!expanded) {
                return (
                  <Tooltip key={item.title}>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate(item.path)}
                        className={cn(
                          'w-full h-10 flex items-center justify-center',
                          active && 'bg-brand-gold-pale text-brand-gold'
                        )}
                      >
                        <Icon className="h-5 w-5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="bg-popover border">
                      {item.title}
                    </TooltipContent>
                  </Tooltip>
                );
              }

              return (
                <Button
                  key={item.title}
                  variant="ghost"
                  onClick={() => navigate(item.path)}
                  className={cn(
                    'w-full justify-start gap-3 h-10',
                    active && 'bg-brand-gold-pale text-brand-gold'
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.title}</span>
                </Button>
              );
            })}
          </nav>

          {/* Filters Section - Only when expanded */}
          {expanded && (
            <div className="p-4 space-y-5">
              {/* Process Step Multi-select */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wide text-brand-gold">
                  Process Step
                </Label>
                <div className="space-y-1 max-h-40 overflow-auto border border-border rounded-md p-2 bg-background">
                  {PROCESS_STEPS.map(step => (
                    <label
                      key={step.value}
                      className="flex items-center gap-2 py-1 px-1 rounded hover:bg-muted/50 cursor-pointer"
                    >
                      <Checkbox
                        checked={industryFilters.processSteps.includes(step.value)}
                        onCheckedChange={() => handleProcessStepToggle(step.value)}
                        className="h-3.5 w-3.5"
                      />
                      <span className="text-sm text-foreground">{step.label}</span>
                    </label>
                  ))}
                </div>
                {industryFilters.processSteps.length > 0 && (
                  <button
                    onClick={() => setIndustryFilters({ ...industryFilters, processSteps: [] })}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Clear ({industryFilters.processSteps.length})
                  </button>
                )}
              </div>

              {/* Quarter Multi-select */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wide text-brand-gold">
                  Quarter
                </Label>
                <div className="space-y-1 border border-border rounded-md p-2 bg-background">
                  {quarterOptions.map(quarter => (
                    <label
                      key={quarter.value}
                      className="flex items-center gap-2 py-1 px-1 rounded hover:bg-muted/50 cursor-pointer"
                    >
                      <Checkbox
                        checked={industryFilters.quarters.includes(quarter.value)}
                        onCheckedChange={() => handleQuarterToggle(quarter.value)}
                        className="h-3.5 w-3.5"
                      />
                      <span className="text-sm text-foreground">{quarter.label}</span>
                    </label>
                  ))}
                </div>
                {industryFilters.quarters.length > 0 && (
                  <button
                    onClick={() => setIndustryFilters({ ...industryFilters, quarters: [] })}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Clear ({industryFilters.quarters.length})
                  </button>
                )}
              </div>

              {/* Target Date Range */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wide text-brand-gold">
                  Target Date Range
                </Label>
                <div className="space-y-2">
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground">From</span>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="date"
                        value={industryFilters.dateFrom}
                        onChange={(e) => handleDateChange('dateFrom', e.target.value)}
                        className="pl-9 bg-background text-sm"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground">To</span>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="date"
                        value={industryFilters.dateTo}
                        onChange={(e) => handleDateChange('dateTo', e.target.value)}
                        className="pl-9 bg-background text-sm"
                      />
                    </div>
                  </div>
                </div>
                {(industryFilters.dateFrom || industryFilters.dateTo) && (
                  <button
                    onClick={() => setIndustryFilters({ ...industryFilters, dateFrom: '', dateTo: '' })}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Clear dates
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </aside>
    </TooltipProvider>
  );
}