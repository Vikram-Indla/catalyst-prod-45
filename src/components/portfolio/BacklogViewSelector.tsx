import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

// Citation: (Doc: Navigate to the backlog - PDF provided)
// Citation: (Screenshot: image-189.png)

export type BacklogView = 'theme' | 'epic' | 'feature';

interface BacklogViewSelectorProps {
  value: BacklogView;
  onChange: (value: BacklogView) => void;
  className?: string;
}

const viewLabels: Record<BacklogView, string> = {
  theme: 'Theme Backlog',
  epic: 'Epic Backlog',
  feature: 'Feature Backlog',
};

const viewOptions: { value: BacklogView; label: string; disabled?: boolean }[] = [
  { value: 'theme', label: 'Theme Backlog' },
  { value: 'epic', label: 'Epic Backlog' },
  { value: 'feature', label: 'Feature Backlog' },
];

export function BacklogViewSelector({ value, onChange, className }: BacklogViewSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={cn("relative", className)} ref={dropdownRef}>
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Viewing:</span>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <span>{viewLabels[value]}</span>
          <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", isOpen && "rotate-180")} />
        </button>
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-56 bg-popover border border-border rounded-md shadow-lg z-50 py-1">
          <div className="px-3 py-2 text-xs font-medium text-muted-foreground">
            Select one
          </div>
          <div className="border-t border-border my-1" />
          {viewOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              disabled={option.disabled}
              className={cn(
                "w-full text-left px-4 py-2 text-sm transition-colors",
                value === option.value
                  ? "bg-accent text-accent-foreground font-medium"
                  : "hover:bg-accent/50 text-foreground",
                option.disabled && "opacity-50 cursor-not-allowed"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
