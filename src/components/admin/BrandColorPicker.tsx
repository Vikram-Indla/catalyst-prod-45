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
  { name: 'Blue', value: 'blue', hex: 'var(--ds-text-brand, var(--ds-text-brand, #2563eb))', bgClass: 'bg-blue-600' },
  { name: 'Blue Dark', value: 'blue-dark', hex: 'var(--ds-background-brand-bold-hovered, var(--ds-background-brand-bold-hovered, #1d4ed8))', bgClass: 'bg-blue-700' },
  { name: 'Blue Light', value: 'blue-light', hex: 'var(--ds-text-brand, var(--ds-text-brand, #3b82f6))', bgClass: 'bg-blue-500' },
  { name: 'Teal', value: 'teal', hex: '#0d9488', bgClass: 'bg-teal-600' },
  { name: 'Teal Dark', value: 'teal-dark', hex: '#0f766e', bgClass: 'bg-teal-700' },
  { name: 'Teal Light', value: 'teal-light', hex: '#14b8a6', bgClass: 'bg-teal-500' },
  { name: 'Gray', value: 'gray', hex: '#6b7280', bgClass: 'bg-gray-500' },
  { name: 'Gray Dark', value: 'gray-dark', hex: '#4b5563', bgClass: 'bg-gray-600' },
  { name: 'Warning', value: 'warning', hex: 'var(--ds-text-warning, var(--ds-text-warning, #f59e0b))', bgClass: 'bg-amber-500' },
  { name: 'Danger', value: 'danger', hex: 'var(--ds-text-danger, var(--ds-text-danger, #ef4444))', bgClass: 'bg-red-500' },
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
