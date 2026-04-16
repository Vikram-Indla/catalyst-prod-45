import * as React from 'react';
import { cn } from '@/lib/utils';

export interface CommentActionProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: React.ReactNode;
}

const CommentAction = React.forwardRef<HTMLButtonElement, CommentActionProps>(
  ({ className, icon, children, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      className={cn(
        'inline-flex items-center gap-1 text-[12px] font-medium',
        'text-[#6B778C] hover:text-[#172B4D] hover:underline',
        'dark:text-[#A1A1A1] dark:hover:text-[#EDEDED]',
        'transition-colors duration-150 cursor-pointer',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:no-underline',
        className
      )}
      {...props}
    >
      {icon && <span className="shrink-0 [&_svg]:h-3.5 [&_svg]:w-3.5">{icon}</span>}
      {children}
    </button>
  )
);
CommentAction.displayName = 'CommentAction';

export { CommentAction };
