import React from 'react';
import { cn } from '@/lib/utils';
import { Slot } from '@radix-ui/react-slot';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'default' | 'lg' | 'icon';

interface CIOButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  asChild?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: cn(
    'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)]',
    'hover:bg-[var(--btn-primary-hover)]',
    'border-transparent'
  ),
  secondary: cn(
    'bg-[var(--btn-secondary-bg)] text-[var(--btn-secondary-text)]',
    'border border-[var(--btn-secondary-border)]',
    'hover:bg-[var(--btn-secondary-hover)]'
  ),
  ghost: cn(
    'bg-transparent text-[var(--text-secondary)]',
    'hover:bg-[var(--btn-ghost-hover)] hover:text-[var(--text-primary)]',
    'border-transparent'
  ),
  danger: cn(
    'bg-[var(--danger)] text-white',
    'hover:opacity-90',
    'border-transparent'
  ),
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  default: 'h-9 px-4 text-sm gap-2',
  lg: 'h-10 px-5 text-sm gap-2',
  icon: 'h-9 w-9 p-0',
};

export const CIOButton = React.forwardRef<HTMLButtonElement, CIOButtonProps>(
  ({ className, variant = 'primary', size = 'default', asChild, leftIcon, rightIcon, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    
    return (
      <Comp
        ref={ref}
        disabled={disabled}
        className={cn(
          'inline-flex items-center justify-center',
          'font-medium rounded-md',
          'transition-all duration-150',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-color)]',
          'disabled:opacity-50 disabled:pointer-events-none',
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {leftIcon && <span className="shrink-0">{leftIcon}</span>}
        {children}
        {rightIcon && <span className="shrink-0">{rightIcon}</span>}
      </Comp>
    );
  }
);

CIOButton.displayName = 'CIOButton';
