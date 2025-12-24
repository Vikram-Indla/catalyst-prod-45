import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';

// Catalyst Brand Color Palette
export const BRAND_COLORS = [
  { name: 'Olive', value: 'olive', hex: '#5c7c5c', bgClass: 'bg-olive-500' },
  { name: 'Olive Dark', value: 'olive-dark', hex: '#4a6a4a', bgClass: 'bg-olive-600' },
  { name: 'Olive Light', value: 'olive-light', hex: '#7d9c7d', bgClass: 'bg-olive-400' },
  { name: 'Bronze', value: 'bronze', hex: '#8b7355', bgClass: 'bg-bronze-500' },
  { name: 'Bronze Dark', value: 'bronze-dark', hex: '#7a6349', bgClass: 'bg-bronze-600' },
  { name: 'Gold', value: 'gold', hex: '#c69c6d', bgClass: 'bg-gold-500' },
  { name: 'Gold Light', value: 'gold-light', hex: '#d4a66f', bgClass: 'bg-gold-400' },
  { name: 'Champagne', value: 'champagne', hex: '#d4b896', bgClass: 'bg-gold-300' },
  { name: 'Success', value: 'success', hex: '#16a34a', bgClass: 'bg-green-600' },
  { name: 'Warning', value: 'warning', hex: '#d97706', bgClass: 'bg-amber-600' },
  { name: 'Info', value: 'info', hex: '#3b82f6', bgClass: 'bg-blue-500' },
  { name: 'Neutral', value: 'neutral', hex: '#6b7280', bgClass: 'bg-gray-500' },
] as const;

export type BrandColorValue = typeof BRAND_COLORS[number]['value'];

export function getBrandColorHex(value: string | null | undefined): string {
  const color = BRAND_COLORS.find(c => c.value === value);
  return color?.hex || BRAND_COLORS[0].hex;
}

export function getBrandColorName(value: string | null | undefined): string {
  const color = BRAND_COLORS.find(c => c.value === value);
  return color?.name || 'Olive';
}

interface BrandColorPickerProps {
  value: string | null | undefined;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function BrandColorPicker({ value, onChange, disabled }: BrandColorPickerProps) {
  const selectedColor = BRAND_COLORS.find(c => c.value === value) || BRAND_COLORS[0];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0 border-2"
          disabled={disabled}
          style={{ backgroundColor: selectedColor.hex }}
        >
          <span className="sr-only">Pick color</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="start">
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground mb-2">
            Catalyst Brand Colors
          </p>
          <div className="grid grid-cols-4 gap-2">
            {BRAND_COLORS.map((color) => (
              <button
                key={color.value}
                onClick={() => onChange(color.value)}
                className={cn(
                  'h-8 w-8 rounded-md border-2 flex items-center justify-center transition-all hover:scale-110',
                  value === color.value 
                    ? 'border-foreground ring-2 ring-foreground ring-offset-2' 
                    : 'border-transparent hover:border-muted-foreground/50'
                )}
                style={{ backgroundColor: color.hex }}
                title={color.name}
              >
                {value === color.value && (
                  <Check className="h-4 w-4 text-white drop-shadow-md" />
                )}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Selected: {selectedColor.name}
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
