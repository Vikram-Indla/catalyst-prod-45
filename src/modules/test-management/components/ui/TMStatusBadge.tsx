/**
 * TMStatusBadge - Status badge component for Test Management
 */

import { cn } from '@/lib/utils';

interface TMStatusBadgeProps {
  status: string;
  color?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'solid' | 'outline' | 'subtle';
  className?: string;
}

const sizeClasses = {
  sm: 'px-1.5 py-0.5 text-[10px]',
  md: 'px-2 py-0.5 text-xs',
  lg: 'px-2.5 py-1 text-sm',
};

export function TMStatusBadge({ 
  status, 
  color = '#64748b', 
  size = 'md',
  variant = 'subtle',
  className 
}: TMStatusBadgeProps) {
  const baseClasses = 'inline-flex items-center font-medium rounded-md whitespace-nowrap';
  
  const variantClasses = {
    solid: 'text-white',
    outline: 'border bg-transparent',
    subtle: '',
  };
  
  const style = variant === 'solid' 
    ? { backgroundColor: color, color: '#fff' }
    : variant === 'outline'
    ? { borderColor: color, color }
    : { backgroundColor: `${color}20`, color };
  
  return (
    <span 
      className={cn(baseClasses, sizeClasses[size], variantClasses[variant], className)}
      style={style}
    >
      {status}
    </span>
  );
}
