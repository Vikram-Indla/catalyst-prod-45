import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface SplitButtonOption {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}

export interface SplitButtonProps {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  options: SplitButtonOption[];
  disabled?: boolean;
  className?: string;
}

export function SplitButton({
  label,
  icon,
  onClick,
  options,
  disabled,
  className,
}: SplitButtonProps) {
  return (
    <div className={cn("inline-flex items-center", className)}>
      {/* Primary action */}
      <button
        onClick={onClick}
        disabled={disabled}
        className={cn(
          "h-8 px-3 inline-flex items-center gap-1.5 rounded-l-md",
          "text-sm font-semibold",
          "bg-[var(--accent-color)] text-[var(--text-inverse)]",
          "hover:bg-[var(--accent-hover)] transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2",
          "disabled:pointer-events-none disabled:opacity-40"
        )}
      >
        {icon}
        {label}
      </button>

      {/* Dropdown trigger */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            disabled={disabled}
            className={cn(
              "h-8 px-1.5 inline-flex items-center justify-center rounded-r-md",
              "bg-[var(--accent-color)] text-[var(--text-inverse)]",
              "border-l border-[var(--text-inverse)]/20",
              "hover:bg-[var(--accent-hover)] transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2",
              "disabled:pointer-events-none disabled:opacity-40"
            )}
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="min-w-[180px] bg-[var(--surface-1)] border-[var(--border-color)] z-[300]"
        >
          {options.map((option, index) => (
            <DropdownMenuItem
              key={index}
              onClick={option.onClick}
              disabled={option.disabled}
              className="flex items-center gap-2 cursor-pointer text-[var(--text-1)] hover:bg-[var(--nav-hover-bg)]"
            >
              {option.icon}
              <span>{option.label}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
