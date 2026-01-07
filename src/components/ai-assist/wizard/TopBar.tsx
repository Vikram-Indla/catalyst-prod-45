import React from 'react';
import { ChevronLeft, FileText, Info, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface TopBarProps {
  draftKey: string;
  currentStepName: string;
  currentStepNumber: number;
  totalSteps: number;
  isRtl: boolean;
  onRtlChange: (rtl: boolean) => void;
  onBack: () => void;
  onOpenDrawer: () => void;
}

export function TopBar({
  draftKey,
  currentStepName,
  currentStepNumber,
  totalSteps,
  isRtl,
  onRtlChange,
  onBack,
  onOpenDrawer
}: TopBarProps) {
  const handleLanguageChange = (lang: 'en' | 'ar') => {
    onRtlChange(lang === 'ar');
  };

  return (
    <header className="h-14 bg-card border-b border-border/50 flex items-center justify-between px-6 sticky top-0 z-30 shadow-sm">
      {/* Left section */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={onBack}
          className="gap-2 text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          {isRtl ? 'رجوع للمسودات' : 'Back to Drafts'}
        </Button>

        <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-lg">
          <FileText className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-primary">{draftKey}</span>
        </div>

      </div>

      {/* Right section */}
      <div className="flex items-center gap-3">
        {/* Language Switcher with Flags */}
        <div className="flex items-center gap-2 border-r border-border pr-3">
          <button
            onClick={() => handleLanguageChange('ar')}
            className={cn(
              "text-lg transition-opacity hover:opacity-100",
              isRtl ? "opacity-100" : "opacity-50"
            )}
            title="العربية"
            aria-label="Switch to Arabic"
          >
            🇸🇦
          </button>
          <span className="text-muted-foreground/50">|</span>
          <button
            onClick={() => handleLanguageChange('en')}
            className={cn(
              "text-lg transition-opacity hover:opacity-100",
              !isRtl ? "opacity-100" : "opacity-50"
            )}
            title="English"
            aria-label="Switch to English"
          >
            🇬🇧
          </button>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={onOpenDrawer}
          className="h-9 w-9"
          title={isRtl ? 'تفاصيل التشغيل' : 'Run Details'}
        >
          <Info className="h-[18px] w-[18px]" />
        </Button>

        <Button variant="ghost" size="icon" className="h-9 w-9" title={isRtl ? 'مساعدة' : 'Help'}>
          <HelpCircle className="h-[18px] w-[18px]" />
        </Button>
      </div>
    </header>
  );
}
