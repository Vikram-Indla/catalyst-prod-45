/**
 * Slider — plain HTML range input. No radix dependency.
 * ADS-styled via CSS custom properties.
 */
import * as React from "react";
import { cn } from "@/lib/utils";

interface SliderProps {
  value?: number[];
  defaultValue?: number[];
  min?: number;
  max?: number;
  step?: number;
  onValueChange?: (value: number[]) => void;
  disabled?: boolean;
  className?: string;
}

const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
  ({ value, defaultValue, min = 0, max = 100, step = 1, onValueChange, disabled, className }, ref) => {
    const currentValue = value?.[0] ?? defaultValue?.[0] ?? min;
    return (
      <input
        ref={ref}
        type="range"
        min={min}
        max={max}
        step={step}
        value={currentValue}
        onChange={(e) => onValueChange?.([Number(e.target.value)])}
        disabled={disabled}
        className={cn("w-full h-2 rounded-full appearance-none cursor-pointer", "bg-[var(--ds-background-neutral,#F1F2F4)]", "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[var(--ds-icon-brand,#0C66E4)]", "disabled:opacity-50 disabled:cursor-not-allowed", className)}
      />
    );
  }
);
Slider.displayName = "Slider";

export { Slider };
