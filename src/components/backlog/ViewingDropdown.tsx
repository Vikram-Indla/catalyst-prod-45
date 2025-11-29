import { useState } from 'react';
import { ViewingOption } from '@/types/backlog.types';
import { Check } from 'lucide-react';

interface ViewingDropdownProps {
  options: ViewingOption[];
  selectedId: string;
  onSelect: (id: string) => void;
}

export function ViewingDropdown({ options, selectedId, onSelect }: ViewingDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find(opt => opt.id === selectedId);

  return (
    <div className="relative">
      <div 
        className="flex items-center gap-2 cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="text-muted-foreground text-lg">⭐</span>
        <span className="text-base font-medium text-foreground">
          {selectedOption?.label || 'Epic Backlog'}
        </span>
        <span className="text-muted-foreground">▼</span>
      </div>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 mt-1 min-w-[200px] bg-popover border border-border rounded shadow-lg z-50">
            <div className="px-4 py-2 text-xs text-muted-foreground border-b border-border">
              Select one
            </div>
            {options.map((option) => (
              <div
                key={option.id}
                className={`px-4 py-2.5 text-sm flex items-center justify-between cursor-pointer ${
                  option.enabled 
                    ? 'text-foreground hover:bg-muted' 
                    : 'text-muted-foreground cursor-not-allowed'
                } ${option.id === selectedId ? 'bg-primary/10 text-primary' : ''}`}
                onClick={() => {
                  if (option.enabled) {
                    onSelect(option.id);
                    setIsOpen(false);
                  }
                }}
              >
                {option.label}
                {option.id === selectedId && (
                  <Check className="w-4 h-4 text-primary" />
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
