import React from 'react';
import { X, FileText, Info, HelpCircle, Save, Cloud } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';

interface WizardTopBarProps {
  draftKey: string;
  documentName: string | null;
  isRtl: boolean;
  onRtlChange: (rtl: boolean) => void;
  onClose: () => void;
  onOpenDrawer: () => void;
  isSaving?: boolean;
  lastSaved?: Date | null;
}

export function WizardTopBar({
  draftKey,
  documentName,
  isRtl,
  onRtlChange,
  onClose,
  onOpenDrawer,
  isSaving,
  lastSaved
}: WizardTopBarProps) {
  const handleLanguageChange = (lang: 'en' | 'ar') => {
    onRtlChange(lang === 'ar');
  };

  const getSaveStatus = () => {
    if (isSaving) return { icon: Save, text: 'Saving...', className: 'text-muted-foreground animate-pulse' };
    if (lastSaved) {
      const diffMs = Date.now() - lastSaved.getTime();
      if (diffMs < 5000) return { icon: Cloud, text: 'Saved', className: 'text-[hsl(var(--success))]' };
      return { icon: Cloud, text: 'Auto-saved', className: 'text-muted-foreground' };
    }
    return null;
  };

  const saveStatus = getSaveStatus();

  return (
    <TooltipProvider>
      <header className="h-14 bg-card border-b border-border/50 flex items-center justify-between px-4 sticky top-0 z-30 shadow-sm">
        {/* Left section - Close button */}
        <div className="flex items-center gap-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-9 w-9 hover:bg-destructive/10 hover:text-destructive"
              >
                <X className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {isRtl ? 'رجوع للمسودات' : 'Close & return to drafts'}
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Center section - Document info */}
        <div className="flex flex-col items-center justify-center flex-1 min-w-0 px-4">
          <div className="flex items-center gap-2 max-w-full">
            {documentName ? (
              <>
                <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="font-medium text-sm truncate max-w-[300px]">{documentName}</span>
              </>
            ) : (
              <span className="font-medium text-sm text-muted-foreground">No document uploaded</span>
            )}
          </div>
          <span className="text-xs text-muted-foreground">{draftKey}</span>
        </div>

        {/* Right section - Save status, language, actions */}
        <div className="flex items-center gap-2">
          {/* Save status indicator */}
          {saveStatus && (
            <div className={cn("flex items-center gap-1.5 text-xs", saveStatus.className)}>
              <saveStatus.icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{saveStatus.text}</span>
            </div>
          )}

          <div className="h-4 w-px bg-border mx-1" />

          {/* Language Switcher */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => handleLanguageChange('ar')}
              className={cn(
                "text-base p-1 rounded transition-all",
                isRtl ? "opacity-100 bg-muted" : "opacity-50 hover:opacity-75"
              )}
              title="العربية"
              aria-label="Switch to Arabic"
            >
              🇸🇦
            </button>
            <button
              onClick={() => handleLanguageChange('en')}
              className={cn(
                "text-base p-1 rounded transition-all",
                !isRtl ? "opacity-100 bg-muted" : "opacity-50 hover:opacity-75"
              )}
              title="English"
              aria-label="Switch to English"
            >
              🇬🇧
            </button>
          </div>

          <div className="h-4 w-px bg-border mx-1" />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onOpenDrawer}
                className="h-9 w-9"
              >
                <Info className="h-[18px] w-[18px]" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{isRtl ? 'تفاصيل التشغيل' : 'Run Details'}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <HelpCircle className="h-[18px] w-[18px]" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{isRtl ? 'مساعدة' : 'Help'}</TooltipContent>
          </Tooltip>
        </div>
      </header>
    </TooltipProvider>
  );
}
