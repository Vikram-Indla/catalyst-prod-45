import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ArrowUpDown, Maximize, Minimize, FileDown, Flag, Menu, Globe } from 'lucide-react';
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

interface ControlsBarProps {
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
  isFullscreen: boolean;
  onFullscreenToggle: () => void;
  onExport: () => void;
  language: Language;
  onLanguageChange: (lang: Language) => void;
  onMobileMenuOpen: () => void;
}

export function ControlsBar({
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
  isFullscreen,
  onFullscreenToggle,
  onExport,
  language,
  onLanguageChange,
  onMobileMenuOpen,
}: ControlsBarProps) {
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
    <div 
      className={cn(
        "flex flex-wrap items-center gap-2 sm:gap-3 px-4 py-3 bg-white border-b border-[#E8E4DD]"
      )}
      style={{ direction: isRTL ? 'rtl' : 'ltr' }}
    >
      {/* Mobile menu toggle */}
      <Button
        variant="outline"
        size="sm"
        className="lg:hidden"
        onClick={onMobileMenuOpen}
        aria-label={t.filterAndSettings}
      >
        <Menu className="h-4 w-4" />
      </Button>

      {/* Time scale buttons - hidden on mobile, shown in dropdown */}
      <div className="hidden lg:flex items-center gap-1 bg-[#F5F2ED] rounded-lg p-1">
        {timeScales.map((scale) => (
          <button
            key={scale.value}
            onClick={() => onTimeScaleChange(scale.value)}
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded-md transition-all",
              timeScale === scale.value
                ? "bg-white text-[#2C2825] shadow-sm"
                : "text-[#5C5650] hover:text-[#2C2825]"
            )}
          >
            {scale.label}
          </button>
        ))}
      </div>

      {/* Mobile time scale dropdown */}
      <div className="lg:hidden">
        <Select value={timeScale} onValueChange={(v) => onTimeScaleChange(v as TimeScale)}>
          <SelectTrigger className="w-[100px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {timeScales.map((scale) => (
              <SelectItem key={scale.value} value={scale.value}>
                {scale.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Filters - hidden on mobile */}
      <div className="hidden sm:flex items-center gap-2">
        {/* Platform filter */}
        <Select value={platform} onValueChange={onPlatformChange}>
          <SelectTrigger className="w-[140px] h-8 text-xs">
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

        {/* Status filter */}
        <Select value={status} onValueChange={onStatusChange}>
          <SelectTrigger className="w-[120px] h-8 text-xs">
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

        {/* Owner filter */}
        <Select value={owner} onValueChange={onOwnerChange}>
          <SelectTrigger className="w-[130px] h-8 text-xs">
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
      <div className="hidden md:flex items-center gap-1">
        <Select value={sortField} onValueChange={(v) => onSortFieldChange(v as SortField)}>
          <SelectTrigger className="w-[120px] h-8 text-xs">
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
        
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => onSortOrderChange(sortOrder === 'asc' ? 'desc' : 'asc')}
          aria-label={`Sort ${sortOrder === 'asc' ? 'descending' : 'ascending'}`}
        >
          <ArrowUpDown className={cn(
            "h-4 w-4 transition-transform",
            sortOrder === 'desc' && "rotate-180"
          )} />
        </Button>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Action buttons */}
      <div className="flex items-center gap-1">
        {/* Milestones toggle */}
        <Button
          variant={showMilestones ? "default" : "ghost"}
          size="sm"
          className="h-8 px-2 text-xs hidden sm:flex"
          onClick={onMilestonesToggle}
          aria-label={showMilestones ? t.hideMilestones : t.showMilestones}
        >
          <Flag className="h-4 w-4 mr-1" />
          <span className="hidden md:inline">{t.milestones}</span>
        </Button>

        {/* Language toggle */}
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2"
          onClick={() => onLanguageChange(language === 'en' ? 'ar' : 'en')}
          aria-label={language === 'en' ? 'Switch to Arabic' : 'Switch to English'}
        >
          <Globe className="h-4 w-4 mr-1" />
          <span className="text-xs font-medium">{language === 'en' ? 'AR' : 'EN'}</span>
        </Button>

        {/* Fullscreen toggle */}
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 hidden sm:flex"
          onClick={onFullscreenToggle}
          aria-label={isFullscreen ? t.exitFullscreen : t.fullscreen}
        >
          {isFullscreen ? (
            <Minimize className="h-4 w-4" />
          ) : (
            <Maximize className="h-4 w-4" />
          )}
        </Button>

        {/* Export PDF */}
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs"
          onClick={onExport}
        >
          <FileDown className="h-4 w-4 mr-1" />
          <span className="hidden sm:inline">{t.exportPdf}</span>
        </Button>
      </div>
    </div>
  );
}
