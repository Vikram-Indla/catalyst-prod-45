import { cn } from '@/lib/utils';
import { ProcessStage, STAGE_NAMES, STAGE_NAMES_AR, STAGE_DESCRIPTIONS, STAGE_COLORS, Language } from '../types';

interface KPIDashboardProps {
  stageCounts: Record<ProcessStage, number>;
  activeStatus: string;
  onStatusClick: (stage: ProcessStage) => void;
  language: Language;
}

export function KPIDashboard({ stageCounts, activeStatus, onStatusClick, language }: KPIDashboardProps) {
  const stages: ProcessStage[] = [1, 2, 3, 4, 5];
  const isRTL = language === 'ar';

  return (
    <div 
      className={cn(
        "grid gap-3 px-4 py-4 bg-[#F5F2ED] border-b",
        "grid-cols-3 sm:grid-cols-5",
        isRTL && "direction-rtl"
      )}
      role="group"
      aria-label={language === 'ar' ? 'لوحة مؤشرات الأداء' : 'KPI Dashboard'}
    >
      {stages.map((stage) => {
        const isActive = activeStatus === String(stage);
        const stageColor = STAGE_COLORS[stage];
        
        return (
          <button
            key={stage}
            onClick={() => onStatusClick(stage)}
            className={cn(
              "relative rounded-lg p-3 sm:p-4 cursor-pointer transition-all duration-200",
              "text-left hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2",
              "border-l-[3px] bg-[#FAF8F5]",
              isActive 
                ? "border-[hsl(35_46%_60%)] bg-[#F7F1E8] ring-2 ring-[hsl(35_46%_60%)]" 
                : "hover:bg-[#FAF8F5]/80",
              isRTL && "text-right border-l-0 border-r-[3px]"
            )}
            style={{ 
              borderLeftColor: isRTL ? undefined : stageColor,
              borderRightColor: isRTL ? stageColor : undefined,
            }}
            aria-pressed={isActive}
            aria-label={`${language === 'ar' ? STAGE_NAMES_AR[stage] : STAGE_NAMES[stage]}: ${stageCounts[stage]}`}
          >
            {/* Stage name */}
            <div className="text-xs sm:text-sm font-semibold text-[#2C2825] uppercase tracking-wide mb-1">
              {language === 'ar' ? STAGE_NAMES_AR[stage] : STAGE_NAMES[stage]}
            </div>
            
            {/* Count */}
            <div className="text-xl sm:text-2xl font-bold text-[#2C2825]">
              {stageCounts[stage]}
            </div>
            
            {/* Description */}
            <div className="text-[10px] sm:text-xs text-[#9A9389] mt-1">
              {STAGE_DESCRIPTIONS[stage][language]}
            </div>
          </button>
        );
      })}
    </div>
  );
}
