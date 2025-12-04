import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Box, ListTree, Map, TrendingUp, ChevronDown, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
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
  const { industryFilters, setIndustryFilters } = useCatalystContext();
  const [deliveryPlatformOpen, setDeliveryPlatformOpen] = useState(false);
  const [processStepOpen, setProcessStepOpen] = useState(false);
  const [quarterOpen, setQuarterOpen] = useState(false);

  const isActive = (path: string, exact: boolean = false) => {
    if (exact) return location.pathname === path;
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const handleDeliveryPlatformToggle = (value: string) => {
    const newPlatforms = industryFilters.deliveryPlatforms.includes(value)
      ? industryFilters.deliveryPlatforms.filter(p => p !== value)
      : [...industryFilters.deliveryPlatforms, value];
    setIndustryFilters({ ...industryFilters, deliveryPlatforms: newPlatforms });
  };

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

  const getDeliveryPlatformDisplayText = () => {
    if (industryFilters.deliveryPlatforms.length === 0) return 'All Platforms';
    if (industryFilters.deliveryPlatforms.length === 1) {
      return deliveryPlatformOptions.find(p => p.value === industryFilters.deliveryPlatforms[0])?.label || industryFilters.deliveryPlatforms[0];
    }
    return `${industryFilters.deliveryPlatforms.length} selected`;
  };

  const getProcessStepDisplayText = () => {
    if (industryFilters.processSteps.length === 0) return 'All Steps';
    if (industryFilters.processSteps.length === 1) {
      return PROCESS_STEPS.find(s => s.value === industryFilters.processSteps[0])?.label || industryFilters.processSteps[0];
    }
    return `${industryFilters.processSteps.length} selected`;
  };

  const getQuarterDisplayText = () => {
    if (industryFilters.quarters.length === 0) return 'All Quarters';
    if (industryFilters.quarters.length === 1) {
      return quarterOptions.find(q => q.value === industryFilters.quarters[0])?.label || industryFilters.quarters[0];
    }
    return `${industryFilters.quarters.length} selected`;
  };

  // Get display for header subtitle
  const getHeaderSubtitle = () => {
    if (industryFilters.deliveryPlatforms.length === 0) return 'All Platforms';
    if (industryFilters.deliveryPlatforms.length === 1) {
      return deliveryPlatformOptions.find(p => p.value === industryFilters.deliveryPlatforms[0])?.label || industryFilters.deliveryPlatforms[0];
    }
    return `${industryFilters.deliveryPlatforms.length} platforms`;
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
                <span className="text-xs text-muted-foreground">{getHeaderSubtitle()}</span>
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
          {/* Filter Dropdowns - Only when expanded */}
          {expanded && (
            <div className="p-4 border-b space-y-4">
              {/* Delivery Platform Multi-select */}
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-brand-gold uppercase tracking-wider">
                  Delivery Platform
                </span>
                <Popover open={deliveryPlatformOpen} onOpenChange={setDeliveryPlatformOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={deliveryPlatformOpen}
                      className="w-full justify-between bg-background font-normal"
                    >
                      <span className="truncate">{getDeliveryPlatformDisplayText()}</span>
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56 p-0 bg-popover border shadow-lg z-50" align="start">
                    <div className="max-h-60 overflow-auto">
                      {deliveryPlatformOptions.map((platform) => (
                        <div
                          key={platform.value}
                          className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-muted/50"
                          onClick={() => handleDeliveryPlatformToggle(platform.value)}
                        >
                          <div className={cn(
                            "h-4 w-4 border rounded flex items-center justify-center",
                            industryFilters.deliveryPlatforms.includes(platform.value) 
                              ? "bg-brand-gold border-brand-gold" 
                              : "border-border"
                          )}>
                            {industryFilters.deliveryPlatforms.includes(platform.value) && (
                              <Check className="h-3 w-3 text-white" />
                            )}
                          </div>
                          <span className="text-sm">{platform.label}</span>
                        </div>
                      ))}
                    </div>
                    {industryFilters.deliveryPlatforms.length > 0 && (
                      <div className="border-t p-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full text-xs"
                          onClick={() => setIndustryFilters({ ...industryFilters, deliveryPlatforms: [] })}
                        >
                          Clear all
                        </Button>
                      </div>
                    )}
                  </PopoverContent>
                </Popover>
              </div>

              {/* Process Step Multi-select Listbox */}
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-brand-gold uppercase tracking-wider">
                  Process Step
                </span>
                <Popover open={processStepOpen} onOpenChange={setProcessStepOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={processStepOpen}
                      className="w-full justify-between bg-background font-normal"
                    >
                      <span className="truncate">{getProcessStepDisplayText()}</span>
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56 p-0 bg-popover border shadow-lg z-50" align="start">
                    <div className="max-h-60 overflow-auto">
                      {PROCESS_STEPS.map((step) => (
                        <div
                          key={step.value}
                          className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-muted/50"
                          onClick={() => handleProcessStepToggle(step.value)}
                        >
                          <div className={cn(
                            "h-4 w-4 border rounded flex items-center justify-center",
                            industryFilters.processSteps.includes(step.value) 
                              ? "bg-brand-gold border-brand-gold" 
                              : "border-border"
                          )}>
                            {industryFilters.processSteps.includes(step.value) && (
                              <Check className="h-3 w-3 text-white" />
                            )}
                          </div>
                          <span className="text-sm">{step.label}</span>
                        </div>
                      ))}
                    </div>
                    {industryFilters.processSteps.length > 0 && (
                      <div className="border-t p-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full text-xs"
                          onClick={() => setIndustryFilters({ ...industryFilters, processSteps: [] })}
                        >
                          Clear all
                        </Button>
                      </div>
                    )}
                  </PopoverContent>
                </Popover>
              </div>

              {/* Quarter Multi-select Listbox */}
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-brand-gold uppercase tracking-wider">
                  Quarter
                </span>
                <Popover open={quarterOpen} onOpenChange={setQuarterOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={quarterOpen}
                      className="w-full justify-between bg-background font-normal"
                    >
                      <span className="truncate">{getQuarterDisplayText()}</span>
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56 p-0 bg-popover border shadow-lg z-50" align="start">
                    <div className="max-h-60 overflow-auto">
                      {quarterOptions.map((quarter) => (
                        <div
                          key={quarter.value}
                          className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-muted/50"
                          onClick={() => handleQuarterToggle(quarter.value)}
                        >
                          <div className={cn(
                            "h-4 w-4 border rounded flex items-center justify-center",
                            industryFilters.quarters.includes(quarter.value) 
                              ? "bg-brand-gold border-brand-gold" 
                              : "border-border"
                          )}>
                            {industryFilters.quarters.includes(quarter.value) && (
                              <Check className="h-3 w-3 text-white" />
                            )}
                          </div>
                          <span className="text-sm">{quarter.label}</span>
                        </div>
                      ))}
                    </div>
                    {industryFilters.quarters.length > 0 && (
                      <div className="border-t p-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full text-xs"
                          onClick={() => setIndustryFilters({ ...industryFilters, quarters: [] })}
                        >
                          Clear all
                        </Button>
                      </div>
                    )}
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          )}

          {/* Navigation Menu */}
          <nav className="p-2 space-y-1">
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
        </div>
      </aside>
    </TooltipProvider>
  );
}
