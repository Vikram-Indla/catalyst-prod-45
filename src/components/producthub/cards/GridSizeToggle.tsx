import React from 'react';
import { cn } from '@/lib/utils';
import { Grid3X3, LayoutGrid, Square } from 'lucide-react';

export type GridSize = 'small' | 'medium' | 'large';

interface GridSizeToggleProps {
  value: GridSize;
  onChange: (size: GridSize) => void;
}

const OPTIONS: { key: GridSize; icon: typeof Grid3X3; label: string }[] = [
  { key: 'small', icon: Grid3X3, label: 'Small grid' },
  { key: 'medium', icon: LayoutGrid, label: 'Medium grid' },
  { key: 'large', icon: Square, label: 'Large grid' },
];

export const GridSizeToggle: React.FC<GridSizeToggleProps> = ({ value, onChange }) => {
  return (
    <div className="flex items-center border border-zinc-300 rounded-lg overflow-hidden">
      {OPTIONS.map(opt => {
        const Icon = opt.icon;
        const isActive = value === opt.key;
        return (
          <button
            key={opt.key}
            onClick={() => onChange(opt.key)}
            title={opt.label}
            className={cn(
              'h-8 w-8 flex items-center justify-center transition-colors',
              isActive
                ? 'bg-white shadow-sm text-zinc-900'
                : 'text-zinc-500 hover:text-zinc-700 hover:bg-zinc-50'
            )}
          >
            <Icon className="w-4 h-4" />
          </button>
        );
      })}
    </div>
  );
};

export default GridSizeToggle;
