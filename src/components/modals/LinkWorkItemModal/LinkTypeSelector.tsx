// =====================================================
// LINK TYPE SELECTOR COMPONENT
// Grid of 6 link type buttons
// =====================================================

import React from 'react';
import { Ban, AlertTriangle, Link2, ChevronUp, ChevronDown, Copy } from 'lucide-react';
import { LinkType, LINK_TYPE_CONFIG } from '@/types/views';
import { cn } from '@/lib/utils';

interface LinkTypeSelectorProps {
  selectedType: LinkType;
  onSelect: (type: LinkType) => void;
}

const LINK_TYPE_ICONS: Record<LinkType, React.ReactNode> = {
  blocks: <Ban className="w-4 h-4" />,
  blocked_by: <AlertTriangle className="w-4 h-4" />,
  relates_to: <Link2 className="w-4 h-4" />,
  parent_of: <ChevronUp className="w-4 h-4" />,
  child_of: <ChevronDown className="w-4 h-4" />,
  duplicates: <Copy className="w-4 h-4" />,
};

export function LinkTypeSelector({ selectedType, onSelect }: LinkTypeSelectorProps) {
  const linkTypes: LinkType[] = [
    'blocks',
    'blocked_by',
    'relates_to',
    'parent_of',
    'child_of',
    'duplicates'
  ];

  return (
    <div className="grid grid-cols-3 gap-2">
      {linkTypes.map((type) => {
        const config = LINK_TYPE_CONFIG[type];
        const isSelected = selectedType === type;

        return (
          <button
            key={type}
            onClick={() => onSelect(type)}
            className={cn(
              'p-3 rounded-lg border-2 text-left transition-all',
              'hover:border-muted-foreground/30',
              isSelected
                ? 'border-primary bg-primary/5'
                : 'border-border bg-background'
            )}
          >
            <div className="flex items-center gap-2 mb-1">
              <span style={{ color: config.color }}>
                {LINK_TYPE_ICONS[type]}
              </span>
              <span className="text-sm font-medium">{config.label}</span>
            </div>
            <p className="text-xs text-muted-foreground">{config.description}</p>
          </button>
        );
      })}
    </div>
  );
}
