import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { 
  TimeScale, 
  Language, 
  SortField, 
  SortOrder,
  PLATFORM_INFO, 
  STAGE_NAMES, 
  STAGE_NAMES_AR, 
  TRANSLATIONS 
} from '../types';

interface MobileControlsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  timeScale: TimeScale;
  onTimeScaleChange: (scale: TimeScale) => void;
  platform: string;
  onPlatformChange: (platform: string) => void;
  status: string;
  onStatusChange: (status: string) => void;
  owner: string;
  onOwnerChange: (owner: string) => void;
  uniqueOwners: string[];
  sortField: SortField;
  onSortFieldChange: (field: SortField) => void;
  sortOrder: SortOrder;
  onSortOrderChange: (order: SortOrder) => void;
  showMilestones: boolean;
  onMilestonesToggle: () => void;
  language: Language;
  onLanguageChange: (lang: Language) => void;
}

export function MobileControlsPanel({
  isOpen,
  onClose,
  timeScale,
  onTimeScaleChange,
  platform,
  onPlatformChange,
  status,
  onStatusChange,
  owner,
  onOwnerChange,
  uniqueOwners,
  sortField,
  onSortFieldChange,
  sortOrder,
  onSortOrderChange,
  showMilestones,
  onMilestonesToggle,
  language,
  onLanguageChange,
}: MobileControlsPanelProps) {
  const t = TRANSLATIONS[language];
  const isRTL = language === 'ar';

  const timeScales: { value: TimeScale; label: string }[] = [
    { value: 'weekly', label: t.weekly },
    { value: 'monthly', label: t.monthly },
    { value: 'quarterly', label: t.quarterly },
    { value: 'yearly', label: t.yearly },
  ];

  const sortOptions: { value: SortField; label: string }[] = [
    { value: 'rank', label: t.rank },
    { value: 'platform', label: t.platform },
    { value: 'submission', label: t.submission },
    { value: 'score', label: t.score },
    { value: 'target', label: t.target },
    { value: 'quarter', label: t.quarter },
    { value: 'owner', label: t.owner },
  ];

  return (
    <>
      {/* Backdrop */}
      <div 
        className={cn(
          "fixed inset-0 bg-black/50 z-40 transition-opacity lg:hidden",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Panel */}
      <div 
        className={cn(
          "fixed top-0 bottom-0 w-[280px] bg-white z-50 shadow-xl transition-transform lg:hidden",
          "flex flex-col overflow-hidden",
          isRTL ? "left-0" : "right-0",
          isOpen 
            ? "translate-x-0" 
            : isRTL ? "-translate-x-full" : "translate-x-full"
        )}
        role="dialog"
        aria-modal="true"
        aria-label={t.filterAndSettings}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#E8E4DD] bg-[#FAF8F5]">
          <h2 className="text-sm font-semibold text-[#2C2825]">{t.filterAndSettings}</h2>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {/* Language */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-[#5C5650] uppercase">{t.language}</label>
            <div className="flex gap-2">
              <button
                onClick={() => onLanguageChange('en')}
                className={cn(
                  "flex-1 py-2 rounded-md text-sm font-medium transition-colors",
                  language === 'en' 
                    ? "bg-[#C69C6D] text-white" 
                    : "bg-[#F5F2ED] text-[#5C5650]"
                )}
              >
                English
              </button>
              <button
                onClick={() => onLanguageChange('ar')}
                className={cn(
                  "flex-1 py-2 rounded-md text-sm font-medium transition-colors",
                  language === 'ar' 
                    ? "bg-[#C69C6D] text-white" 
                    : "bg-[#F5F2ED] text-[#5C5650]"
                )}
              >
                العربية
              </button>
            </div>
          </div>

          {/* Time Scale */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-[#5C5650] uppercase">{t.timeScale}</label>
            <div className="grid grid-cols-2 gap-2">
              {timeScales.map((scale) => (
                <button
                  key={scale.value}
                  onClick={() => onTimeScaleChange(scale.value)}
                  className={cn(
                    "py-2 rounded-md text-sm font-medium transition-colors",
                    timeScale === scale.value 
                      ? "bg-[#C69C6D] text-white" 
                      : "bg-[#F5F2ED] text-[#5C5650]"
                  )}
                >
                  {scale.label}
                </button>
              ))}
            </div>
          </div>

          {/* Platform */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-[#5C5650] uppercase">{t.platform}</label>
            <Select value={platform} onValueChange={onPlatformChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t.allPlatforms} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.allPlatforms}</SelectItem>
                {Object.entries(PLATFORM_INFO).map(([key, info]) => (
                  <SelectItem key={key} value={key}>
                    {language === 'ar' ? info.nameAr : info.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-[#5C5650] uppercase">{t.allStatuses}</label>
            <Select value={status} onValueChange={onStatusChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t.allStatuses} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.allStatuses}</SelectItem>
                {Object.entries(language === 'ar' ? STAGE_NAMES_AR : STAGE_NAMES).map(([stage, name]) => (
                  <SelectItem key={stage} value={stage}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Owner */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-[#5C5650] uppercase">{t.owner}</label>
            <Select value={owner} onValueChange={onOwnerChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t.allOwners} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.allOwners}</SelectItem>
                {uniqueOwners.map((o) => (
                  <SelectItem key={o} value={o}>
                    {o}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Sort */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-[#5C5650] uppercase">{t.sortBy}</label>
            <Select value={sortField} onValueChange={(v) => onSortFieldChange(v as SortField)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sortOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <button
                onClick={() => onSortOrderChange('asc')}
                className={cn(
                  "flex-1 py-2 rounded-md text-sm font-medium transition-colors",
                  sortOrder === 'asc' 
                    ? "bg-[#C69C6D] text-white" 
                    : "bg-[#F5F2ED] text-[#5C5650]"
                )}
              >
                ↑ Asc
              </button>
              <button
                onClick={() => onSortOrderChange('desc')}
                className={cn(
                  "flex-1 py-2 rounded-md text-sm font-medium transition-colors",
                  sortOrder === 'desc' 
                    ? "bg-[#C69C6D] text-white" 
                    : "bg-[#F5F2ED] text-[#5C5650]"
                )}
              >
                ↓ Desc
              </button>
            </div>
          </div>

          {/* Milestones toggle */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-[#5C5650] uppercase">{t.milestones}</label>
            <button
              onClick={onMilestonesToggle}
              className={cn(
                "w-full py-2 rounded-md text-sm font-medium transition-colors",
                showMilestones 
                  ? "bg-[#C69C6D] text-white" 
                  : "bg-[#F5F2ED] text-[#5C5650]"
              )}
            >
              {showMilestones ? t.hideMilestones : t.showMilestones}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
