import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { ChevronUp, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export type SkillsQuickFilter = 'myTeam' | 'expertsOnly' | 'criticalGaps' | 'lowCoverage' | null;

export interface SkillsInventoryFilters {
  activeQuickFilter?: SkillsQuickFilter;
  teamMemberNames?: string[];
  teamIds?: string[];
  skillNames?: string[];
  skillCategoryIds?: string[];
  proficiencyLevels?: string[];
  coverageMin?: number | null;
  coverageMax?: number | null;
}

interface SkillsFiltersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: SkillsInventoryFilters;
  onFiltersChange: (filters: SkillsInventoryFilters) => void;
  teamMembers: string[];
  skills: string[];
  skillCategories: string[];
  teams: string[];
}

const QUICK_FILTER_CONFIG = [
  { 
    id: 'myTeam' as SkillsQuickFilter, 
    label: 'My Team', 
    tooltip: 'Filter to skills assigned to your team(s).' 
  },
  { 
    id: 'expertsOnly' as SkillsQuickFilter, 
    label: 'Experts Only', 
    tooltip: 'Shows only team members with Expert proficiency level.' 
  },
  { 
    id: 'criticalGaps' as SkillsQuickFilter, 
    label: 'Critical Gaps', 
    tooltip: 'Shows team members with coverage below 70% OR proficiency "No Skill".' 
  },
  { 
    id: 'lowCoverage' as SkillsQuickFilter, 
    label: 'Low Coverage (<70%)', 
    tooltip: 'Shows team members with coverage below 70%.' 
  },
];

const PROFICIENCY_LEVELS = [
  { label: 'Expert', colorClass: 'bg-health-green' },
  { label: 'Advanced', colorClass: 'bg-info' },
  { label: 'Intermediate', colorClass: 'bg-warning' },
  { label: 'Beginner', colorClass: 'bg-destructive' },
  { label: 'No Skill', colorClass: 'bg-muted-foreground' },
];

