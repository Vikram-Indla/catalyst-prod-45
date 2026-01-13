// ============================================================
// WORK ITEM SELECTOR COMPONENT
// Allows selecting any work item type with filtering tabs
// ============================================================

import { useState, useMemo } from 'react';
import { FileText, Layers, Rocket, Briefcase, Link2 } from 'lucide-react';
import { SearchableSelect, SelectOption } from './SearchableSelect';
import { usePlannerWorkItems, WorkItemType, WORK_ITEM_TYPE_CONFIG, PlannerWorkItem } from '../hooks/usePlannerWorkItems';
import { cn } from '@/lib/utils';

interface WorkItemSelectorProps {
  value: string | null;
  onChange: (value: string | null, workItem?: PlannerWorkItem) => void;
  label?: string;
  required?: boolean;
  allowedTypes?: WorkItemType[];
  placeholder?: string;
  className?: string;
}

const TYPE_ICONS: Record<WorkItemType, typeof FileText> = {
  story: FileText,
  feature: Layers,
  epic: Rocket,
  business_request: Briefcase,
};

export function WorkItemSelector({
  value,
  onChange,
  label = 'Linked Work Item',
  required = false,
  allowedTypes = ['story', 'feature', 'epic', 'business_request'],
  placeholder = 'Select a work item...',
  className,
}: WorkItemSelectorProps) {
  const [activeFilter, setActiveFilter] = useState<WorkItemType | 'all'>('all');
  
  const { data: workItems = [], isLoading } = usePlannerWorkItems(allowedTypes);

  // Filter items by active tab
  const filteredItems = useMemo(() => {
    if (activeFilter === 'all') return workItems;
    return workItems.filter(item => item.type === activeFilter);
  }, [workItems, activeFilter]);

  // Find selected item
  const selectedItem = workItems.find(item => item.id === value);

  // Transform to select options
  const options: SelectOption[] = filteredItems.map(item => ({
    id: item.id,
    label: item.name,
    meta: item.displayId,
    color: WORK_ITEM_TYPE_CONFIG[item.type].color,
    type: item.type,
  }));

  // Get icon for type
  const getIcon = (type: WorkItemType) => {
    const Icon = TYPE_ICONS[type];
    return Icon;
  };

  const handleChange = (newValue: string | null) => {
    const item = workItems.find(w => w.id === newValue);
    onChange(newValue, item);
  };

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          {label} {required && <span className="text-destructive">*</span>}
        </div>
      )}

      {/* Type Filter Tabs */}
      {allowedTypes.length > 1 && (
        <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-lg mb-2">
          <button
            type="button"
            onClick={() => setActiveFilter('all')}
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
              activeFilter === 'all'
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            All
          </button>
          {allowedTypes.map(type => {
            const config = WORK_ITEM_TYPE_CONFIG[type];
            const Icon = TYPE_ICONS[type];
            return (
              <button
                key={type}
                type="button"
                onClick={() => setActiveFilter(type)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                  activeFilter === type
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="w-3.5 h-3.5" style={{ color: config.color }} />
                <span className="hidden sm:inline">{config.pluralLabel}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Selector */}
      <SearchableSelect
        placeholder={isLoading ? 'Loading...' : placeholder}
        searchPlaceholder="Search work items..."
        options={options}
        value={value}
        onChange={handleChange}
        disabled={isLoading}
        renderTrigger={(selected) => {
          if (!selected || !selectedItem) {
            return (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Link2 className="w-4 h-4" />
                <span>{placeholder}</span>
              </div>
            );
          }
          const Icon = getIcon(selectedItem.type);
          const config = WORK_ITEM_TYPE_CONFIG[selectedItem.type];
          return (
            <div className="flex items-center gap-2">
              <Icon className="w-4 h-4 flex-shrink-0" style={{ color: config.color }} />
              <span className="text-foreground truncate">{selected.label}</span>
              <span className="text-xs text-muted-foreground">({selected.meta})</span>
            </div>
          );
        }}
        renderOption={(option) => {
          const type = (option as SelectOption & { type: WorkItemType }).type;
          const Icon = TYPE_ICONS[type];
          const config = WORK_ITEM_TYPE_CONFIG[type];
          return (
            <div className="flex items-center gap-3">
              <div 
                className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${config.color}15` }}
              >
                <Icon className="w-3.5 h-3.5" style={{ color: config.color }} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-foreground truncate">{option.label}</div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{option.meta}</span>
                  <span>•</span>
                  <span>{config.label}</span>
                </div>
              </div>
            </div>
          );
        }}
      />
    </div>
  );
}
