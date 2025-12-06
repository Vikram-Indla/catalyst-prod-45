import { cn } from '@/lib/utils';
import { ProcessStage, STAGE_NAMES, STAGE_NAMES_AR, STAGE_COLORS, Language, TRANSLATIONS } from '../types';

interface LegendProps {
  language: Language;
  totalCount: number;
  implementingCount: number;
}

export function Legend({ language, totalCount, implementingCount }: LegendProps) {
  const t = TRANSLATIONS[language];
  const isRTL = language === 'ar';
  const stages: ProcessStage[] = [1, 2, 3, 4, 5];

  return (
    <div 
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-[#FAF8F5] border-t border-[#E8E4DD]",
        "text-xs sm:text-sm"
      )}
      style={{ direction: isRTL ? 'rtl' : 'ltr' }}
    >
      {/* Summary counts */}
      <div className="flex items-center gap-4 text-[#5C5650]">
        <span>
          <strong className="text-[#2C2825]">{totalCount}</strong> {t.requests}
        </span>
        <span className="hidden sm:inline">|</span>
        <span className="hidden sm:inline">
          <strong className="text-[#2C2825]">{implementingCount}</strong> {t.implementing}
        </span>
      </div>

      {/* Stage legend */}
      <div className="flex flex-wrap items-center gap-3">
        {stages.map((stage) => (
          <div key={stage} className="flex items-center gap-1.5">
            <div 
              className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: STAGE_COLORS[stage] }}
              aria-hidden="true"
            />
            <span className="text-[#5C5650]">
              {stage} {language === 'ar' ? STAGE_NAMES_AR[stage] : STAGE_NAMES[stage]}
            </span>
          </div>
        ))}
      </div>

      {/* Today indicator */}
      <div className="hidden sm:flex items-center gap-1.5">
        <div className="w-3 h-0.5 bg-[#C69C6D]" aria-hidden="true" />
        <span className="text-[#C69C6D] font-medium">{t.today}</span>
      </div>
    </div>
  );
}