// Accordion Section Component
function AccordionSection({ 
  title, 
  isOpen, 
  onToggle, 
  children 
}: { 
  title: string; 
  isOpen: boolean; 
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-border last:border-b-0">
      <button
        type="button"
        className="flex items-center justify-between w-full px-4 sm:px-5 py-3 text-sm font-medium text-foreground hover:bg-muted/30 transition-colors"
        onClick={onToggle}
      >
        {title}
        <ChevronUp className={cn(
          "h-4 w-4 text-muted-foreground transition-transform duration-300 ease-out",
          !isOpen && "rotate-180"
        )} />
      </button>
      <div 
        className={cn(
          "grid transition-[grid-template-rows] duration-300 ease-out",
          isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}
      >
        <div className="overflow-hidden">
          <div className="px-4 sm:px-5 pb-4">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

// Multi-select dropdown component
function MultiSelectDropdown({ 
  options, 
  selected, 
  onChange, 
  placeholder = 'Select...',
}: { 
  options: string[]; 
  selected: string[]; 
  onChange: (values: string[]) => void;
  placeholder?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleOption = (value: string) => {
    const newValues = selected.includes(value)
      ? selected.filter(v => v !== value)
      : [...selected, value];
    onChange(newValues);
  };

  const displayText = selected.length === 0 
    ? placeholder 
    : selected.length === 1 
      ? selected[0]
      : `${selected.length} selected`;

  return (
    <div className="relative">
      <button
        type="button"
        className={cn(
          "flex items-center justify-between w-full h-10 px-3 border rounded-md text-sm bg-white transition-colors",
          selected.length > 0 ? "border-border text-foreground" : "border-border text-muted-foreground",
          "hover:border-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-brand-gold"
        )}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={cn("truncate", selected.length === 0 && "text-muted-foreground")}>
          {displayText}
        </span>
        <svg className="h-4 w-4 text-muted-foreground shrink-0 ml-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </button>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute z-50 top-full left-0 mt-1 w-full bg-white border border-border rounded-md shadow-lg max-h-48 overflow-y-auto">
            {options.map((option) => (
              <label
                key={option}
                className="flex items-center gap-2 px-3 py-2 hover:bg-muted/50 cursor-pointer"
              >
                <Checkbox
                  checked={selected.includes(option)}
                  onCheckedChange={() => toggleOption(option)}
                  className="border-border data-[state=checked]:bg-brand-gold data-[state=checked]:border-brand-gold"
                />
                <span className="text-sm text-foreground truncate">{option}</span>
              </label>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function SkillsFiltersDialog({
  open,
  onOpenChange,
  filters,
  onFiltersChange,
  teamMembers,
  skills,
  skillCategories,
  teams,
}: SkillsFiltersDialogProps) {
  const [localFilters, setLocalFilters] = useState<SkillsInventoryFilters>(filters);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    people: true,
    skill: true,
    proficiency: true,
    coverage: false,
  });

  // Reset local state when dialog opens
  useEffect(() => {
    if (open) {
      setLocalFilters(filters);
    }
  }, [open, filters]);

  const toggleSection = (section: string) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleQuickFilterClick = (filterId: SkillsQuickFilter) => {
    let newFilters: SkillsInventoryFilters = { activeQuickFilter: filterId };
    
    switch (filterId) {
      case 'myTeam':
        // For now, just set the filter - in real implementation would filter by user's team
        newFilters = { ...newFilters };
        break;
      case 'expertsOnly':
        newFilters = { ...newFilters, proficiencyLevels: ['Expert'] };
        break;
      case 'criticalGaps':
        newFilters = { ...newFilters, coverageMax: 70, proficiencyLevels: ['No Skill', 'Beginner'] };
        break;
      case 'lowCoverage':
        newFilters = { ...newFilters, coverageMax: 70 };
        break;
    }
    
    setLocalFilters(newFilters);
  };

  const handleClearFilters = () => {
    setLocalFilters({});
  };

  const handleApplyFilters = () => {
    onFiltersChange({ ...localFilters });
    onOpenChange(false);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  const updateFilter = <K extends keyof SkillsInventoryFilters>(key: K, value: SkillsInventoryFilters[K]) => {
    setLocalFilters(prev => ({ ...prev, [key]: value, activeQuickFilter: null }));
  };

  const activeFilterCount = Object.entries(localFilters).filter(([key, value]) => {
    if (key === 'activeQuickFilter') return false;
    if (Array.isArray(value)) return value.length > 0;
    return value !== undefined && value !== '' && value !== null && value !== 'all';
  }).length;

  return (
    <Dialog open={open} onOpenChange={handleCancel}>
      <DialogContent className="max-w-[480px] w-[95vw] p-0 bg-white border shadow-xl rounded-lg overflow-hidden gap-0 [&>button.absolute]:hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-4 border-b border-border">
          <h2 className="text-base font-semibold text-foreground">Filters</h2>
          <button 
            type="button"
            className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
            onClick={handleCancel}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Quick Filters */}
        <TooltipProvider>
          <div className="px-4 sm:px-5 py-4 border-b border-border bg-muted/20">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Quick Filters</div>
            <div className="flex flex-wrap gap-2">
              {QUICK_FILTER_CONFIG.map((sf) => (
                <Tooltip key={sf.id}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className={cn(
                        "px-3 py-1.5 border rounded-md text-sm cursor-pointer transition-all whitespace-nowrap font-medium",
                        localFilters.activeQuickFilter === sf.id
                          ? "bg-brand-gold border-brand-gold text-white"
                          : "bg-white border-border text-foreground hover:border-brand-gold hover:bg-brand-gold/5"
                      )}
                      onClick={() => handleQuickFilterClick(sf.id)}
                    >
                      {sf.label}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="bg-brand-dark text-white text-xs max-w-[280px] p-2 rounded-md">
                    {sf.tooltip}
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          </div>
        </TooltipProvider>

        {/* Filter Body */}
        <div className="max-h-[50vh] sm:max-h-[400px] overflow-y-auto scroll-smooth overscroll-contain [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-muted/30 [&::-webkit-scrollbar-thumb]:bg-muted-foreground/20 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/30">
          
          {/* People Section */}
          <AccordionSection 
            title="People" 
            isOpen={openSections.people} 
            onToggle={() => toggleSection('people')}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Team Member</label>
                <MultiSelectDropdown
                  options={teamMembers}
                  selected={localFilters.teamMemberNames || []}
                  onChange={(values) => updateFilter('teamMemberNames', values.length > 0 ? values : undefined)}
                  placeholder="Select members..."
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Team</label>
                <MultiSelectDropdown
                  options={teams}
                  selected={localFilters.teamIds || []}
                  onChange={(values) => updateFilter('teamIds', values.length > 0 ? values : undefined)}
                  placeholder="Select teams..."
                />
              </div>
            </div>
          </AccordionSection>

          {/* Skill & Category Section */}
          <AccordionSection 
            title="Skill & Category" 
            isOpen={openSections.skill} 
            onToggle={() => toggleSection('skill')}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Primary Skill</label>
                <MultiSelectDropdown
                  options={skills}
                  selected={localFilters.skillNames || []}
                  onChange={(values) => updateFilter('skillNames', values.length > 0 ? values : undefined)}
                  placeholder="Select skills..."
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Skill Category</label>
                <MultiSelectDropdown
                  options={skillCategories}
                  selected={localFilters.skillCategoryIds || []}
                  onChange={(values) => updateFilter('skillCategoryIds', values.length > 0 ? values : undefined)}
                  placeholder="Select categories..."
                />
              </div>
            </div>
          </AccordionSection>

          {/* Proficiency Level Section */}
          <AccordionSection 
            title="Proficiency Level" 
            isOpen={openSections.proficiency} 
            onToggle={() => toggleSection('proficiency')}
          >
            <div className="space-y-2.5">
              {PROFICIENCY_LEVELS.map(level => (
                <label key={level.label} className="flex items-center gap-3 cursor-pointer">
                  <Checkbox
                    checked={(localFilters.proficiencyLevels || []).includes(level.label)}
                    onCheckedChange={(checked) => {
                      const current = localFilters.proficiencyLevels || [];
                      const newLevels = checked 
                        ? [...current, level.label]
                        : current.filter(l => l !== level.label);
                      updateFilter('proficiencyLevels', newLevels.length > 0 ? newLevels : undefined);
                    }}
                    className="border-border data-[state=checked]:bg-brand-gold data-[state=checked]:border-brand-gold"
                  />
                  <span className={`h-2.5 w-2.5 rounded-full ${level.colorClass}`} />
                  <span className="text-sm text-foreground">{level.label}</span>
                </label>
              ))}
            </div>
          </AccordionSection>

          {/* Coverage Section */}
          <AccordionSection 
            title="Coverage" 
            isOpen={openSections.coverage} 
            onToggle={() => toggleSection('coverage')}
          >
            <div className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-muted-foreground">Coverage Range</label>
                  <span className="text-xs text-muted-foreground">
                    {localFilters.coverageMin ?? 0}% - {localFilters.coverageMax ?? 100}%
                  </span>
                </div>
                <Slider
                  value={[localFilters.coverageMin ?? 0, localFilters.coverageMax ?? 100]}
                  onValueChange={([min, max]) => {
                    updateFilter('coverageMin', min > 0 ? min : null);
                    updateFilter('coverageMax', max < 100 ? max : null);
                  }}
                  min={0}
                  max={100}
                  step={5}
                  className="w-full"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Min %</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={localFilters.coverageMin ?? ''}
                    onChange={(e) => updateFilter('coverageMin', e.target.value ? parseInt(e.target.value) : null)}
                    className="w-full h-10 px-3 border border-border rounded-md text-sm bg-white focus:outline-none focus:ring-1 focus:ring-brand-gold"
                    placeholder="0"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Max %</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={localFilters.coverageMax ?? ''}
                    onChange={(e) => updateFilter('coverageMax', e.target.value ? parseInt(e.target.value) : null)}
                    className="w-full h-10 px-3 border border-border rounded-md text-sm bg-white focus:outline-none focus:ring-1 focus:ring-brand-gold"
                    placeholder="100"
                  />
                </div>
              </div>
            </div>
          </AccordionSection>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-t border-border bg-white">
          <span className="text-sm">
            <span className="text-brand-gold font-medium">{activeFilterCount}</span>
            <span className="text-muted-foreground ml-1">filters applied</span>
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearFilters}
              className="h-9 px-4 text-sm font-medium"
            >
              Clear All
            </Button>
            <Button
              size="sm"
              onClick={handleApplyFilters}
              className="h-9 px-5 text-sm font-medium bg-brand-gold hover:bg-brand-gold-hover text-white"
            >
              Apply
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
